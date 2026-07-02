import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateSkillCategory } from './create-skill-category';

describe('CreateSkillCategory', () => {
  let component: CreateSkillCategory;
  let fixture: ComponentFixture<CreateSkillCategory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateSkillCategory],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateSkillCategory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
