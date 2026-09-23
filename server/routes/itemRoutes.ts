import { Router } from 'express';
import {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
} from '../controllers/itemController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Publicly viewable items (or authenticated)
router.get('/', getItems);
router.get('/:id', getItemById);

// Protected routes
router.post('/', requireAuth, createItem);
router.put('/:id', requireAuth, updateItem);
router.delete('/:id', requireAuth, deleteItem);

export default router;
