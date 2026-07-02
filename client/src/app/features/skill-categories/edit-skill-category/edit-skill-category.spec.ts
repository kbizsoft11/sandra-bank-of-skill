import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditSkillCategory } from './edit-skill-category';

describe('EditSkillCategory', () => {
  let component: EditSkillCategory;
  let fixture: ComponentFixture<EditSkillCategory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditSkillCategory],
    }).compileComponents();

    fixture = TestBed.createComponent(EditSkillCategory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
