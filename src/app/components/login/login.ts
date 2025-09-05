import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  login(role: 'admin'|'cliente'|'empleado', user?: string) {
    this.auth.loginAs(role, user);
    this.router.navigate(['/productos']);
  }
}
