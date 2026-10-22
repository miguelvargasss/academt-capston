import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CourseWorkspace,
  CourseStudent,
} from '../../../../../domain/models/course-workspace.model';
import { CourseIconComponent } from '../../../../shared/components/course-icon/course-icon.component';
@Component({
  selector: 'app-course-students',
  standalone: true,
  imports: [CommonModule, CourseIconComponent],
  templateUrl: './course-students.component.html',
  styleUrl: '../course-section.css',
})
export class CourseStudentsComponent {
  readonly workspace = input.required<CourseWorkspace>();
  readonly busy = input(false);
  readonly remove = output<CourseStudent>();
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
