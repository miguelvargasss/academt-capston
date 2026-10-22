import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CreateStudentCommand,
  Student,
  StudentAccountStatus,
  UpdateStudentCommand,
} from '../../../domain/models/student.model';
import { formatPhone, phoneDigits } from './student-utils';
const nonBlank = (c: AbstractControl) =>
  typeof c.value === 'string' && !c.value.trim() ? { required: true } : null;
const phone = (c: AbstractControl) =>
  /^[0-9 ]+$/.test(c.value) && c.value.replace(/\D/g, '').length === 9 ? null : { phone: true };
@Component({
  selector: 'app-student-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './student-form.component.html',
  styleUrls: ['../../shared/styles/management-dialog.css', './student-form.component.css'],
})
export class StudentFormComponent implements OnInit, AfterViewInit {
  readonly student = input<Student | null>(null);
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly closed = output<void>();
  readonly created = output<CreateStudentCommand>();
  readonly updated = output<UpdateStudentCommand>();
  readonly showPassword = signal(false);
  readonly submitted = signal(false);
  private readonly fb = inject(FormBuilder);
  @ViewChild('dialog') private dialog!: ElementRef<HTMLDialogElement>;
  readonly form = this.fb.nonNullable.group({
    fullName: ['', [nonBlank, Validators.maxLength(200)]],
    identifier: [
      '',
      [
        Validators.required,
        Validators.pattern(/^(?!.*\.\.)[A-Za-z0-9](?:[A-Za-z0-9._-]{0,62}[A-Za-z0-9])?$/),
      ],
    ],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    phone: ['', [Validators.required, phone]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    status: this.fb.nonNullable.control<StudentAccountStatus>('ACTIVO'),
  });
  ngOnInit(): void {
    const student = this.student();
    if (student) {
      this.form.controls.identifier.disable();
      this.form.controls.password.disable();
      this.form.patchValue({
        fullName: student.fullName,
        email: student.email,
        phone: formatPhone(student.phone),
        status: student.status,
      });
    } else this.form.controls.email.disable();
  }
  ngAfterViewInit(): void {
    this.dialog.nativeElement.showModal();
  }
  cancel(event?: Event): void {
    event?.preventDefault();
    if (!this.busy()) this.closed.emit();
  }
  format(event: Event): void {
    const field = event.target as HTMLInputElement;
    const formatted = formatPhone(phoneDigits(field.value));
    field.value = formatted;
    this.form.controls.phone.setValue(formatted);
  }
  invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }
  submit(): void {
    if (this.busy()) return;
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const student = this.student();
    if (student)
      this.updated.emit({
        id: student.id,
        fullName: v.fullName.trim(),
        email: v.email.trim(),
        phone: phoneDigits(v.phone),
        status: v.status,
        previousStatus: student.status,
      });
    else
      this.created.emit({
        fullName: v.fullName.trim(),
        emailIdentifier: v.identifier.trim().toLowerCase(),
        phone: phoneDigits(v.phone),
        password: v.password,
      });
  }
}
