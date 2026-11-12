import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../core/config/environment';
import { Page } from '../users/users-api.service';

export interface Conversation {
  id: string; cursoId: string | null; cursoTitulo: string | null; asunto: string | null;
  participante1Id: string; participante1NombreCompleto: string; participante2Id: string;
  participante2NombreCompleto: string; mensajesNoLeidos: number | null;
}
export interface Message {
  id: string; conversacionId: string; remitenteId: string; remitenteNombreCompleto: string;
  cuerpo: string; leido: boolean; enviadoAt: string;
}
export interface Contact { id: string; nombreCompleto: string; avatarUrl: string | null; }
export interface ContactCourse { id: string; titulo: string; }
@Injectable({ providedIn: 'root' })
export class MessagesApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/conversaciones`;
  list(page: number) { return this.http.get<Page<Conversation>>(this.url, { params: { page, size: 20, sort: 'ultimoMensajeAt,desc' } }); }
  last(id: string) { return this.http.get<Message[]>(`${this.url}/${encodeURIComponent(id)}/mensajes/ultimos`, { params: { limit: 50 } }); }
  send(id: string, cuerpo: string) { return this.http.post<Message>(`${this.url}/${encodeURIComponent(id)}/mensajes`, { cuerpo }); }
  read(id: string) { return this.http.patch<void>(`${this.url}/${encodeURIComponent(id)}/leer-todos`, {}); }
  courses() { return this.http.get<ContactCourse[]>(`${environment.apiUrl}/api/cursos/mis-cursos`); }
  contacts(courseId: string) { return this.http.get<Contact[]>(`${this.url}/contactos`, { params: { cursoId: courseId } }); }
  create(courseId: string, contactId: string) {
    return this.http.post<Conversation>(this.url, { cursoId: courseId, otroParticipanteId: contactId });
  }
}
