import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { COURSE_REPOSITORY } from '../../core/tokens/repository.tokens';
import { Course } from '../../domain/models/course.model';
import { CreateCourseDto } from '../../domain/repositories/course.repository';

@Injectable({
  providedIn: 'root'
})
export class CreateCourseUseCase {
  private readonly repository = inject(COURSE_REPOSITORY);

  execute(dto: CreateCourseDto): Observable<Course> {
    return this.repository.createCourse(dto);
  }
}
