import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { map } from 'rxjs'; 

import { AuthService } from '../../services/auth-service';
// Ajustá la ruta de tu UsuarioService según cómo lo tengas en tu proyecto
import { UsuarioService } from '../../services/usuario.service'; 

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  // ¡CLAVE! Sumamos ReactiveFormsModule a los imports
  imports: [CommonModule, RouterModule, ReactiveFormsModule], 
  templateUrl: './nav-bar.html',
  styleUrls: ['./nav-bar.css']
})
export class NavBar implements OnInit {
  
  // Inyecciones de dependencias usando la sintaxis moderna
  private authService = inject(AuthService);
  private usuarioService = inject(UsuarioService); 
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private modalService = inject(NgbModal);

  role$ = this.authService.role$;
  isLoggedIn$ = this.authService.isLoggedIn$;

  displayRole$ = this.role$.pipe(
    map(role => role ? role.replace('ROLE_', '') : '')
  );

  // Variable para el formulario de cambio de clave
  claveForm!: FormGroup;

  ngOnInit(): void {
    // Inicializamos el formulario al cargar el componente
    this.claveForm = this.fb.group({
      claveActual: ['', Validators.required],
      nuevaClave: ['', [Validators.required, Validators.minLength(4)]],
      confirmarClave: ['', Validators.required]
    }, { validators: this.passwordsMatchValidator });
  }

  // Validador personalizado para asegurar que las nuevas contraseñas coincidan
  passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const pass = group.get('nuevaClave')?.value;
    const confirm = group.get('confirmarClave')?.value;
    return pass === confirm ? null : { passwordsMismatch: true };
  }

  // Método para abrir el modal desde el HTML
  abrirModalCambioClave(modal: any) {
    this.claveForm.reset();
    this.modalService.open(modal, { centered: true });
  }

  // Método para enviar la solicitud al backend
  actualizarMiClave() {
    if (this.claveForm.invalid) {
      this.claveForm.markAllAsTouched();
      return;
    }

    const payload = {
      claveActual: this.claveForm.value.claveActual,
      nuevaClave: this.claveForm.value.nuevaClave
    };

    this.usuarioService.cambiarClavePersonal(payload).subscribe({
      next: (res: any) => {
        alert('¡Contraseña actualizada con éxito!');
        this.modalService.dismissAll();
      },
      error: (err) => {
        console.error(err);
        alert('Error: ' + (err.error?.error || 'No se pudo actualizar la contraseña. Verificá tu clave actual.'));
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/productos']); 
  }
}