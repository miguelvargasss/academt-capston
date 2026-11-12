import { TestBed } from '@angular/core/testing';
import { CourseWorkspace } from '../../../../../domain/models/course-workspace.model';
import { CourseContentComponent } from './course-content.component';

const unit = (id: string, weekIds: string[]) => ({ id, number: 1, title: id, description: '', weeks: weekIds.map((weekId) => ({ id: weekId, unitId: id, number: 1, title: weekId, description: '', isCurrent: false, resources: [] })) });
const workspace = { canManage: true, course: { id: 'course' }, units: [unit('u1', ['w1', 'w2']), unit('u2', [])], submissions: [] } as unknown as CourseWorkspace;

describe('Reordenamiento de contenido', () => {
  it('mueve unidades y semanas mediante controles sin alterar los originales', () => {
    const fixture = TestBed.createComponent(CourseContentComponent);
    fixture.componentRef.setInput('workspace', workspace); fixture.detectChanges();
    const unitOrder = vi.fn(); const weekOrder = vi.fn();
    fixture.componentInstance.reorderUnits.subscribe(unitOrder); fixture.componentInstance.reorderWeeks.subscribe(weekOrder);
    fixture.componentInstance.moveUnit('u1', 1);
    fixture.componentInstance.moveWeek(workspace.units[0], 'w2', -1);
    expect(unitOrder).toHaveBeenCalledWith(['u2', 'u1']);
    expect(weekOrder).toHaveBeenCalledWith({ unitId: 'u1', ids: ['w2', 'w1'] });
    expect(workspace.units.map((u) => u.id)).toEqual(['u1', 'u2']);
  });
  it('impide reordenar mientras se filtra o no se gestiona el curso', () => {
    const fixture = TestBed.createComponent(CourseContentComponent);
    fixture.componentRef.setInput('workspace', workspace); fixture.detectChanges();
    const emitted = vi.fn(); fixture.componentInstance.reorderUnits.subscribe(emitted);
    fixture.componentInstance.query.set('u1'); fixture.componentInstance.moveUnit('u1', 1);
    fixture.componentInstance.query.set(''); fixture.componentRef.setInput('workspace', { ...workspace, canManage: false }); fixture.detectChanges();
    fixture.componentInstance.moveUnit('u1', 1); expect(emitted).not.toHaveBeenCalled();
  });
});
