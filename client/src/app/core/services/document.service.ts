import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  private apiUrl = `${API_CONFIG.BASE_URL}/documents`;

  constructor(private http: HttpClient) {}

  /**
   * Upload a document
   */
  uploadDocument(
    file: File,
    documentType?: string,
    description?: string,
    requirementId?: string,
  ): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    // Support both old workflow (documentType) and new workflow (requirementId)
    if (requirementId) {
      formData.append('requirementId', requirementId);
    } else if (documentType) {
      formData.append('documentType', documentType);
    }

    if (description) {
      formData.append('description', description);
    }

    return this.http.post(`${this.apiUrl}/upload`, formData);
  }

  /**
   * Get my documents
   */
  getMyDocuments(filters?: {
    documentType?: string;
    verificationStatus?: string;
  }): Observable<any> {
    let url = `${this.apiUrl}/me`;
    const params = new URLSearchParams();

    if (filters?.documentType) {
      params.append('documentType', filters.documentType);
    }
    if (filters?.verificationStatus) {
      params.append('verificationStatus', filters.verificationStatus);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.http.get(url);
  }

  /**
   * Get document summary
   */
  getDocumentSummary(): Observable<any> {
    return this.http.get(`${this.apiUrl}/summary`);
  }

  /**
   * Delete a document
   */
  deleteDocument(documentId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${documentId}`);
  }

  /**
   * Get a single document for download
   */
  getDocument(documentId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${documentId}/download`);
  }

  /**
   * Get documents for verification (company only)
   */
  getDocumentsForVerification(filters?: {
    verificationStatus?: string;
    documentType?: string;
    employeeId?: string;
    page?: number;
    limit?: number;
  }): Observable<any> {
    let url = `${this.apiUrl}/verify/list`;
    const params = new URLSearchParams();

    if (filters?.verificationStatus) {
      params.append('verificationStatus', filters.verificationStatus);
    }
    if (filters?.documentType) {
      params.append('documentType', filters.documentType);
    }
    if (filters?.employeeId) {
      params.append('employeeId', filters.employeeId);
    }
    if (filters?.page) {
      params.append('page', filters.page.toString());
    }
    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.http.get(url);
  }

  /**
   * Verify a document (company only)
   */
  verifyDocument(
    documentId: string,
    verificationStatus: 'verified' | 'rejected' | 'under_review',
    verificationNotes?: string,
  ): Observable<any> {
    const payload = {
      verificationStatus,
      verificationNotes: verificationNotes || '',
    };

    return this.http.put(`${this.apiUrl}/${documentId}/verify`, payload);
  }

  /**
   * Submit all documents for review (employee only)
   */
  submitAllForReview(): Observable<any> {
    return this.http.post(`${this.apiUrl}/submit-for-review`, {});
  }

  getFileUrl(filePath: string): string {
    if (!filePath) {
      return '';
    }

    if (/^https?:\/\//i.test(filePath)) {
      return filePath;
    }

    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    return `${API_CONFIG.SERVER_URL}${normalizedPath}`;
  }

  /**
   * Open a document for inline viewing (does NOT trigger a download).
   * Uses a blob so the browser renders based on file type, ignoring
   * any Content-Disposition: attachment header from the server.
   */
viewFile(
  filePath: string,
  fileName?: string,
  fileType?: string
): void {
  const url = this.getFileUrl(filePath);

  if (!url) {
    console.error('Invalid file URL');
    return;
  }

  // Open the tab immediately because this is inside the user's click event.
  const viewerTab = window.open('', '_blank');

  if (!viewerTab) {
    console.error('Popup was blocked');
    return;
  }

  // Show something while the file is loading.
  viewerTab.document.write(`
    <html>
      <head>
        <title>Loading document...</title>
      </head>
      <body>
        <p>Loading document...</p>
      </body>
    </html>
  `);

  this.http.get(url, {
    responseType: 'blob'
  }).subscribe({
    next: (blob: Blob) => {

      console.log('Blob received:', blob);
      console.log('Blob size:', blob.size);
      console.log('Blob type:', blob.type);

      const objectUrl = URL.createObjectURL(blob);

      console.log('Opening:', objectUrl);

      // Navigate the already-open tab.
      viewerTab.location.replace(objectUrl);

      // Do NOT revoke immediately.
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 60_000);
    },

    error: (error) => {
      console.error('Failed to load document:', error);

      viewerTab.document.body.innerHTML = `
        <h2>Unable to load document</h2>
        <p>Status: ${error.status}</p>
      `;
    }
  });
}

  private resolveMimeType(fileType?: string, fileName?: string): string | undefined {
    const ext = (fileType || fileName?.split('.').pop() || '').toLowerCase();
    const map: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      txt: 'text/plain',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return map[ext];
  }

  /**
   * Download file from path
   */
  downloadFile(filePath: string, fileName: string): void {
    const url = this.getFileUrl(filePath);
    if (!url) {
      return;
    }

    this.http.get(url, { responseType: 'blob' }).subscribe((blob: Blob) => {
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(objectUrl);
    });
  }
}
