import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CourseWorkspaceRepository } from '../../domain/repositories/course-workspace.repository';
import {
  CourseWorkspace,
  SaveStructureCommand,
  SaveResourceCommand,
  SaveAnnouncementCommand,
  GradeCommand,
  RegisterSubmissionCommand,
  DeletableResource,
  PublicationCommand,
  SendSubmissionCommand,
} from '../../domain/models/course-workspace.model';
import { environment } from '../../core/config/environment';
import { PanelCursoDto } from '../dtos/course-workspace.dto';
import { mapCourseWorkspace } from '../mappers/course-workspace.mapper';

const RESOURCE_PATHS = { CLASS: 'clases', MATERIAL: 'materiales', TASK: 'tareas' } as const;

@Injectable({ providedIn: 'root' })
export class CourseWorkspaceHttpRepository implements CourseWorkspaceRepository {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api`;

  getWorkspace(courseId: string): Observable<CourseWorkspace> {
    return this.http
      .get<PanelCursoDto>(`${this.base}/cursos/${encodeURIComponent(courseId)}/aula`)
      .pipe(map(mapCourseWorkspace));
  }

  saveUnit(c: SaveStructureCommand): Observable<void> {
    return this.save('unidades', c.id, {
      titulo: c.title,
      descripcion: c.description,
      ...(!c.id ? { cursoId: c.parentId, numero: c.number } : {}),
    });
  }

  saveWeek(c: SaveStructureCommand): Observable<void> {
    return this.save('semanas', c.id, {
      titulo: c.title,
      descripcion: c.description,
      ...(!c.id ? { unidadId: c.parentId, numero: c.number } : {}),
    });
  }

  reorderUnits(courseId: string, ids: string[]): Observable<void> {
    return this.http.put(`${this.base}/cursos/${encodeURIComponent(courseId)}/unidades/reordenar`, {
      orden: ids.map((id, index) => ({ id, numero: index + 1 })),
    }).pipe(map(() => undefined));
  }

  reorderWeeks(unitId: string, ids: string[]): Observable<void> {
    return this.http.put(`${this.base}/unidades/${encodeURIComponent(unitId)}/semanas/reordenar`, {
      orden: ids.map((id, index) => ({ id, numero: index + 1 })),
    }).pipe(map(() => undefined));
  }

  saveResource(c: SaveResourceCommand): Observable<void> {
    return this.save(`cursos/${encodeURIComponent(c.courseId)}/contenido/${c.kind}`, c.id, {
      semanaId: c.weekId,
      titulo: c.title,
      descripcion: c.description,
      tipo: c.materialType,
      urlArchivo: c.fileUrl,
      urlExterno: c.externalUrl,
      tamanoMb: c.sizeMb,
      urlGrabacion: c.recordingUrl,
      fechaHora: c.startsAt,
      duracionMinutos: c.durationMinutes,
      sala: c.room,
      fechaLimite: c.dueAt,
      puntajeMaximo: c.maxScore,
      tipoActividad: c.activityType,
      publicado: c.published === true,
      visible: c.visible !== false,
    });
  }

  markCurrentWeek(id: string): Observable<void> {
    return this.http
      .patch(`${this.base}/semanas/${id}/marcar-actual`, {})
      .pipe(map(() => undefined));
  }

  saveAnnouncement(c: SaveAnnouncementCommand): Observable<void> {
    return this.save('anuncios', c.id, {
      titulo: c.title,
      cuerpo: c.body,
      imagenUrl: c.imageUrl ?? '',
      publicado: c.published === true,
      fijado: c.pinned === true,
      ...(!c.id ? { cursoId: c.courseId } : {}),
    });
  }

  archiveAnnouncement(id: string): Observable<void> {
    return this.http.patch(`${this.base}/anuncios/${id}/archivar`, {}).pipe(map(() => undefined));
  }

  grade(c: GradeCommand): Observable<void> {
    return this.http
      .patch(`${this.base}/entregas/${c.id}/calificar`, {
        nota: c.grade,
        retroalimentacion: c.feedback,
      })
      .pipe(map(() => undefined));
  }

  registerSubmission(c: RegisterSubmissionCommand): Observable<void> {
    return this.http
      .post(`${this.base}/entregas`, {
        tareaId: c.taskId,
        estudianteId: c.studentId,
        urlArchivo: c.fileUrl,
      })
      .pipe(map(() => undefined));
  }

  delete(kind: DeletableResource, id: string): Observable<void> {
    const paths = {
      ...RESOURCE_PATHS,
      UNIT: 'unidades',
      WEEK: 'semanas',
      ANNOUNCEMENT: 'anuncios',
    };
    return this.http.delete<void>(`${this.base}/${paths[kind]}/${id}`);
  }

  getSchedule(
    courseId: string,
  ): Observable<import('../../domain/models/course-schedule.model').CourseSchedulePlan> {
    return this.http
      .get<{
        fechaInicio: string | null;
        fechaFin: string | null;
        horarios: {
          dia: import('../../domain/models/course-schedule.model').Weekday;
          horaInicio: string;
          horaFin: string;
        }[];
      }>(`${this.base}/cursos/${courseId}/horarios`)
      .pipe(
        map((p) => ({
          startsOn: p.fechaInicio,
          endsOn: p.fechaFin,
          slots: p.horarios.map((h) => ({
            day: h.dia,
            startTime: h.horaInicio.slice(0, 5),
            endTime: h.horaFin.slice(0, 5),
          })),
        })),
      );
  }
  saveSchedule(
    courseId: string,
    plan: import('../../domain/models/course-schedule.model').CourseSchedulePlan,
  ): Observable<void> {
    return this.http.put<void>(`${this.base}/cursos/${courseId}/horarios`, {
      fechaInicio: plan.startsOn,
      fechaFin: plan.endsOn,
      horarios: plan.slots.map((h) => ({
        dia: h.day,
        horaInicio: h.startTime,
        horaFin: h.endTime,
      })),
    });
  }

  setPublication(c: PublicationCommand): Observable<void> {
    return this.http
      .patch(`${this.base}/cursos/${c.courseId}/contenido/${c.kind}/${c.id}/publicacion`, {
        publicado: c.published,
        visible: c.visible,
      })
      .pipe(map(() => undefined));
  }
  removeStudent(courseId: string, studentId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/cursos/${courseId}/alumnos/${studentId}`);
  }
  completeResource(
    courseId: string,
    kind: import('../../domain/models/course-workspace.model').ResourceKind,
    id: string,
  ): Observable<void> {
    return this.http
      .post(`${this.base}/cursos/${courseId}/contenido/${kind}/${id}/completar`, {})
      .pipe(map(() => undefined));
  }
  sendSubmission(c: SendSubmissionCommand): Observable<void> {
    return this.http
      .post(`${this.base}/entregas/enviar`, {
        tareaId: c.taskId,
        urlArchivo: c.fileUrl,
        textoRespuesta: c.textContent,
      })
      .pipe(map(() => undefined));
  }

  private save(path: string, id: string | undefined, body: object): Observable<void> {
    const request = id
      ? this.http.put(`${this.base}/${path}/${id}`, body)
      : this.http.post(`${this.base}/${path}`, body);
    return request.pipe(map(() => undefined));
  }
}
