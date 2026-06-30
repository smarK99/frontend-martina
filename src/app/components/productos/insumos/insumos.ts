import { Component, inject, TemplateRef, ViewChild } from '@angular/core';
import { InsumosService } from '../../../services/insumos-service';
import { Insumo } from '../../../model/producto.model';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-insumos',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './insumos.html',
  styleUrl: './insumos.css'
})
export class Insumos {
private fb = inject(FormBuilder);
private modalService = inject(NgbModal);
private insumoService = inject(InsumosService);

  insumos: Insumo[] = [];
  cargando = false;
  
  insumoForm: FormGroup;
  insumoEnEdicion: Insumo | null = null; 

  @ViewChild('insumoModal') modalInsumo!: TemplateRef<any>;

  constructor() {
    this.insumoForm = this.fb.group({
      nombreInsumo: ['', [Validators.required, Validators.maxLength(50)]],
      descripcionInsumo: ['', Validators.maxLength(200)],
      precioCompraInsumo: ['', [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit() {
    this.cargarInsumos();
  }

  cargarInsumos() {
    this.cargando = true;
    
    // Simulación (Reemplazar con this.insumoService.getAll()...)
    this.insumoService.getAll().subscribe({
      next: (data) => {
        this.insumos = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar insumos', err);
        this.cargando = false;
      }
    });
  }

  // --- ACCIÓN: CREAR (Llamado desde el botón del componente Padre) ---
  abrirModalAltaInsumo() {
    this.insumoEnEdicion = null; 
    this.insumoForm.reset();     
    this.abrirModal();
  }

  // --- ACCIÓN: EDITAR (Llamado desde la tabla) ---
  editarInsumo(insumo: Insumo) {
    this.insumoEnEdicion = insumo; 
    
    this.insumoForm.patchValue({
      nombreInsumo: insumo.nombreInsumo,
      descripcionInsumo: insumo.descripcionInsumo,
      precioCompraInsumo: insumo.precioCompraInsumo
    });

    this.abrirModal(); 
  }

  private abrirModal() {
    this.modalService.open(this.modalInsumo, { centered: true }).result.then(
      () => this.insumoForm.reset(),
      () => this.insumoForm.reset()
    );
  }

  // --- ACCIÓN: GUARDAR ---
  guardarInsumo() {
    if (this.insumoForm.invalid) {
      this.insumoForm.markAllAsTouched();
      return;
    }

    const formData = this.insumoForm.value;

    if (this.insumoEnEdicion) {
      // MODO EDICIÓN (PUT) - Aplicamos la fusión de objetos para evitar el Error 400
      const payloadActualizado = {
        ...this.insumoEnEdicion, 
        ...formData                 
      };

      console.log('Actualizando insumo:', payloadActualizado);
      this.insumoService.update(this.insumoEnEdicion.id, payloadActualizado).subscribe({
        next: () => {
          console.log('Insumo actualizada exitosamente');
          this.modalService.dismissAll();
          this.cargarInsumos(); // Recargar la lista de insumos
        },
        error: (err) => {
          console.error('Error al actualizar insumo', err);
        }
      });
      
      this.modalService.dismissAll();
      alert('Insumo actualizado');

    } else {
      // MODO CREACIÓN (POST)
      this.insumoService.create(formData).subscribe({
        next: () => {
          console.log('Insumo creado exitosamente');
          this.cargarInsumos(); // Recargar la lista de insumos
        },
        error: (err) => {
          console.error('Error al crear insumo', err);
        }
      })
      
      this.modalService.dismissAll();
      alert('Insumo creado');
    }
  }

  eliminarInsumo(idInsumo: any) {
    const confirmar = confirm('¿Estás seguro de que deseas eliminar este insumo?');
    if (confirmar) {
      this.insumoService.delete(idInsumo).subscribe({
        next: () => {
          console.log('Insumo eliminado exitosamente');
          this.cargarInsumos(); // Recargar la lista de insumos
        },
        error: (err: any) => {
          console.error('Error al eliminar insumo', err);
        }
      });
    }
  }
}
