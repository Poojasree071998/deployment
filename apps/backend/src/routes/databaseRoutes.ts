import express from 'express';
import { createDatabase, getDatabases, deleteDatabase } from '../controllers/databaseController.js';

const router = express.Router();

router.post('/', createDatabase);
router.get('/', getDatabases);
router.delete('/:id', deleteDatabase);

export default router;
