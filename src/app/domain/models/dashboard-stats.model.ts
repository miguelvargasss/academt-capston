export interface DashboardMetrics {
  enrolledCoursesCount: number;
  completedTasksCount: number;
  averageGrade: number; // Ej: 18.5 / 20 o 92%
  attendanceRate: number; // Ej: 96%
  studyHoursThisWeek: number;
}

export interface QuickTask {
  id: string;
  title: string;
  courseTitle: string;
  dueDate: string;
  isUrgent: boolean;
  status: 'PENDIENTE' | 'ENTREGADA' | 'CALIFICADA';
}

export interface ScheduledClass {
  id: string;
  title: string;
  courseTitle: string;
  timeRange: string;
  teacherName: string;
  roomOrMeetUrl: string | null;
  isLiveNow?: boolean;
}

export interface DashboardSummary {
  metrics: DashboardMetrics;
  tasks: QuickTask[];
  classes: ScheduledClass[];
}
