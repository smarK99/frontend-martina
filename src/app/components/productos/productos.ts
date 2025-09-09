import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductoService } from '../../services/producto-service';
import { Observable } from 'rxjs';

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen: string;
}

@Component({
  selector: 'app-productos',
  imports: [CommonModule],
  templateUrl: './productos.html',
  styleUrl: './productos.css'
})
export class Productos {
  productos: Producto[] = [
    {
      id: 1,
      nombre: 'Sándwich de Milanesa',
      descripcion: 'Clásico de la casa con milanesa, lechuga, tomate y aderezo.',
      precio: 2500,
      imagen: 'assets/img/milanesa.jpg'
    },
    {
      id: 2,
      nombre: 'Sándwich de Jamón y Queso',
      descripcion: 'Simple pero irresistible.',
      precio: 1800,
      imagen: '/src/app/assets/jcocido.jpg'
    },
    {
      id: 3,
      nombre: 'Sándwich Vegetariano',
      descripcion: 'Opción saludable con vegetales frescos y queso crema.',
      precio: 2200,
      imagen: 'assets/img/vegetariano.jpg'
    }
  ];

  // private productoService = inject(ProductoService);

  // productos$!: Observable<Producto[]>;
  // loading = false;
  // error: string | null = null;

  // ngOnInit() {
  //   this.loadAll();
  // }

  // loadAll() {
  //   this.loading = true;
  //   this.error = null;
  //   this.productos$ = this.productoService.getAll(); // observable listo para async pipe
  //   // si querés manejar loading/error con suscripción:
  //   // this.productoService.getAll().subscribe({
  //   //   next: list => { this.productos = list; this.loading = false; },
  //   //   error: err => { this.error = 'Error al cargar'; this.loading = false; }
  //   // });
  // }


  agregarAlCarrito(producto: Producto) {
    console.log('Agregado al carrito:', producto);
    // Más adelante se conectará con el servicio de carrito
  }
}
