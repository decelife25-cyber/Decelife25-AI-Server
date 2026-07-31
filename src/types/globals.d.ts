// Global ambient types to satisfy usage of fetch, Headers, RequestInit, Response, FormData in Node environment
// These are intentionally permissive (any) to allow the project to compile without external DOM lib types.

declare global {
  var fetch: any;
  interface Headers {
    [key: string]: any;
  }
  interface RequestInit {
    method?: string;
    headers?: any;
    body?: any;
  }
  interface Response {
    ok: boolean;
    status: number;
    statusText: string;
    json: () => Promise<any>;
    text: () => Promise<string>;
    arrayBuffer: () => Promise<ArrayBuffer>;
  }
  var FormData: any;
  var URLSearchParams: any;
}

export {};
