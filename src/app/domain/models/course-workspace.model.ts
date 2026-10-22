import { CefrLevel, CourseStatus } from './course.model';

export type ResourceKind = 'CLASS' | 'MATERIAL' | 'TASK';
export type MaterialType = 'PDF' | 'AUDIO' | 'VIDEO' | 'ENLACE' | 'DOCUMENTO' | 'IMAGEN';
export type ActivityType = 'TAREA' | 'EVALUACION' | 'QUIZ';

export interface CourseResource {
  id: string;
  weekId: string;
  kind: ResourceKind;
  title: string;
  description: string;
  materialType?: MaterialType | null;
  sizeMb?: number | null;
  fileUrl?: string | null;
  externalUrl?: string | null;
  recordingUrl?: string | null;
  startsAt?: string | null;
  durationMinutes?: number | null;
  room?: string | null;
  dueAt?: string | null;
  maxScore?: number | null;
  activityType?: ActivityType;
  published?: boolean;
  visible?: boolean;
}

export interface CourseWeek {
  id: string;
  unitId: string;
  number: number;
  title: string;
  description: string;
  isCurrent: boolean;
  resources: CourseResource[];
}

export interface CourseUnit {
  id: string;
  number: number;
  title: string;
  description: string;
  weeks: CourseWeek[];
}

export interface CourseStudent {
  enrollmentId: string;
  id: string;
  name: string;
  email: string;
  status: 'ACTIVA' | 'COMPLETADA' | 'RIESGO' | 'ABANDONADA';
  grade: number | null;
  attendance: number | null;
  enrolledAt: string;
  avatarUrl?: string | null;
  progress?: number | null;
}

export interface CourseAnnouncement {
  imageUrl?: string | null;
  id: string;
  title: string;
  body: string;
  author: string;
  active: boolean;
  createdAt: string;
  published?: boolean;
  pinned?: boolean;
  publishedAt?: string | null;
}

export interface CourseSubmission {
  id: string;
  taskId: string;
  taskTitle: string;
  studentId: string;
  studentName: string;
  fileUrl: string | null;
  submittedAt: string | null;
  grade: number | null;
  feedback: string | null;
  status: 'PENDIENTE' | 'CALIFICADA' | 'TARDE';
  textContent?: string | null;
  isLate?: boolean;
  gradedAt?: string | null;
  graderName?: string | null;
}

export interface CourseWorkspace {
  course: {
    id: string;
    title: string;
    description: string;
    level: CefrLevel;
    status: CourseStatus;
    teacherId: string;
    teacherName: string;
    schedule: string | null;
    startsOn: string | null;
    endsOn: string | null;
    capacity: number;
  };
  units: CourseUnit[];
  students: CourseStudent[];
  announcements: CourseAnnouncement[];
  submissions: CourseSubmission[];
  canManage?: boolean;
  completedResourceIds?: string[];
  stats?: {
    totalStudents: number;
    activeStudents: number;
    averageProgress: number | null;
    publishedResources: number;
  };
}

export interface SaveStructureCommand {
  id?: string;
  parentId: string;
  number?: number;
  title: string;
  description: string;
}

export interface SaveResourceCommand extends Omit<CourseResource, 'id'> {
  id?: string;
  courseId: string;
}
export interface SaveAnnouncementCommand {
  imageUrl?: string | null;
  id?: string;
  courseId: string;
  title: string;
  body: string;
  published?: boolean;
  pinned?: boolean;
}
export interface SendSubmissionCommand {
  taskId: string;
  fileUrl: string | null;
  textContent: string | null;
}
export interface PublicationCommand {
  courseId: string;
  kind: ResourceKind;
  id: string;
  published: boolean;
  visible: boolean;
}
export interface GradeCommand {
  id: string;
  grade: number;
  feedback: string;
}
export interface RegisterSubmissionCommand {
  taskId: string;
  studentId: string;
  fileUrl: string | null;
}
export type DeletableResource = 'UNIT' | 'WEEK' | ResourceKind | 'ANNOUNCEMENT';

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  BORRADOR: 'Borrador',
  ACTIVO: 'Activo',
  FINALIZADO: 'Finalizado',
  ARCHIVADO: 'Archivado',
};
export const RESOURCE_LABELS: Record<ResourceKind, string> = {
  CLASS: 'Clase',
  MATERIAL: 'Material',
  TASK: 'Tarea',
};
