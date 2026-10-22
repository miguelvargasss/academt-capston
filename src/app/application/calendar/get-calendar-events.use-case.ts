import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CALENDAR_REPOSITORY } from '../../core/tokens/repository.tokens';
import { CalendarEvent } from '../../domain/models/calendar-event.model';

@Injectable({
  providedIn: 'root',
})
export class GetCalendarEventsUseCase {
  private readonly calendarRepository = inject(CALENDAR_REPOSITORY);

  execute(from?: string, to?: string): Observable<CalendarEvent[]> {
    return this.calendarRepository.getEvents(from, to);
  }
}
