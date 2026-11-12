import { DestroyRef, Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
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
  private readonly destroy = inject(DestroyRef);
  private expiryTimer: ReturnType<typeof setTimeout> | undefined;

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
  public readonly isAdmin = computed(() => {
    const user = this._currentUser();
    return user?.role === 'ADMINISTRADOR' || !!user?.roles?.includes('ADMINISTRADOR');
  });
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

  constructor() {
    this.scheduleExpiration(this._token());
    this.destroy.onDestroy(() => this.cancelExpiration());
  }

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
    this.scheduleExpiration(session.accessToken);

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
      roles: session.roles,
      status: 'ACTIVO',
      avatarUrl: undefined
    };

    localStorage.setItem(this.USER_KEY, JSON.stringify(profile));
    this._currentUser.set(profile);
  }

  public updateProfile(update: Pick<UserProfile, 'id' | 'email' | 'fullName' | 'status' | 'avatarUrl'>): void {
    const current = this._currentUser();
    if (!current || current.id !== update.id) return;
    const profile = { ...current, ...update };
    if (this.isBrowser) localStorage.setItem(this.USER_KEY, JSON.stringify(profile));
    this._currentUser.set(profile);
  }

  /** Aplica roles verificados por el servidor solo si la sesión que inició la consulta sigue vigente. */
  public updateRoles(roles: UserRole[], expectedToken: string | null): void {
    const current = this._currentUser();
    if (!current || !roles.length || !expectedToken || this._token() !== expectedToken || !this.isTokenValid(expectedToken)) return;
    const primaryRole: UserRole = roles.includes('DOCENTE') ? 'DOCENTE'
      : roles.includes('ADMINISTRADOR') ? 'ADMINISTRADOR' : 'ESTUDIANTE';
    const profile = { ...current, role: primaryRole, roles: [...roles] };
    if (this.isBrowser) localStorage.setItem(this.USER_KEY, JSON.stringify(profile));
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
    this.cancelExpiration();
    if (this.isBrowser) {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    this._token.set(null);
    this._currentUser.set(null);
  }

  private cancelExpiration(): void {
    if (this.expiryTimer !== undefined) clearTimeout(this.expiryTimer);
    this.expiryTimer = undefined;
  }

  private scheduleExpiration(token: string | null): void {
    this.cancelExpiration();
    if (!this.isBrowser || !token || !this.isTokenValid(token)) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const delay = Math.min(Math.max(payload.exp * 1000 - Date.now(), 0), 2_147_483_647);
      this.expiryTimer = setTimeout(() => {
        if (this._token() !== token) return;
        if (!this.isTokenValid(token)) this.clearSession();
        else this.scheduleExpiration(token);
      }, delay);
    } catch {
      this.clearSession();
    }
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
