# Calendar module (Google Calendar) — Decelife25 AI Server

This module provides a minimal Google Calendar client and a repository abstraction that uses the Google Calendar REST API v3.

Features
- Authentication via service account JSON or OAuth access token (env variables supported)
- List calendars, get calendar metadata
- List events, get event, create/update/patch/delete events
- Search events with query and time range

Environment variables
- `GOOGLE_OAUTH_ACCESS_TOKEN` — optional pre-obtained OAuth2 access token
- `GOOGLE_SERVICE_ACCOUNT_JSON` — JSON string of service account key
- `GOOGLE_SERVICE_ACCOUNT_PATH` — file path to service account key
- `GOOGLE_CALENDAR_SCOPES` — default `https://www.googleapis.com/auth/calendar`

Usage example
```ts
import { CalendarRepository } from './src/calendar/CalendarRepository';
const repo = new CalendarRepository();
const calendars = await repo.listCalendars();
console.log(calendars);
```
