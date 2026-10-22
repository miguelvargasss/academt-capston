import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { DashboardRepository } from '../../domain/repositories/dashboard.repository';
import {
  DashboardMetrics,
  DashboardSummary,
  QuickTask,
  ScheduledClass,
} from '../../domain/models/dashboard-stats.model';
import { DashboardResumenResponseDto } from '../dtos/dashboard.dto';
import { environment } from '../../core/config/environment';
@Injectable({ providedIn: 'root' })
export class DashboardHttpRepository implements DashboardRepository {
  private readonly http = inject(HttpClient);
  getSummary(): Observable<DashboardSummary> {
    // Cada entrada o actualización consulta al usuario autenticado actual; no hay caché global entre sesiones.
    return this.http
      .get<DashboardResumenResponseDto>(`${environment.apiUrl}/api/dashboard/resumen`)
      .pipe(
        map((res) => ({
          metrics: {
            enrolledCoursesCount: res.metricas.cursosInscritos,
            completedTasksCount: res.metricas.tareasEntregadas,
            averageGrade: res.metricas.promedioCalificacion,
            attendanceRate: res.metricas.porcentajeAsistencia,
            studyHoursThisWeek: res.metricas.horasEstudioSemanal,
          },
          tasks: res.tareasPendientes.map((t) => ({
            id: t.id,
            title: t.titulo,
            courseTitle: t.cursoTitulo,
            dueDate: t.fechaLimite,
            isUrgent: t.urgente,
            status: t.estado as QuickTask['status'],
          })),
          classes: res.clasesHoy.map((c) => ({
            id: c.id,
            title: c.titulo,
            courseTitle: c.cursoTitulo,
            timeRange: c.horario,
            teacherName: c.docenteNombre,
            roomOrMeetUrl: c.enlaceVirtual,
            isLiveNow: c.enVivo,
          })),
        })),
      );
  }
  getStudentMetrics(): Observable<DashboardMetrics> {
    return this.getSummary().pipe(map((s) => s.metrics));
  }
  getUpcomingTasks(): Observable<QuickTask[]> {
    return this.getSummary().pipe(map((s) => s.tasks));
  }
  getTodayClasses(): Observable<ScheduledClass[]> {
    return this.getSummary().pipe(map((s) => s.classes));
  }
}
