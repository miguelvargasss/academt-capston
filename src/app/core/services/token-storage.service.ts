import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { UserProfile, UserRole } from '../../domain/models/user.model';
import { AuthSession } from '../../domain/models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {
  private readonly ACCESS_TOKEN_KEY = 'kelly_access_token';
  private readonly USER_KEY = 'kelly_user_profile';
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Signals para estado reactivo del usuario
  private readonly _currentUser = signal<UserProfile | null>(this.loadStoredUser());
  private readonly _token = signal<string | null>(this.loadStoredToken());

  public readonly currentUser = this._currentUser.asReadonly();
  public readonly token = this._token.asReadonly();
  public readonly isAuthenticated = computed(() => {
    const t = this._token();
    return !!t && this.isTokenValid(t);
  });
  public readonly userRole = computed<UserRole | null>(() => this._currentUser()?.role ?? null);
  public readonly roleLabel = computed<string>(() => {
    const role = this.userRole();
    if (role === 'DOCENTE') return 'Docente';
    if (role === 'ADMINISTRADOR') return 'Administrador';
    return 'Estudiante';
  });
  public readonly userInitials = computed<string>(() => {
    const user = this._currentUser();
    if (!user) return 'KA';
    if (user.fullName && user.fullName.trim().length > 0) {
      const parts = user.fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'KA';
  });

  public isTokenValid(token: string | null): boolean {
    if (!token) return false;
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    try {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);

      const nowInSeconds = Math.floor(Date.now() / 1000);
      return typeof payload.exp === 'number' && Number.isFinite(payload.exp) && payload.exp > nowInSeconds;
    } catch {
      return false;
    }
  }

  public saveSession(session: AuthSession, fallbackName?: string): void {
    if (!this.isBrowser) return;

    localStorage.setItem(this.ACCESS_TOKEN_KEY, session.accessToken);
    this._token.set(session.accessToken);

    const primaryRole: UserRole = session.roles.includes('DOCENTE')
      ? 'DOCENTE'
      : session.roles.includes('ADMINISTRADOR')
        ? 'ADMINISTRADOR'
        : 'ESTUDIANTE';

    const cleanEmailName = session.email ? session.email.split('@')[0] : 'Usuario';
    const formattedName = cleanEmailName.charAt(0).toUpperCase() + cleanEmailName.slice(1);

    const profile: UserProfile = {
      id: session.userId,
      email: session.email,
      fullName: fallbackName || formattedName,
      role: primaryRole,
      status: 'ACTIVO',
      avatarUrl: undefined
    };

    localStorage.setItem(this.USER_KEY, JSON.stringify(profile));
    this._currentUser.set(profile);
  }

  public getAccessToken(): string | null {
    const t = this._token();
    if (!t || !this.isTokenValid(t)) {
      if (t) {
        this.clearSession();
      }
      return null;
    }
    return t;
  }

  public clearSession(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    this._token.set(null);
    this._currentUser.set(null);
  }

  private loadStoredToken(): string | null {
    if (!this.isBrowser) return null;
    const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
    if (!token || !this.isTokenValid(token)) {
      if (token) {
        localStorage.removeItem(this.ACCESS_TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
      }
      return null;
    }
    return token;
  }

  private loadStoredUser(): UserProfile | null {
    if (!this.isBrowser) return null;
    const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
    if (!token || !this.isTokenValid(token)) {
      return null;
    }
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      return null;
    }
  }
}
