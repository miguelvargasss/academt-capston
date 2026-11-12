import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../core/config/environment';
import { UserRole, UserStatus } from '../../../domain/models/user.model';

export interface ProfileResponse {
  id: string;
  nombre: string;
  apellido: string;
  correoElectronico: string;
  avatarUrl: string | null;
  estado: UserStatus;
  roles: UserRole[];
}

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly http = inject(HttpClient);

  current() {
    return this.http.get<ProfileResponse>(`${environment.apiUrl}/api/usuarios/me`);
  }

  update(id: string, data: { nombre: string; apellido: string; avatarUrl: string | null }) {
    return this.http.put<ProfileResponse>(`${environment.apiUrl}/api/usuarios/${encodeURIComponent(id)}`, data);
  }

  changePassword(id: string, data: { contrasenaActual: string; contrasenaNueva: string }) {
    return this.http.patch<void>(`${environment.apiUrl}/api/usuarios/${encodeURIComponent(id)}/contrasena`, data);
  }
}
