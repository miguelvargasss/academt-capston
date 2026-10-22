import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CourseWorkspace } from '../../../../domain/models/course-workspace.model';
import { CourseIconComponent } from '../../../shared/components/course-icon/course-icon.component';

@Component({
  selector: 'app-course-metrics',
  standalone: true,
  imports: [CommonModule, CourseIconComponent],
  templateUrl: './course-metrics.component.html',
  styleUrl: './course-metrics.component.css',
})
export class CourseMetricsComponent {
  readonly workspace = input.required<CourseWorkspace>();
  readonly weeks = computed(() => this.workspace().units.flatMap((u) => u.weeks));
  readonly resources = computed(() => this.weeks().flatMap((w) => w.resources));
  readonly tasks = computed(() => this.resources().filter((r) => r.kind === 'TASK'));
  readonly materialCount = computed(
    () => this.resources().filter((r) => r.kind === 'MATERIAL').length,
  );
  readonly activeStudents = computed(
    () => this.workspace().students.filter((s) => ['ACTIVA', 'RIESGO'].includes(s.status)).length,
  );
  readonly gradedCount = computed(
    () => this.workspace().submissions.filter((s) => s.status === 'CALIFICADA').length,
  );
  readonly gradedPercentage = computed(() =>
    this.workspace().submissions.length
      ? Math.round((this.gradedCount() / this.workspace().submissions.length) * 100)
      : null,
  );
  readonly averageProgress = computed(() =>
    this.workspace().canManage
      ? (this.workspace().stats?.averageProgress ?? null)
      : (this.workspace().students.find((s) => s.progress !== null && s.progress !== undefined)
          ?.progress ?? null),
  );
}
