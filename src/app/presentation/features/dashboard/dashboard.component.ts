import {
  Component,
  DestroyRef,
  NgZone,
  afterNextRender,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { GetDashboardStatsUseCase } from '../../../application/dashboard/get-dashboard-stats.use-case';
import { TokenStorageService } from '../../../core/services/token-storage.service';
import {
  DashboardMetrics,
  QuickTask,
  ScheduledClass,
} from '../../../domain/models/dashboard-stats.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { BadgeComponent } from '../../shared/components/badge/badge.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, BadgeComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly dashboardStatsUseCase = inject(GetDashboardStatsUseCase);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly currentUser = this.tokenStorage.currentUser;
  readonly userRole = this.tokenStorage.userRole;
  readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly destroy = inject(DestroyRef);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  // Estados reactivos con Signals
  metrics = signal<DashboardMetrics | null>(null);
  upcomingTasks = signal<QuickTask[]>([]);
  todayClasses = signal<ScheduledClass[]>([]);

  constructor() {
    const zone = inject(NgZone);
    afterNextRender(() =>
      zone.runOutsideAngular(() => {
        const synchronize = () => {
          if (document.visibilityState === 'visible' && !this.loading()) this.load();
        };
        window.addEventListener('focus', synchronize);
        const timer = window.setInterval(synchronize, 30000);
        this.destroy.onDestroy(() => {
          window.removeEventListener('focus', synchronize);
          window.clearInterval(timer);
        });
      }),
    );
  }
  ngOnInit(): void {
    this.load();
  }
  load(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.dashboardStatsUseCase
      .getSummary()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (s) => {
          this.metrics.set(s.metrics);
          this.upcomingTasks.set(s.tasks);
          this.todayClasses.set(s.classes);
          this.loading.set(false);
        },
        error: (e) => {
          this.metrics.set(null);
          this.upcomingTasks.set([]);
          this.todayClasses.set([]);
          this.error.set(apiErrorMessage(e, 'No se pudo actualizar tu dashboard.'));
          this.loading.set(false);
        },
      });
  }
}
