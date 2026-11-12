import { Injectable, inject } from '@angular/core';
import { catchError, forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { STUDENT_REPOSITORY } from '../../core/tokens/repository.tokens';
import {
  CreateStudentCommand,
  Student,
  UpdateStudentCommand,
} from '../../domain/models/student.model';
export class StudentStatusUpdateError extends Error {
  constructor(cause: unknown) {
    super('Los datos se guardaron, pero no se pudo confirmar el cambio de estado. Revisa el estado actualizado antes de reintentar.', { cause });
  }
}

@Injectable({ providedIn: 'root' })
export class ManageStudentsUseCase {
  private readonly repository = inject(STUDENT_REPOSITORY);
  load() {
    return this.repository.load();
  }
  create(command: CreateStudentCommand) {
    return this.repository.create(command);
  }
  update(command: UpdateStudentCommand) {
    return this.repository
      .update(command)
      .pipe(
        switchMap((student) =>
          command.status === command.previousStatus
            ? of(student)
            : this.repository.setStatus(command.id, command.status).pipe(
                catchError((error) => throwError(() => new StudentStatusUpdateError(error))),
              ),
        ),
      );
  }
  delete(id: string) {
    return this.repository.delete(id);
  }
  saveCourses(student: Student, selectedIds: string[]) {
    const existing = new Set(
      student.enrollments.filter((e) => e.status === 'ACTIVA' || e.status === 'RIESGO').map((e) => e.courseId),
    );
    const terminal = new Set(
      student.enrollments.filter((e) => e.status === 'COMPLETADA' || e.status === 'ABANDONADA').map((e) => e.courseId),
    );
    const selected = new Set(selectedIds);
    const changes = [
      ...selectedIds
        .filter((id) => !existing.has(id) && !terminal.has(id))
        .map((id) => ({ id, request: this.repository.enroll(student.id, id) })),
      ...[...existing]
        .filter((id) => !selected.has(id))
        .map((id) => ({ id, request: this.repository.withdraw(student.id, id) })),
    ];
    if (!changes.length) return of([] as { id: string; error: unknown }[]);
    // Todos los cambios se inician en paralelo; conservamos los fallos para reintentar solo lo pendiente.
    return forkJoin(
      changes.map((c) =>
        c.request.pipe(
          map(() => null),
          catchError((error) => of({ id: c.id, error })),
        ),
      ),
    ).pipe(
      map((results) => results.filter((r): r is { id: string; error: unknown } => r !== null)),
    );
  }
}
