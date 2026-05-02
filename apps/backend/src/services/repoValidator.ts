import axios from 'axios';

interface RepoDetails {
  provider: 'github' | 'gitlab' | 'bitbucket' | 'unknown';
  owner: string;
  name: string;
  fullName: string;
  visibility: 'public' | 'private';
  defaultBranch: string;
  size: number;
  framework: string;
  buildContext: {
    installCommand: string;
    buildCommand: string;
    outputDir: string;
  };
}

export class RepoValidator {
  private static GITHUB_API = 'https://api.github.com';

  /**
   * Main validation entry point
   */
  static async validate(url: string, token?: string): Promise<RepoDetails> {
    const parsed = this.parseUrl(url);
    if (parsed.provider === 'unknown') {
      throw new Error('Unsupported or invalid Git provider URL');
    }

    if (parsed.provider === 'github') {
      return await this.validateGitHub(parsed.owner, parsed.name, token);
    }

    throw new Error(`Provider ${parsed.provider} integration coming soon!`);
  }

  /**
   * Parse Git URL to extract provider, owner, and repo name
   */
  private static parseUrl(url: string) {
    // Basic Security: Block localhost and IP-based URLs to prevent SSRF
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('localhost') || lowerUrl.includes('127.0.0.1') || lowerUrl.includes('::1')) {
      throw new Error('Safety check failed: Local or internal URLs are not allowed');
    }

    const githubRegex = /github\.com\/([^/]+)\/([^/.]+)(?:\.git)?/;
    const gitlabRegex = /gitlab\.com\/([^/]+)\/([^/.]+)(?:\.git)?/;
    const bitbucketRegex = /bitbucket\.org\/([^/]+)\/([^/.]+)(?:\.git)?/;

    let match;
    if ((match = url.match(githubRegex))) return { provider: 'github' as const, owner: match[1], name: match[2] };
    if ((match = url.match(gitlabRegex))) return { provider: 'gitlab' as const, owner: match[1], name: match[2] };
    if ((match = url.match(bitbucketRegex))) return { provider: 'bitbucket' as const, owner: match[1], name: match[2] };

    return { provider: 'unknown' as const, owner: '', name: '' };
  }

  /**
   * GitHub Specific Validation
   */
  private static async validateGitHub(owner: string, name: string, token?: string): Promise<RepoDetails> {
    const headers = token ? { Authorization: `token ${token}` } : {};

    try {
      // 1. Fetch Repo Metadata
      const repoRes = await axios.get(`${this.GITHUB_API}/repos/${owner}/${name}`, { headers });
      const data = repoRes.data;

      // 2. Detect Framework (Check package.json)
      const framework = await this.detectFramework(owner, name, data.default_branch, token);

      return {
        provider: 'github',
        owner,
        name,
        fullName: data.full_name,
        visibility: data.private ? 'private' : 'public',
        defaultBranch: data.default_branch,
        size: data.size,
        framework: framework.name,
        buildContext: framework.buildContext
      };
    } catch (error: any) {
      if (error.response?.status === 404) throw new Error('Repository not found or is private (requires token)');
      if (error.response?.status === 401) throw new Error('Invalid GitHub token');
      throw new Error(error.message || 'Failed to validate repository');
    }
  }

  /**
   * Framework Detection Logic
   */
  private static async detectFramework(owner: string, name: string, branch: string, token?: string) {
    const headers = token ? { Authorization: `token ${token}` } : {};
    const packageJsonUrl = `${this.GITHUB_API}/repos/${owner}/${name}/contents/package.json?ref=${branch}`;

    try {
      const res = await axios.get(packageJsonUrl, { headers });
      const content = Buffer.from(res.data.content, 'base64').toString();
      const pkg = JSON.parse(content);

      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps['next']) return { name: 'Next.js', buildContext: { installCommand: 'npm install', buildCommand: 'next build', outputDir: '.next' } };
      if (deps['vite']) return { name: 'Vite/React', buildContext: { installCommand: 'npm install', buildCommand: 'vite build', outputDir: 'dist' } };
      if (deps['@angular/core']) return { name: 'Angular', buildContext: { installCommand: 'npm install', buildCommand: 'ng build', outputDir: 'dist' } };
      if (deps['vue']) return { name: 'Vue.js', buildContext: { installCommand: 'npm install', buildCommand: 'npm run build', outputDir: 'dist' } };
      if (deps['express']) return { name: 'Node.js (Express)', buildContext: { installCommand: 'npm install', buildCommand: 'none', outputDir: 'none' } };

      return { name: 'Node.js', buildContext: { installCommand: 'npm install', buildCommand: 'npm start', outputDir: 'none' } };
    } catch (e) {
      return { name: 'Static HTML / Unknown', buildContext: { installCommand: 'none', buildCommand: 'none', outputDir: '.' } };
    }
  }
}
