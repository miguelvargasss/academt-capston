import { CursoResumenDto } from '../dtos/course.dto';
import { Course } from '../../domain/models/course.model';

export function mapCursoDtoToCourse(dto: CursoResumenDto): Course {
  return {
    id: dto.id,
    title: dto.titulo,
    description: dto.descripcion || '',
    levelCefr: dto.nivelCefr,
    status: dto.estado,
    teacherName: dto.docenteNombreCompleto ?? '',
    progressPercentage: null,
    totalHours: null,
    enrolledStudentsCount: null,
    nextLesson: dto.horario ?? '',
  };
}
