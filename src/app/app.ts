import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RequestFeedbackService } from './core/services/request-feedback.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend.kellyAcademy');
  protected readonly feedback = inject(RequestFeedbackService);
}
