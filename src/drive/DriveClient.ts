import fs from 'fs/promises';
import crypto from 'crypto';

import type { DriveClientOptions, DriveFile, UploadResult, SearchOptions } from './types';

const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

export class DriveClient {
  private options: DriveClientOptions;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(options: DriveClientOptions = {}) {
    this.options = options;
  }

  private async loadServiceAccountJSON() {
    if (this.options.serviceAccountJson) {
      return JSON.parse(this.options.serviceAccountJson);
    }
    if (this.options.serviceAccountPath) {
      const content = await fs.readFile(this.options.serviceAccountPath, { encoding: 'utf-8' });
      return JSON.parse(content);
    }
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    }
    if (process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
      const content = await fs.readFile(process.env.GOOGLE_SERVICE_ACCOUNT_PATH, { encoding: 'utf-8' });
      return JSON.parse(content);
    }
    throw new Error('No service account credentials found.');
  }

  private async getAccessToken(): Promise<string> {
    const envToken = this.options.accessToken || process.env.GOOGLE_OAUTH_ACCESS_TOKEN || process.env.GOOGLE_ACCESS_TOKEN;
    if (envToken) return envToken;

    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt - 60_000) {
      return this.cachedToken.token;
    }

    const sa = await this.loadServiceAccountJSON();
    if (!sa.private_key || !sa.client_email) {
      throw new Error('Invalid service account JSON: missing private_key or client_email.');
    }

    const scopes = this.options.scopes || process.env.GOOGLE_DRIVE_SCOPES || 'https://www.googleapis.com/auth/drive';
    const scopeStr = Array.isArray(scopes) ? scopes.join(' ') : scopes;

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;

    const header = { alg: 'RS256', typ: 'JWT' };
    const payload: any = {
      iss: sa.client_email,
      scope: scopeStr,
      aud: GOOGLE_OAUTH_TOKEN_URL,
      exp,
      iat,
    };

    const base64url = (obj: any) =>
      Buffer.from(JSON.stringify(obj))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const signingInput = `${base64url(header)}.${base64url(payload)}`;

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signingInput);
    sign.end();
    const signature = sign.sign(sa.private_key, 'base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const jwt = `${signingInput}.${signature}`;

    const params = new URLSearchParams();
    params.set('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
    params.set('assertion', jwt);

    const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Unable to obtain access token: ${res.status} ${text}`);
    }

    const body = await res.json();
    if (!body.access_token) throw new Error('No access_token in token response');

    const token = body.access_token as string;
    const expiresIn = Number(body.expires_in || 3600);
    this.cachedToken = { token, expiresAt: Date.now() + expiresIn * 1000 };
    return token;
  }

  private async request(path: string, opts: { method?: string; query?: Record<string, string | number | boolean>; headers?: Record<string, string>; body?: any; rawResponse?: boolean } = {}) {
    const token = await this.getAccessToken();
    const url = new URL(path.startsWith('http') ? path : `${DRIVE_API_BASE}${path}`);
    if (opts.query) {
      Object.entries(opts.query).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      });
    }
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      ...opts.headers,
    };
    let body = opts.body;
    const res = await fetch(url.toString(), {
      method: opts.method || 'GET',
      headers,
      body,
    });
    if (opts.rawResponse) return res;
    const text = await res.text();
    try {
      return JSON.parse(text || '{}');
    } catch {
      return text;
    }
  }

  async getFileMetadata(fileId: string, fields = '*') {
    const res = await this.request(`/files/${encodeURIComponent(fileId)}`, { query: { fields } });
    return res as DriveFile;
  }

  async downloadFile(fileId: string) {
    const res = await this.request(`${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?alt=media`, { rawResponse: true });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Download failed: ${res.status} ${t}`);
    }
    const ab = await res.arrayBuffer();
    return ab;
  }

  async uploadFile(name: string, content: Buffer | ArrayBuffer | Uint8Array, mimeType = 'application/octet-stream', parents?: string[]) {
    const metadata = { name, mimeType, parents } as any;
    const boundary = '-------DecelifeDriveUpload' + Date.now();
    const delimiter = `--${boundary}`;
    const closeDelimiter = `--${boundary}--`;

    const metaPart = Buffer.from(
      [
        delimiter,
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify(metadata),
      ].join('\r\n') + '\r\n'
    );

    const dataPartHeader = Buffer.from(
      [
        delimiter,
        `Content-Type: ${mimeType}`,
        '',
      ].join('\r\n')
    );

    const close = Buffer.from('\r\n' + closeDelimiter + '\r\n');

    const bufferContent = Buffer.isBuffer(content) ? content : Buffer.from(content as any);

    const body = Buffer.concat([metaPart, dataPartHeader, bufferContent, close]);

    const res = await this.request(`${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(body.length),
      },
      body,
    });

    return { id: res.id, name: res.name, mimeType: res.mimeType } as UploadResult;
  }

  async updateFile(fileId: string, name?: string, content?: Buffer | ArrayBuffer | Uint8Array, mimeType?: string, parents?: string[]) {
    const metadata: any = {};
    if (name) metadata.name = name;
    if (parents) metadata.parents = parents;
    if (mimeType) metadata.mimeType = mimeType;

    if (content) {
      const boundary = '-------DecelifeDriveUpload' + Date.now();
      const delimiter = `--${boundary}`;
      const closeDelimiter = `--${boundary}--`;

      const metaPart = Buffer.from(
        [
          delimiter,
          'Content-Type: application/json; charset=UTF-8',
          '',
          JSON.stringify(metadata),
        ].join('\r\n') + '\r\n'
      );

      const dataPartHeader = Buffer.from(
        [
          delimiter,
          `Content-Type: ${mimeType || 'application/octet-stream'}`,
          '',
        ].join('\r\n')
      );

      const close = Buffer.from('\r\n' + closeDelimiter + '\r\n');
      const bufferContent = Buffer.isBuffer(content) ? content : Buffer.from(content as any);

      const body = Buffer.concat([metaPart, dataPartHeader, bufferContent, close]);

      const res = await this.request(`${DRIVE_UPLOAD_BASE}/files/${encodeURIComponent(fileId)}?uploadType=multipart`, {
        method: 'PATCH',
        headers: {
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': String(body.length),
        },
        body,
      });

      return { id: res.id, name: res.name, mimeType: res.mimeType } as UploadResult;
    } else {
      const res = await this.request(`/files/${encodeURIComponent(fileId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
      });
      return { id: res.id, name: res.name, mimeType: res.mimeType } as UploadResult;
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    const res = await this.request(`/files/${encodeURIComponent(fileId)}`, { method: 'DELETE', rawResponse: true });
    if (![200, 204].includes(res.status)) {
      const t = await res.text();
      throw new Error(`Delete failed: ${res.status} ${t}`);
    }
  }

  async createFolder(name: string, parentId?: string) {
    const body = { name, mimeType: 'application/vnd.google-apps.folder', parents: parentId ? [parentId] : undefined } as any;
    const res = await this.request('/files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return res as DriveFile;
  }

  async searchFiles(opts: SearchOptions = {}) {
    const q = opts.q;
    const fields = opts.fields || 'nextPageToken, files(id, name, mimeType, parents)';
    const res = await this.request('/files', { query: { q, pageSize: opts.pageSize || 100, fields } });
    return res as any;
  }

  async listFolderChildren(folderId: string, pageSize = 100) {
    const q = `'${folderId}' in parents and trashed = false`;
    return this.searchFiles({ q, pageSize });
  }
}
