import { limaToday, mondayOf, shiftDate } from './academic-date';
import { courseTimestamp } from './course-date';

describe('Fechas académicas en Lima', () => {
  afterEach(() => vi.useRealTimers());
  it('mantiene el día de Lima cerca de medianoche UTC', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-22T02:30:00Z'));
    expect(limaToday()).toBe('2026-10-21');
  });
  it.each([['2026-12-31', 1, '2027-01-01'], ['2028-02-28', 1, '2028-02-29'], ['2026-03-01', -1, '2026-02-28']])('desplaza fechas sin depender de la zona del equipo (%s)', (date, days, expected) => {
    expect(shiftDate(date as string, days as number)).toBe(expected);
  });
  it.each(['2026-10-19', '2026-10-21', '2026-10-25'])('encuentra el lunes de la semana (%s)', date => {
    expect(mondayOf(date)).toBe('2026-10-19');
  });
  it('interpreta LocalDateTime de la API como UTC-5 y respeta offsets explícitos', () => {
    expect(courseTimestamp('2026-10-21T19:00:00')).toBe(Date.parse('2026-10-22T00:00:00Z'));
    expect(courseTimestamp('2026-10-21T19:00:00Z')).toBe(Date.parse('2026-10-21T19:00:00Z'));
    expect(courseTimestamp('2026-10-21T19:00:00+02:00')).toBe(Date.parse('2026-10-21T17:00:00Z'));
    expect(Number.isNaN(courseTimestamp(null))).toBe(true);
  });
});
