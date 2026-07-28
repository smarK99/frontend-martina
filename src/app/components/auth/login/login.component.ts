import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth-service';
import { Component, inject } from '@angular/core';
import { FormsModule, NgForm, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TemplateRef } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { UsuarioService } from '../../../services/usuario.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
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
  private usuarioService = inject(UsuarioService);
  private modalService = inject(NgbModal);

  emailRecuperacion = new FormControl('', [Validators.required, Validators.email]);
  mensajeRecuperacion: string = '';

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

  abrirModalRecuperacion(modal: TemplateRef<any>) {
    this.emailRecuperacion.reset();
    this.mensajeRecuperacion = '';
    this.modalService.open(modal, { centered: true });
  }

  enviarCorreoRecuperacion() {
    if (this.emailRecuperacion.invalid) {
      this.emailRecuperacion.markAsTouched();
      return;
    }

    const email = this.emailRecuperacion.value!;
    this.usuarioService.solicitarRecuperacionClave(email).subscribe({
      next: (res) => {
        // Mostramos el mensaje de éxito que nos manda Spring Boot
        this.mensajeRecuperacion = res.mensaje;
      },
      error: (err) => {
        // Como buena práctica, no avisamos si falló por no existir, pero capturamos errores de red
        this.mensajeRecuperacion = "Ocurrió un error al intentar enviar el correo. Intentá más tarde.";
      }
    });
  }
}