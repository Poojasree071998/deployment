import { Router } from 'express';
import { getDeployments, deployProject } from '../controllers/projectController.js';

const router = Router();

router.get('/:projectId', getDeployments);
router.post('/:projectId', deployProject);

export default router;
