import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: 'img',
  standalone: true
})
export class ImageFallbackDirective {
  private readonly defaultFallbackSrc = '/assets/images/image-fallback.svg';

  @Input() fallbackSrc: string | null = this.defaultFallbackSrc;

  constructor(private readonly elementRef: ElementRef<HTMLImageElement>) {}

  @HostListener('error')
  onError(): void {
    const element = this.elementRef.nativeElement;
    const currentSrc = element.getAttribute('src') || '';
    const fallbackSrc = this.fallbackSrc || this.defaultFallbackSrc;

    if (!fallbackSrc || currentSrc.includes('/assets/images/image-fallback.svg')) {
      return;
    }

    element.src = fallbackSrc;
    element.removeAttribute('srcset');

    if (!element.alt) {
      element.alt = 'Image unavailable';
    }
  }
}
