import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon } from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  /**
   * Show success alert
   */
  success(message: string, title: string = 'Success!'): Promise<any> {
    return Swal.fire({
      icon: 'success',
      title: title,
      text: message,
      confirmButtonColor: '#667eea',
      confirmButtonText: 'OK'
    });
  }

  /**
   * Show error alert
   */
  error(message: string, title: string = 'Error!'): Promise<any> {
    return Swal.fire({
      icon: 'error',
      title: title,
      text: message,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'OK'
    });
  }

  /**
   * Show warning alert
   */
  warning(message: string, title: string = 'Warning!'): Promise<any> {
    return Swal.fire({
      icon: 'warning',
      title: title,
      text: message,
      confirmButtonColor: '#f59e0b',
      confirmButtonText: 'OK'
    });
  }

  /**
   * Show info alert
   */
  info(message: string, title: string = 'Info'): Promise<any> {
    return Swal.fire({
      icon: 'info',
      title: title,
      text: message,
      confirmButtonColor: '#3b82f6',
      confirmButtonText: 'OK'
    });
  }

  /**
   * Show confirmation dialog
   */
  confirm(
    message: string, 
    title: string = 'Are you sure?',
    confirmText: string = 'Yes',
    cancelText: string = 'Cancel'
  ): Promise<boolean> {
    return Swal.fire({
      icon: 'question',
      title: title,
      text: message,
      showCancelButton: true,
      confirmButtonColor: '#667eea',
      cancelButtonColor: '#6c757d',
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true
    }).then((result) => {
      return result.isConfirmed;
    });
  }

  /**
   * Show delete confirmation dialog
   */
  confirmDelete(itemName: string = 'this item'): Promise<boolean> {
    return Swal.fire({
      icon: 'warning',
      title: 'Delete Confirmation',
      html: `Are you sure you want to delete <strong>${itemName}</strong>?<br><small class="text-muted">This action cannot be undone.</small>`,
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    }).then((result) => {
      return result.isConfirmed;
    });
  }

  /**
   * Show loading alert
   */
  loading(message: string = 'Please wait...'): void {
    Swal.fire({
      title: message,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  /**
   * Close any open alert
   */
  close(): void {
    Swal.close();
  }

  /**
   * Show toast notification
   */
  toast(message: string, icon: SweetAlertIcon = 'success', duration: number = 3000): void {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: duration,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });

    Toast.fire({
      icon: icon,
      title: message
    });
  }

  /**
   * Show select category dialog
   */
  selectCategory(categories: string[] | { id: string; name: string }[]): Promise<string | null> {
    let options: Record<string, string> = {};

    if (Array.isArray(categories) && categories.length > 0) {
      if (typeof categories[0] === 'string') {
        // Old format: string array
        options = (categories as string[]).reduce((acc, cat) => {
          acc[cat] = cat;
          return acc;
        }, {} as Record<string, string>);
      } else {
        // New format: { id, name } array
        options = (categories as any[]).reduce((acc, cat) => {
          acc[cat.id] = cat.name;
          return acc;
        }, {} as Record<string, string>);
      }
    }

    return Swal.fire({
      title: 'Select Target Category',
      input: 'select',
      inputOptions: options,
      inputPlaceholder: 'Choose a category',
      showCancelButton: true,
      confirmButtonColor: '#667eea',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Move',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value) {
          return 'Please select a category';
        }
        return null;
      }
    }).then((result) => {
      return result.isConfirmed ? result.value : null;
    });
  }
}
