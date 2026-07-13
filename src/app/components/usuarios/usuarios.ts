import { Component, inject, OnInit, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject, Observable } from 'rxjs';

import { AuthService } from '../../services/auth-service';
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

  role$ = this.auth.role$;
  
  // Formulario reactivo
  usuarioForm: FormGroup;
  isEditMode = false;
  usuarioSeleccionadoId: number | null = null;

  constructor() {
    // Inicializamos el formulario con las reglas reales de tu Login
    this.usuarioForm = this.fb.group({
      nombreApellido: ['', Validators.required],
      usuario: ['', [Validators.required, Validators.minLength(4)]], // Mínimo 4 como tu Login
      mailUsuario: ['', [Validators.required, Validators.email]],
      telefonoUsuario: [''],
      domicilioUsuario: [''],
      claveUsuario: ['', Validators.required] // Solo requerida, sin restricciones raras
    });
  }

  ngOnInit() {}

  // Método simple para abrir el modal de Alta limpia
  abrirModalAlta(modal: TemplateRef<any>) {
    this.isEditMode = false;
    this.usuarioSeleccionadoId = null;
    this.usuarioForm.reset();
    
    // En alta, el campo de usuario y clave se habilitan y son obligatorios
    this.usuarioForm.get('usuario')?.enable();
    this.usuarioForm.get('claveUsuario')?.setValidators([Validators.required]);
    this.usuarioForm.get('claveUsuario')?.updateValueAndValidity();

    this.modalService.open(modal, { size: 'lg', centered: true });
  }

  closeModal() {
    this.modalService.dismissAll();
    this.usuarioForm.reset();
  }

  // --- LÓGICA DE EDICIÓN ---
  abrirModalEdicion(modal: TemplateRef<any>, usuarioData: any) {
    this.isEditMode = true;
    this.usuarioSeleccionadoId = usuarioData.codUsuario;
    
    // En edición, el username no se puede cambiar y la clave no se pide
    this.usuarioForm.get('usuario')?.disable();
    this.usuarioForm.get('claveUsuario')?.clearValidators();
    this.usuarioForm.get('claveUsuario')?.updateValueAndValidity();

    // Precargamos los datos en el formulario
    this.usuarioForm.patchValue({
      nombreApellido: usuarioData.nombreApellido,
      usuario: usuarioData.usuario,
      mailUsuario: usuarioData.mailUsuario,
      telefonoUsuario: usuarioData.telefonoUsuario,
      domicilioUsuario: usuarioData.domicilioUsuario,
      claveUsuario: '' 
    });

    this.modalService.open(modal, { size: 'lg', centered: true });
  }

  // --- LÓGICA DE GUARDADO (ALTA Y MODIFICACIÓN) ---
  guardarUsuario() {
    // 1. Verificamos que el formulario sea válido
    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      return;
    }

    // 2. Obtenemos los valores (usamos getRawValue para incluir el 'usuario' aunque esté deshabilitado)
    const formValues = this.usuarioForm.getRawValue();

    if (this.isEditMode) {
      // 3A. Armamos el payload de Modificación (Exacto como pide el CU N°1)
      const payloadModificacion = {
        codUsuario: this.usuarioSeleccionadoId,
        domicilioUsuario: formValues.domicilioUsuario || '',
        mailUsuario: formValues.mailUsuario,
        nombreApellido: formValues.nombreApellido,
        telefonoUsuario: formValues.telefonoUsuario || ''
      };
      
      console.log('Enviando DTO de Modificación al Backend:', payloadModificacion);
      
      // ACÁ IRÍA TU LLAMADA AL SERVICIO:
      // this.usuarioService.update(payloadModificacion).subscribe(...)
      
    } else {
      // 3B. Armamos el payload de Alta (Exacto como pide el CU N°1)
      const payloadAlta = {
        claveUsuario: formValues.claveUsuario,
        domicilioUsuario: formValues.domicilioUsuario || '',
        mailUsuario: formValues.mailUsuario,
        nombreApellido: formValues.nombreApellido,
        usuario: formValues.usuario,
        telefonoUsuario: formValues.telefonoUsuario || ''
      };

      console.log('Enviando DTO de Alta al Backend:', payloadAlta);
      
      // ACÁ IRÍA TU LLAMADA AL SERVICIO:
      // this.usuarioService.create(payloadAlta).subscribe(...)
    }

    // 4. Cerramos el modal y damos aviso
    this.closeModal();
    alert(this.isEditMode ? 'Usuario actualizado con éxito.' : 'Usuario registrado con éxito.');
  }

  // --- LÓGICA DE BAJA LÓGICA ---
  darDeBaja(codUsuario: number) {
    if (confirm('¿Estás seguro de que querés dar de baja a este usuario? Esta acción es lógica y registrará la fecha actual.')) {
      
      const payloadBaja = {
        codUsuario: codUsuario
      };
      
      console.log('Enviando DTO de Baja al Backend:', payloadBaja);
      
      // ACÁ IRÍA TU LLAMADA AL SERVICIO:
      // this.usuarioService.baja(payloadBaja).subscribe(...)
      
      alert('El usuario fue dado de baja exitosamente.');
    }
  }
}