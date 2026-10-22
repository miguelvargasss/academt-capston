import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  CourseWorkspace,
  COURSE_STATUS_LABELS,
} from '../../../../domain/models/course-workspace.model';
import { CourseIconComponent } from '../../../shared/components/course-icon/course-icon.component';

@Component({
  selector: 'app-course-header',
  standalone: true,
  imports: [CommonModule, RouterLink, CourseIconComponent],
  templateUrl: './course-header.component.html',
  styleUrl: './course-header.component.css',
})
export class CourseHeaderComponent {
  readonly scheduleRequested = output<void>();
  readonly workspace = input.required<CourseWorkspace>();
  readonly activeTab = input.required<string>();
  readonly tabs = input.required<{ id: string; label: string }[]>();
  readonly statusLabels = COURSE_STATUS_LABELS;
  readonly activeStudents = computed(
    () => this.workspace().students.filter((s) => ['ACTIVA', 'RIESGO'].includes(s.status)).length,
  );
  readonly resources = computed(() =>
    this.workspace().units.flatMap((u) => u.weeks.flatMap((w) => w.resources)),
  );
}
