import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditSkill } from './edit-skill';

describe('EditSkill', () => {
  let component: EditSkill;
  let fixture: ComponentFixture<EditSkill>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditSkill],
    }).compileComponents();

    fixture = TestBed.createComponent(EditSkill);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
