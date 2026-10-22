import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginUseCase } from '../../../../application/auth/login.use-case';
import { UserRole } from '../../../../domain/models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly loginUseCase = inject(LoginUseCase);
  private readonly router = inject(Router);

  // Rol seleccionado en la UI: 'ESTUDIANTE' o 'DOCENTE'
  selectedRole = signal<'ESTUDIANTE' | 'DOCENTE'>('ESTUDIANTE');
  showPassword = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  loginForm = this.fb.group({
    correoElectronico: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(6)]],
    recordarme: [false]
  });

  selectRole(role: 'ESTUDIANTE' | 'DOCENTE'): void {
    this.selectedRole.set(role);
  }

  toggleShowPassword(): void {
    this.showPassword.update(prev => !prev);
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isLoading()) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { correoElectronico, contrasena } = this.loginForm.value;
    const role = this.selectedRole();

    this.loginUseCase.execute({
      correoElectronico: correoElectronico!,
      contrasena: contrasena!,
      selectedRole: role
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set('Credenciales incorrectas o servidor no disponible. Inténtalo nuevamente.');
      }
    });
  }
}
