import { Component, input, output } from '@angular/core';
import { CourseIconComponent } from '../../shared/components/course-icon/course-icon.component';
import { formatPhone } from './student-utils';
@Component({
  selector: 'app-student-created-card',
  standalone: true,
  imports: [CourseIconComponent],
  template: `<section id="student-created-card" aria-label="Credenciales del alumno creado">
    <div class="symbol"><app-course-icon name="check" /></div>
    <div class="info">
      <p class="eyebrow">CUENTA CREADA</p>
      <h2>{{ credentials().name }} ya puede ingresar</h2>
      <p>{{ credentials().email }} · +51 {{ formatPhone(credentials().phone) }}</p>
      <small>Comparte su contraseña inicial antes de cerrar esta tarjeta.</small
      ><a
        [href]="credentials().whatsAppUrl"
        target="_blank"
        rel="noopener noreferrer"
        referrerpolicy="no-referrer"
        >Enviar credenciales por WhatsApp<app-course-icon name="external"
      /></a>
    </div>
    <button aria-label="Cerrar tarjeta de credenciales" (click)="closed.emit()">×</button>
  </section>`,
  styles: `
    :host {
      display: contents;
    }
    section {
      position: fixed;
      right: 1.5rem;
      bottom: 1.5rem;
      z-index: 40;
      width: min(480px, calc(100vw - 3rem));
      display: flex;
      gap: 1rem;
      border: 1px solid #bbf7d0;
      border-radius: 1rem;
      background: #f8fdf9;
      padding: 1.5rem;
      box-shadow: var(--shadow-elevation);
    }
    .symbol {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      background: #dcfce7;
      color: #166534;
      border-radius: 0.8rem;
      flex-shrink: 0;
    }
    .info {
      flex: 1;
      min-width: 0;
    }
    .eyebrow {
      font-size: 0.6rem;
      letter-spacing: 0.14em;
      font-weight: 700;
      color: #166534;
      margin-bottom: 0.5rem;
    }
    h2 {
      font-weight: 700;
      font-size: 1rem;
    }
    p:not(.eyebrow) {
      font-size: 0.75rem;
      margin-top: 0.5rem;
      overflow-wrap: anywhere;
    }
    small {
      display: block;
      color: var(--color-text-secondary);
      font-size: 0.7rem;
      margin-top: 0.4rem;
      line-height: 1.7;
    }
    a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      background: #166534;
      color: white;
      border-radius: 0.65rem;
      padding: 0.7rem 1rem;
      font-size: 0.75rem;
      font-weight: 650;
      margin-top: 1rem;
      text-decoration: none;
    }
    button {
      font-size: 1.4rem;
      align-self: flex-start;
      cursor: pointer;
      color: var(--color-text-secondary);
    }
    a:focus-visible,
    button:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 3px;
    }
    @media (max-width: 480px) {
      section {
        padding: 1rem;
      }
      .symbol {
        display: none;
      }
    }
  `,
})
export class StudentCreatedCardComponent {
  readonly credentials = input.required<{
    name: string;
    email: string;
    phone: string;
    whatsAppUrl: string;
  }>();
  readonly closed = output<void>();
  readonly formatPhone = formatPhone;
}
