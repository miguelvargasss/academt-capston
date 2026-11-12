import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../core/config/environment';
import { ProfileResponse } from '../profile/profile-api.service';

export type AccountStatus = 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
export interface UserSummary {
  id: string; nombre: string; apellido: string; correoElectronico: string; estado: AccountStatus;
}
export interface Page<T> { content: T[]; number: number; totalPages: number; totalElements: number; }
export interface RoleSummary { nombre: string; descripcion: string | null; }

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/usuarios`;

  list(page: number, filters: { texto: string; estado: string; rol: string }) {
    let params = new HttpParams().set('page', page).set('size', 20);
    for (const [key, value] of Object.entries(filters)) if (value.trim()) params = params.set(key, value.trim());
    return this.http.get<Page<UserSummary>>(this.url, { params });
  }
  roles() { return this.http.get<Page<RoleSummary>>(`${environment.apiUrl}/api/roles`, { params: { size: 100 } }); }
  detail(id: string) { return this.http.get<ProfileResponse>(`${this.url}/${encodeURIComponent(id)}`); }
  setStatus(id: string, estado: AccountStatus) {
    return this.http.patch<ProfileResponse>(`${this.url}/${encodeURIComponent(id)}/estado`, { estado });
  }
  setRoles(id: string, roles: string[]) {
    return this.http.put<ProfileResponse>(`${this.url}/${encodeURIComponent(id)}/roles`, { roles });
  }
}
