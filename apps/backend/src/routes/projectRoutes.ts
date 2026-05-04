import { Router } from 'express';
import { createProject, getProjects, updateProject, deleteProject, deployProject, validateRepo, getDeployments } from '../controllers/projectController.js';

const router = Router();

router.post('/validate', validateRepo);
router.post('/', createProject);
router.get('/', getProjects);
router.put('/:projectId', updateProject);
router.get('/deployments', getDeployments);
router.get('/:projectId/deployments', getDeployments);
router.delete('/:projectId', deleteProject);

export default router;
