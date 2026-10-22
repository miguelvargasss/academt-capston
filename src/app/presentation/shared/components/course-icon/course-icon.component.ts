import { Component, input } from '@angular/core';

const paths = {
  upload: 'M12 16V3 m-5 5 5-5 5 5 M4 16v5h16v-5',
  download: 'M12 3v13 m-5-5 5 5 5-5 M4 17v4h16v-4',

  eye: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  hidden:
    'm3 3 18 18 M10.6 5.1A12 12 0 0 1 12 5c7 0 10 7 10 7a18 18 0 0 1-3 4 M6 6a18 18 0 0 0-4 6s3 7 10 7a12 12 0 0 0 5-1 M10 10a3 3 0 0 0 4 4',
  pin: 'm16 3 5 5-4 1-3 5-4 1-1-4 5-3Z M9 15l-6 6',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 3H20v19H6.5A2.5 2.5 0 0 1 4 19.5v-14A2.5 2.5 0 0 1 6.5 3Z',
  calendar:
    'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M22 21v-2a4 4 0 0 0-3-3.87 M13 3.13a4 4 0 0 1 0 7.75 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  video:
    'm16 8 6-4v16l-6-4 M3 5h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z M14 2v6h6 M8 13h8 M8 17h5',
  task: 'M9 5H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4 M9 3h6v4H9Z m-1 12 3 3 5-5',
  plus: 'M12 5v14 M5 12h14',
  chevron: 'm6 9 6 6 6-6',
  edit: 'm16 3 5 5 M4 15 16 3a3.5 3.5 0 0 1 5 5L9 20l-6 1Z',
  trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
  arrow: 'm12 19-7-7 7-7 M5 12h14',
  external: 'M15 3h6v6 M10 14 21 3 M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5',
  search: 'M21 21 16.5 16.5 M19 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  refresh: 'M20 7v5h-5 M4 17v-5h5 M6 6a8 8 0 0 1 14 6 M18 18a8 8 0 0 1-14-6',
  chart: 'M3 3v18h18 M8 16v-5 M13 16V7 M18 16v-8',
  check: 'm5 12 4 4L19 6',
  announcement: 'm3 9 18-6v18L3 15Z M7 16v5h4l-1-4',
} as const;

@Component({
  selector: 'app-course-icon',
  standalone: true,
  template:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="paths[name()]"/></svg>',
  styles:
    ':host{display:inline-flex;width:1.1rem;height:1.1rem;flex-shrink:0}svg{width:100%;height:100%}',
})
export class CourseIconComponent {
  readonly name = input<keyof typeof paths>('book');
  readonly paths = paths;
}
