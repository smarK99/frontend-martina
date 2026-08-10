import { Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject, Observable, switchMap, combineLatest, tap, catchError, of, debounceTime, distinctUntilChanged } from 'rxjs';

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
  
  // ==========================================
  // VARIABLES DE PAGINACIÓN Y FILTROS
  // ==========================================
  private refresh$ = new BehaviorSubject<void>(undefined);
  filterSubject = new BehaviorSubject<string>(''); // Controla el texto del buscador
  
  currentPage = 0;
  pageSize = 15;
  totalElements = 0;
  totalPages = 0;
  isLoadingTabla = false;
  usuarios: any[] = []; // Reemplazamos el Observable por un array normal para la vista

  // Formulario reactivo
  usuarioForm: FormGroup;
  isEditMode = false;
  usuarioSeleccionadoId: number | null = null;

  // Variables para Roles
  rolesDisponibles: string[] = ['ADMIN', 'DUENIO', 'STOCK', 'EMPLEADO', 'REPARTIDOR', 'CLIENTE'];
  rolesSeleccionados: string[] = [];
  usuarioParaRolesId: number | null = null;

  // ==========================================
  // ALERTA GENÉRICA Y CONFIRMACIÓN DE BAJA
  // ==========================================
  @ViewChild('alertaModal') alertaModal!: TemplateRef<any>;
  mensajeAlerta: string = '';
  tipoAlerta: 'exito' | 'error' = 'exito';
  
  usuarioABajar: number | null = null;

  constructor() {
    this.usuarioForm = this.fb.group({
      nombreApellido: ['', Validators.required],
      usuario: ['', [Validators.required, Validators.minLength(4)]],
      mailUsuario: ['', [Validators.required, Validators.email]],
      telefonoUsuario: [''],
      domicilioUsuario: [''],
      claveUsuario: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.configurarPaginacionReactiva();
  }

  // ==========================================
  // LÓGICA REACTIVA DE PAGINACIÓN Y BÚSQUEDA
  // ==========================================
  configurarPaginacionReactiva() {
    combineLatest([
      this.filterSubject.pipe(debounceTime(400), distinctUntilChanged()), // Espera a que termine de tipear
      this.refresh$,
      this.role$
    ]).pipe(
      tap(() => this.isLoadingTabla = true),
      switchMap(([termino, _, role]) => {
        
        // Seguridad: Si no es admin o dueño, no traemos la lista
        if (role !== 'ROLE_ADMIN' && role !== 'ROLE_DUENIO') {
          return of({ content: [], totalElements: 0, totalPages: 0 });
        }

        return this.usuarioService.buscarPaginadoYFiltrado(termino, this.currentPage, this.pageSize).pipe(
          catchError(error => {
            console.error('🚨 Error al traer usuarios del backend:', error);
            return of({ content: [], totalElements: 0, totalPages: 0 });
          })
        );
      })
    ).subscribe(response => {
      this.totalElements = response.totalElements || 0;
      this.totalPages = response.totalPages || 0;
      this.usuarios = response.content || []; 
      this.isLoadingTabla = false; 
    });
  }

  onFilterChange(value: string) {
    this.currentPage = 0; 
    this.filterSubject.next(value.trim()); 
  }

  cambiarPagina(nuevaPagina: number) {
    if (nuevaPagina >= 0 && nuevaPagina < this.totalPages) {
      this.currentPage = nuevaPagina;
      this.refresh$.next(); 
    }
  }

  mostrarAlerta(mensaje: string, tipo: 'exito' | 'error') {
    this.mensajeAlerta = mensaje;
    this.tipoAlerta = tipo;
    
    this.modalService.open(this.alertaModal, { centered: true, size: 'sm', backdrop: 'static' });

    if (tipo === 'exito') {
      setTimeout(() => {
        this.modalService.dismissAll();
      }, 2000);
    }
  }

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
          setTimeout(() => this.mostrarAlerta('Usuario actualizado con éxito.', 'exito'), 300);
        },
        error: (err) => {
          console.error(err);
          this.mostrarAlerta('Error al actualizar el usuario.', 'error');
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
          setTimeout(() => this.mostrarAlerta('Usuario registrado con éxito.', 'exito'), 300);
        },
        error: (err) => {
          console.error(err);
          this.mostrarAlerta('Error al registrar el usuario.', 'error');
        }
      });
    }
  }

  abrirModalBaja(codUsuario: number, modalTemplate: any) {
    this.usuarioABajar = codUsuario;
    this.modalService.open(modalTemplate, { centered: true, size: 'sm' });
  }

  confirmarBaja() {
    if (this.usuarioABajar) {
      const payloadBaja = { codUsuario: this.usuarioABajar };
      
      this.usuarioService.baja(payloadBaja).subscribe({
        next: () => {
          this.modalService.dismissAll();
          this.usuarioABajar = null;
          this.refresh$.next();
          setTimeout(() => this.mostrarAlerta('El usuario fue dado de baja exitosamente.', 'exito'), 300);
        },
        error: (err) => {
          console.error(err);
          this.mostrarAlerta('Error al dar de baja al usuario.', 'error');
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
    console.log("Rol clickeado:", rol, "| Estado actual de la lista:", this.rolesSeleccionados);
  }

  guardarRoles() {
    const payload = {
      id: this.usuarioParaRolesId,
      codUsuario: this.usuarioParaRolesId, 
      roles: this.rolesSeleccionados
    };
    
    console.log(">>> ENVIANDO A JAVA EL PAYLOAD:", payload);
    
    this.usuarioService.actualizarRoles(payload).subscribe({
      next: () => {
        this.modalService.dismissAll();
        this.refresh$.next();
        setTimeout(() => this.mostrarAlerta('Permisos actualizados correctamente.', 'exito'), 300);
      },
      error: (err) => {
        console.error(err);
        this.mostrarAlerta('Error al actualizar permisos.', 'error');
      }
    });
  }
}