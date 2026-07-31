import { GitHubClient } from './github-client';
import type { CreateFileOptions, UpdateFileOptions, CommitOptions } from './types';

export class GitHubRepository {
  private client: GitHubClient;
  private owner: string;
  private repo: string;

  constructor(client: GitHubClient, owner: string, repo: string) {
    this.client = client;
    this.owner = owner;
    this.repo = repo;
  }

  async getInfo() {
    return this.client.getRepo(this.owner, this.repo);
  }

  async listBranches() {
    return this.client.listBranches(this.owner, this.repo);
  }

  async getBranch(branch: string) {
    return this.client.getBranch(this.owner, this.repo, branch);
  }

  async getFile(path: string, ref?: string) {
    return this.client.getFile(this.owner, this.repo, path, ref);
  }

  async createOrUpdateFile(path: string, options: CreateFileOptions | UpdateFileOptions) {
    return this.client.createOrUpdateFile(this.owner, this.repo, path, options as any);
  }

  async createBranch(newBranch: string, fromBranch?: string) {
    return this.client.createBranch(this.owner, this.repo, newBranch, fromBranch);
  }

  async createPullRequest(title: string, head: string, base?: string, body?: string) {
    return this.client.createPullRequest(this.owner, this.repo, title, head, base, body);
  }

  async commitFiles(options: CommitOptions) {
    return this.client.commitFiles(this.owner, this.repo, options);
  }
}
