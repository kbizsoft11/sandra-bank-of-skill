import { Component, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-prism-assessment-frame',
  standalone: true,
  templateUrl: './prism-assessment-frame.html',
  styleUrl: './prism-assessment-frame.scss',
})
export class PrismAssessmentFrameComponent {
  private readonly sanitizer = inject(DomSanitizer);

  @Input() title = 'PRISM assessment';
  @Output() closed = new EventEmitter<void>();
  safeUrl: SafeResourceUrl | null = null;

  @Input()
  set url(value: string | null | undefined) {
    this.safeUrl = this.toSafeUrl(value);
  }

  @HostListener('document:keydown.escape')
  closeWithEscape(): void { this.close(); }

  close(): void { this.closed.emit(); }

  private toSafeUrl(value: string | null | undefined): SafeResourceUrl | null {
    if (!value) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
      return this.sanitizer.bypassSecurityTrustResourceUrl(url.toString());
    } catch {
      return null;
    }
  }
}
