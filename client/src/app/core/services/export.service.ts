import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  /**
   * Export data to CSV format
   */
  exportToCSV(data: any[], filename: string, headers?: string[]): void {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    // Get headers from first object keys if not provided
    const csvHeaders = headers || Object.keys(data[0]);
    
    // Create CSV content
    const csvContent = this.convertToCSV(data, csvHeaders);
    
    // Download file
    this.downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
  }

  /**
   * Export data to Excel format (as CSV for broad compatibility)
   */
  exportToExcel(data: any[], filename: string, headers?: string[]): void {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    // Get headers from first object keys if not provided
    const excelHeaders = headers || Object.keys(data[0]);
    
    // Create Excel/CSV content
    const excelContent = this.convertToCSV(data, excelHeaders);
    
    // Download file with .xlsx extension (Excel compatible CSV)
    this.downloadFile(excelContent, `${filename}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;');
  }

  /**
   * Export complex data with multiple sheets (as CSV for now, can be enhanced)
   */
  exportMultipleSheets(
    sheetsData: Array<{ sheetName: string; data: any[]; headers?: string[] }>,
    filename: string
  ): void {
    if (!sheetsData || sheetsData.length === 0) {
      console.warn('No data to export');
      return;
    }

    // For CSV export, combine all sheets with separators
    let fullContent = '';

    sheetsData.forEach((sheet, index) => {
      if (index > 0) {
        fullContent += '\n\n---\n';
        fullContent += `${sheet.sheetName}\n`;
        fullContent += '---\n\n';
      } else {
        fullContent += `${sheet.sheetName}\n`;
        fullContent += '---\n\n';
      }

      const headers = sheet.headers || Object.keys(sheet.data[0]);
      fullContent += this.convertToCSV(sheet.data, headers);
    });

    this.downloadFile(fullContent, `${filename}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;');
  }

  /**
   * Convert array of objects to CSV string
   */
  private convertToCSV(data: any[], headers: string[]): string {
    // CSV header row
    const csvHeaders = headers.map(h => this.escapeCSVField(String(h))).join(',');
    
    // CSV data rows
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = this.getNestedValue(row, header);
        return this.escapeCSVField(String(value || ''));
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }

  /**
   * Get nested object value using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Escape CSV field values (handle commas, quotes, newlines)
   */
  private escapeCSVField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  /**
   * Download file helper
   */
  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Format data for export (flatten nested objects if needed)
   */
  flattenData(data: any[], excludeFields?: string[]): any[] {
    return data.map(item => {
      const flattened: any = {};

      Object.keys(item).forEach(key => {
        if (excludeFields?.includes(key)) {
          return;
        }

        if (typeof item[key] === 'object' && item[key] !== null) {
          if (Array.isArray(item[key])) {
            flattened[key] = JSON.stringify(item[key]);
          } else {
            // Flatten nested object
            Object.keys(item[key]).forEach(nestedKey => {
              flattened[`${key}_${nestedKey}`] = item[key][nestedKey];
            });
          }
        } else {
          flattened[key] = item[key];
        }
      });

      return flattened;
    });
  }
}
