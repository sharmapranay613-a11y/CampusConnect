import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../services/db.js';

export async function createBorrowRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required to borrow an item.' });
      return;
    }

    const { item_id } = req.body;
    if (!item_id) {
      res.status(400).json({ error: 'item_id is required.' });
      return;
    }

    const borrowRequest = await db.createBorrowRequest({
      item_id,
      borrower_id: req.user.id,
    });

    res.status(201).json({
      message: 'Borrow request sent successfully to the item owner.',
      request: borrowRequest,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to submit borrow request.' });
  }
}

export async function getMyRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const requests = await db.getRequestsByBorrower(req.user.id);
    res.json({ requests });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve your borrow requests.' });
  }
}

export async function getIncomingRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const requests = await db.getRequestsByOwner(req.user.id);
    res.json({ requests });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve incoming borrow requests.' });
  }
}

export async function approveRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    const updatedRequest = await db.updateRequestStatus(id, req.user.id, 'approved');

    res.json({
      message: 'Borrow request approved. The item is now marked as unavailable.',
      request: updatedRequest,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to approve request.' });
  }
}

export async function rejectRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    const updatedRequest = await db.updateRequestStatus(id, req.user.id, 'rejected');

    res.json({
      message: 'Borrow request rejected. The item remains available.',
      request: updatedRequest,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to reject request.' });
  }
}
