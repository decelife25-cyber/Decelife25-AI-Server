# Drive module (Google Drive) — Decelife25 AI Server

This module provides a minimal Google Drive client and a repository abstraction that uses the Drive REST API v3.

Features
- Authentication:
  - By OAuth access token (env: `GOOGLE_OAUTH_ACCESS_TOKEN` or via DriveClientOptions.accessToken)
  - By Service Account JSON (env: `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_SERVICE_ACCOUNT_PATH` or via DriveClientOptions.serviceAccountJson / serviceAccountPath)
- Read file metadata
- Download file content
- Upload (multipart) and update (multipart)
- Delete files
- Search files (by name, folder, using Drive query)
- Create folders
- List folder children

Important environment variables
- `GOOGLE_OAUTH_ACCESS_TOKEN` — optional: pre-obtained OAuth2 access token
- `GOOGLE_SERVICE_ACCOUNT_JSON` — JSON string content of a service account key
- `GOOGLE_SERVICE_ACCOUNT_PATH` — path to a service account JSON key file
- `GOOGLE_DRIVE_SCOPES` — optional, default: `https://www.googleapis.com/auth/drive`

Scopes
- For full control: `https://www.googleapis.com/auth/drive`
- For file-level access: `https://www.googleapis.com/auth/drive.file`
- For read-only: `https://www.googleapis.com/auth/drive.readonly`

Usage example
```ts
import { DriveRepository } from './src/drive/DriveRepository';

const repo = new DriveRepository(); // will use env/service account or token
// upload
await repo.uploadFile('hello.txt', Buffer.from('hello world'), 'text/plain');
// search
const found = await repo.searchByName('hello.txt');
// download
if (found.length) {
  const buf = await repo.downloadFileById(found[0].id);
  console.log(buf.toString());
}
```

Notes
- Upload method uses multipart upload suitable for small-to-medium files. For very large files consider implementing resumable uploads (not included here).
- This module minimizes external dependencies to remain aligned with the project's CORE constraints.
