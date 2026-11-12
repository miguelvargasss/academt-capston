import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TokenStorageService } from '../../../core/services/token-storage.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { ProfileResponse } from '../profile/profile-api.service';
import { AccountStatus, Page, RoleSummary, UserSummary, UsersApiService } from './users-api.service';

@Component({
  selector: 'app-users', standalone: true, imports: [ReactiveFormsModule],
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit {
  private readonly api = inject(UsersApiService);
  private readonly destroy = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  readonly storage = inject(TokenStorageService);
  readonly filters = this.fb.nonNullable.group({ texto: '', estado: '', rol: '' });
  readonly statusForm = this.fb.nonNullable.group({ estado: this.fb.nonNullable.control<AccountStatus>('ACTIVO') });
  readonly page = signal<Page<UserSummary> | null>(null);
  readonly roles = signal<RoleSummary[]>([]);
  readonly selected = signal<ProfileResponse | null>(null);
  readonly selectedRoles = signal<string[]>([]);
  readonly loading = signal(false);
  readonly opening = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly detailError = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  ngOnInit(): void {
    this.load(0);
    this.api.roles().pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (page) => this.roles.set(page.content),
      error: (e) => this.error.set(apiErrorMessage(e, 'No se pudieron cargar los roles.')),
    });
  }
  load(page: number): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.list(page, this.filters.getRawValue()).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (result) => { this.page.set(result); this.loading.set(false); },
      error: (e) => { this.loading.set(false); this.error.set(apiErrorMessage(e, 'No se pudieron cargar los usuarios.')); },
    });
  }
  open(user: UserSummary): void {
    if (this.opening() || this.busy()) return;
    this.opening.set(true);
    this.detailError.set(null);
    this.notice.set(null);
    this.selected.set(null);
    this.api.detail(user.id).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (detail) => { this.applyDetail(detail); this.opening.set(false); },
      error: (e) => { this.opening.set(false); this.error.set(apiErrorMessage(e, 'No se pudo cargar el usuario.')); },
    });
  }
  toggleRole(role: string, checked: boolean): void {
    const roles = new Set(this.selectedRoles());
    if (checked) roles.add(role); else roles.delete(role);
    this.selectedRoles.set([...roles]);
  }
  saveStatus(): void {
    const user = this.selected();
    const status = this.statusForm.getRawValue().estado;
    if (!user || this.busy() || status === user.estado) return;
    this.busy.set(true); this.detailError.set(null); this.notice.set(null);
    this.api.setStatus(user.id, status).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (detail) => { this.applyDetail(detail); this.busy.set(false); this.notice.set('Estado actualizado.'); this.load(this.page()?.number ?? 0); },
      error: (e) => { this.busy.set(false); this.detailError.set(apiErrorMessage(e, 'No se pudo cambiar el estado.')); },
    });
  }
  saveRoles(): void {
    const user = this.selected();
    if (!user || this.busy()) return;
    if (!this.selectedRoles().length) { this.detailError.set('Selecciona al menos un rol.'); return; }
    this.busy.set(true); this.detailError.set(null); this.notice.set(null);
    this.api.setRoles(user.id, this.selectedRoles()).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (detail) => { this.applyDetail(detail); this.busy.set(false); this.notice.set('Roles actualizados.'); this.load(this.page()?.number ?? 0); },
      error: (e) => { this.busy.set(false); this.detailError.set(apiErrorMessage(e, 'No se pudieron cambiar los roles.')); },
    });
  }
  private applyDetail(detail: ProfileResponse): void {
    this.selected.set(detail);
    this.selectedRoles.set([...detail.roles]);
    this.statusForm.patchValue({ estado: detail.estado as AccountStatus });
  }
}
