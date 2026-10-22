import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CalendarRepository } from '../../domain/repositories/calendar.repository';
import { CalendarEvent } from '../../domain/models/calendar-event.model';
import { environment } from '../../core/config/environment';
export interface AgendaItemDto {
  id: string;
  tipo: 'CURSO' | 'CLASE' | 'TUTORIA' | 'EVENTO';
  cursoId: string | null;
  titulo: string;
  cursoTitulo: string | null;
  docenteNombre: string | null;
  inicio: string;
  fin: string | null;
  url: string | null;
  estado: CalendarEvent['status'];
}
@Injectable({ providedIn: 'root' })
export class CalendarHttpRepository implements CalendarRepository {
  private readonly http = inject(HttpClient);
  getEvents(from?: string, to?: string): Observable<CalendarEvent[]> {
    const params: Record<string, string> = {};
    if (from) params['desde'] = from;
    if (to) params['hasta'] = to;
    return this.http.get<AgendaItemDto[]>(`${environment.apiUrl}/api/calendario`, { params }).pipe(
      map((items) =>
        items.map((item) => {
          const start = new Date(item.inicio);
          const time = (date: Date) =>
            date.toLocaleTimeString('es-PE', {
              timeZone: 'America/Lima',
              hour: '2-digit',
              minute: '2-digit',
              hourCycle: 'h23',
            });
          let virtualUrl: string | undefined;
          try {
            const url = new URL(item.url ?? '');
            if (['https:', 'http:'].includes(url.protocol)) virtualUrl = url.href;
          } catch {}
          return {
            id: item.id,
            day: start.toLocaleDateString('es-PE', { timeZone: 'America/Lima', weekday: 'long' }),
            date: start.toLocaleDateString('es-PE', {
              timeZone: 'America/Lima',
              day: '2-digit',
              month: 'short',
            }),
            time: time(start) + (item.fin ? ' – ' + time(new Date(item.fin)) : ''),
            title: item.titulo,
            courseTitle: item.cursoTitulo ?? '',
            teacher: item.docenteNombre ?? '',
            status: item.estado,
            virtualUrl,
            kind: item.tipo,
            courseId: item.cursoId,
            startsAt: item.inicio,
            endsAt: item.fin,
          };
        }),
      ),
    );
  }
}
