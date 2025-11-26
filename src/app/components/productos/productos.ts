import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductoService } from '../../services/producto-service';
import { Observable } from 'rxjs';
import { Producto } from '../../model/producto.model';
import { ActionBar } from '../action-bar/action-bar';
import { FormModal } from '../form-modal/form-modal';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-productos',
  imports: [CommonModule, ActionBar, FormModal, ReactiveFormsModule],
  templateUrl: './productos.html',
  styleUrl: './productos.css'
})
export class Productos {

  productos: Producto[] = [];

  isModalOpen = false;
  productoForm: FormGroup;

  constructor(private productoService: ProductoService, private fb: FormBuilder) {
    // Definimos el formulario específico de Productos
    this.productoForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      precio: [0, [Validators.required, Validators.min(1)]],
      categoria: ['', Validators.required],
      imagenUrl: ['']
    });
  }

  ngOnInit() {
    this.loadProductos();
    // this.productos$ = this.productoService.getAll();
  }

  loadProductos(): void{
    this.productoService.getAll().subscribe(data => {this.productos = data})
  }


  agregarAlCarrito(producto: Producto) {
    console.log('Agregado al carrito:', producto);
    // Más adelante se conectará con el servicio de carrito
  }

  //---MODAL---
  openModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.productoForm.reset(); // Limpiar al cerrar
  }

  guardarProducto() {
    if (this.productoForm.valid) {
      console.log('Guardando Producto:', this.productoForm.value);
      // Aquí llamas a tu servicio: this.productoService.create(...)
      this.closeModal();
    } else {
      this.productoForm.markAllAsTouched(); // Mostrar errores si faltan datos
    }
  }
}
