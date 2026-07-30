import { afterNextRender, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly themeService = inject(ThemeService);
  private readonly fallbackImageSrc = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
    <svg width="800px" height="800px" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="120" height="120" fill="#EFF1F3"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M33.2503 38.4816C33.2603 37.0472 34.4199 35.8864 35.8543 35.875H83.1463C84.5848 35.875 85.7503 37.0431 85.7503 38.4816V80.5184C85.7403 81.9528 84.5807 83.1136 83.1463 83.125H35.8543C34.4158 83.1236 33.2503 81.957 33.2503 80.5184V38.4816ZM80.5006 41.1251H38.5006V77.8751L62.8921 53.4783C63.9172 52.4536 65.5788 52.4536 66.6039 53.4783L80.5006 67.4013V41.1251ZM43.75 51.6249C43.75 54.5244 46.1005 56.8749 49 56.8749C51.8995 56.8749 54.25 54.5244 54.25 51.6249C54.25 48.7254 51.8995 46.3749 49 46.3749C46.1005 46.3749 43.75 48.7254 43.75 51.6249Z" fill="#687787"/>
</svg>
  `);

  constructor() {
    afterNextRender(() => {
      this.themeService.initTheme();
      this.attachGlobalImageFallback();
    });
  }

  private attachGlobalImageFallback(): void {
    const applyFallback = (image: HTMLImageElement): void => {
      if (!image || image.dataset['fallbackApplied'] === 'true') {
        return;
      }

      image.dataset['fallbackApplied'] = 'true';

      const handleError = () => {
        if (image.getAttribute('src') === this.fallbackImageSrc) {
          return;
        }

        image.src = this.fallbackImageSrc;
        image.removeAttribute('srcset');

        if (!image.alt) {
          image.alt = 'Image unavailable';
        }
      };

      image.addEventListener('error', handleError);

      if (image.complete && image.naturalWidth === 0 && image.naturalHeight === 0) {
        handleError();
      }
    };

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLImageElement) {
            applyFallback(node);
          }

          if (node instanceof Element) {
            node.querySelectorAll('img').forEach((img) => applyFallback(img));
          }
        });
      });
    });

    document.querySelectorAll('img').forEach((img) => applyFallback(img));

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
}
