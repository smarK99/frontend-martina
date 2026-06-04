import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoriaService } from '../../../services/categoria-service';
import { Categoria } from '../../../model/producto.model';

@Component({
  selector: 'app-categorias',
  imports: [CommonModule],
  templateUrl: './categorias.html',
  styleUrl: './categorias.css'
})

export class Categorias {
  private categoriaService = inject(CategoriaService);
  
  categorias: Categoria[] = [];
  cargando = false;

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
    console.log('Abriendo modal para crear una NUEVA categoría...');
    // Aquí irá tu lógica con NgbModal para abrir el formulario vacío
  }

  // --- MÉTODOS DE LA TABLA ---
  editarCategoria(categoria: Categoria) {
    console.log('Abriendo modal para EDITAR categoría:', categoria);
    // Aquí abrirás el mismo modal, pero pasándole los datos de la categoría seleccionada
  }

  eliminarCategoria(idCategoria: any) {
    const confirmar = confirm('¿Estás seguro de que deseas eliminar esta categoría?');
    if (confirmar) {
      console.log('Llamando al backend para eliminar categoría ID:', idCategoria);
      // this.categoriaService.delete(idCategoria).subscribe(...)
    }
  }
}
