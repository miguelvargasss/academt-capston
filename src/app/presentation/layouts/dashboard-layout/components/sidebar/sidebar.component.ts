import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TokenStorageService } from '../../../../../core/services/token-storage.service';
import { LogoutUseCase } from '../../../../../application/auth/logout.use-case';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  readonly tokenStorage = inject(TokenStorageService);
  private readonly logoutUseCase = inject(LogoutUseCase);

  readonly currentUser = this.tokenStorage.currentUser;
  readonly userRole = this.tokenStorage.userRole;
  readonly roleLabel = this.tokenStorage.roleLabel;
  readonly userInitials = this.tokenStorage.userInitials;

  onLogout(): void {
    this.logoutUseCase.execute();
  }
}
