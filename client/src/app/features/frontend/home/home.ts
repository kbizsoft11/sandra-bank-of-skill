import { AfterViewInit, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import Swiper from 'swiper';
import { Navigation, Autoplay } from 'swiper/modules';

@Component({
  selector: 'app-home',
  standalone: true, // remove if you're using NgModules
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})

export class HomeComponent implements AfterViewInit {

  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async goToDashboard(): Promise<void> {
    await this.auth.waitForUserLoad();

    const dashboardPath = this.auth.getRoleDashboardPath();
    if (dashboardPath !== '/auth/login') {
      await this.router.navigateByUrl(dashboardPath);
    }
  }

  ngAfterViewInit(): void {

    new Swiper('.bosTestimonialSwiper', {
      modules: [Navigation, Autoplay],
      slidesPerView: 3,
      spaceBetween: 30,
      loop: true,
      navigation: {
        nextEl: '.bos-testimonial-next',
        prevEl: '.bos-testimonial-prev'
      },
      autoplay: {
        delay: 3000,
        disableOnInteraction: false
      },
      breakpoints: {
        0: {
          slidesPerView: 1
        },
        768: {
          slidesPerView: 2
        },
        992: {
          slidesPerView: 3
        }
      }
    });

  }

}
