import { UserRole } from './user.model';

export interface AuthCredentials {
  correoElectronico: string;
  contrasena: string;
  selectedRole?: 'ESTUDIANTE' | 'DOCENTE';
}

export interface AuthSession {
  accessToken: string;
  tokenType: string;
  userId: string;
  email: string;
  roles: UserRole[];
  permisos: string[];
}
