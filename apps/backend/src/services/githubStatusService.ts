import axios from 'axios';

export type CommitStatus = 'pending' | 'success' | 'failure' | 'error';

/**
 * Updates the commit status on GitHub.
 * This is what provides the "Green Checkmark" or "Red X" on GitHub.
 */
export const updateGitHubStatus = async (
  gitUrl: string, 
  sha: string, 
  status: CommitStatus, 
  targetUrl?: string, 
  description?: string
) => {
  // Use the GITHUB_TOKEN from env or the one stored for the project
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.log('ℹ️ No GITHUB_TOKEN found. Skipping GitHub status update.');
    return;
  }

  // Extract owner and repo from gitUrl (e.g. https://github.com/owner/repo)
  const repoMatch = gitUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (!repoMatch) {
    console.error('❌ Could not parse GitHub URL for status update:', gitUrl);
    return;
  }

  const [_, owner, repo] = repoMatch;
  const cleanRepo = repo.replace('.git', '');

  try {
    await axios.post(
      `https://api.github.com/repos/${owner}/${cleanRepo}/statuses/${sha}`,
      {
        state: status,
        target_url: targetUrl,
        description: description || `Deployment ${status}`,
        context: 'Mini PaaS / VPS Deployer'
      },
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );
    console.log(`✅ GitHub Status Updated: ${status} for ${cleanRepo}@${sha.substring(0, 7)}`);
  } catch (error: any) {
    console.error('❌ Failed to update GitHub status:', error.response?.data || error.message);
  }
};
