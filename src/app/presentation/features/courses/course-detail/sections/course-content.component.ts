import { Component, computed, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CourseWorkspace,
  CourseResource,
  CourseUnit,
  CourseWeek,
  PublicationCommand,
  RESOURCE_LABELS,
} from '../../../../../domain/models/course-workspace.model';
import { CourseIconComponent } from '../../../../shared/components/course-icon/course-icon.component';
import { CourseEditorState } from '../course-editor.component';

@Component({
  selector: 'app-course-content',
  standalone: true,
  imports: [CommonModule, CourseIconComponent],
  templateUrl: './course-content.component.html',
  styleUrl: '../course-section.css',
})
export class CourseContentComponent {
  readonly workspace = input.required<CourseWorkspace>();
  readonly busy = input(false);
  readonly edit = output<CourseEditorState>();
  readonly view = output<CourseResource>();
  readonly publication = output<PublicationCommand>();
  readonly currentWeek = output<CourseWeek>();
  readonly reorderUnits = output<string[]>();
  readonly reorderWeeks = output<{ unitId: string; ids: string[] }>();
  readonly query = signal('');
  readonly openWeeks = signal<Set<string>>(new Set());
  readonly labels = RESOURCE_LABELS;
  private initialized = false;
  private dragged: { type: 'unit' | 'week'; id: string; unitId?: string } | null = null;
  readonly canManage = computed(() => this.workspace().canManage === true);
  readonly weeks = computed(() => this.workspace().units.flatMap((u) => u.weeks));
  readonly filtered = computed(() => {
    const q = this.query().trim().toLocaleLowerCase();
    return this.workspace()
      .units.map((u) => ({
        ...u,
        weeks: u.weeks.filter(
          (w) =>
            !q ||
            `${u.title} ${w.title} ${w.resources.map((r) => r.title + ' ' + r.description).join(' ')}`
              .toLocaleLowerCase()
              .includes(q),
        ),
      }))
      .filter((u) => !q || u.weeks.length || u.title.toLocaleLowerCase().includes(q));
  });
  constructor() {
    effect(() => {
      const first = this.weeks().find((w) => w.isCurrent) ?? this.weeks()[0];
      if (first && !this.initialized) {
        this.initialized = true;
        this.openWeeks.set(new Set([first.id]));
      }
    });
  }
  search(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
  toggle(id: string): void {
    this.openWeeks.update((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  isOpen(id: string): boolean {
    return this.openWeeks().has(id) || !!this.query();
  }
  publishedCount(week: CourseWeek): number {
    return week.resources.filter((r) => r.published).length;
  }
  resourceLabel(r: CourseResource): string {
    return r.kind === 'TASK'
      ? { TAREA: 'Tarea', EVALUACION: 'Evaluación', QUIZ: 'Quiz' }[r.activityType ?? 'TAREA']
      : this.labels[r.kind];
  }
  addWeek(unit: CourseUnit): void {
    this.edit.emit({ mode: 'WEEK', unit: this.workspace().units.find((u) => u.id === unit.id)! });
  }
  change(resource: CourseResource, field: 'published' | 'visible'): void {
    this.publication.emit({
      courseId: this.workspace().course.id,
      id: resource.id,
      kind: resource.kind,
      published: field === 'published' ? !resource.published : resource.published === true,
      visible: field === 'visible' ? !resource.visible : resource.visible !== false,
    });
  }
  hasSubmissions(id: string): boolean {
    return this.workspace().submissions.some((s) => s.taskId === id);
  }
  canReorder(): boolean {
    return this.canManage() && !this.busy() && !this.query().trim();
  }
  moveUnit(id: string, direction: -1 | 1): void {
    const ids = this.workspace().units.map((u) => u.id);
    this.emitMoved(ids, id, ids.indexOf(id) + direction, (result) => this.reorderUnits.emit(result));
  }
  moveWeek(unit: CourseUnit, id: string, direction: -1 | 1): void {
    const ids = this.workspace().units.find((u) => u.id === unit.id)?.weeks.map((w) => w.id) ?? [];
    this.emitMoved(ids, id, ids.indexOf(id) + direction, (result) => this.reorderWeeks.emit({ unitId: unit.id, ids: result }));
  }
  dragStart(event: DragEvent, type: 'unit' | 'week', id: string, unitId?: string): void {
    event.stopPropagation();
    if (!this.canReorder()) { event.preventDefault(); return; }
    this.dragged = { type, id, unitId };
    event.dataTransfer?.setData('text/plain', id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }
  dragOver(event: DragEvent, type: 'unit' | 'week', unitId?: string): void {
    if (this.dragged?.type !== type || (type === 'week' && this.dragged.unitId !== unitId)) return;
    event.preventDefault();
    event.stopPropagation();
  }
  drop(event: DragEvent, type: 'unit' | 'week', targetId: string, unitId?: string): void {
    const dragged = this.dragged;
    if (!dragged || dragged.type !== type || (type === 'week' && dragged.unitId !== unitId)) return;
    event.stopPropagation();
    this.dragged = null;
    event.preventDefault();
    const ids = type === 'unit'
      ? this.workspace().units.map((u) => u.id)
      : this.workspace().units.find((u) => u.id === unitId)?.weeks.map((w) => w.id) ?? [];
    this.emitMoved(ids, dragged.id, ids.indexOf(targetId), (result) => {
      if (type === 'unit') this.reorderUnits.emit(result);
      else if (unitId) this.reorderWeeks.emit({ unitId, ids: result });
    });
  }
  dragEnd(): void { this.dragged = null; }
  private emitMoved(ids: string[], id: string, destination: number, emit: (ids: string[]) => void): void {
    const source = ids.indexOf(id);
    if (!this.canReorder() || source < 0 || destination < 0 || destination >= ids.length || source === destination) return;
    const reordered = [...ids];
    reordered.splice(source, 1);
    reordered.splice(destination, 0, id);
    emit(reordered);
  }
}
