import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../../../core/config/environment';
import { TokenStorageService } from '../../../../../core/services/token-storage.service';
import { apiErrorMessage } from '../../../../../core/utils/api-error';
import {
  CourseWorkspace,
  CourseStudent,
} from '../../../../../domain/models/course-workspace.model';
import { CourseIconComponent } from '../../../../shared/components/course-icon/course-icon.component';
import { CourseAttendanceComponent } from './course-attendance.component';
@Component({
  selector: 'app-course-students',
  standalone: true,
  imports: [CommonModule, CourseIconComponent, CourseAttendanceComponent],
  templateUrl: './course-students.component.html',
  styleUrl: '../course-section.css',
})
export class CourseStudentsComponent {
  private readonly http = inject(HttpClient);
  private readonly destroy = inject(DestroyRef);
  readonly isAdmin = inject(TokenStorageService).isAdmin;
  readonly workspace = input.required<CourseWorkspace>();
  readonly busy = input(false);
  readonly remove = output<CourseStudent>();
  readonly changed = output<void>();
  readonly statusBusy = signal<string | null>(null);
  readonly statusError = signal<string | null>(null);
  readonly query = signal('');
  readonly canManage = computed(() => this.workspace().canManage === true);
  readonly activeCount = computed(
    () =>
      this.workspace().stats?.activeStudents ??
      this.workspace().students.filter((s) => ['ACTIVA', 'RIESGO'].includes(s.status)).length,
  );
  readonly students = computed(() =>
    this.workspace().students.filter((s) =>
      `${s.name} ${s.email}`.toLocaleLowerCase().includes(this.query().trim().toLocaleLowerCase()),
    ),
  );
  search(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
  updateStatus(student: CourseStudent, value: string): void {
    const allowed = student.status === 'ACTIVA' ? ['RIESGO', 'COMPLETADA', 'ABANDONADA']
      : student.status === 'RIESGO' ? ['ACTIVA', 'COMPLETADA', 'ABANDONADA'] : [];
    if (!this.isAdmin() || this.statusBusy() || !allowed.includes(value)) return;
    if (['COMPLETADA', 'ABANDONADA'].includes(value) &&
        !globalThis.confirm(`¿Confirmas cambiar la matrícula de ${student.name} a ${value}? Esta transición es definitiva.`)) return;
    this.statusBusy.set(student.enrollmentId);
    this.statusError.set(null);
    this.http.patch(`${environment.apiUrl}/api/matriculas/${encodeURIComponent(student.enrollmentId)}/estado`, { estado: value })
      .pipe(takeUntilDestroyed(this.destroy)).subscribe({
        next: () => { this.statusBusy.set(null); this.changed.emit(); },
        error: (error) => { this.statusBusy.set(null); this.statusError.set(apiErrorMessage(error, 'No se pudo cambiar el estado.')); this.changed.emit(); },
      });
  }
  initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }
  avatar(url: string | null | undefined): string | null {
    try {
      const u = new URL(url ?? '');
      return ['https:', 'http:'].includes(u.protocol) ? u.href : null;
    } catch {
      return null;
    }
  }
  readonly statusLabels = {
    ACTIVA: 'Activo',
    RIESGO: 'En seguimiento',
    COMPLETADA: 'Completado',
    ABANDONADA: 'Retirado',
  };
}
