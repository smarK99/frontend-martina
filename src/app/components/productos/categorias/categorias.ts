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

export class Categorias {
  
  private categoriaService = inject(CategoriaService);
  private fb = inject(FormBuilder);
  private modalService = inject(NgbModal);
  
  categorias: Categoria[] = [];// Lista de categorías (provenientes del backend) para mostrar en la tabla
  cargando = false;

  categoriaForm: FormGroup; //Modal alta/edición de categoría
  categoriaEnEdicion: Categoria | null = null;

  // Atrapamos el modal del HTML
  @ViewChild('categoriaModal') modalCategoria!: TemplateRef<any>;

  constructor() {
    // Inicializamos el formulario
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
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar categorías', err);
        this.cargando = false;
      }
    });
  
  }

  // --- MÉTODO PÚBLICO: LO LLAMA EL PADRE AL TOCAR EL BOTÓN ROJO ---
  abrirModalAltaCategoria() {
    this.categoriaEnEdicion = null; // Aseguramos que no haya categoría en edición
    this.categoriaForm.reset(); // Limpiamos el formulario
    this.abrirModal();
  }

  // --- MÉTODOS DE LA TABLA ---
  editarCategoria(categoria: Categoria) {
    this.categoriaEnEdicion = categoria; // Guardamos la categoría que se va a editar
    this.categoriaForm.patchValue({ // Cargamos los datos de la categoría en el formulario
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
          this.cargarCategorias(); // Recargar la lista de categorías
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
      // MODO EDICIÓN (PUT)

      //Fusionamos el objeto original con los datos nuevos del formulario
      const payloadActualizado = {
        ...this.categoriaEnEdicion, // Trae el id, fechaHora, etc.
        ...formData                 // Sobrescribe el nombre y descripción nuevos
      };
      this.categoriaService.update(this.categoriaEnEdicion.id, payloadActualizado).subscribe({
        next: () => {
          console.log('Categoría actualizada exitosamente');
          this.modalService.dismissAll();
          this.cargarCategorias(); // Recargar la lista de categorías
        },
        error: (err) => {
          console.error('Error al actualizar categoría', err);
        }
      });
    } else {
      // MODO CREACIÓN (POST)
      console.log('Creando nueva categoría:', formData);
      this.categoriaService.create(formData).subscribe({
        next: () => {
          console.log('Categoría creada exitosamente');
          this.cargarCategorias(); // Recargar la lista de categorías
        },
        error: (err) => {
          console.error('Error al crear categoría', err);
        }
      });
    }

    this.modalService.dismissAll(); // Cerramos el modal
  }


}
