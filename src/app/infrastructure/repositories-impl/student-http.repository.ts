import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../core/config/environment';
import { StudentRepository } from '../../domain/repositories/student.repository';
import {
  CreateStudentCommand,
  Student,
  StudentAccountStatus,
  StudentDirectory,
  UpdateStudentCommand,
} from '../../domain/models/student.model';
import { CefrLevel, CourseStatus } from '../../domain/models/course.model';
interface StudentDto {
  id: string;
  nombreCompleto: string;
  correoElectronico: string;
  telefono: string | null;
  avatarUrl: string | null;
  estado: StudentAccountStatus;
  enRiesgo: boolean;
  creadoAt: string;
  matriculas: {
    id: string;
    cursoId: string;
    estado: Student['enrollments'][number]['status'];
    notaFinal: number | null;
  }[];
}
interface DirectoryDto {
  alumnos: StudentDto[];
  cursos: {
    id: string;
    titulo: string;
    nivelCefr: CefrLevel;
    estado: CourseStatus;
    capacidadMaxima: number;
    inscritos: number;
  }[];
}
function student(dto: StudentDto): Student {
  return {
    id: dto.id,
    fullName: dto.nombreCompleto,
    email: dto.correoElectronico,
    phone: dto.telefono,
    avatarUrl: dto.avatarUrl,
    status: dto.estado,
    atRisk: dto.enRiesgo,
    createdAt: dto.creadoAt,
    enrollments: dto.matriculas.map((m) => ({
      id: m.id,
      courseId: m.cursoId,
      status: m.estado,
      finalGrade: m.notaFinal,
    })),
  };
}
@Injectable({ providedIn: 'root' })
export class StudentHttpRepository implements StudentRepository {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/docente/alumnos`;
  load(): Observable<StudentDirectory> {
    return this.http
      .get<DirectoryDto>(this.base)
      .pipe(
        map((dto) => ({
          students: dto.alumnos.map(student),
          courses: dto.cursos.map((c) => ({
            id: c.id,
            title: c.titulo,
            level: c.nivelCefr,
            status: c.estado,
            capacity: c.capacidadMaxima,
            enrolled: c.inscritos,
          })),
        })),
      );
  }
  create(c: CreateStudentCommand): Observable<Student> {
    return this.http
      .post<StudentDto>(this.base, {
        nombreCompleto: c.fullName,
        identificadorCorreo: c.emailIdentifier,
        telefono: c.phone,
        contrasena: c.password,
      })
      .pipe(map(student));
  }
  update(c: UpdateStudentCommand): Observable<Student> {
    return this.http
      .patch<StudentDto>(`${this.base}/${c.id}`, {
        nombreCompleto: c.fullName,
        correoElectronico: c.email,
        telefono: c.phone,
      })
      .pipe(map(student));
  }
  setStatus(id: string, status: StudentAccountStatus): Observable<Student> {
    return this.http
      .patch<StudentDto>(`${this.base}/${id}/estado`, { estado: status })
      .pipe(map(student));
  }
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
  enroll(studentId: string, courseId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${studentId}/cursos`, { cursoId: courseId });
  }
  withdraw(studentId: string, courseId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${studentId}/cursos/${courseId}`);
  }
}
