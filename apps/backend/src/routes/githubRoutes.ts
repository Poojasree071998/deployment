import { Router } from 'express';
import axios from 'axios';

const router = Router();

// Fetch user's GitHub repositories
router.get('/repos', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No GitHub token provided' });
  }

  try {
    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: authHeader,
        Accept: 'application/vnd.github.v3+json'
      },
      params: {
        sort: 'updated',
        per_page: 100
      }
    });

    res.json(response.data);
  } catch (error: any) {
    console.error('Fetch Repos Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch repositories' });
  }
});

/**
 * Automatically set up a GitHub Webhook for a project
 */
router.post('/setup-webhook', async (req, res) => {
  const { gitUrl, token, publicUrl, secret } = req.body;

  if (!gitUrl || !token || !publicUrl) {
    return res.status(400).json({ error: 'Missing required parameters: gitUrl, token, or publicUrl' });
  }

  try {
    // 1. Parse GitHub URL (e.g., https://github.com/owner/repo)
    const githubRegex = /github\.com\/([^/]+)\/([^/.]+)(?:\.git)?/;
    const match = gitUrl.match(githubRegex);

    if (!match) {
      return res.status(400).json({ error: 'Invalid GitHub URL' });
    }

    const [_, owner, repo] = match;

    // 2. Call GitHub API to create webhook
    // Docs: https://docs.github.com/en/rest/repos/webhooks?apiVersion=2022-11-28#create-a-repository-webhook
    const webhookUrl = `${publicUrl.replace(/\/$/, '')}/api/webhooks/github`;
    
    console.log(`🔧 Setting up webhook for ${owner}/${repo} -> ${webhookUrl}`);

    const response = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/hooks`,
      {
        name: 'web',
        active: true,
        events: ['push'],
        config: {
          url: webhookUrl,
          content_type: 'json',
          secret: secret || undefined,
          insecure_ssl: '0' // GitHub recommends 0 (verified SSL) but we might need 1 for dev tunnels if they have cert issues. ngrok is usually fine with 0.
        }
      },
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );

    res.status(201).json({ 
      message: 'Webhook created successfully', 
      webhookId: response.data.id,
      url: response.data.config.url
    });

  } catch (error: any) {
    console.error('Webhook Setup Error:', error.response?.data || error.message);
    const githubError = error.response?.data?.errors?.[0]?.message || error.response?.data?.message || error.message;
    
    // Check if webhook already exists
    if (githubError.includes('Hook already exists')) {
        return res.status(200).json({ message: 'Webhook already exists on this repository.' });
    }

    res.status(error.response?.status || 500).json({ 
      error: 'Failed to set up GitHub webhook',
      details: githubError
    });
  }
});

export default router;
