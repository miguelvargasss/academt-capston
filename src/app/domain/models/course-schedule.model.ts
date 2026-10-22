export type Weekday =
  'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export interface WeeklySlot {
  day: Weekday | '';
  startTime: string;
  endTime: string;
}
export interface CourseSchedulePlan {
  startsOn: string | null;
  endsOn: string | null;
  slots: WeeklySlot[];
}
export const WEEKDAYS: { id: Weekday; label: string }[] = [
  { id: 'MONDAY', label: 'Lunes' },
  { id: 'TUESDAY', label: 'Martes' },
  { id: 'WEDNESDAY', label: 'Miércoles' },
  { id: 'THURSDAY', label: 'Jueves' },
  { id: 'FRIDAY', label: 'Viernes' },
  { id: 'SATURDAY', label: 'Sábado' },
  { id: 'SUNDAY', label: 'Domingo' },
];
export function scheduleError(slots: WeeklySlot[]): string | null {
  if (!slots.length) return 'Añade al menos una sesión semanal.';
  if (slots.length > 21) return 'Puedes programar hasta 21 franjas semanales.';
  for (const slot of slots) {
    if (
      !WEEKDAYS.some((d) => d.id === slot.day) ||
      !/^\d{2}:\d{2}$/.test(slot.startTime) ||
      !/^\d{2}:\d{2}$/.test(slot.endTime)
    )
      return 'Selecciona el día y las horas de inicio y fin de cada sesión.';
    if (
      slot.startTime >= '24:00' ||
      slot.endTime >= '24:00' ||
      slot.startTime.slice(3) > '59' ||
      slot.endTime.slice(3) > '59'
    )
      return 'Revisa las horas de las sesiones.';
    if (slot.endTime <= slot.startTime)
      return 'La hora de fin debe ser posterior a la de inicio en el mismo día.';
  }
  const sorted = [...slots].sort(
    (a, b) => a.day.localeCompare(b.day) || a.startTime.localeCompare(b.startTime),
  );
  if (
    sorted.some(
      (s, i) => i > 0 && s.day === sorted[i - 1].day && s.startTime < sorted[i - 1].endTime,
    )
  )
    return 'Las sesiones del mismo día no pueden superponerse.';
  return null;
}
