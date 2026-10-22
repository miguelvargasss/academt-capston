export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type CourseStatus = 'BORRADOR' | 'ACTIVO' | 'FINALIZADO' | 'ARCHIVADO';

export interface Course {
  id: string;
  title: string;
  description: string;
  levelCefr: CefrLevel;
  status: CourseStatus;
  teacherName: string;
  progressPercentage: number | null;
  totalHours: number | null;
  enrolledStudentsCount: number | null;
  coverImage?: string;
  nextLesson?: string;
}
