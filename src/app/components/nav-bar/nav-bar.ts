import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { map } from 'rxjs'; // <-- Importamos map

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './nav-bar.html',
  styleUrls: ['./nav-bar.css']
})
export class NavBar {
  
  private authService = inject(AuthService);
  private router = inject(Router);

  role$ = this.authService.role$;
  isLoggedIn$ = this.authService.isLoggedIn$;

  // Creamos un observable exclusivo para la UI que limpia el texto
  displayRole$ = this.role$.pipe(
    map(role => role ? role.replace('ROLE_', '') : '')
  );

  logout() {
    this.authService.logout();
    this.router.navigate(['/productos']); 
  }
}