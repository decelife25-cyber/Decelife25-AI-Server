import type { CalendarClientOptions, CalendarListEntry, CalendarEvent, EventQueryOptions } from './types';
import { CalendarClient } from './CalendarClient';

export class CalendarRepository {
  private client: CalendarClient;

  constructor(opts?: CalendarClientOptions) {
    this.client = new CalendarClient(opts || {});
  }

  async listCalendars() {
    const res = await this.client.listCalendars();
    return res.items || [] as CalendarListEntry[];
  }

  async getCalendar(calendarId: string) {
    return this.client.getCalendar(calendarId);
  }

  async listEvents(calendarId: string, opts?: EventQueryOptions) {
    const res = await this.client.listEvents(calendarId, opts || {});
    return res.items || [] as CalendarEvent[];
  }

  async getEvent(calendarId: string, eventId: string) {
    return this.client.getEvent(calendarId, eventId);
  }

  async createEvent(calendarId: string, event: CalendarEvent) {
    return this.client.createEvent(calendarId, event);
  }

  async updateEvent(calendarId: string, eventId: string, event: Partial<CalendarEvent>) {
    return this.client.updateEvent(calendarId, eventId, event);
  }

  async patchEvent(calendarId: string, eventId: string, event: Partial<CalendarEvent>) {
    return this.client.patchEvent(calendarId, eventId, event);
  }

  async deleteEvent(calendarId: string, eventId: string) {
    return this.client.deleteEvent(calendarId, eventId);
  }

  async searchEvents(calendarId: string, q: string, opts?: EventQueryOptions) {
    const res = await this.client.searchEvents(calendarId, q, opts || {});
    return res.items || [] as CalendarEvent[];
  }
}
