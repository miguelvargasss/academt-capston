import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, expand, reduce } from 'rxjs';
import { environment } from '../../../../../core/config/environment';
import { apiErrorMessage } from '../../../../../core/utils/api-error';
import { CourseWorkspace } from '../../../../../domain/models/course-workspace.model';

type Status = 'PRESENTE' | 'AUSENTE' | 'TARDE' | 'JUSTIFICADO';
interface Attendance { estudianteId: string; estado: Status; }
interface Page { content: Attendance[]; number: number; last: boolean; }

@Component({
  selector: 'app-course-attendance', standalone: true, imports: [FormsModule],
  templateUrl: './course-attendance.component.html',
})
export class CourseAttendanceComponent {
  readonly workspace = input.required<CourseWorkspace>();
  private readonly http = inject(HttpClient);
  private readonly destroy = inject(DestroyRef);
  private readonly base = `${environment.apiUrl}/api/asistencias`;
  readonly classes = computed(() => this.workspace().units.flatMap((unit) =>
    unit.weeks.flatMap((week) => week.resources.filter((resource) => resource.kind === 'CLASS' && resource.startsAt))));
  readonly students = computed(() => this.workspace().students.filter((student) => student.status === 'ACTIVA' || student.status === 'RIESGO'));
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly existing = signal<Record<string, Status>>({});
  readonly selection = signal<Record<string, Status | ''>>({});
  readonly ready = signal(false);
  classId = '';

  load(): void {
    if (this.loading() || this.saving()) return;
    if (!this.classId) {
      this.ready.set(false); this.existing.set({}); this.selection.set({});
      this.error.set(null); this.notice.set(null);
      return;
    }
    const selectedClass = this.classId;
    this.loading.set(true); this.ready.set(false); this.error.set(null); this.notice.set(null);
    this.existing.set({}); this.selection.set({});
    const page = (number: number) => this.http.get<Page>(this.base, {
      params: { claseId: selectedClass, size: 200, page: number },
    });
    page(0).pipe(
      expand((result) => result.last ? EMPTY : page(result.number + 1)),
      reduce((all, result) => [...all, ...result.content], [] as Attendance[]),
      takeUntilDestroyed(this.destroy),
    ).subscribe({
      next: (records) => {
        this.existing.set(Object.fromEntries(records.map((record) => [record.estudianteId, record.estado])));
        this.loading.set(false); this.ready.set(true);
      },
      error: (error) => { this.error.set(apiErrorMessage(error, 'No se pudieron cargar las asistencias.')); this.loading.set(false); },
    });
  }

  setStatus(id: string, value: string): void {
    if (!['', 'PRESENTE', 'AUSENTE', 'TARDE', 'JUSTIFICADO'].includes(value)) return;
    this.selection.update((items) => ({ ...items, [id]: value as Status | '' }));
  }

  save(): void {
    if (!this.ready() || this.loading() || this.saving()) return;
    const registros = this.students().filter((student) => !this.existing()[student.id] && this.selection()[student.id])
      .map((student) => ({ estudianteId: student.id, estado: this.selection()[student.id], observacion: null }));
    if (!registros.length) { this.error.set('Selecciona al menos una asistencia.'); return; }
    this.saving.set(true); this.error.set(null); this.notice.set(null);
    this.http.post(`${this.base}/masivo`, { claseId: this.classId, registros })
      .pipe(takeUntilDestroyed(this.destroy)).subscribe({
        next: () => { this.saving.set(false); this.load(); this.notice.set('Las asistencias se registraron.'); },
        error: (error) => { this.saving.set(false); this.error.set(apiErrorMessage(error, 'No se pudo confirmar el registro. Actualiza la lista antes de reintentar.')); },
      });
  }
}
