import { CefrLevel, CourseStatus } from '../../domain/models/course.model';
import {
  MaterialType,
  CourseStudent,
  CourseSubmission,
} from '../../domain/models/course-workspace.model';

export interface CursoDetalleDto {
  id: string;
  titulo: string;
  descripcion: string | null;
  nivelCefr: CefrLevel;
  estado: CourseStatus;
  docente: { id: string; nombre: string; apellido: string };
  horario: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  capacidadMaxima: number;
}
export interface EstructuraDto {
  id: string;
  numero: number;
  titulo: string;
  descripcion: string | null;
}
interface ContenidoDto {
  id: string;
  semanaId: string;
  titulo: string;
  descripcion: string | null;
  publicado?: boolean;
  visible?: boolean;
}
export interface ClaseDto extends ContenidoDto {
  urlVivo: string | null;
  urlGrabacion: string | null;
  fechaHora: string | null;
  duracionMinutos: number | null;
  sala: string | null;
}
export interface MaterialDto extends ContenidoDto {
  tipo: MaterialType | null;
  tamanoMb: number | null;
  urlArchivo: string | null;
  urlExterno: string | null;
}
export interface TareaDto extends ContenidoDto {
  instruccionesUrl: string | null;
  fechaLimite: string | null;
  puntajeMaximo: number;
  tipoActividad?: 'TAREA' | 'EVALUACION' | 'QUIZ';
}
export interface SemanaPanelDto {
  semana: EstructuraDto & { unidadId: string; esActual: boolean };
  clases: ClaseDto[];
  materiales: MaterialDto[];
  tareas: TareaDto[];
}
export interface PanelCursoDto {
  puedeGestionar?: boolean;
  contenidosCompletados?: string[];
  avances?: { estudianteId: string; avatarUrl: string | null; progreso: number | null }[];
  estadisticas?: {
    totalAlumnos: number;
    alumnosActivos: number;
    progresoPromedio: number | null;
    recursosPublicados: number;
  };
  curso: CursoDetalleDto;
  unidades: { unidad: EstructuraDto; semanas: SemanaPanelDto[] }[];
  matriculas: {
    id: string;
    estudianteId: string;
    estudianteNombreCompleto: string;
    estudianteCorreo: string;
    estado: CourseStudent['status'];
    notaFinal: number | null;
    asistenciaPorcentaje: number | null;
    matriculadoAt: string;
  }[];
  anuncios: {
    imagenUrl?: string | null;
    id: string;
    titulo: string;
    cuerpo: string;
    autorNombreCompleto: string;
    activo: boolean;
    fechaCreacion: string;
    publicado?: boolean;
    fijado?: boolean;
    publicadoAt?: string | null;
  }[];
  entregas: {
    id: string;
    tareaId: string;
    tareaTitulo: string;
    estudianteId: string;
    estudianteNombreCompleto: string;
    urlArchivo: string | null;
    enviadoAt: string | null;
    nota: number | null;
    retroalimentacion: string | null;
    estado: CourseSubmission['status'];
    textoRespuesta?: string | null;
    tardia?: boolean;
    calificadoAt?: string | null;
    calificadoPorNombreCompleto?: string | null;
  }[];
}
