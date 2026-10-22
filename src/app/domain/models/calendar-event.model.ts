export interface CalendarEvent {
  id: string;
  day: string;
  date: string;
  time: string;
  title: string;
  courseTitle: string;
  teacher: string;
  status:
    | 'CONFIRMADA'
    | 'EN_VIVO'
    | 'PROXIMA'
    | 'PROGRAMADA'
    | 'EN_CURSO'
    | 'FINALIZADA'
    | 'PENDIENTE'
    | 'COMPLETADA';
  kind?: 'CURSO' | 'CLASE' | 'TUTORIA' | 'EVENTO';
  courseId?: string | null;
  startsAt?: string;
  endsAt?: string | null;
  virtualUrl?: string;
}
