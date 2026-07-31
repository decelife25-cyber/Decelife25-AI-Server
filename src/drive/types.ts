export interface DriveClientOptions {
  /** OAuth access token if available */
  accessToken?: string;
  /** Scope(s) to request when using service account */
  scopes?: string | string[];
  /** Path to service account JSON file or JSON string */
  serviceAccountPath?: string;
  serviceAccountJson?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType?: string;
  parents?: string[];
  [key: string]: any;
}

export interface UploadResult {
  id: string;
  name: string;
  mimeType?: string;
}

export interface SearchOptions {
  q?: string;
  pageSize?: number;
  fields?: string;
}
