import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'primary' | 'soft' | 'outline' | 'dark' | 'success';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide transition-colors"
      [ngClass]="variantClasses()"
    >
      <ng-content></ng-content>
    </span>
  `
})
export class BadgeComponent {
  variant = input<BadgeVariant>('soft');

  variantClasses(): string {
    switch (this.variant()) {
      case 'primary':
        return 'bg-primary text-white';
      case 'soft':
        return 'bg-primary-soft text-accent-dark font-semibold';
      case 'outline':
        return 'border border-app-border text-text-secondary bg-white';
      case 'dark':
        return 'bg-sidebar text-white';
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      default:
        return 'bg-primary-soft text-accent-dark';
    }
  }
}
