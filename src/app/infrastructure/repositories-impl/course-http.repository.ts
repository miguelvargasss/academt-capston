import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CourseRepository, CreateCourseDto } from '../../domain/repositories/course.repository';
import { Course } from '../../domain/models/course.model';
import { environment } from '../../core/config/environment';
import { CursoResumenDto } from '../dtos/course.dto';
import { CursoDetalleDto } from '../dtos/course-workspace.dto';
import { mapCursoDtoToCourse } from '../mappers/course.mapper';

function mapDetail(c: CursoDetalleDto): Course {
  return {
    id: c.id,
    title: c.titulo,
    description: c.descripcion ?? '',
    levelCefr: c.nivelCefr,
    status: c.estado,
    teacherName: `${c.docente.nombre} ${c.docente.apellido}`.trim(),
    progressPercentage: null,
    totalHours: null,
    enrolledStudentsCount: null,
    nextLesson: c.horario ?? '',
  };
}

@Injectable({ providedIn: 'root' })
export class CourseHttpRepository implements CourseRepository {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/cursos`;
  getMyCourses(): Observable<Course[]> {
    return this.http
      .get<CursoResumenDto[]>(`${this.base}/mis-cursos`)
      .pipe(map((list) => list.map(mapCursoDtoToCourse)));
  }
  getCourseById(id: string): Observable<Course> {
    return this.http
      .get<CursoDetalleDto>(`${this.base}/${encodeURIComponent(id)}`)
      .pipe(map(mapDetail));
  }
  createCourse(dto: CreateCourseDto): Observable<Course> {
    return this.http.post<CursoDetalleDto>(this.base, dto).pipe(map(mapDetail));
  }
}
