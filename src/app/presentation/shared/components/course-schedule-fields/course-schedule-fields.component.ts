import { Component, forwardRef, input, output, signal } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  Validator,
  ValidationErrors,
} from '@angular/forms';
import {
  WeeklySlot,
  Weekday,
  WEEKDAYS,
  scheduleError,
} from '../../../../domain/models/course-schedule.model';
@Component({
  selector: 'app-course-schedule-fields',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CourseScheduleFieldsComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => CourseScheduleFieldsComponent),
      multi: true,
    },
  ],
  template: `<div class="schedule-editor">
    <div class="heading"><strong>Sesiones semanales</strong><span>America/Lima · UTC−5</span></div>
    <div class="slots">
      @for (slot of slots(); track $index; let i = $index) {
        <div class="slot">
          <label
            >Día<select
              [attr.aria-label]="'Día de la sesión ' + (i + 1)"
              [value]="slot.day"
              [disabled]="disabled()"
              (change)="day(i, $event)"
              (blur)="touch()"
            >
              <option value="">Seleccionar día</option>
              @for (d of days; track d.id) {
                <option [value]="d.id">{{ d.label }}</option>
              }
            </select></label
          ><label
            >Inicio<input
              type="time"
              step="60"
              [attr.aria-label]="'Hora de inicio de la sesión ' + (i + 1)"
              [value]="slot.startTime"
              [disabled]="disabled()"
              (input)="time(i, 'startTime', $event)"
              (blur)="touch()" /></label
          ><label
            >Fin<input
              type="time"
              step="60"
              [attr.aria-label]="'Hora de fin de la sesión ' + (i + 1)"
              [value]="slot.endTime"
              [disabled]="disabled()"
              (input)="time(i, 'endTime', $event)"
              (blur)="touch()" /></label
          ><button
            type="button"
            class="remove"
            [attr.aria-label]="'Quitar sesión ' + (i + 1)"
            [disabled]="disabled() || slots().length === 1"
            (click)="remove(i)"
          >
            ×
          </button>
        </div>
      }
    </div>
    <button
      type="button"
      class="add"
      [disabled]="disabled() || slots().length >= 21"
      (click)="add()"
    >
      + Añadir otra sesión
    </button>
    <p class="help">
      Se repetirá cada semana entre las fechas del curso y aparecerá en Horarios para el docente y
      sus alumnos inscritos.
    </p>
    @if (showErrors() && error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
  </div>`,
  styles: `
    :host {
      display: block;
    }
    .schedule-editor {
      padding: 1rem;
      border: 1px solid var(--color-app-border);
      border-radius: 0.9rem;
      background: var(--color-app-bg);
    }
    .heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
      font-size: 0.75rem;
    }
    .heading span {
      font-size: 0.6rem;
      color: var(--color-text-secondary);
    }
    .slots {
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
    }
    .slot {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) 1.5rem;
      gap: 0.6rem;
      align-items: end;
    }
    label {
      font-size: 0.65rem;
      font-weight: 650;
      color: var(--color-text-secondary);
      min-width: 0;
    }
    input,
    select {
      display: block;
      width: 100%;
      min-width: 0;
      margin-top: 0.35rem;
      padding: 0.6rem 0.5rem;
      border: 1px solid var(--color-app-border);
      border-radius: 0.6rem;
      background: white;
      font-size: 0.75rem;
      color: var(--color-text-main);
    }
    input:focus,
    select:focus {
      outline: 2px solid var(--color-primary-soft);
      border-color: var(--color-primary);
    }
    .remove {
      font-size: 1.3rem;
      height: 2.3rem;
      color: var(--color-text-secondary);
      cursor: pointer;
    }
    .add {
      display: block;
      margin-top: 1rem;
      color: var(--color-primary);
      font-size: 0.7rem;
      font-weight: 650;
      cursor: pointer;
    }
    .help {
      color: var(--color-text-secondary);
      font-size: 0.65rem;
      line-height: 1.8;
      margin-top: 0.75rem;
    }
    .error {
      color: #b91c1c;
      font-size: 0.7rem;
      margin-top: 0.6rem;
      line-height: 1.7;
    }
    button:disabled,
    input:disabled,
    select:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    @media (max-width: 480px) {
      .slot {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 1.5rem;
      }
      .slot label:first-child {
        grid-column: 1/4;
      }
      .heading {
        align-items: start;
        flex-direction: column;
      }
    }
  `,
})
export class CourseScheduleFieldsComponent implements ControlValueAccessor, Validator {
  readonly showErrors = input(false);
  readonly disabled = signal(false);
  readonly slots = signal<WeeklySlot[]>([{ day: '', startTime: '', endTime: '' }]);
  readonly days = WEEKDAYS;
  private changed: (value: WeeklySlot[]) => void = () => {};
  private touched: () => void = () => {};
  private revalidate: () => void = () => {};
  writeValue(value: WeeklySlot[] | null): void {
    this.slots.set(
      value?.length
        ? value.map((s) => ({
            ...s,
            startTime: s.startTime.slice(0, 5),
            endTime: s.endTime.slice(0, 5),
          }))
        : [{ day: '', startTime: '', endTime: '' }],
    );
  }
  registerOnChange(fn: (value: WeeklySlot[]) => void): void {
    this.changed = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.touched = fn;
  }
  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }
  validate(): ValidationErrors | null {
    const error = this.error();
    return error ? { schedule: error } : null;
  }
  registerOnValidatorChange(fn: () => void): void {
    this.revalidate = fn;
  }
  error(): string | null {
    return scheduleError(this.slots());
  }
  touch(): void {
    this.touched();
  }
  private emit(): void {
    this.changed(this.slots());
    this.revalidate();
    this.touched();
  }
  day(index: number, event: Event): void {
    this.change(index, { day: (event.target as HTMLSelectElement).value as Weekday | '' });
  }
  time(index: number, key: 'startTime' | 'endTime', event: Event): void {
    this.change(index, { [key]: (event.target as HTMLInputElement).value });
  }
  private change(index: number, value: Partial<WeeklySlot>): void {
    if (this.disabled()) return;
    this.slots.update((list) =>
      list.map((slot, i) => (i === index ? { ...slot, ...value } : slot)),
    );
    this.emit();
  }
  add(): void {
    if (this.disabled() || this.slots().length >= 21) return;
    this.slots.update((list) => [...list, { day: '', startTime: '', endTime: '' }]);
    this.emit();
  }
  remove(index: number): void {
    if (this.disabled() || this.slots().length === 1) return;
    this.slots.update((list) => list.filter((_, i) => i !== index));
    this.emit();
  }
}
