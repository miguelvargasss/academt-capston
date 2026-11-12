import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { DISPLAYED_TERMS_VERSION, hasDisplayedRoles, TermsService, TermsStatus } from '../../../core/services/terms.service';
import { TokenStorageService } from '../../../core/services/token-storage.service';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './terms.component.html',
})
export class TermsComponent implements OnInit {
  private readonly terms = inject(TermsService);
  private readonly session = inject(TokenStorageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);

  readonly displayedVersion = DISPLAYED_TERMS_VERSION;
  readonly status = signal<TermsStatus | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly versionMatches = computed(() => this.status()?.version === this.displayedVersion);
  readonly roles = computed(() => Array.isArray(this.status()?.roles) ? this.status()!.roles : []);
  readonly rolesKnown = computed(() => !!this.status() && hasDisplayedRoles(this.status()?.roles));
  readonly isStudent = computed(() => this.roles().includes('ESTUDIANTE'));
  readonly isTeacher = computed(() => this.roles().includes('DOCENTE'));
  readonly isAdmin = computed(() => this.roles().includes('ADMINISTRADOR'));
  confirmed = false;

  ngOnInit(): void { this.load(); }

  load(): void {
    if (this.loading() || this.saving()) return;
    this.loading.set(true);
    this.error.set(null);
    this.status.set(null);
    this.confirmed = false;
    this.terms.status().pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (status) => {
        this.status.set(status);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo consultar el estado de los términos. Comprueba tu conexión e inténtalo de nuevo.');
      },
    });
  }

  accept(): void {
    if (!this.confirmed || !this.status() || !this.versionMatches() || !this.rolesKnown() || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    this.terms.accept([...this.roles()]).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (status) => {
        this.saving.set(false);
        if (!status.aceptado || status.version !== this.displayedVersion) {
          this.status.set(status);
          this.confirmed = false;
          this.error.set('Los términos cambiaron. Actualiza la aplicación y revisa la versión vigente antes de aceptar.');
          return;
        }
        this.status.set(status);
        this.continue();
      },
      error: (error: { status?: number }) => {
        this.saving.set(false);
        if (error.status === 409) {
          this.load();
          return;
        }
        this.error.set('No se pudo registrar tu aceptación. Inténtalo de nuevo.');
      },
    });
  }

  continue(): void {
    if (!this.status()?.aceptado || !this.versionMatches()) return;
    const requested = this.route.snapshot.queryParamMap.get('volver');
    const destination = requested && requested.startsWith('/') && !requested.startsWith('//') &&
      !requested.startsWith('/terminos') && !requested.startsWith('/login') ? requested : '/dashboard';
    void this.router.navigateByUrl(destination);
  }

  logout(): void {
    if (this.saving()) return;
    this.session.clearSession();
    void this.router.navigate(['/login']);
  }
}
