export type UserRole = 'ADMINISTRADOR' | 'DOCENTE' | 'ESTUDIANTE';

export type UserStatus = 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
}
