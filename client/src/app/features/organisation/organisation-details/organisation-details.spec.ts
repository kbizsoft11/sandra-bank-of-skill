import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrganisationService } from '../../../core/services/organisation.service';
import { OrganisationDetailsPage } from './organisation-details';

describe('OrganisationDetailsPage', () => {
  let component: OrganisationDetailsPage;
  let organisationService: jasmine.SpyObj<OrganisationService>;

  beforeEach(async () => {
    const orgServiceSpy = jasmine.createSpyObj('OrganisationService', ['getMyOrganisation']);
    orgServiceSpy.getMyOrganisation.and.returnValue(of({
      success: true,
      message: 'Organisation fetched successfully',
      data: {
        _id: 'org-1',
        organisationName: 'Bank of Skill',
        industry: 'Technology',
        companySize: '11-50',
        country: 'India',
        website: 'https://bankofskill.com',
        description: 'A learning platform',
        tenantId: 'tenant-1',
        ownerUserId: 'user-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      }
    }));

    await TestBed.configureTestingModule({
      imports: [OrganisationDetailsPage],
      providers: [{ provide: OrganisationService, useValue: orgServiceSpy }]
    }).compileComponents();

    const fixture = TestBed.createComponent(OrganisationDetailsPage);
    component = fixture.componentInstance;
    organisationService = TestBed.inject(OrganisationService) as jasmine.SpyObj<OrganisationService>;
  });

  it('loads the current organisation on init', () => {
    component.ngOnInit();

    expect(organisationService.getMyOrganisation).toHaveBeenCalled();
    expect(component.organisation().organisationName).toBe('Bank of Skill');
  });
});
