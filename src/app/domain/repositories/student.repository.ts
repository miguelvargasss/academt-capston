import { Observable } from 'rxjs';
import {
  CreateStudentCommand,
  Student,
  StudentAccountStatus,
  StudentDirectory,
  UpdateStudentCommand,
} from '../models/student.model';
export interface StudentRepository {
  load(): Observable<StudentDirectory>;
  create(command: CreateStudentCommand): Observable<Student>;
  update(command: UpdateStudentCommand): Observable<Student>;
  setStatus(id: string, status: StudentAccountStatus): Observable<Student>;
  delete(id: string): Observable<void>;
  enroll(studentId: string, courseId: string): Observable<void>;
  withdraw(studentId: string, courseId: string): Observable<void>;
}
