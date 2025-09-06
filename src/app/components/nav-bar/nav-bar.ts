import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth-service';
import { Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';


@Component({
  selector: 'app-nav-bar',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css'
})
export class NavBar {
  private modalService = inject(NgbModal);
  private auth = inject(AuthService);
  private router = inject(Router);

  role$: Observable<string | null> = this.auth.role$;
  isLoggedIn$: Observable<boolean> = this.auth.isLoggedIn$;

  loginUser = '';
  loginRole: 'admin' | 'cliente' | 'empleado' = 'cliente';

  openLoginModal(content: any) {
    // centered: true centra el modal; size: 'sm'|'lg' opcional
    this.modalService.open(content, { centered: true, size: 'md' });
  }

  loginFromModal(modalRef: any) {
    // validar si hace falta
    this.auth.loginAs(this.loginRole, this.loginUser || undefined);
    modalRef.close(); // cierra el modal
    if (this.loginRole === 'cliente') this.router.navigate(['/pedidos']);
    else this.router.navigate(['/productos']);
  }

  goLogin() {
    this.router.navigate(['/login']);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/productos']);
  }
}
