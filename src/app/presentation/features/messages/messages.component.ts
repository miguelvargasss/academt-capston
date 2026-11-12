import { Component, DestroyRef, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TokenStorageService } from '../../../core/services/token-storage.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { Page } from '../users/users-api.service';
import { Contact, ContactCourse, Conversation, Message, MessagesApiService } from './messages-api.service';

@Component({ selector: 'app-messages', standalone: true, imports: [ReactiveFormsModule], templateUrl: './messages.component.html' })
export class MessagesComponent implements OnInit {
  private readonly api = inject(MessagesApiService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly storage = inject(TokenStorageService);
  readonly conversations = signal<Page<Conversation> | null>(null);
  readonly selected = signal<Conversation | null>(null);
  readonly messages = signal<Message[]>([]);
  readonly loading = signal(false);
  readonly messageLoading = signal(false);
  readonly sending = signal(false);
  readonly error = signal<string | null>(null);
  readonly messageError = signal<string | null>(null);
  readonly form = this.fb.nonNullable.group({ cuerpo: ['', [Validators.required]] });
  readonly newForm = this.fb.nonNullable.group({ cursoId: ['', Validators.required], contactoId: ['', Validators.required] });
  readonly creating = signal(false);
  readonly showNew = signal(false);
  readonly contactsLoading = signal(false);
  readonly courses = signal<ContactCourse[]>([]);
  readonly contacts = signal<Contact[]>([]);
  readonly newError = signal<string | null>(null);

  ngOnInit(): void {
    this.load(0);
    if (this.browser) {
      const timer = setInterval(() => {
        if (document.visibilityState !== 'visible') return;
        this.load(this.conversations()?.number ?? 0, true);
        const current = this.selected();
        if (current) this.loadMessages(current.id, true);
      }, 15000);
      this.destroy.onDestroy(() => clearInterval(timer));
    }
  }
  name(conversation: Conversation): string {
    const id = this.storage.currentUser()?.id;
    if (conversation.participante1Id === id) return conversation.participante2NombreCompleto;
    if (conversation.participante2Id === id) return conversation.participante1NombreCompleto;
    return `${conversation.participante1NombreCompleto} y ${conversation.participante2NombreCompleto}`;
  }
  startNew(): void {
    this.showNew.set(true);
    this.newError.set(null);
    this.api.courses().pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (courses) => this.courses.set(courses),
      error: (e) => this.newError.set(apiErrorMessage(e, 'No se pudieron cargar tus cursos.')),
    });
  }
  selectCourse(): void {
    const courseId = this.newForm.controls.cursoId.value;
    this.newForm.controls.contactoId.setValue('');
    this.contacts.set([]); this.newError.set(null); this.contactsLoading.set(false);
    if (!courseId) return;
    this.contactsLoading.set(true);
    this.api.contacts(courseId).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (contacts) => {
        if (this.newForm.controls.cursoId.value !== courseId) return;
        this.contacts.set(contacts); this.contactsLoading.set(false);
      },
      error: (e) => {
        if (this.newForm.controls.cursoId.value !== courseId) return;
        this.contactsLoading.set(false); this.newError.set(apiErrorMessage(e, 'No se pudieron cargar los contactos.'));
      },
    });
  }
  create(): void {
    const { cursoId, contactoId } = this.newForm.getRawValue();
    if (!cursoId || !contactoId || this.creating() || this.contactsLoading()) return;
    this.creating.set(true); this.newError.set(null);
    this.api.create(cursoId, contactoId).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (conversation) => {
        this.creating.set(false); this.showNew.set(false);
        this.newForm.reset(); this.contacts.set([]);
        this.load(0, true); this.open(conversation);
      },
      error: (e) => { this.creating.set(false); this.newError.set(apiErrorMessage(e, 'No se pudo iniciar la conversación.')); },
    });
  }
  load(page: number, quiet = false): void {
    if (this.loading()) return;
    this.loading.set(true);
    if (!quiet) this.error.set(null);
    this.api.list(page).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (result) => { this.conversations.set(result); this.loading.set(false); this.error.set(null); },
      error: (e) => { this.loading.set(false); this.error.set(apiErrorMessage(e, 'No se pudieron actualizar las conversaciones.')); },
    });
  }
  open(conversation: Conversation): void {
    if (this.selected()?.id === conversation.id || this.sending()) return;
    this.selected.set(conversation);
    this.messages.set([]);
    this.messageError.set(null);
    this.loadMessages(conversation.id);
  }
  participant(conversation: Conversation): boolean {
    const id = this.storage.currentUser()?.id;
    return conversation.participante1Id === id || conversation.participante2Id === id;
  }
  loadMessages(id: string, quiet = false): void {
    if (this.messageLoading()) return;
    this.messageLoading.set(true);
    this.api.last(id).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (messages) => {
        this.messageLoading.set(false);
        if (this.selected()?.id !== id) {
          const current = this.selected();
          if (current) this.loadMessages(current.id);
          return;
        }
        this.messages.set([...messages].reverse());
        this.messageError.set(null);
        if (this.selected() && this.participant(this.selected()!) && messages.some((m) => !m.leido && m.remitenteId !== this.storage.currentUser()?.id)) {
          this.api.read(id).pipe(takeUntilDestroyed(this.destroy)).subscribe({
            next: () => this.load(this.conversations()?.number ?? 0, true),
            error: (e) => this.messageError.set(apiErrorMessage(e, 'No se pudieron marcar los mensajes como leídos.')),
          });
        }
      },
      error: (e) => {
        this.messageLoading.set(false);
        if (this.selected()?.id === id) this.messageError.set(apiErrorMessage(e, 'No se pudieron cargar los mensajes.'));
        else { const current = this.selected(); if (current) this.loadMessages(current.id); }
      },
    });
  }
  send(): void {
    const current = this.selected();
    const body = this.form.getRawValue().cuerpo.trim();
    if (!current || !this.participant(current) || !body || this.sending()) return;
    this.sending.set(true); this.messageError.set(null);
    this.api.send(current.id, body).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => {
        this.sending.set(false);
        this.form.reset();
        if (this.selected()?.id === current.id) this.loadMessages(current.id);
        this.load(this.conversations()?.number ?? 0, true);
      },
      error: (e) => { this.sending.set(false); this.messageError.set(apiErrorMessage(e, 'No se pudo enviar el mensaje.')); },
    });
  }
}
