import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UsuarioService } from '../../../services/usuario.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private usuarioService = inject(UsuarioService);

  token: string | null = null;
  mensajeExito: string = '';
  mensajeError: string = '';
  isLoading = false;

  // Formulario reactivo con validación personalizada para que las claves coincidan
  resetForm = new FormGroup({
    nuevaClave: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmarClave: new FormControl('', [Validators.required])
  }, { validators: this.clavesCoincidenValidator });

  ngOnInit() {
    // Capturamos el "?token=..." de la URL
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      if (!this.token) {
        this.mensajeError = 'Enlace inválido o corrupto. Faltan credenciales de seguridad.';
      }
    });
  }

  // Validador personalizado
  clavesCoincidenValidator(control: AbstractControl): ValidationErrors | null {
    const nueva = control.get('nuevaClave')?.value;
    const confirmar = control.get('confirmarClave')?.value;
    return nueva === confirmar ? null : { noCoinciden: true };
  }

  cambiarClave() {
    if (this.resetForm.invalid || !this.token) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.mensajeError = '';
    const nuevaClave = this.resetForm.value.nuevaClave!;

    // Enviaremos el token y la nueva clave al backend
    this.usuarioService.restablecerClaveConToken(this.token, nuevaClave).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.mensajeExito = '¡Contraseña actualizada con éxito!';
        // Esperamos 3 segundos y lo mandamos al login
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err) => {
        this.isLoading = false;
        this.mensajeError = 'El enlace expiró o es inválido. Volvé a solicitar la recuperación.';
      }
    });
  }
}