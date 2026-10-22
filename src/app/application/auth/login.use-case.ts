import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AUTH_REPOSITORY } from '../../core/tokens/repository.tokens';
import { AuthCredentials, AuthSession } from '../../domain/models/auth.model';
import { TokenStorageService } from '../../core/services/token-storage.service';

@Injectable({
  providedIn: 'root'
})
export class LoginUseCase {
  private readonly authRepository = inject(AUTH_REPOSITORY);
  private readonly tokenStorage = inject(TokenStorageService);

  execute(credentials: AuthCredentials, displayName?: string): Observable<AuthSession> {
    return this.authRepository.login(credentials).pipe(
      tap(session => {
        this.tokenStorage.saveSession(session, displayName);
      })
    );
  }
}
