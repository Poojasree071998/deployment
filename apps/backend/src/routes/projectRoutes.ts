import { Router } from 'express';
import { createProject, getProjects, deleteProject, deployProject, validateRepo } from '../controllers/projectController.js';

const router = Router();

router.post('/validate', validateRepo);
router.post('/', createProject);
router.get('/', getProjects);
router.delete('/:projectId', deleteProject);

export default router;
