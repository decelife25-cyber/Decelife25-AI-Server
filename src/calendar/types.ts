export interface CalendarClientOptions {
  accessToken?: string;
  scopes?: string | string[];
  serviceAccountPath?: string;
  serviceAccountJson?: string;
}

export interface CalendarListEntry {
  id: string;
  summary?: string;
  description?: string;
  timeZone?: string;
  [key: string]: any;
}

export interface CalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  attendees?: Array<{ email?: string; displayName?: string; [key: string]: any }>;
  [key: string]: any;
}

export interface EventQueryOptions {
  q?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
}
