import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DocumentService } from './document.service';
import { API_CONFIG } from '../config/api.config';

describe('DocumentService', () => {
  let service: DocumentService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(DocumentService);
  });

  it('should build a full URL for upload file paths', () => {
    const result = service.getFileUrl('/uploads/documents/sample.pdf');

    expect(result).toBe(`${API_CONFIG.SERVER_URL}/uploads/documents/sample.pdf`);
  });
});
