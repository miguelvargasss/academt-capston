import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { COURSE_REPOSITORY } from '../../core/tokens/repository.tokens';
import { Course } from '../../domain/models/course.model';

@Injectable({
  providedIn: 'root'
})
export class GetCoursesUseCase {
  private readonly courseRepository = inject(COURSE_REPOSITORY);

  execute(): Observable<Course[]> {
    return this.courseRepository.getMyCourses();
  }
}
