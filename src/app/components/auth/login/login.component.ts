import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth-service';
import { Component, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginUsuario = { username: '', password: '' };
  
  // Variables para controlar la vista
  mensajeError: string | null = null;
  isLoading = false;
  mostrarPassword = false; 

  
  private authService = inject(AuthService);
  private router = inject(Router);

  onLogin(form: NgForm) {
    if (form.invalid) {
      // Si el formulario es inválido, marcamos todos los campos como tocados para que salten los errores en rojo
      Object.keys(form.controls).forEach(key => {
        form.controls[key].markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.mensajeError = null; // Limpiamos errores anteriores

    this.authService.login(this.loginUsuario).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.router.navigate(['/productos']);
      },
      error: (err) => {
        this.isLoading = false;
        // Atrapamos el famoso error 401 y lo mostramos lindo
        if (err.status === 401 || err.status === 400) {
          this.mensajeError = 'Usuario o contraseña incorrectos. Por favor, verificá tus datos.';
        } else {
          this.mensajeError = 'Error de conexión con el servidor. Intentá más tarde.';
        }
        console.error('Error detallado en el login:', err);
      }
    });
  }
}