import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TokenStorageService } from '../../core/services/token-storage.service';

@Injectable({
  providedIn: 'root'
})
export class LogoutUseCase {
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly router = inject(Router);

  execute(): void {
    this.tokenStorage.clearSession();
    this.router.navigate(['/login']);
  }
}
