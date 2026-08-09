import { Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InsumosService } from '../../../services/insumos-service';
import { Insumo } from '../../../model/producto.model';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-insumos',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './insumos.html',
  styleUrl: './insumos.css'
})
export class Insumos implements OnInit {
  private fb = inject(FormBuilder);
  private modalService = inject(NgbModal);
  private insumoService = inject(InsumosService);

  insumos: Insumo[] = [];
  insumosFiltrados: Insumo[] = []; // <-- NUEVO: Arreglo espejo
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
    
    this.insumoService.getAll().subscribe({
      next: (data) => {
        this.insumos = data;
        this.insumosFiltrados = data; // <-- NUEVO: Inicializamos el arreglo espejo
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar insumos', err);
        this.cargando = false;
      }
    });
  }

  // --- NUEVO: MÉTODO DE FILTRADO ---
  filtrarInsumos(termino: string) {
    if (!termino) {
      this.insumosFiltrados = this.insumos;
      return;
    }
    
    const q = termino.toLowerCase().trim();
    this.insumosFiltrados = this.insumos.filter(insumo => 
      // Blindaje de ID al igual que en categorías
      (insumo.id?.toString() || '').includes(q) || 
      insumo.nombreInsumo.toLowerCase().includes(q) ||
      (insumo.descripcionInsumo && insumo.descripcionInsumo.toLowerCase().includes(q))
    );
  }

  abrirModalAltaInsumo() {
    this.insumoEnEdicion = null; 
    this.insumoForm.reset();     
    this.abrirModal();
  }

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

  guardarInsumo() {
    if (this.insumoForm.invalid) {
      this.insumoForm.markAllAsTouched();
      return;
    }

    const formData = this.insumoForm.value;

    if (this.insumoEnEdicion) {
      const payloadActualizado = {
        ...this.insumoEnEdicion, 
        ...formData                
      };

      console.log('Actualizando insumo:', payloadActualizado);
      this.insumoService.update(this.insumoEnEdicion.id, payloadActualizado).subscribe({
        next: () => {
          console.log('Insumo actualizada exitosamente');
          this.modalService.dismissAll();
          this.cargarInsumos(); 
        },
        error: (err) => {
          console.error('Error al actualizar insumo', err);
        }
      });
      
      this.modalService.dismissAll();
      // Opcional: reemplazar estos alert() por un modal o toast en el futuro ;)
      alert('Insumo actualizado');

    } else {
      this.insumoService.create(formData).subscribe({
        next: () => {
          console.log('Insumo creado exitosamente');
          this.cargarInsumos(); 
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
          this.cargarInsumos(); 
        },
        error: (err: any) => {
          console.error('Error al eliminar insumo', err);
        }
      });
    }
  }
}