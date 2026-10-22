import { Observable } from 'rxjs';
import { Course } from '../models/course.model';

export interface CreateCourseDto {
  docenteId: string;
  titulo: string;
  descripcion?: string;
  nivelCefr: string;
  horario?: string;
  horarios?: {dia: import('../models/course-schedule.model').Weekday;horaInicio:string;horaFin:string}[];
  fechaInicio?: string;
  fechaFin?: string;
  capacidadMaxima: number;
}

export interface CourseRepository {
  getMyCourses(): Observable<Course[]>;
  getCourseById(id: string): Observable<Course>;
  createCourse(dto: CreateCourseDto): Observable<Course>;
}
