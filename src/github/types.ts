import { Logger } from '../core';

export interface GitHubAuth {
  token: string;
}

export interface RepoInfo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
}

export interface BranchInfo {
  name: string;
  commit: { sha: string };
}

export interface FileContent {
  type: string;
  encoding: string;
  size: number;
  name: string;
  path: string;
  content: string; // base64
  sha: string;
  url: string;
}

export interface CreateFileOptions {
  message: string;
  content: string; // raw text, will be base64 encoded by client
  branch?: string;
  committer?: { name: string; email: string };
}

export interface UpdateFileOptions extends CreateFileOptions {
  sha: string;
}

export interface CommitOptions {
  message: string;
  files: Array<{ path: string; content: string }>; // raw content
  branch: string;
}
