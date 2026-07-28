import { Component, inject, TemplateRef, ViewChild } from '@angular/core';
import { Sucursal, SucursalProducto } from '../../../model/pedido.model';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SucursalService } from '../../../services/sucursal-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SucursalProductoDTO, SucursalProductoService } from '../../../services/sucursal-producto-service';
import { Producto } from '../../../model/producto.model';
import { ProductoService } from '../../../services/producto-service';
import { forkJoin } from 'rxjs';

//Para la visualización de los productos y sus precios en el modal, creamos una interfaz que contenga solo los campos necesarios para mostrar en la tabla del modal
export interface PrecioVisual {
  id: number;
  nombreProducto: string;
  descripcionProducto: string;
  precio: number;
}

@Component({
  selector: 'app-asignar-precios',
  imports: [CommonModule, FormsModule],
  templateUrl: './asignar-precios.html',
  styleUrl: './asignar-precios.css'
})
export class AsignarPrecios {

  private modalService = inject(NgbModal);
  private sucursalService = inject(SucursalService);
  private sucursalProductoService = inject(SucursalProductoService);
  private productoService = inject(ProductoService);

  sucursales: Sucursal[] = [];
  allProductos: Producto[] = [];
  cargando = false;

  // Variables para el Modal
  @ViewChild('preciosModal') modalPrecios!: TemplateRef<any>;
  sucursalActiva: Sucursal | null = null;
  
  //Lista que dibuja el modal con los productos y sus precios para la sucursal seleccionada
  listaPrecios: PrecioVisual[] = [];

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando = true;
    
    // Usamos forkJoin para cargar sucursales y productos en paralelo
    forkJoin({
      sucursales: this.sucursalService.getAll(),
      productos: this.productoService.getAll()
    }).subscribe({
      next: (resultados) => {
        this.sucursales = resultados.sucursales;
        this.allProductos = resultados.productos;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar datos base', err);
        this.cargando = false;
      }
    });
  }

  abrirModalPrecios(sucursal: Sucursal) {
    this.sucursalActiva = sucursal;

    this.listaPrecios = this.allProductos.map(producto => {
      const sucursalProducto = sucursal.sucursalProductoList.find(sp => sp.producto.id === producto.id); //Buscamos el precio actual del producto en la sucursal seleccionada 
      return {
        id: Number(producto.id),
        nombreProducto: producto.nombreProducto,
        descripcionProducto: producto.descripcionProducto,
        precio: sucursalProducto ? sucursalProducto.precioSucursalProducto : 0 //Si no hay precio asignado, lo inicializamos en 0
      };
    });

    // Abrimos el modal instantáneamente con diseño rojo y scroll
    this.modalService.open(this.modalPrecios, { 
      size: 'lg', 
      centered: true,
      scrollable: true, // Permite scroll interno si hay muchos productos
      backdrop: 'static' // Evita cerrar el modal al hacer clic fuera
    });
  } 
  
  guardarPrecios() {
    // 1. Verificamos que haya una sucursal activa seleccionada por seguridad
    if (!this.sucursalActiva) return;

    const idSucursalActual = this.sucursalActiva.id;

    // 2. ARMADO DEL DTO: Recorremos los productos de esta sucursal y extraemos solo lo necesario
    const payloadDTOs = this.listaPrecios.map(item => {
      return {
        idProducto: Number(item.id),
        idSucursal: Number(idSucursalActual),
        precioSP: item.precio
      };
    });

    console.log('Enviando DTOs al backend:', payloadDTOs);

    // 3. ENVIAMOS AL SERVICIO
    this.sucursalProductoService.configPrecios(payloadDTOs).subscribe({
      next: (respuesta) => {
        // Si sale todo bien, cerramos el modal y avisamos al usuario
        this.modalService.dismissAll();
        alert(`Precios actualizados correctamente para ${this.sucursalActiva?.nombreSucursal}`);
        
        // Opcional: Podrías llamar a this.cargarSucursales() aquí para refrescar la tabla de fondo
      },
      error: (err) => {
        // Si falla, lo mostramos en consola para debugear
        console.error('Error al guardar los precios en la BD', err);
        alert('Hubo un error al guardar. Revisa la consola.');
      }
    });
  
  }
}
