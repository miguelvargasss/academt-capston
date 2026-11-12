import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../config/environment';
import { UserRole } from '../../domain/models/user.model';
import { TokenStorageService } from './token-storage.service';

// Cambiar esta versión junto con el texto mostrado y la versión del backend.
export const DISPLAYED_TERMS_VERSION = '2026-11-11.1';
const DISPLAYED_ROLES = ['ESTUDIANTE', 'DOCENTE', 'ADMINISTRADOR'];
export function hasDisplayedRoles(roles: unknown): roles is UserRole[] {
  return Array.isArray(roles) && roles.length > 0 && roles.every((role) => DISPLAYED_ROLES.includes(role));
}

export interface TermsStatus {
  version: string;
  aceptado: boolean;
  roles: string[];
  aceptadoEn: string | null;
}

@Injectable({ providedIn: 'root' })
export class TermsService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(TokenStorageService);
  private get endpoint(): string { return `${environment.apiUrl}/api/terminos/aceptacion`; }

  status() {
    const token = this.session.getAccessToken();
    return this.http.get<TermsStatus>(this.endpoint).pipe(tap((status) => {
      if (hasDisplayedRoles(status.roles)) this.session.updateRoles(status.roles, token);
    }));
  }
  accept(rolesMostrados: string[]) { return this.http.post<TermsStatus>(this.endpoint, { version: DISPLAYED_TERMS_VERSION, rolesMostrados }); }
}
