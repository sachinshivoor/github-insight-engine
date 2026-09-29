// GitHub REST API service

import { store } from './store.js';

class GitHubAPI {
  constructor() {
    this.baseUrl = 'https://api.github.com';
  }

  _getHeaders() {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
    };
    if (store.githubToken) {
      headers['Authorization'] = `Bearer ${store.githubToken}`;
    }
    return headers;
  }

  async _fetch(url, extraHeaders = {}) {
    const response = await fetch(url, {
      headers: { ...this._getHeaders(), ...extraHeaders },
    });

    if (response.status === 403) {
      const remaining = response.headers.get('X-RateLimit-Remaining');
      if (remaining === '0') {
        const reset = response.headers.get('X-RateLimit-Reset');
        const resetTime = new Date(parseInt(reset) * 1000).toLocaleTimeString();
        throw new Error(`GitHub API rate limit exceeded. Resets at ${resetTime}. Add a GitHub token in Settings for higher limits.`);
      }
      throw new Error('GitHub API access forbidden. Check your token permissions.');
    }

    if (response.status === 404) {
      throw new Error('Repository not found. Check the URL and ensure it is public.');
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async _restFetch(path, extraHeaders = {}) {
    return this._fetch(`${this.baseUrl}${path}`, extraHeaders);
  }

  parseRepoUrl(url) {
    url = url.trim();
    // Handle formats: https://github.com/owner/repo, github.com/owner/repo, owner/repo
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/\s?#]+)/,
      /^([^\/\s]+)\/([^\/\s]+)$/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, ''),
        };
      }
    }
    throw new Error('Invalid GitHub repository URL. Use format: https://github.com/owner/repo');
  }

  async getRepo(owner, repo) {
    return this._restFetch(`/repos/${owner}/${repo}`);
  }

  async getLanguages(owner, repo) {
    return this._restFetch(`/repos/${owner}/${repo}/languages`);
  }

  async getContributors(owner, repo) {
    try {
      return await this._restFetch(`/repos/${owner}/${repo}/contributors?per_page=10&anon=0`);
    } catch {
      return [];
    }
  }

  async getCommits(owner, repo, perPage = 30) {
    try {
      return await this._restFetch(`/repos/${owner}/${repo}/commits?per_page=${perPage}`);
    } catch {
      return [];
    }
  }

  async getCommitActivity(owner, repo) {
    try {
      const data = await this._restFetch(`/repos/${owner}/${repo}/stats/commit_activity`);
      // This endpoint sometimes returns 202 (computing), retry once after delay
      if (!Array.isArray(data)) {
        await new Promise(r => setTimeout(r, 2000));
        const retry = await this._restFetch(`/repos/${owner}/${repo}/stats/commit_activity`);
        return Array.isArray(retry) ? retry : [];
      }
      return data;
    } catch {
      return [];
    }
  }

  async getContributorStats(owner, repo) {
    try {
      const data = await this._restFetch(`/repos/${owner}/${repo}/stats/contributors`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async getFileTree(owner, repo, branch = 'main') {
    try {
      const data = await this._restFetch(`/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
      return data.tree || [];
    } catch {
      try {
        // Try master branch
        const data = await this._restFetch(`/repos/${owner}/${repo}/git/trees/master?recursive=1`);
        return data.tree || [];
      } catch {
        return [];
      }
    }
  }

  async getReadme(owner, repo) {
    try {
      const data = await this._restFetch(`/repos/${owner}/${repo}/readme`);
      if (data.content) {
        return atob(data.content.replace(/\n/g, ''));
      }
      return '';
    } catch {
      return '';
    }
  }

  async getTopics(owner, repo) {
    try {
      const data = await this._restFetch(`/repos/${owner}/${repo}/topics`, {
        'Accept': 'application/vnd.github.mercy-preview+json',
      });
      return data.names || [];
    } catch {
      return [];
    }
  }

  async getRateLimit() {
    try {
      return await this._restFetch('/rate_limit');
    } catch {
      return null;
    }
  }
}

export const githubAPI = new GitHubAPI();
