import { Injectable, inject } from '@angular/core';
import { COURSE_WORKSPACE_REPOSITORY } from '../../core/tokens/repository.tokens';
import {
  SaveStructureCommand,
  SaveResourceCommand,
  SaveAnnouncementCommand,
  GradeCommand,
  RegisterSubmissionCommand,
  DeletableResource,
  PublicationCommand,
  ResourceKind,
  SendSubmissionCommand,
} from '../../domain/models/course-workspace.model';

@Injectable({ providedIn: 'root' })
export class ManageCourseUseCase {
  private readonly repository = inject(COURSE_WORKSPACE_REPOSITORY);
  getSchedule(courseId: string) {
    return this.repository.getSchedule(courseId);
  }
  saveSchedule(
    courseId: string,
    plan: import('../../domain/models/course-schedule.model').CourseSchedulePlan,
  ) {
    return this.repository.saveSchedule(courseId, plan);
  }
  load(courseId: string) {
    return this.repository.getWorkspace(courseId);
  }
  saveUnit(command: SaveStructureCommand) {
    return this.repository.saveUnit(command);
  }
  saveWeek(command: SaveStructureCommand) {
    return this.repository.saveWeek(command);
  }
  saveResource(command: SaveResourceCommand) {
    return this.repository.saveResource(command);
  }
  markCurrentWeek(id: string) {
    return this.repository.markCurrentWeek(id);
  }
  saveAnnouncement(command: SaveAnnouncementCommand) {
    return this.repository.saveAnnouncement(command);
  }
  archiveAnnouncement(id: string) {
    return this.repository.archiveAnnouncement(id);
  }
  grade(command: GradeCommand) {
    return this.repository.grade(command);
  }
  registerSubmission(command: RegisterSubmissionCommand) {
    return this.repository.registerSubmission(command);
  }
  delete(kind: DeletableResource, id: string) {
    return this.repository.delete(kind, id);
  }
  setPublication(command: PublicationCommand) {
    return this.repository.setPublication(command);
  }
  removeStudent(courseId: string, studentId: string) {
    return this.repository.removeStudent(courseId, studentId);
  }
  completeResource(courseId: string, kind: ResourceKind, id: string) {
    return this.repository.completeResource(courseId, kind, id);
  }
  sendSubmission(command: SendSubmissionCommand) {
    return this.repository.sendSubmission(command);
  }
}
