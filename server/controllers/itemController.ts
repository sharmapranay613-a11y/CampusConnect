import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../services/db.js';

export async function getItems(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { search, category, owner_id } = req.query;

    const items = await db.getItems({
      search: typeof search === 'string' ? search : undefined,
      category: typeof category === 'string' ? category : undefined,
      owner_id: typeof owner_id === 'string' ? owner_id : undefined,
    });

    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch items.' });
  }
}

export async function getItemById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const item = await db.getItemById(id);
    if (!item) {
      res.status(404).json({ error: 'Item not found.' });
      return;
    }
    res.json({ item });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch item details.' });
  }
}

export async function createItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required to create a listing.' });
      return;
    }

    const {
      title,
      description,
      category,
      condition,
      image_url,
      pickup_location,
      borrow_duration,
    } = req.body;

    if (!title || !description || !category || !condition || !pickup_location || !borrow_duration) {
      res.status(400).json({
        error: 'Missing required fields: title, description, category, condition, pickup_location, borrow_duration.',
      });
      return;
    }

    const newItem = await db.createItem({
      owner_id: req.user.id,
      title,
      description,
      category,
      condition,
      image_url: image_url || '',
      pickup_location,
      borrow_duration,
    });

    res.status(201).json({
      message: 'Item listing created successfully.',
      item: newItem,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create item listing.' });
  }
}

export async function updateItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    const {
      title,
      description,
      category,
      condition,
      image_url,
      pickup_location,
      borrow_duration,
      available,
    } = req.body;

    const existing = await db.getItemById(id);
    if (!existing) {
      res.status(404).json({ error: 'Item not found.' });
      return;
    }

    if (existing.owner_id !== req.user.id) {
      res.status(403).json({ error: 'Forbidden: You can only edit your own listings.' });
      return;
    }

    const updated = await db.updateItem(id, req.user.id, {
      title,
      description,
      category,
      condition,
      image_url,
      pickup_location,
      borrow_duration,
      available,
    });

    res.json({
      message: 'Item updated successfully.',
      item: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update item.' });
  }
}

export async function deleteItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    const existing = await db.getItemById(id);
    if (!existing) {
      res.status(404).json({ error: 'Item not found.' });
      return;
    }

    if (existing.owner_id !== req.user.id) {
      res.status(403).json({ error: 'Forbidden: You can only delete your own listings.' });
      return;
    }

    await db.deleteItem(id, req.user.id);
    res.json({ message: 'Item listing deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete item.' });
  }
}
