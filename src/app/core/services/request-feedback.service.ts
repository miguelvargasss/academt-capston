import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RequestFeedbackService {
  private readonly pending = signal(0);
  readonly loading = computed(() => this.pending() > 0);
  readonly message = signal<string | null>(null);
  private dismissTimer?: ReturnType<typeof setTimeout>;

  begin(): void { this.pending.update((count) => count + 1); }
  end(): void { this.pending.update((count) => Math.max(0, count - 1)); }

  notify(message: string): void {
    if (this.dismissTimer) clearTimeout(this.dismissTimer);
    this.message.set(message);
    this.dismissTimer = setTimeout(() => this.dismiss(), 8000);
  }

  dismiss(): void {
    if (this.dismissTimer) clearTimeout(this.dismissTimer);
    this.dismissTimer = undefined;
    this.message.set(null);
  }
}
