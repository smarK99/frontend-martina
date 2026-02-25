import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductoService } from '../../services/producto-service';
import { Observable } from 'rxjs';
import { Producto } from '../../model/producto.model';
import { ActionBar } from '../action-bar/action-bar';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-productos',
  imports: [CommonModule, ActionBar, ReactiveFormsModule],
  templateUrl: './productos.html',
  styleUrl: './productos.css'
})
export class Productos {

  productos: Producto[] = [];

  isModalOpen = false;
  productoForm: FormGroup;

  constructor(private productoService: ProductoService, private fb: FormBuilder, private modalService: NgbModal) {
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


  // --- MODAL LÓGICA ---

  // 3. RECIBIR EL TEMPLATE Y ABRIRLO CON EL SERVICIO
  openModal(modalTemplate: any) {
    // Abrimos el modal. Le ponemos size: 'lg' para que sea ancho y centered: true
    this.modalService.open(modalTemplate, { size: 'lg', centered: true });
  }

  // 4. USAR EL SERVICIO PARA CERRAR TODO
  closeModal() {
    this.modalService.dismissAll(); // Cierra los modales activos
    this.productoForm.reset(); // Limpia el formulario
  }

  guardarProducto() {
    if (this.productoForm.valid) {
      console.log('Guardando Producto:', this.productoForm.value);
      
      // Aquí llamas a tu servicio de backend: this.productoService.create(...)
      
      // Si todo sale bien, cierras el modal usando la misma función
      this.closeModal(); 
    } else {
      this.productoForm.markAllAsTouched(); // Muestra los errores si faltan datos
    }
  }
 
}
