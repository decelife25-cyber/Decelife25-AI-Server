import { BaseService, Logger, ConfigProvider, NoopLogger } from '../core';
import type { GitHubAuth, RepoInfo, BranchInfo, FileContent, CreateFileOptions, UpdateFileOptions, CommitOptions } from './types';

const API_BASE = 'https://api.github.com';

function ensureFetch(): typeof fetch {
  const f = (globalThis as any).fetch;
  if (!f) throw new Error('Global fetch is not available in this runtime');
  return f.bind(globalThis) as typeof fetch;
}

function toBase64(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64');
}

function fromBase64(input: string): string {
  return Buffer.from(input, 'base64').toString('utf8');
}

export class GitHubClient extends BaseService {
  private token?: string;
  private readonly logger: Logger;
  private readonly config: ConfigProvider;

  constructor(options: { logger?: Logger; config: ConfigProvider }) {
    super({ logger: options.logger ?? new NoopLogger(), config: options.config });
    this.logger = options.logger ?? new NoopLogger();
    this.config = options.config;
  }

  authenticate(auth: GitHubAuth) {
    this.token = auth.token;
  }

  private getAuthHeader(): Record<string, string> {
    if (!this.token) throw new Error('GitHub client not authenticated (no token)');
    return { Authorization: `token ${this.token}` };
  }

  private async request(path: string, init: RequestInit = {}) {
    const fetch = ensureFetch();
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      ...(init.headers as Record<string, string> || {}),
    };
    if (this.token) Object.assign(headers, this.getAuthHeader());

    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    this.logger.debug(`GitHubClient request: ${init.method ?? 'GET'} ${url}`);
    const res = await fetch(url, { ...init, headers });
    const text = await res.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch (e) {
      body = text;
    }

    if (!res.ok) {
      const msg = `GitHub API error ${res.status} ${res.statusText}`;
      this.logger.error(msg, { status: res.status, path, body });
      const err: any = new Error(msg);
      err.status = res.status;
      err.body = body;
      throw err;
    }

    return body;
  }

  async getRepo(owner: string, repo: string): Promise<RepoInfo> {
    return this.request(`/repos/${owner}/${repo}`) as Promise<RepoInfo>;
  }

  async listBranches(owner: string, repo: string): Promise<BranchInfo[]> {
    return this.request(`/repos/${owner}/${repo}/branches`) as Promise<BranchInfo[]>;
  }

  async getBranch(owner: string, repo: string, branch: string): Promise<BranchInfo> {
    return this.request(`/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`) as Promise<BranchInfo>;
  }

  async getFile(owner: string, repo: string, path: string, ref?: string): Promise<FileContent> {
    const q = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    return this.request(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}${q}`) as Promise<FileContent>;
  }

  async createOrUpdateFile(owner: string, repo: string, path: string, options: CreateFileOptions | UpdateFileOptions): Promise<any> {
    const body: any = {
      message: options.message,
      content: toBase64(options.content),
    };
    if (options.branch) body.branch = options.branch;
    if ((options as UpdateFileOptions).sha) body.sha = (options as UpdateFileOptions).sha;
    if (options.committer) body.committer = options.committer;

    return this.request(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  async createBranch(owner: string, repo: string, newBranch: string, fromBranch = 'main'): Promise<{ ref: string; sha: string }> {
    // get ref of fromBranch
    const ref = await this.request(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(fromBranch)}`) as any;
    const sha = ref.object?.sha ?? ref.sha ?? (ref.commit && ref.commit.sha);
    const created = await this.request(`/repos/${owner}/${repo}/git/refs`, { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha }) });
    return created as { ref: string; sha: string };
  }

  async createPullRequest(owner: string, repo: string, title: string, head: string, base = 'main', body?: string): Promise<any> {
    const payload: any = { title, head, base };
    if (body) payload.body = body;
    return this.request(`/repos/${owner}/${repo}/pulls`, { method: 'POST', body: JSON.stringify(payload) });
  }

  // Lower-level git operations: create blob, create tree, create commit, update ref
  async createBlob(owner: string, repo: string, content: string, encoding: 'utf-8' | 'base64' = 'base64') {
    const payload = { content: encoding === 'utf-8' ? toBase64(content) : content, encoding: 'base64' };
    return this.request(`/repos/${owner}/${repo}/git/blobs`, { method: 'POST', body: JSON.stringify(payload) });
  }

  async createTree(owner: string, repo: string, tree: Array<any>, base_tree?: string) {
    const payload: any = { tree };
    if (base_tree) payload.base_tree = base_tree;
    return this.request(`/repos/${owner}/${repo}/git/trees`, { method: 'POST', body: JSON.stringify(payload) });
  }

  async createCommit(owner: string, repo: string, message: string, treeSha: string, parents: string[]) {
    const payload = { message, tree: treeSha, parents };
    return this.request(`/repos/${owner}/${repo}/git/commits`, { method: 'POST', body: JSON.stringify(payload) });
  }

  async updateRef(owner: string, repo: string, branch: string, sha: string, force = false) {
    return this.request(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, { method: 'PATCH', body: JSON.stringify({ sha, force }) });
  }

  // Helper: commit multiple files via Git Data API (creates blobs, tree, commit and updates ref)
  async commitFiles(owner: string, repo: string, options: CommitOptions): Promise<any> {
    const { branch, message, files } = options;
    // get branch commit sha
    const ref = await this.request(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`) as any;
    const baseSha = ref.object?.sha ?? ref.sha ?? (ref.commit && ref.commit.sha);

    // get tree sha of base commit
    const baseCommit = await this.request(`/repos/${owner}/${repo}/git/commits/${baseSha}`) as any;
    const baseTree = baseCommit.tree.sha;

    // create blobs
    const blobs = await Promise.all(files.map(async (f) => {
      const blob = await this.createBlob(owner, repo, f.content, 'utf-8');
      return { path: f.path, sha: blob.sha };
    }));

    const tree = blobs.map(b => ({ path: b.path, mode: '100644', type: 'blob', sha: b.sha }));

    // create tree
    const createdTree = await this.createTree(owner, repo, tree, baseTree) as any;

    // create commit
    const createdCommit = await this.createCommit(owner, repo, message, createdTree.sha, [baseSha]) as any;

    // update ref
    await this.updateRef(owner, repo, branch, createdCommit.sha, false);

    return createdCommit;
  }
}
