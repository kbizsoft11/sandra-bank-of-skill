import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';

import { UserList } from './user-list';

describe('UserList', () => {
  let component: UserList;
  let fixture: ComponentFixture<UserList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        UserList,
        HttpClientTestingModule,
        RouterTestingModule,
        ReactiveFormsModule
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserList);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the invite form', () => {
    expect(component.inviteForm).toBeDefined();
    expect(component.inviteForm.get('email')).toBeDefined();
    expect(component.inviteForm.get('role')).toBeDefined();
  });

  it('should open the invite modal', () => {
    component.openInviteModal();

    expect(component.showInviteModal).toBe(true);
    expect(component.inviteError).toBe('');
    expect(component.inviteSuccess).toBe('');
  });

  it('should close the invite modal', () => {
    component.showInviteModal = true;
    component.closeInviteModal();

    expect(component.showInviteModal).toBe(false);
  });

  it('should validate email in invite form', () => {
    const emailControl = component.inviteForm.get('email');
    
    // Test empty email
    emailControl?.setValue('');
    expect(emailControl?.hasError('required')).toBe(true);

    // Test invalid email
    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBe(true);

    // Test valid email
    emailControl?.setValue('test@example.com');
    expect(emailControl?.valid).toBe(true);
  });

  it('should not send invite with invalid form', () => {
    component.inviteForm.get('email')?.setValue('');
    component.sendInvite();

    expect(component.isInviting).toBe(false);
  });
});
