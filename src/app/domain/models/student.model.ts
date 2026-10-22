import { CefrLevel, CourseStatus } from './course.model';
export type StudentAccountStatus = 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';
export type EnrollmentStatus = 'ACTIVA' | 'RIESGO' | 'COMPLETADA' | 'ABANDONADA';
export interface StudentEnrollment {
  id: string;
  courseId: string;
  status: EnrollmentStatus;
  finalGrade: number | null;
}
export interface Student {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  status: StudentAccountStatus;
  atRisk: boolean;
  createdAt: string;
  enrollments: StudentEnrollment[];
}
export interface StudentCourse {
  id: string;
  title: string;
  level: CefrLevel;
  status: CourseStatus;
  capacity: number;
  enrolled: number;
}
export interface StudentDirectory {
  students: Student[];
  courses: StudentCourse[];
}
export interface CreateStudentCommand {
  fullName: string;
  emailIdentifier: string;
  phone: string;
  password: string;
}
export interface UpdateStudentCommand {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: StudentAccountStatus;
  previousStatus: StudentAccountStatus;
}
export const STUDENT_STATUS_LABELS: Record<StudentAccountStatus, string> = {
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
  SUSPENDIDO: 'Suspendido',
};
