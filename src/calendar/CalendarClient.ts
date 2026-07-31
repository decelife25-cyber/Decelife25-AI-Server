import fs from 'fs/promises';
import crypto from 'crypto';
import type { CalendarClientOptions, CalendarListEntry, CalendarEvent, EventQueryOptions } from './types';

const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export class CalendarClient {
  private options: CalendarClientOptions;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(options: CalendarClientOptions = {}) {
    this.options = options;
  }

  private async loadServiceAccountJSON() {
    if (this.options.serviceAccountJson) return JSON.parse(this.options.serviceAccountJson);
    if (this.options.serviceAccountPath) {
      const content = await fs.readFile(this.options.serviceAccountPath, 'utf-8');
      return JSON.parse(content);
    }
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    if (process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
      const content = await fs.readFile(process.env.GOOGLE_SERVICE_ACCOUNT_PATH, 'utf-8');
      return JSON.parse(content);
    }
    throw new Error('No service account credentials found');
  }

  private async getAccessToken(): Promise<string> {
    const envToken = this.options.accessToken || process.env.GOOGLE_OAUTH_ACCESS_TOKEN || process.env.GOOGLE_ACCESS_TOKEN;
    if (envToken) return envToken;
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt - 60_000) return this.cachedToken.token;

    const sa = await this.loadServiceAccountJSON();
    if (!sa.private_key || !sa.client_email) throw new Error('Invalid service account JSON');

    const scopes = this.options.scopes || process.env.GOOGLE_CALENDAR_SCOPES || 'https://www.googleapis.com/auth/calendar';
    const scopeStr = Array.isArray(scopes) ? scopes.join(' ') : scopes;

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload: any = { iss: sa.client_email, scope: scopeStr, aud: GOOGLE_OAUTH_TOKEN_URL, exp, iat };

    const base64url = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const signingInput = `${base64url(header)}.${base64url(payload)}`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signingInput);
    sign.end();
    const signature = sign.sign(sa.private_key, 'base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const jwt = `${signingInput}.${signature}`;

    const params = new URLSearchParams();
    params.set('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
    params.set('assertion', jwt);

    const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
    if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
    const body = await res.json();
    if (!body.access_token) throw new Error('No access_token in token response');
    const token = body.access_token as string;
    const expiresIn = Number(body.expires_in || 3600);
    this.cachedToken = { token, expiresAt: Date.now() + expiresIn * 1000 };
    return token;
  }

  private async request(path: string, opts: { method?: string; query?: Record<string, string | number | boolean>; headers?: Record<string, string>; body?: any; rawResponse?: boolean } = {}) {
    const token = await this.getAccessToken();
    const url = new URL(path.startsWith('http') ? path : `${CALENDAR_API_BASE}${path}`);
    if (opts.query) Object.entries(opts.query).forEach(([k, v]) => { if (v !== undefined && v !== null) url.searchParams.set(k, String(v)); });
    const headers: Record<string, string> = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers };
    const res = await fetch(url.toString(), { method: opts.method || 'GET', headers, body: opts.body });
    if (opts.rawResponse) return res;
    const text = await res.text();
    try { return JSON.parse(text || '{}'); } catch { return text; }
  }

  // Calendars list
  async listCalendars(): Promise<{ items: CalendarListEntry[] }> {
    return this.request('/users/me/calendarList');
  }

  async getCalendar(calendarId: string): Promise<CalendarListEntry> {
    return this.request(`/calendars/${encodeURIComponent(calendarId)}`);
  }

  // Events
  async listEvents(calendarId: string, opts: EventQueryOptions = {}): Promise<{ items: CalendarEvent[] }> {
    return this.request(`/calendars/${encodeURIComponent(calendarId)}/events`, { query: { q: opts.q, timeMin: opts.timeMin, timeMax: opts.timeMax, maxResults: opts.maxResults } });
  }

  async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent> {
    return this.request(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`);
  }

  async createEvent(calendarId: string, event: CalendarEvent): Promise<CalendarEvent> {
    return this.request(`/calendars/${encodeURIComponent(calendarId)}/events`, { method: 'POST', body: JSON.stringify(event) });
  }

  async updateEvent(calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    return this.request(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: 'PUT', body: JSON.stringify(event) });
  }

  async patchEvent(calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    return this.request(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: 'PATCH', body: JSON.stringify(event) });
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    const res = await this.request(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: 'DELETE', rawResponse: true });
    if (![200, 204].includes(res.status)) { const t = await res.text(); throw new Error(`Delete event failed: ${res.status} ${t}`); }
  }

  // Search events by query (uses events.list q param)
  async searchEvents(calendarId: string, q: string, opts: EventQueryOptions = {}): Promise<{ items: CalendarEvent[] }> {
    return this.listEvents(calendarId, { ...opts, q });
  }
}
