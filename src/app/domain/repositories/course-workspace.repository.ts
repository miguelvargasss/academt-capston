import { Observable } from 'rxjs';
import {
  CourseWorkspace,
  SaveStructureCommand,
  SaveResourceCommand,
  SaveAnnouncementCommand,
  GradeCommand,
  RegisterSubmissionCommand,
  DeletableResource,
  SendSubmissionCommand,
  PublicationCommand,
  ResourceKind,
} from '../models/course-workspace.model';

export interface CourseWorkspaceRepository {
  getWorkspace(courseId: string): Observable<CourseWorkspace>;
  getSchedule(
    courseId: string,
  ): Observable<import('../models/course-schedule.model').CourseSchedulePlan>;
  saveSchedule(
    courseId: string,
    plan: import('../models/course-schedule.model').CourseSchedulePlan,
  ): Observable<void>;
  saveUnit(command: SaveStructureCommand): Observable<void>;
  saveWeek(command: SaveStructureCommand): Observable<void>;
  saveResource(command: SaveResourceCommand): Observable<void>;
  markCurrentWeek(id: string): Observable<void>;
  saveAnnouncement(command: SaveAnnouncementCommand): Observable<void>;
  archiveAnnouncement(id: string): Observable<void>;
  grade(command: GradeCommand): Observable<void>;
  registerSubmission(command: RegisterSubmissionCommand): Observable<void>;
  delete(kind: DeletableResource, id: string): Observable<void>;
  setPublication(command: PublicationCommand): Observable<void>;
  removeStudent(courseId: string, studentId: string): Observable<void>;
  completeResource(courseId: string, kind: ResourceKind, id: string): Observable<void>;
  sendSubmission(command: SendSubmissionCommand): Observable<void>;
}
