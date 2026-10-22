import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { GetCoursesUseCase } from '../../../application/courses/get-courses.use-case';
import { CreateCourseUseCase } from '../../../application/courses/create-course.use-case';
import { TokenStorageService } from '../../../core/services/token-storage.service';
import { Course, CefrLevel } from '../../../domain/models/course.model';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { RouterLink } from '@angular/router';
import { COURSE_STATUS_LABELS } from '../../../domain/models/course-workspace.model';
import { CourseScheduleFieldsComponent } from '../../shared/components/course-schedule-fields/course-schedule-fields.component';
import { WeeklySlot, Weekday } from '../../../domain/models/course-schedule.model';
import { apiErrorMessage } from '../../../core/utils/api-error';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    BadgeComponent,
    RouterLink,
    CourseScheduleFieldsComponent,
  ],
  templateUrl: './courses.component.html',
})
export class CoursesComponent implements OnInit {
  private readonly getCoursesUseCase = inject(GetCoursesUseCase);
  private readonly createCourseUseCase = inject(CreateCourseUseCase);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly fb = inject(FormBuilder);

  readonly currentUser = this.tokenStorage.currentUser;
  readonly userRole = this.tokenStorage.userRole;
  readonly statusLabels = COURSE_STATUS_LABELS;
  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);

  courses = signal<Course[]>([]);
  selectedFilter = signal<string>('TODOS');
  searchQuery = signal<string>('');

  // Estado del modal cuestionario flotante
  isCreateModalOpen = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  courseForm = this.fb.group(
    {
      titulo: ['', [Validators.required, Validators.maxLength(200)]],
      descripcion: ['', [Validators.maxLength(5000)]],
      nivelCefr: ['B1', [Validators.required]],
      horarios: this.fb.nonNullable.control<WeeklySlot[]>([], Validators.required),
      capacidadMaxima: [20, [Validators.required, Validators.min(1)]],
      fechaInicio: ['', Validators.required],
      fechaFin: [''],
    },
    {
      validators: (control: AbstractControl) => {
        const start = control.get('fechaInicio')?.value;
        const end = control.get('fechaFin')?.value;
        return start && end && end < start ? { dateRange: true } : null;
      },
    },
  );

  readonly cefrOptions = [
    { code: 'A1', label: 'A1 - Beginner', desc: 'Introducción básica y vocabulario esencial' },
    { code: 'A2', label: 'A2 - Elementary', desc: 'Frases cotidianas y fluidez inicial' },
    { code: 'B1', label: 'B1 - Intermediate', desc: 'Estructuras intermedias y conversación' },
    { code: 'B2', label: 'B2 - Upper Intermediate', desc: 'Inmersión profesional y debate' },
    { code: 'C1', label: 'C1 - Advanced', desc: 'Dominio ejecutivo y alta precisión' },
    { code: 'C2', label: 'C2 - Mastery', desc: 'Fluidez y competencia bilingüe total' },
  ];

  filteredCourses = computed(() => {
    let list = this.courses();
    const filter = this.selectedFilter();
    const query = this.searchQuery().toLowerCase().trim();

    if (filter !== 'TODOS') {
      list = list.filter((c) => c.levelCefr === filter);
    }

    if (query) {
      list = list.filter(
        (c) => c.title.toLowerCase().includes(query) || c.description.toLowerCase().includes(query),
      );
    }

    return list;
  });

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.getCoursesUseCase.execute().subscribe({
      next: (data) => {
        this.courses.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.loadError.set(apiErrorMessage(error, 'No se pudieron cargar tus cursos.'));
        this.isLoading.set(false);
      },
    });
  }

  setFilter(filter: string): void {
    this.selectedFilter.set(filter);
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  openCreateModal(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.courseForm.reset({
      titulo: '',
      descripcion: '',
      nivelCefr: 'B1',
      horarios: [],
      capacidadMaxima: 20,
      fechaInicio: '',
      fechaFin: '',
    });
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    if (this.isSubmitting()) return;
    this.isCreateModalOpen.set(false);
    this.errorMessage.set(null);
  }

  selectCefrLevel(level: string): void {
    this.courseForm.patchValue({ nivelCefr: level });
  }

  onSubmitCreateCourse(): void {
    if (this.courseForm.invalid || this.isSubmitting()) {
      this.courseForm.markAllAsTouched();
      this.errorMessage.set(
        this.courseForm.hasError('dateRange')
          ? 'La fecha de fin no puede ser anterior a la de inicio.'
          : 'Revisa el título, la fecha de inicio y las sesiones semanales del curso.',
      );
      return;
    }

    const docenteId = this.currentUser()?.id;
    if (!docenteId) {
      this.errorMessage.set('No se encontró la identidad del docente autenticado.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const val = this.courseForm.value;

    const dto = {
      docenteId: docenteId,
      titulo: val.titulo!.trim(),
      descripcion: val.descripcion ? val.descripcion.trim() : undefined,
      nivelCefr: val.nivelCefr!,
      horarios: (val.horarios ?? []).map((slot) => ({
        dia: slot.day as Weekday,
        horaInicio: slot.startTime,
        horaFin: slot.endTime,
      })),
      fechaInicio: val.fechaInicio ? val.fechaInicio : undefined,
      fechaFin: val.fechaFin ? val.fechaFin : undefined,
      capacidadMaxima: val.capacidadMaxima || 20,
    };

    this.createCourseUseCase.execute(dto).subscribe({
      next: (newCourse) => {
        this.isSubmitting.set(false);
        this.successMessage.set('¡Curso creado y publicado con éxito en la plataforma!');
        this.courses.update((current) => [newCourse, ...current]);
        setTimeout(() => {
          this.closeCreateModal();
        }, 1200);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = apiErrorMessage(err, 'Error al registrar el curso en el servidor.');
        this.errorMessage.set(msg);
      },
    });
  }

  getTeacherInitials(name?: string): string {
    if (!name || name === 'Sin docente asignado') return 'DOC';
    const clean = name.replace(/^Prof\.\s*/i, '');
    const parts = clean.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase();
  }
}
