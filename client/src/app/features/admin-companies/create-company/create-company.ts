import { Component } from '@angular/core';
import { CompanyForm } from '../company-form/company-form';

@Component({
  selector: 'app-create-company',
  standalone: true,
  imports: [CompanyForm],
  template: '<app-company-form [isEditMode]="false"></app-company-form>',
})
export class CreateCompany {}
