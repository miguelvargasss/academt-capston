import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TokenStorageService } from '../../../../../core/services/token-storage.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html'
})
export class NavbarComponent {
  readonly tokenStorage = inject(TokenStorageService);
  readonly currentUser = this.tokenStorage.currentUser;
  readonly userRole = this.tokenStorage.userRole;
  readonly roleLabel = this.tokenStorage.roleLabel;
  readonly userInitials = this.tokenStorage.userInitials;
}
