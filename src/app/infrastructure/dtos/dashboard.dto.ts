export interface MetricasDto {
  cursosInscritos: number;
  promedioCalificacion: number;
  tareasEntregadas: number;
  porcentajeAsistencia: number;
  horasEstudioSemanal: number;
}

export interface ClaseHoyDto {
  id: string;
  titulo: string;
  cursoTitulo: string;
  horario: string;
  docenteNombre: string;
  enlaceVirtual: string | null;
  enVivo: boolean;
}

export interface TareaPendienteDto {
  id: string;
  titulo: string;
  cursoTitulo: string;
  fechaLimite: string;
  urgente: boolean;
  estado: string;
}

export interface DashboardResumenResponseDto {
  metricas: MetricasDto;
  clasesHoy: ClaseHoyDto[];
  tareasPendientes: TareaPendienteDto[];
  rolUsuario: string;
  nombreUsuario: string;
}
