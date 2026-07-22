import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CompanyForm } from '../company-form/company-form';

@Component({
  selector: 'app-edit-company',
  standalone: true,
  imports: [CompanyForm],
  template: '<app-company-form [isEditMode]="true" [companyId]="companyId()"></app-company-form>',
})
export class EditCompany implements OnInit {
  private readonly route = inject(ActivatedRoute);

  readonly companyId = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.companyId.set(id);
    }
  }
}
