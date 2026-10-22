import { CefrLevel, CourseStatus } from '../../domain/models/course.model';

export interface CursoResumenDto {
  id: string;
  titulo: string;
  descripcion: string | null;
  estado: CourseStatus;
  nivelCefr: CefrLevel;
  horario: string | null;
  docenteId: string;
  docenteNombreCompleto: string | null;
}
