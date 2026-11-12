import { Component, DestroyRef, OnInit, inject, output, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../core/config/environment';
import { TokenStorageService } from '../../../core/services/token-storage.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { UserRole } from '../../../domain/models/user.model';

type Day = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
type TutoringStatus = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA' | 'COMPLETADA';
interface Page<T> { content: T[]; number: number; totalPages: number; totalElements: number; }
interface Block { id: string; docenteId: string; diaSemana: Day; horaInicio: string; horaFin: string; bloqueada: boolean; }
interface Course { id: string; titulo: string; docenteId: string; }
interface Tutoring { id: string; estudianteId: string; estudianteNombreCompleto: string; docenteId: string; docenteNombreCompleto: string; cursoTitulo: string | null; fecha: string; duracionMinutos: number; estado: TutoringStatus; }
interface TutoringDetails extends Tutoring { notas: string | null; }
interface Teacher { id: string; nombre: string; apellido: string; }

@Component({ selector: 'app-tutoring-manager', standalone: true, imports: [ReactiveFormsModule], templateUrl: './tutoring-manager.component.html' })
export class TutoringManagerComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly destroy = inject(DestroyRef);
  readonly storage = inject(TokenStorageService);
  readonly changed = output<void>();
  private readonly base = `${environment.apiUrl}/api`;
  readonly days: { value: Day; label: string }[] = [
    { value: 'MONDAY', label: 'Lunes' }, { value: 'TUESDAY', label: 'Martes' },
    { value: 'WEDNESDAY', label: 'Miércoles' }, { value: 'THURSDAY', label: 'Jueves' },
    { value: 'FRIDAY', label: 'Viernes' }, { value: 'SATURDAY', label: 'Sábado' },
    { value: 'SUNDAY', label: 'Domingo' },
  ];
  readonly blocks = signal<Page<Block> | null>(null);
  readonly tutorings = signal<Page<Tutoring> | null>(null);
  readonly courses = signal<Course[]>([]);
  readonly available = signal<Block[]>([]);
  readonly editing = signal<Block | null>(null);
  readonly editingTutoring = signal<TutoringDetails | null>(null);
  readonly loadingDetails = signal(false);
  readonly selectedTeacher = signal('');
  readonly teachers = signal<Teacher[]>([]);
  readonly teacherPage = signal<Page<Teacher> | null>(null);
  readonly loadingTeachers = signal(false);
  readonly deletingBlock = signal<string | null>(null);
  readonly loadingBlocks = signal(false);
  readonly loadingTutorings = signal(false);
  readonly loadingAvailable = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly availabilityForm = this.fb.nonNullable.group({
    diaSemana: this.fb.nonNullable.control<Day>('MONDAY', Validators.required),
    horaInicio: ['', Validators.required], horaFin: ['', Validators.required],
    bloqueada: [false],
  });
  readonly tutoringForm = this.fb.nonNullable.group({
    cursoId: ['', Validators.required], fecha: ['', Validators.required],
    duracionMinutos: this.fb.nonNullable.control(30, [Validators.required, Validators.min(15), Validators.max(240)]),
  });
  readonly editTutoringForm = this.fb.nonNullable.group({
    fecha: ['', Validators.required],
    duracionMinutos: this.fb.nonNullable.control(30, [Validators.required, Validators.min(15), Validators.max(240)]),
    notas: [''],
  });

  hasRole(role: UserRole): boolean {
    const user = this.storage.currentUser();
    return !!user && (user.role === role || !!user.roles?.includes(role));
  }
  get isTeacher(): boolean { return this.hasRole('DOCENTE'); }
  get isStudent(): boolean { return this.hasRole('ESTUDIANTE'); }
  get canManageBlocks(): boolean { return this.isTeacher || this.storage.isAdmin(); }
  get selectableTeachers(): Teacher[] { return this.teachers().filter((teacher) => teacher.id !== this.storage.currentUser()?.id || !this.isTeacher); }
  ngOnInit(): void {
    this.loadTutorings(0);
    if (this.isTeacher) {
      this.selectedTeacher.set(this.storage.currentUser()?.id ?? '');
      this.loadBlocks(0);
    }
    if (this.storage.isAdmin()) this.loadTeachers(0);
    if (this.isStudent) this.http.get<Course[]>(`${this.base}/cursos/mis-cursos`).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (courses) => this.courses.set(courses),
      error: (e) => this.error.set(apiErrorMessage(e, 'No se pudieron cargar tus cursos.')),
    });
  }
  loadTeachers(page: number): void {
    if (!this.storage.isAdmin() || this.loadingTeachers()) return;
    this.loadingTeachers.set(true);
    this.http.get<Page<Teacher>>(`${this.base}/usuarios`, { params: { rol: 'DOCENTE', estado: 'ACTIVO', page, size: 20 } }).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (result) => {
        this.teacherPage.set(result);
        this.teachers.update((current) => page === 0 ? result.content : [...current, ...result.content.filter((teacher) => !current.some((t) => t.id === teacher.id))]);
        this.loadingTeachers.set(false);
      },
      error: (e) => { this.loadingTeachers.set(false); this.error.set(apiErrorMessage(e, 'No se pudieron cargar los docentes.')); },
    });
  }
  selectTeacher(event: Event): void {
    if (!this.storage.isAdmin() || this.busy()) return;
    this.selectedTeacher.set((event.target as HTMLSelectElement).value);
    this.blocks.set(null); this.cancelEdit(); this.deletingBlock.set(null);
    if (this.selectedTeacher()) this.loadBlocks(0);
  }
  loadBlocks(page: number): void {
    const id = this.selectedTeacher();
    if (!id || this.loadingBlocks()) return;
    this.loadingBlocks.set(true);
    this.http.get<Page<Block>>(`${this.base}/disponibilidades`, { params: { docenteId: id, page, size: 20 } }).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (blocks) => { this.loadingBlocks.set(false); if (this.selectedTeacher() === id) this.blocks.set(blocks); else if (this.selectedTeacher()) this.loadBlocks(0); },
      error: (e) => { this.loadingBlocks.set(false); if (this.selectedTeacher() === id) this.error.set(apiErrorMessage(e, 'No se pudo cargar la disponibilidad.')); else if (this.selectedTeacher()) this.loadBlocks(0); },
    });
  }
  edit(block: Block): void {
    this.editing.set(block); this.error.set(null); this.notice.set(null);
    this.availabilityForm.setValue({ diaSemana: block.diaSemana, horaInicio: block.horaInicio.slice(0, 5), horaFin: block.horaFin.slice(0, 5), bloqueada: block.bloqueada });
  }
  cancelEdit(): void {
    this.editing.set(null);
    this.availabilityForm.reset({ diaSemana: 'MONDAY', horaInicio: '', horaFin: '', bloqueada: false });
  }
  saveBlock(): void {
    const teacherId = this.selectedTeacher();
    if (!this.canManageBlocks || !teacherId || this.busy()) return;
    if (!this.storage.isAdmin() && teacherId !== this.storage.currentUser()?.id) return;
    this.availabilityForm.markAllAsTouched();
    if (this.availabilityForm.invalid) return;
    const data = this.availabilityForm.getRawValue();
    if (data.horaFin <= data.horaInicio) { this.error.set('La hora de fin debe ser posterior al inicio.'); return; }
    this.busy.set(true); this.error.set(null); this.notice.set(null);
    const block = this.editing();
    const request = block
      ? this.http.put(`${this.base}/disponibilidades/${encodeURIComponent(block.id)}`, data)
      : this.http.post(`${this.base}/disponibilidades`, { docenteId: teacherId, diaSemana: data.diaSemana, horaInicio: data.horaInicio, horaFin: data.horaFin });
    request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => { this.busy.set(false); this.cancelEdit(); this.notice.set('Disponibilidad guardada.'); this.loadBlocks(this.blocks()?.number ?? 0); },
      error: (e) => { this.busy.set(false); this.error.set(apiErrorMessage(e, 'No se pudo guardar la disponibilidad.')); },
    });
  }
  removeBlock(block: Block): void {
    if (!this.storage.isAdmin() || this.busy() || block.docenteId !== this.selectedTeacher()) return;
    if (this.deletingBlock() !== block.id) { this.deletingBlock.set(block.id); return; }
    this.busy.set(true); this.error.set(null); this.notice.set(null);
    this.http.delete(`${this.base}/disponibilidades/${encodeURIComponent(block.id)}`).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => { this.busy.set(false); this.deletingBlock.set(null); this.cancelEdit(); this.notice.set('Disponibilidad eliminada.'); this.loadBlocks(this.blocks()?.number ?? 0); },
      error: (e) => { this.busy.set(false); this.deletingBlock.set(null); this.error.set(apiErrorMessage(e, 'No se pudo eliminar la disponibilidad.')); },
    });
  }
  loadTutorings(page: number): void {
    if (this.loadingTutorings()) return;
    this.loadingTutorings.set(true);
    this.http.get<Page<Tutoring>>(`${this.base}/tutorias`, { params: { page, size: 20, sort: 'fecha,desc' } }).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (result) => { this.tutorings.set(result); this.loadingTutorings.set(false); },
      error: (e) => { this.loadingTutorings.set(false); this.error.set(apiErrorMessage(e, 'No se pudieron cargar las tutorías.')); },
    });
  }
  selectCourse(): void {
    const course = this.courses().find((item) => item.id === this.tutoringForm.controls.cursoId.value);
    this.available.set([]); this.loadingAvailable.set(false);
    if (!course) return;
    this.loadingAvailable.set(true);
    this.http.get<Page<Block>>(`${this.base}/disponibilidades`, { params: { docenteId: course.docenteId, bloqueada: false, size: 100 } }).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (result) => { if (this.tutoringForm.controls.cursoId.value === course.id) { this.available.set(result.content); this.loadingAvailable.set(false); } },
      error: (e) => { if (this.tutoringForm.controls.cursoId.value === course.id) { this.loadingAvailable.set(false); this.error.set(apiErrorMessage(e, 'No se pudo cargar la disponibilidad del docente.')); } },
    });
  }
  requestTutoring(): void {
    const student = this.storage.currentUser();
    const data = this.tutoringForm.getRawValue();
    const course = this.courses().find((item) => item.id === data.cursoId);
    if (!student || !this.isStudent || this.busy()) return;
    this.tutoringForm.markAllAsTouched();
    if (this.tutoringForm.invalid || !course) return;
    if (!Number.isInteger(Number(data.duracionMinutos))) { this.error.set('La duración debe ser un número entero de minutos.'); return; }
    const date = new Date(`${data.fecha}:00-05:00`);
    if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) { this.error.set('La fecha de la tutoría debe ser futura.'); return; }
    const time = data.fecha.split('T')[1]?.split(':').map(Number);
    if (!time || time[0] * 60 + time[1] + Number(data.duracionMinutos) >= 24 * 60) { this.error.set('La tutoría debe terminar antes de la medianoche.'); return; }
    this.busy.set(true); this.error.set(null); this.notice.set(null);
    this.http.post(`${this.base}/tutorias`, { estudianteId: student.id, docenteId: course.docenteId, cursoId: course.id, fecha: data.fecha, duracionMinutos: Number(data.duracionMinutos) }).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => { this.busy.set(false); this.notice.set('Tutoría solicitada.'); this.tutoringForm.reset({ cursoId: '', fecha: '', duracionMinutos: 30 }); this.available.set([]); this.loadTutorings(0); this.changed.emit(); },
      error: (e) => { this.busy.set(false); this.error.set(apiErrorMessage(e, 'No se pudo solicitar la tutoría.')); },
    });
  }
  changeStatus(item: Tutoring, status: TutoringStatus): void {
    if (this.busy()) return;
    const id = this.storage.currentUser()?.id;
    if (!this.storage.isAdmin() && id !== item.estudianteId && id !== item.docenteId) return;
    if (status === 'COMPLETADA' && !this.storage.isAdmin() && id !== item.docenteId) return;
    if (!(item.estado === 'PENDIENTE' && ['CONFIRMADA', 'CANCELADA'].includes(status)) && !(item.estado === 'CONFIRMADA' && ['COMPLETADA', 'CANCELADA'].includes(status))) return;
    this.busy.set(true); this.error.set(null); this.notice.set(null);
    this.http.patch(`${this.base}/tutorias/${encodeURIComponent(item.id)}/estado`, { estado: status }).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => { this.busy.set(false); this.notice.set('Estado de la tutoría actualizado.'); this.loadTutorings(this.tutorings()?.number ?? 0); this.changed.emit(); },
      error: (e) => { this.busy.set(false); this.error.set(apiErrorMessage(e, 'No se pudo actualizar la tutoría.')); },
    });
  }
  canEditTutoring(item: Tutoring): boolean {
    const id = this.storage.currentUser()?.id;
    return this.storage.isAdmin() || id === item.estudianteId || id === item.docenteId;
  }
  openTutoring(item: Tutoring): void {
    if (this.busy() || this.loadingDetails() || !this.canEditTutoring(item)) return;
    this.editingTutoring.set(null); this.loadingDetails.set(true); this.error.set(null); this.notice.set(null);
    this.http.get<TutoringDetails>(`${this.base}/tutorias/${encodeURIComponent(item.id)}`).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (detail) => {
        this.editingTutoring.set(detail);
        this.editTutoringForm.setValue({ fecha: detail.fecha.slice(0, 16), duracionMinutos: detail.duracionMinutos, notas: detail.notas ?? '' });
        this.loadingDetails.set(false);
      },
      error: (e) => { this.loadingDetails.set(false); this.error.set(apiErrorMessage(e, 'No se pudo cargar la tutoría.')); },
    });
  }
  saveTutoring(): void {
    const item = this.editingTutoring();
    if (!item || this.busy() || !this.canEditTutoring(item)) return;
    this.editTutoringForm.markAllAsTouched();
    if (this.editTutoringForm.invalid) return;
    const data = this.editTutoringForm.getRawValue();
    const pending = item.estado === 'PENDIENTE';
    const dateChanged = pending && data.fecha !== item.fecha.slice(0, 16);
    const date = dateChanged ? data.fecha : item.fecha;
    const duration = pending ? Number(data.duracionMinutos) : item.duracionMinutos;
    if (!Number.isInteger(duration)) { this.error.set('La duración debe ser un número entero de minutos.'); return; }
    if (dateChanged) {
      const instant = new Date(`${date}:00-05:00`);
      if (!Number.isFinite(instant.getTime()) || instant.getTime() <= Date.now()) { this.error.set('La fecha de la tutoría debe ser futura.'); return; }
    }
    if (dateChanged || duration !== item.duracionMinutos) {
      const time = date.split('T')[1]?.split(':').map(Number);
      if (!time || time[0] * 60 + time[1] + duration >= 24 * 60) { this.error.set('La tutoría debe terminar antes de la medianoche.'); return; }
    }
    this.busy.set(true); this.error.set(null); this.notice.set(null);
    this.http.put(`${this.base}/tutorias/${encodeURIComponent(item.id)}`, { fecha: date, duracionMinutos: duration, notas: data.notas.trim() || null }).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => { this.busy.set(false); this.editingTutoring.set(null); this.notice.set('Tutoría actualizada.'); this.loadTutorings(this.tutorings()?.number ?? 0); this.changed.emit(); },
      error: (e) => { this.busy.set(false); this.error.set(apiErrorMessage(e, 'No se pudo actualizar la tutoría.')); },
    });
  }
  day(day: Day): string { return this.days.find((d) => d.value === day)?.label ?? day; }
}
