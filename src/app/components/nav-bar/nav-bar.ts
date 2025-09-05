import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth-service';
import { Observable } from 'rxjs';


@Component({
  selector: 'app-nav-bar',
  imports: [CommonModule, RouterModule],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css'
})
export class NavBar {
  private auth = inject(AuthService);
  private router = inject(Router);

  role$: Observable<string | null> = this.auth.role$;
  isLoggedIn$: Observable<boolean> = this.auth.isLoggedIn$;

  goLogin() {
    this.router.navigate(['/login']);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/productos']);
  }
}
