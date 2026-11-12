import { Component, DestroyRef, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TokenStorageService } from '../../../../../core/services/token-storage.service';
import { environment } from '../../../../../core/config/environment';
import { apiErrorMessage } from '../../../../../core/utils/api-error';

interface NotificationItem { id: string; titulo: string; leida: boolean; fechaCreacion: string; }
interface NotificationPage { content: NotificationItem[]; }

@Component({
  selector: 'app-navbar', standalone: true, imports: [CommonModule], templateUrl: './navbar.component.html',
})
export class NavbarComponent implements OnInit {
  readonly tokenStorage = inject(TokenStorageService);
  private readonly http = inject(HttpClient);
  private readonly destroy = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly url = `${environment.apiUrl}/api/notificaciones`;
  readonly currentUser = this.tokenStorage.currentUser;
  readonly userRole = this.tokenStorage.userRole;
  readonly roleLabel = this.tokenStorage.roleLabel;
  readonly userInitials = this.tokenStorage.userInitials;
  readonly unread = signal<number | null>(null);
  readonly opened = signal(false);
  readonly items = signal<NotificationItem[]>([]);
  readonly loading = signal(false);
  readonly marking = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.browser) return;
    this.refreshCount();
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      this.refreshCount();
      if (this.opened()) this.load();
    }, 30000);
    this.destroy.onDestroy(() => clearInterval(timer));
  }
  refreshCount(): void {
    this.http.get<{ total: number }>(`${this.url}/count-no-leidas`)
      .pipe(takeUntilDestroyed(this.destroy)).subscribe({ next: ({ total }) => this.unread.set(total), error: () => this.unread.set(null) });
  }
  toggle(): void {
    this.opened.update((opened) => !opened);
    if (this.opened()) this.load();
  }
  load(): void {
    if (this.loading()) return;
    this.loading.set(true); this.error.set(null);
    this.http.get<NotificationPage>(this.url, { params: { size: 20, sort: 'fechaCreacion,desc' } })
      .pipe(takeUntilDestroyed(this.destroy)).subscribe({
        next: (result) => { this.items.set(result.content); this.loading.set(false); },
        error: (e) => { this.loading.set(false); this.error.set(apiErrorMessage(e, 'No se pudieron cargar las notificaciones.')); },
      });
  }
  read(item: NotificationItem): void {
    if (item.leida || this.marking()) return;
    this.marking.set(item.id); this.error.set(null);
    this.http.patch(`${this.url}/${encodeURIComponent(item.id)}/leer`, {})
      .pipe(takeUntilDestroyed(this.destroy)).subscribe({
        next: () => { this.marking.set(null); this.items.update((items) => items.map((n) => n.id === item.id ? { ...n, leida: true } : n)); this.refreshCount(); },
        error: (e) => { this.marking.set(null); this.error.set(apiErrorMessage(e, 'No se pudo marcar la notificación como leída.')); },
      });
  }
}
