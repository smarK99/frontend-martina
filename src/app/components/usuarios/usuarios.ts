import { Component, inject, OnInit, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject, Observable, switchMap } from 'rxjs';

import { AuthService } from '../../services/auth-service';
import { UsuarioService } from '../../services/usuario.service';
import { ActionBar } from '../action-bar/action-bar';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbModule, ActionBar],
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.css']
})
export class Usuarios implements OnInit {

  private fb = inject(FormBuilder);
  private modalService = inject(NgbModal);
  private auth = inject(AuthService);
  private usuarioService = inject(UsuarioService); 

  role$ = this.auth.role$;
  
  // Estado de la tabla
  private refresh$ = new BehaviorSubject<void>(undefined);
  usuarios$!: Observable<any[]>;

  // Formulario reactivo
  usuarioForm: FormGroup;
  isEditMode = false;
  usuarioSeleccionadoId: number | null = null;

  // Variables para Roles
  rolesDisponibles: string[] = ['ADMIN', 'DUENIO', 'STOCK', 'EMPLEADO', 'REPARTIDOR', 'CLIENTE'];
  rolesSeleccionados: string[] = [];
  usuarioParaRolesId: number | null = null;

  constructor() {
    this.usuarioForm = this.fb.group({
      nombreApellido: ['', Validators.required],
      usuario: ['', [Validators.required, Validators.minLength(4)]],
      mailUsuario: ['', [Validators.required, Validators.email]],
      telefonoUsuario: [''],
      domicilioUsuario: [''],
      claveUsuario: ['', Validators.required]
    });

    // Enganchamos la tabla al backend
    this.usuarios$ = this.refresh$.pipe(
      switchMap(() => this.usuarioService.getAll())
    );
  }

  ngOnInit() {}

  // --- MODALES ALTA Y EDICIÓN ---
  abrirModalAlta(modal: TemplateRef<any>) {
    this.isEditMode = false;
    this.usuarioSeleccionadoId = null;
    this.usuarioForm.reset();
    
    this.usuarioForm.get('usuario')?.enable();
    this.usuarioForm.get('claveUsuario')?.setValidators([Validators.required]);
    this.usuarioForm.get('claveUsuario')?.updateValueAndValidity();

    this.modalService.open(modal, { size: 'lg', centered: true });
  }

  abrirModalEdicion(modal: TemplateRef<any>, usuarioData: any) {
    this.isEditMode = true;
    
    // 1. Corregimos el ID (antes era codUsuario, ahora es id)
    this.usuarioSeleccionadoId = usuarioData.id;
    
    this.usuarioForm.get('usuario')?.disable();
    this.usuarioForm.get('claveUsuario')?.clearValidators();
    this.usuarioForm.get('claveUsuario')?.updateValueAndValidity();

    // 2. Mapeamos los datos con los nombres correctos que vienen de la Base de Datos
    this.usuarioForm.patchValue({
      nombreApellido: usuarioData.nombreCompletoUsuario, 
      usuario: usuarioData.username,                     
      mailUsuario: usuarioData.email,                    
      telefonoUsuario: usuarioData.telefono,             
      domicilioUsuario: usuarioData.direccion,           
      claveUsuario: '' 
    });

    this.modalService.open(modal, { size: 'lg', centered: true });
  }

  closeModal() {
    this.modalService.dismissAll();
    this.usuarioForm.reset();
  }

  // --- GUARDAR Y DAR DE BAJA ---
  guardarUsuario() {
    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      return;
    }

    const formValues = this.usuarioForm.getRawValue();

   if (this.isEditMode) {
      const payloadModificacion = {
        // Aseguramos que el ID viaje correctamente
        id: this.usuarioSeleccionadoId,
        codUsuario: this.usuarioSeleccionadoId, 
        
        domicilioUsuario: formValues.domicilioUsuario || '',
        mailUsuario: formValues.mailUsuario,
        nombreApellido: formValues.nombreApellido,
        telefonoUsuario: formValues.telefonoUsuario || ''
      };
      
      this.usuarioService.update(payloadModificacion).subscribe({
        next: () => {
          this.closeModal();
          this.refresh$.next(); 
          alert('Usuario actualizado con éxito.');
        },
        error: (err) => {
          console.error(err);
          alert('Error al actualizar el usuario.');
        }
      });
      
    } else {
      const payloadAlta = {
        claveUsuario: formValues.claveUsuario,
        domicilioUsuario: formValues.domicilioUsuario || '',
        mailUsuario: formValues.mailUsuario,
        nombreApellido: formValues.nombreApellido,
        usuario: formValues.usuario,
        telefonoUsuario: formValues.telefonoUsuario || ''
      };

      this.usuarioService.create(payloadAlta).subscribe({
        next: () => {
          this.closeModal();
          this.refresh$.next(); 
          alert('Usuario registrado con éxito.');
        },
        error: (err) => {
          console.error(err);
          alert('Error al registrar el usuario.');
        }
      });
    }
  }

  darDeBaja(codUsuario: number) {
    if (confirm('¿Estás seguro de que querés dar de baja a este usuario? Esta acción es lógica y registrará la fecha actual.')) {
      const payloadBaja = { codUsuario: codUsuario };
      
      this.usuarioService.baja(payloadBaja).subscribe({
        next: () => {
          this.refresh$.next();
          alert('El usuario fue dado de baja exitosamente.');
        },
        error: (err) => {
          console.error(err);
          alert('Error al dar de baja.');
        }
      });
    }
  }

  abrirModalRoles(modal: TemplateRef<any>, usuarioData: any) {
    this.usuarioParaRolesId = usuarioData.id; 

    // 2. Leemos los roles tal cual vienen de la base de datos, sin inventarle prefijos
    if (usuarioData.tiposUsuario && usuarioData.tiposUsuario.length > 0) {
      this.rolesSeleccionados = usuarioData.tiposUsuario.map((t: any) => t.nombreTipoUsuario.toUpperCase());
    } else if (usuarioData.authorities) {
      // Alternativa de seguridad (por si Java no manda tiposUsuario)
      this.rolesSeleccionados = usuarioData.authorities.map((a: any) => a.authority.replace('ROLE_', '').toUpperCase());
    } else {
      this.rolesSeleccionados = [];
    }
    
    this.modalService.open(modal, { size: 'md', centered: true });
  }

  toggleRol(rol: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.rolesSeleccionados.push(rol);
    } else {
      this.rolesSeleccionados = this.rolesSeleccionados.filter(r => r !== rol);
    }
    // Agregamos este chismoso:
    console.log("Rol clickeado:", rol, "| Estado actual de la lista:", this.rolesSeleccionados);
  }

  guardarRoles() {
    const payload = {
      id: this.usuarioParaRolesId,
      codUsuario: this.usuarioParaRolesId, 
      roles: this.rolesSeleccionados
    };
    
    // Agregamos este chismoso antes de mandarlo a Java:
    console.log(">>> ENVIANDO A JAVA EL PAYLOAD:", payload);
    
    this.usuarioService.actualizarRoles(payload).subscribe({
      next: () => {
        this.modalService.dismissAll();
        this.refresh$.next();
        alert('Permisos actualizados correctamente.');
      },
      error: (err) => {
        console.error(err);
        alert('Error al actualizar permisos.');
      }
    });
  }
}