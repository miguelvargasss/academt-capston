import { AuthResponseDto } from '../dtos/auth.dto';
import { AuthSession } from '../../domain/models/auth.model';
import { UserRole } from '../../domain/models/user.model';

export function mapAuthResponseToSession(dto: AuthResponseDto): AuthSession {
  const mappedRoles: UserRole[] = dto.roles.map(r => {
    const upper = r.toUpperCase();
    if (upper.includes('DOCENTE') || upper.includes('PROFESORA') || upper.includes('TEACHER')) return 'DOCENTE';
    if (upper.includes('ADMIN')) return 'ADMINISTRADOR';
    return 'ESTUDIANTE';
  });

  return {
    accessToken: dto.accessToken,
    tokenType: dto.tokenType || 'Bearer',
    userId: dto.userId,
    email: dto.correoElectronico,
    roles: mappedRoles.length > 0 ? mappedRoles : ['ESTUDIANTE'],
    permisos: dto.permisos || []
  };
}
