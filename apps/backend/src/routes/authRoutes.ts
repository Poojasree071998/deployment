import { Router } from 'express';
import axios from 'axios';

const router = Router();

// 1. Redirect to GitHub login
router.get('/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_CALLBACK_URL;
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo,user`;
  res.redirect(url);
});

// 2. Handle GitHub callback
router.get('/github/callback', async (req, res) => {
  const { code } = req.query;

  try {
    // Exchange code for access token
    const response = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }, {
      headers: { Accept: 'application/json' }
    });

    const accessToken = response.data.access_token;

    if (!accessToken) {
      throw new Error('Failed to obtain access token');
    }

    // Redirect back to frontend with the token in the URL (for simplicity in this PaaS)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?github_token=${accessToken}`);

  } catch (error: any) {
    console.error('GitHub OAuth Error:', error.response?.data || error.message);
    res.redirect(`${process.env.FRONTEND_URL}?error=github_auth_failed`);
  }
});

export default router;
