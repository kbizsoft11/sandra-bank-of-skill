import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkillCategoryList } from './skill-category-list';

describe('SkillCategoryList', () => {
  let component: SkillCategoryList;
  let fixture: ComponentFixture<SkillCategoryList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkillCategoryList],
    }).compileComponents();

    fixture = TestBed.createComponent(SkillCategoryList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
