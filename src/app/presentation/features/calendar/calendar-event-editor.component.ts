import { AfterViewInit, Component, DestroyRef, ElementRef, OnInit, ViewChild, inject, input, output, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../core/config/environment';
import { apiErrorMessage } from '../../../core/utils/api-error';

type EventType = 'CLASE' | 'TAREA' | 'EXAMEN' | 'TUTORIA' | 'REUNION' | 'OTRO';
interface EventDetails {
  id: string; titulo: string; descripcion: string | null; tipo: EventType;
  inicio: string; fin: string | null; sala: string | null;
}

@Component({
  selector: 'app-calendar-event-editor', standalone: true, imports: [ReactiveFormsModule],
  templateUrl: './calendar-event-editor.component.html',
})
export class CalendarEventEditorComponent implements OnInit, AfterViewInit {
  readonly eventId = input<string | null>(null);
  readonly closed = output<void>();
  readonly saved = output<void>();
  @ViewChild('dialog') private dialog!: ElementRef<HTMLDialogElement>;
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly destroy = inject(DestroyRef);
  private readonly base = `${environment.apiUrl}/api/eventos`;
  readonly loading = signal(false);
  readonly ready = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly confirmingDelete = signal(false);
  readonly form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.maxLength(200)]],
    descripcion: [''],
    tipo: this.fb.nonNullable.control<EventType>('OTRO', Validators.required),
    inicio: ['', Validators.required],
    fin: [''],
    sala: ['', Validators.maxLength(100)],
  });

  ngOnInit(): void {
    const id = this.eventId();
    if (!id) { this.ready.set(true); return; }
    this.loading.set(true);
    this.http.get<EventDetails>(`${this.base}/${encodeURIComponent(id)}`)
      .pipe(takeUntilDestroyed(this.destroy)).subscribe({
        next: (event) => {
          this.form.patchValue({ ...event, descripcion: event.descripcion ?? '', fin: event.fin ?? '', sala: event.sala ?? '' });
          this.ready.set(true);
          this.loading.set(false);
        },
        error: (e) => { this.loading.set(false); this.error.set(apiErrorMessage(e, 'No se pudo cargar el evento.')); },
      });
  }
  ngAfterViewInit(): void { this.dialog.nativeElement.showModal(); }
  cancel(event?: Event): void { event?.preventDefault(); if (!this.busy()) this.closed.emit(); }
  submit(): void {
    if (this.busy() || this.loading() || !this.ready()) return;
    this.form.markAllAsTouched();
    this.error.set(null);
    const data = this.form.getRawValue();
    if (this.form.invalid || !data.titulo.trim()) return;
    if (data.fin && data.fin <= data.inicio) {
      this.error.set('La fecha de fin debe ser posterior al inicio.');
      return;
    }
    const body = {
      titulo: data.titulo.trim(), descripcion: data.descripcion.trim() || null,
      tipo: data.tipo, inicio: data.inicio, fin: data.fin || null, sala: data.sala.trim() || null,
    };
    const id = this.eventId();
    this.busy.set(true);
    const request = id
      ? this.http.put<EventDetails>(`${this.base}/${encodeURIComponent(id)}`, body)
      : this.http.post<EventDetails>(this.base, { ...body, cursoId: null });
    request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => { this.busy.set(false); this.saved.emit(); },
      error: (e) => { this.busy.set(false); this.error.set(apiErrorMessage(e, 'No se pudo guardar el evento.')); },
    });
  }
  remove(): void {
    const id = this.eventId();
    if (!id || this.busy() || !this.ready()) return;
    if (!this.confirmingDelete()) { this.confirmingDelete.set(true); return; }
    this.busy.set(true); this.error.set(null);
    this.http.delete<void>(`${this.base}/${encodeURIComponent(id)}`).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => { this.busy.set(false); this.saved.emit(); },
      error: (e) => { this.busy.set(false); this.error.set(apiErrorMessage(e, 'No se pudo eliminar el evento.')); },
    });
  }
}
