import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LogoutUseCase } from '../../../application/auth/logout.use-case';
import { TokenStorageService } from '../../../core/services/token-storage.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { ProfileApiService, ProfileResponse } from './profile-api.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private readonly api = inject(ProfileApiService);
  private readonly storage = inject(TokenStorageService);
  private readonly logout = inject(LogoutUseCase);
  private readonly destroy = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly profile = signal<ProfileResponse | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly changingPassword = signal(false);
  readonly profileError = signal<string | null>(null);
  readonly passwordError = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    apellido: ['', [Validators.required, Validators.maxLength(100)]],
    avatarUrl: ['', [Validators.maxLength(500)]],
  });
  readonly passwordForm = this.fb.nonNullable.group({
    contrasenaActual: ['', Validators.required],
    contrasenaNueva: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)]],
    confirmacion: ['', Validators.required],
  });

  ngOnInit(): void {
    this.api.current().pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (profile) => {
        this.applyProfile(profile);
        this.loading.set(false);
      },
      error: (error) => {
        this.profileError.set(apiErrorMessage(error, 'No se pudo cargar el perfil.'));
        this.loading.set(false);
      },
    });
  }

  save(): void {
    if (this.saving() || this.changingPassword()) return;
    this.form.markAllAsTouched();
    const current = this.profile();
    const { nombre, apellido, avatarUrl } = this.form.getRawValue();
    if (this.form.invalid || !current || !nombre.trim() || !apellido.trim()) return;
    this.saving.set(true);
    this.profileError.set(null);
    this.notice.set(null);
    this.api.update(current.id, { nombre: nombre.trim(), apellido: apellido.trim(), avatarUrl: avatarUrl.trim() || null })
      .pipe(takeUntilDestroyed(this.destroy)).subscribe({
        next: (profile) => {
          this.applyProfile(profile);
          this.saving.set(false);
          this.notice.set('Perfil actualizado.');
        },
        error: (error) => {
          this.saving.set(false);
          this.profileError.set(apiErrorMessage(error, 'No se pudo actualizar el perfil.'));
        },
      });
  }

  changePassword(): void {
    if (this.saving() || this.changingPassword()) return;
    this.passwordForm.markAllAsTouched();
    this.passwordError.set(null);
    const current = this.profile();
    const { contrasenaActual, contrasenaNueva, confirmacion } = this.passwordForm.getRawValue();
    if (this.passwordForm.invalid || !current) return;
    if (contrasenaNueva !== confirmacion) {
      this.passwordError.set('Las contraseñas nuevas no coinciden.');
      return;
    }
    if (contrasenaActual === contrasenaNueva) {
      this.passwordError.set('La contraseña nueva debe ser diferente de la actual.');
      return;
    }
    this.changingPassword.set(true);
    this.api.changePassword(current.id, { contrasenaActual, contrasenaNueva })
      .pipe(takeUntilDestroyed(this.destroy)).subscribe({
        next: () => {
          this.passwordForm.reset();
          this.changingPassword.set(false);
          this.logout.execute();
        },
        error: (error) => {
          this.changingPassword.set(false);
          this.passwordError.set(apiErrorMessage(error, 'No se pudo cambiar la contraseña.'));
        },
      });
  }

  private applyProfile(profile: ProfileResponse): void {
    this.profile.set(profile);
    this.form.patchValue({ nombre: profile.nombre, apellido: profile.apellido, avatarUrl: profile.avatarUrl ?? '' });
    this.storage.updateProfile({
      id: profile.id,
      email: profile.correoElectronico,
      fullName: `${profile.nombre} ${profile.apellido}`.trim(),
      avatarUrl: profile.avatarUrl ?? undefined,
      status: profile.estado,
    });
  }
}
