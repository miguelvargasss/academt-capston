import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  input,
  output,
  signal,
} from '@angular/core';
@Component({
  selector: 'app-delete-confirm-modal',
  standalone: true,
  template: `<dialog #dialog aria-labelledby="delete-confirm-title" (cancel)="cancel($event)">
    <div class="dialog-shell">
      <header>
        <div>
          <p class="eyebrow">ELIMINACIÓN DEFINITIVA</p>
          <h2 id="delete-confirm-title">{{ title() }}</h2>
        </div>
        <button
          class="close"
          aria-label="Cerrar confirmación"
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
        <p>
          Vas a eliminar a <strong>{{ name() }}</strong
          >.
        </p>
        <p class="help">{{ description() }}</p>
        <label style="display:flex;align-items:start;gap:.6rem;margin-top:1.25rem;line-height:1.7"
          ><input
            type="checkbox"
            style="margin-top:.2rem"
            [checked]="acknowledged()"
            [disabled]="busy()"
            (change)="acknowledged.set(!acknowledged())"
          />Entiendo que esta acción es permanente y no se puede deshacer.</label
        >
      </div>
      <footer>
        <button class="btn" [disabled]="busy()" (click)="cancel()">Cancelar</button
        ><button
          class="btn danger"
          [disabled]="busy() || !acknowledged()"
          (click)="confirmed.emit()"
        >
          {{ busy() ? 'Eliminando…' : 'Eliminar definitivamente' }}
        </button>
      </footer>
    </div>
  </dialog>`,
  styleUrl: '../../styles/management-dialog.css',
})
export class DeleteConfirmModalComponent implements AfterViewInit {
  readonly title = input('Confirmar eliminación');
  readonly name = input.required<string>();
  readonly description = input.required<string>();
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly confirmed = output<void>();
  readonly closed = output<void>();
  readonly acknowledged = signal(false);
  @ViewChild('dialog') private dialog!: ElementRef<HTMLDialogElement>;
  ngAfterViewInit(): void {
    this.dialog.nativeElement.showModal();
  }
  cancel(event?: Event): void {
    event?.preventDefault();
    if (!this.busy()) this.closed.emit();
  }
}
