import { Router } from 'express';
import {
  createBorrowRequest,
  getMyRequests,
  getIncomingRequests,
  approveRequest,
  rejectRequest,
} from '../controllers/requestController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All request routes require authentication
router.use(requireAuth);

router.post('/', createBorrowRequest);
router.get('/my', getMyRequests);
router.get('/incoming', getIncomingRequests);
router.put('/:id/approve', approveRequest);
router.put('/:id/reject', rejectRequest);

export default router;
