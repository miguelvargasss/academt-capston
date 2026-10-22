import { Observable } from 'rxjs';
import { CalendarEvent } from '../models/calendar-event.model';

export interface CalendarRepository {
  getEvents(from?: string, to?: string): Observable<CalendarEvent[]>;
}
