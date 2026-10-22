import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, startWith, switchMap } from 'rxjs';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { GetCalendarEventsUseCase } from '../../../application/calendar/get-calendar-events.use-case';
import { CalendarEvent } from '../../../domain/models/calendar-event.model';
import { limaToday, mondayOf, shiftDate } from '../../../core/utils/academic-date';
import { apiErrorMessage } from '../../../core/utils/api-error';
@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, BadgeComponent, RouterLink],
  templateUrl: './calendar.component.html',
})
export class CalendarComponent {
  private readonly useCase = inject(GetCalendarEventsUseCase);
  private readonly reload$ = new Subject<void>();
  readonly from = signal(mondayOf(limaToday()));
  readonly to = computed(() => shiftDate(this.from(), 6));
  readonly events = signal<CalendarEvent[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly labels: Record<CalendarEvent['status'], string> = {
    CONFIRMADA: 'Confirmada',
    EN_VIVO: 'En curso',
    PROXIMA: 'Próxima',
    PROGRAMADA: 'Programada',
    EN_CURSO: 'En curso',
    FINALIZADA: 'Finalizada',
    PENDIENTE: 'Por confirmar',
    COMPLETADA: 'Completada',
  };
  readonly kindLabels = {
    CURSO: 'Clase del curso',
    CLASE: 'Clase',
    TUTORIA: 'Tutoría',
    EVENTO: 'Evento',
  };
  constructor() {
    this.reload$
      .pipe(
        startWith(undefined),
        switchMap(() => {
          this.loading.set(true);
          this.error.set(null);
          return this.useCase.execute(this.from(), this.to()).pipe(
            catchError((e) => {
              this.error.set(apiErrorMessage(e, 'No se pudo cargar tu horario.'));
              return of([]);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((events) => {
        this.events.set(events);
        this.loading.set(false);
      });
  }
  refresh(): void {
    this.reload$.next();
  }
  move(days: number): void {
    this.from.update((value) => shiftDate(value, days));
    this.refresh();
  }
  today(): void {
    this.from.set(mondayOf(limaToday()));
    this.refresh();
  }
  choose(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      this.from.set(mondayOf(value));
      this.refresh();
    }
  }
}
