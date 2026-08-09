import { Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoriaService } from '../../../services/categoria-service';
import { Categoria } from '../../../model/producto.model';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-categorias',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './categorias.html',
  styleUrl: './categorias.css'
})
export class Categorias implements OnInit {
  
  private categoriaService = inject(CategoriaService);
  private fb = inject(FormBuilder);
  private modalService = inject(NgbModal);
  
  categorias: Categoria[] = []; 
  categoriasFiltradas: Categoria[] = []; // <-- NUEVO: Arreglo espejo para la tabla
  cargando = false;

  categoriaForm: FormGroup; 
  categoriaEnEdicion: Categoria | null = null;

  @ViewChild('categoriaModal') modalCategoria!: TemplateRef<any>;

  constructor() {
    this.categoriaForm = this.fb.group({
      nombreCategoria: ['', [Validators.required, Validators.maxLength(50)]],
      descripcionCategoria: ['', Validators.maxLength(200)]
    });
  }

  ngOnInit() {
    this.cargarCategorias();
  }

  cargarCategorias() {
    this.cargando = true;
    
    this.categoriaService.getAll().subscribe({
      next: (data) => {
        this.categorias = data;
        this.categoriasFiltradas = data; // <-- NUEVO: Inicializamos el espejo con todos los datos
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar categorías', err);
        this.cargando = false;
      }
    });
  }

  // --- NUEVO: MÉTODO PARA FILTRAR EN TIEMPO REAL ---
  filtrarCategorias(termino: string) {
    if (!termino) {
      this.categoriasFiltradas = this.categorias;
      return;
    }
    
    const q = termino.toLowerCase().trim();
    this.categoriasFiltradas = this.categorias.filter(cat => 
      // Usamos (cat.id?.toString() || '') para evitar el error si es undefined
      (cat.id?.toString() || '').includes(q) || 
      cat.nombreCategoria.toLowerCase().includes(q) ||
      (cat.descripcionCategoria && cat.descripcionCategoria.toLowerCase().includes(q))
    );
  }

  abrirModalAltaCategoria() {
    this.categoriaEnEdicion = null; 
    this.categoriaForm.reset(); 
    this.abrirModal();
  }

  editarCategoria(categoria: Categoria) {
    this.categoriaEnEdicion = categoria; 
    this.categoriaForm.patchValue({ 
      nombreCategoria: categoria.nombreCategoria,
      descripcionCategoria: categoria.descripcionCategoria
    });

    this.abrirModal();
  }

  private abrirModal() {
    this.modalService.open(this.modalCategoria, { centered: true }).result.then(
      () => this.categoriaForm.reset(),
      () => this.categoriaForm.reset()
    );
  }

  eliminarCategoria(idCategoria: any) {
    const confirmar = confirm('¿Estás seguro de que deseas eliminar esta categoría?');
    if (confirmar) {
      this.categoriaService.delete(idCategoria).subscribe({
        next: () => {
          console.log('Categoría eliminada exitosamente');
          this.cargarCategorias(); 
        },
        error: (err) => {
          console.error('Error al eliminar categoría', err);
        }
      });
    }
  }

  guardarCategoria() {
    if (this.categoriaForm.invalid) {
      this.categoriaForm.markAllAsTouched();
      return;
    }

    const formData = this.categoriaForm.value;

    if (this.categoriaEnEdicion) {
      const payloadActualizado = {
        ...this.categoriaEnEdicion, 
        ...formData                
      };
      this.categoriaService.update(this.categoriaEnEdicion.id, payloadActualizado).subscribe({
        next: () => {
          console.log('Categoría actualizada exitosamente');
          this.modalService.dismissAll();
          this.cargarCategorias(); 
        },
        error: (err) => {
          console.error('Error al actualizar categoría', err);
        }
      });
    } else {
      this.categoriaService.create(formData).subscribe({
        next: () => {
          console.log('Categoría creada exitosamente');
          this.cargarCategorias(); 
        },
        error: (err) => {
          console.error('Error al crear categoría', err);
        }
      });
    }

    this.modalService.dismissAll(); 
  }
}