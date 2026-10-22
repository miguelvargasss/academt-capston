import { Component, computed, input, output, signal } from '@angular/core';
import { FileAttachmentComponent } from '../../../../shared/components/file-attachment/file-attachment.component';
import { CommonModule } from '@angular/common';
import {
  CourseWorkspace,
  CourseAnnouncement,
  SaveAnnouncementCommand,
} from '../../../../../domain/models/course-workspace.model';
import { CourseIconComponent } from '../../../../shared/components/course-icon/course-icon.component';
import { CourseEditorState } from '../course-editor.component';
@Component({
  selector: 'app-course-announcements',
  standalone: true,
  imports: [CommonModule, CourseIconComponent, FileAttachmentComponent],
  templateUrl: './course-announcements.component.html',
  styleUrls: ['../course-section.css', './course-announcements.component.css'],
})
export class CourseAnnouncementsComponent {
  readonly workspace = input.required<CourseWorkspace>();
  readonly busy = input(false);
  readonly edit = output<CourseEditorState>();
  readonly save = output<SaveAnnouncementCommand>();
  readonly filter = signal('ALL');
  readonly canManage = computed(() => this.workspace().canManage === true);
  readonly announcements = computed(() =>
    this.workspace().announcements.filter(
      (a) =>
        this.filter() === 'ALL' ||
        (this.filter() === 'DRAFTS' ? !a.published : a.published && a.active),
    ),
  );
  changeFilter(event: Event): void {
    this.filter.set((event.target as HTMLSelectElement).value);
  }
  toggle(a: CourseAnnouncement, field: 'pinned' | 'published'): void {
    this.save.emit({
      id: a.id,
      courseId: this.workspace().course.id,
      title: a.title,
      body: a.body,
      imageUrl: a.imageUrl,
      pinned: field === 'pinned' ? !a.pinned : a.pinned === true,
      published: field === 'published' ? !a.published : a.published === true,
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
}
