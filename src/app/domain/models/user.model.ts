export type UserRole = 'ADMINISTRADOR' | 'DOCENTE' | 'ESTUDIANTE';

export type UserStatus = 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO' | 'BLOQUEADO';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  roles?: UserRole[];
  status: UserStatus;
  avatarUrl?: string;
}
