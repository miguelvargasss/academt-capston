import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ManageCourseUseCase } from '../../../../application/courses/manage-course.use-case';
import { WeeklySlot } from '../../../../domain/models/course-schedule.model';
import { apiErrorMessage } from '../../../../core/utils/api-error';
import { CourseScheduleFieldsComponent } from '../../../shared/components/course-schedule-fields/course-schedule-fields.component';
@Component({
  selector: 'app-course-schedule-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, CourseScheduleFieldsComponent],
  template: `<dialog #dialog aria-labelledby="course-schedule-title" (cancel)="cancel($event)">
    <form [formGroup]="form" (ngSubmit)="save()" novalidate>
      <header>
        <div>
          <p class="eyebrow">PLANIFICACIÓN SEMANAL</p>
          <h2 id="course-schedule-title">Horario del curso</h2>
          <p class="subtitle">{{ title() }}</p>
        </div>
        <button
          type="button"
          class="close"
          aria-label="Cerrar horarios"
          [disabled]="busy()"
          (click)="cancel()"
        >
          ×
        </button>
      </header>
      <div class="body">
        @if (error()) {
          <div class="error" role="alert">{{ error() }}</div>
        }
        @if (loading()) {
          <p class="help" role="status">Cargando horario…</p>
        } @else if (!loaded()) {
          <button type="button" class="btn" (click)="load()">Reintentar</button>
        } @else {
          <fieldset [disabled]="busy()" [inert]="busy()">
            @if (legacy() && !form.controls.slots.value.length) {
              <p class="help mb-4">
                Horario anterior: {{ legacy() }}. Selecciona sus días y horas para incorporarlo a la
                agenda.
              </p>
            }
            <app-course-schedule-fields
              formControlName="slots"
              [showErrors]="form.controls.slots.touched"
            />
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
              <div>
                <label for="schedule-start">Inicio del curso</label
                ><input
                  class="field"
                  id="schedule-start"
                  type="date"
                  formControlName="startsOn"
                  required
                />
              </div>
              <div>
                <label for="schedule-end">Fin del curso (opcional)</label
                ><input class="field" id="schedule-end" type="date" formControlName="endsOn" />
              </div>
            </div>
            @if (form.hasError('dateRange')) {
              <p class="field-error">La fecha de fin no puede ser anterior a la de inicio.</p>
            }
            <p class="help">
              El cambio se reflejará en Horarios y en la agenda de los alumnos inscritos.
            </p>
          </fieldset>
        }
      </div>
      <footer>
        <button type="button" class="btn" [disabled]="busy()" (click)="cancel()">Cancelar</button
        ><button type="submit" class="btn primary" [disabled]="busy() || !loaded()">
          {{ busy() ? 'Guardando…' : 'Guardar horario' }}
        </button>
      </footer>
    </form>
  </dialog>`,
  styleUrl: '../../../shared/styles/management-dialog.css',
})
export class CourseScheduleDialogComponent implements OnInit, AfterViewInit {
  readonly courseId = input.required<string>();
  readonly title = input.required<string>();
  readonly legacy = input<string | null>(null);
  readonly closed = output<void>();
  readonly saved = output<void>();
  readonly busy = signal(false);
  readonly loading = signal(true);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);
  private readonly manage = inject(ManageCourseUseCase);
  private readonly destroy = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  @ViewChild('dialog') private dialog!: ElementRef<HTMLDialogElement>;
  readonly form = this.fb.nonNullable.group(
    {
      startsOn: ['', Validators.required],
      endsOn: [''],
      slots: this.fb.nonNullable.control<WeeklySlot[]>([], Validators.required),
    },
    {
      validators: (c: AbstractControl) =>
        c.get('startsOn')?.value &&
        c.get('endsOn')?.value &&
        c.get('endsOn')!.value < c.get('startsOn')!.value
          ? { dateRange: true }
          : null,
    },
  );
  ngOnInit(): void {
    this.load();
  }
  ngAfterViewInit(): void {
    this.dialog.nativeElement.showModal();
  }
  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.manage
      .getSchedule(this.courseId())
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (p) => {
          this.form.patchValue({
            startsOn: p.startsOn ?? '',
            endsOn: p.endsOn ?? '',
            slots: p.slots,
          });
          this.loaded.set(true);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(apiErrorMessage(e, 'No se pudo cargar el horario.'));
          this.loading.set(false);
        },
      });
  }
  cancel(event?: Event): void {
    event?.preventDefault();
    if (!this.busy()) this.closed.emit();
  }
  save(): void {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Revisa los días, las horas y la fecha de inicio del curso.');
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);
    this.manage
      .saveSchedule(this.courseId(), {
        startsOn: v.startsOn,
        endsOn: v.endsOn || null,
        slots: v.slots,
      })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.saved.emit();
        },
        error: (e) => {
          this.error.set(apiErrorMessage(e, 'No se pudo guardar el horario.'));
          this.busy.set(false);
        },
      });
  }
}
