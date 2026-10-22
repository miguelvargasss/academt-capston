import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { AuthRepository } from '../../domain/repositories/auth.repository';
import { AuthCredentials, AuthSession } from '../../domain/models/auth.model';
import { UserProfile } from '../../domain/models/user.model';
import { AuthRequestDto, AuthResponseDto } from '../dtos/auth.dto';
import { mapAuthResponseToSession } from '../mappers/auth.mapper';
import { environment } from '../../core/config/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthHttpRepository implements AuthRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  login(credentials: AuthCredentials): Observable<AuthSession> {
    const payload: AuthRequestDto = {
      correoElectronico: credentials.correoElectronico,
      contrasena: credentials.contrasena
    };

    return this.http.post<AuthResponseDto>(`${this.apiUrl}/auth/login`, payload).pipe(
      map(dto => mapAuthResponseToSession(dto))
    );
  }

  logout(): Observable<void> {
    return of(undefined);
  }

  getCurrentUser(): Observable<UserProfile | null> {
    return of(null);
  }
}
