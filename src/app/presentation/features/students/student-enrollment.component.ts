import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Student, StudentCourse } from '../../../domain/models/student.model';
import { COURSE_STATUS_LABELS } from '../../../domain/models/course-workspace.model';
import { CourseIconComponent } from '../../shared/components/course-icon/course-icon.component';
@Component({
  selector: 'app-student-enrollment',
  standalone: true,
  imports: [CommonModule, CourseIconComponent],
  templateUrl: './student-enrollment.component.html',
  styleUrls: ['../../shared/styles/management-dialog.css', './student-enrollment.component.css'],
})
export class StudentEnrollmentComponent implements OnInit, AfterViewInit {
  readonly student = input.required<Student>();
  readonly courses = input.required<StudentCourse[]>();
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly closed = output<void>();
  readonly saved = output<string[]>();
  readonly selected = signal(new Set<string>());
  readonly query = signal('');
  readonly statusLabels = COURSE_STATUS_LABELS;
  @ViewChild('dialog') private dialog!: ElementRef<HTMLDialogElement>;
  readonly current = computed(
    () =>
      new Set(
        this.student()
          .enrollments.filter((e) => e.status !== 'ABANDONADA')
          .map((e) => e.courseId),
      ),
  );
  readonly filtered = computed(() =>
    this.courses().filter((c) =>
      `${c.title} ${c.level} ${c.id}`.toLowerCase().includes(this.query().trim().toLowerCase()),
    ),
  );
  readonly added = computed(
    () => [...this.selected()].filter((id) => !this.current().has(id)).length,
  );
  readonly removed = computed(
    () => [...this.current()].filter((id) => !this.selected().has(id)).length,
  );
  ngOnInit(): void {
    this.selected.set(new Set(this.current()));
  }
  ngAfterViewInit(): void {
    this.dialog.nativeElement.showModal();
  }
  cancel(event?: Event): void {
    event?.preventDefault();
    if (!this.busy()) this.closed.emit();
  }
  available(c: StudentCourse): boolean {
    return c.status === 'ACTIVO' && c.enrolled < c.capacity;
  }
  toggle(id: string): void {
    if (this.busy()) return;
    this.selected.update((previous) => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  search(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
  submit(): void {
    if (!this.busy() && (this.added() || this.removed())) this.saved.emit([...this.selected()]);
  }
}
