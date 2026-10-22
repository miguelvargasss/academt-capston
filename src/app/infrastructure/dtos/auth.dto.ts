export interface AuthRequestDto {
  correoElectronico: string;
  contrasena: string;
}

export interface AuthResponseDto {
  accessToken: string;
  tokenType: string;
  userId: string;
  correoElectronico: string;
  roles: string[];
  permisos: string[];
}
