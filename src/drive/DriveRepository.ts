import type { DriveClientOptions, DriveFile } from './types';
import { DriveClient } from './DriveClient';

export class DriveRepository {
  private client: DriveClient;

  constructor(opts?: DriveClientOptions) {
    this.client = new DriveClient(opts || {});
  }

  async getFileMetadataById(fileId: string) {
    return this.client.getFileMetadata(fileId, 'id,name,mimeType,parents,modifiedTime,size');
  }

  async downloadFileById(fileId: string) {
    const ab = await this.client.downloadFile(fileId);
    return Buffer.from(ab);
  }

  async findFileByNameInFolder(name: string, folderId?: string): Promise<DriveFile | null> {
    let q = `name = '${name.replace(/'/g, "\\'")}' and trashed = false`;
    if (folderId) q += ` and '${folderId}' in parents`;
    const res = await this.client.searchFiles({ q, pageSize: 10, fields: 'files(id,name,mimeType,parents)' });
    const files = res.files || [];
    return files.length ? (files[0] as DriveFile) : null;
  }

  async uploadFile(name: string, content: Buffer | ArrayBuffer | Uint8Array, mimeType?: string, parentId?: string) {
    const parents = parentId ? [parentId] : undefined;
    const res = await this.client.uploadFile(name, content, mimeType || 'application/octet-stream', parents);
    return res;
  }

  async updateFile(fileId: string, name?: string, content?: Buffer | ArrayBuffer | Uint8Array, mimeType?: string, parentId?: string) {
    const parents = parentId ? [parentId] : undefined;
    const res = await this.client.updateFile(fileId, name, content, mimeType, parents);
    return res;
  }

  async deleteFile(fileId: string) {
    return this.client.deleteFile(fileId);
  }

  async searchByName(name: string) {
    const q = `name contains '${name.replace(/'/g, "\\'")}' and trashed = false`;
    const res = await this.client.searchFiles({ q, pageSize: 100, fields: 'files(id,name,mimeType,parents)' });
    return res.files || [];
  }

  async createFolder(name: string, parentId?: string) {
    return this.client.createFolder(name, parentId);
  }

  async listFolder(folderId: string) {
    const res = await this.client.listFolderChildren(folderId, 100);
    return res.files || [];
  }
}
