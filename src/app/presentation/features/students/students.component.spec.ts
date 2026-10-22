import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, Subject } from 'rxjs';
import { ManageStudentsUseCase } from '../../../application/students/manage-students.use-case';
import { Student, StudentDirectory } from '../../../domain/models/student.model';
import { StudentsComponent } from './students.component';
import { StudentFormComponent } from './student-form.component';
import { DeleteConfirmModalComponent } from '../../shared/components/delete-confirm-modal/delete-confirm-modal.component';
import { credentialsWhatsAppUrl } from './student-utils';
const ana: Student = {
  id: 'ana',
  fullName: 'Ana Martínez',
  email: 'ana@kellyacademy.com',
  phone: '999159716',
  avatarUrl: null,
  status: 'ACTIVO',
  atRisk: false,
  createdAt: '2026-10-01T12:00:00',
  enrollments: [],
};
const directory: StudentDirectory = {
  students: [
    ana,
    { ...ana, id: 'luis', fullName: 'Luis Torres', email: 'luis@kellyacademy.com', atRisk: true },
    {
      ...ana,
      id: 'maria',
      fullName: 'María Inactiva',
      email: 'maria@kellyacademy.com',
      status: 'INACTIVO',
    },
  ],
  courses: [],
};
describe('Teacher student management', () => {
  const manage = {
    load: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    saveCourses: vi.fn(),
  };
  beforeEach(() => {
    Object.values(manage).forEach((fn) => fn.mockReset());
    manage.load.mockReturnValue(of(structuredClone(directory)));
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: ManageStudentsUseCase, useValue: manage }],
    });
    HTMLDialogElement.prototype.showModal = vi.fn();
  });
  it('filters names, emails and enrollment risk without reloading the directory', () => {
    const fixture = TestBed.createComponent(StudentsComponent);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    expect(fixture.nativeElement.querySelector('.table-footer').textContent).toContain(
      'Mostrando 3 alumnos',
    );
    page.query.set('LUIS@KELLY');
    fixture.detectChanges();
    expect(page.filtered().map((s) => s.id)).toEqual(['luis']);
    page.filter.set('ACTIVO');
    fixture.detectChanges();
    expect(page.filtered()).toEqual([]);
    page.filter.set('RIESGO');
    fixture.detectChanges();
    expect(page.filtered().map((s) => s.id)).toEqual(['luis']);
    page.query.set('');
    page.filter.set('INACTIVO');
    fixture.detectChanges();
    expect(page.filtered().map((s) => s.id)).toEqual(['maria']);
    expect(manage.load).toHaveBeenCalledTimes(1);
  });
  it('creates an institutional account, formats the phone and offers a transient WhatsApp message', () => {
    const created = { ...ana, id: 'new-student' };
    manage.create.mockReturnValue(of(created));
    const store = vi.spyOn(Storage.prototype, 'setItem');
    const fixture = TestBed.createComponent(StudentsComponent);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('#open-create-student-btn').click();
    fixture.detectChanges();
    const form = fixture.debugElement.query(By.directive(StudentFormComponent))
      .componentInstance as StudentFormComponent;
    const phone = fixture.nativeElement.querySelector('#student-phone') as HTMLInputElement;
    phone.value = '999159716';
    phone.dispatchEvent(new Event('input', { bubbles: true }));
    expect(phone.value).toBe('999 159 716');
    form.form.patchValue({
      fullName: 'Ana Martínez',
      identifier: 'ana',
      password: 'Initial?&=123',
    });
    form.submit();
    fixture.detectChanges();
    expect(manage.create).toHaveBeenCalledWith({
      fullName: 'Ana Martínez',
      emailIdentifier: 'ana',
      phone: '999159716',
      password: 'Initial?&=123',
    });
    const link = fixture.nativeElement.querySelector(
      '#student-created-card a',
    ) as HTMLAnchorElement;
    const url = new URL(link.href);
    expect(url.host).toBe('wa.me');
    expect(url.pathname).toBe('/51999159716');
    expect(url.searchParams.get('text')).toContain('Contraseña inicial: Initial?&=123');
    expect(url.searchParams.get('text')).toContain(location.origin + '/login');
    expect(store).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('[aria-label="Cerrar tarjeta de credenciales"]').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.createdCard()).toBeNull();
    expect(fixture.nativeElement.querySelector('#student-created-card')).toBeNull();
    store.mockRestore();
  });
  it('keeps the student row until the server confirms deletion and requires explicit confirmation', async () => {
    const result = new Subject<void>();
    manage.delete.mockReturnValue(result);
    manage.load
      .mockReturnValueOnce(of(structuredClone(directory)))
      .mockReturnValue(
        of({ ...directory, students: directory.students.filter((s) => s.id !== 'ana') }),
      );
    const fixture = TestBed.createComponent(StudentsComponent);
    fixture.detectChanges();
    fixture.componentInstance.open({ mode: 'DELETE', id: 'ana' });
    fixture.detectChanges();
    const modal = fixture.debugElement.query(By.directive(DeleteConfirmModalComponent))
      .componentInstance as DeleteConfirmModalComponent;
    const button = fixture.nativeElement.querySelector('dialog .danger') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(manage.delete).not.toHaveBeenCalled();
    modal.acknowledged.set(true);
    fixture.detectChanges();
    button.click();
    fixture.detectChanges();
    expect(manage.delete).toHaveBeenCalledWith('ana');
    expect(fixture.componentInstance.directory().students.some((s) => s.id === 'ana')).toBe(true);
    result.next();
    result.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('tr.removing')).not.toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 250));
    fixture.detectChanges();
    expect(fixture.componentInstance.directory().students.some((s) => s.id === 'ana')).toBe(false);
  });
  it('encodes all WhatsApp message fields and rejects an incomplete phone number', () => {
    const url = new URL(
      credentialsWhatsAppUrl(
        'Ana & Luis',
        'ana@kellyacademy.com',
        'A?&=12345',
        '999159716',
        'https://academy.example/login',
      ),
    );
    expect(url.searchParams.get('text')).toContain('A?&=12345');
    expect(url.searchParams.get('text')).toContain('Ana & Luis');
    expect(
      credentialsWhatsAppUrl('Ana', 'a@b.c', '12345678', '123', 'https://academy.example/login'),
    ).toBe('');
  });
});
