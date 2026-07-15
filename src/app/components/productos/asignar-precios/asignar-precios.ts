import { Component, inject, TemplateRef, ViewChild } from '@angular/core';
import { Sucursal, SucursalProducto } from '../../../model/pedido.model';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SucursalService } from '../../../services/sucursal-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SucursalProductoDTO, SucursalProductoService } from '../../../services/sucursal-producto-service';

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

  sucursales: Sucursal[] = [];
  cargando = false;

  // Variables para el Modal
  @ViewChild('preciosModal') modalPrecios!: TemplateRef<any>;
  sucursalActiva: Sucursal | null = null;
  listaPrecios: SucursalProducto[] = [];
  cargandoPrecios = false;

  ngOnInit() {
    this.cargarSucursales();
  }

  cargarSucursales() {
    this.cargando = true;
    
    this.sucursalService.getAll().subscribe({
      next: (data) => {
        this.sucursales = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar sucursales', err);
        this.cargando = false;
      }
    });
  }

  abrirModalPrecios(sucursal: Sucursal) {
    this.sucursalActiva = sucursal;
    
    // Abrimos el modal instantáneamente con diseño rojo y scroll
    this.modalService.open(this.modalPrecios, { 
      size: 'lg', 
      centered: true,
      scrollable: true, // <-- CLAVE: Permite scroll interno si hay muchos productos
      backdrop: 'static'
    });
  } 
  
  guardarPrecios() {
    // 1. Verificamos que haya una sucursal activa seleccionada por seguridad
    if (!this.sucursalActiva) return;

    const idSucursalActual = this.sucursalActiva.id;

    // 2. ARMADO DEL DTO: Recorremos los productos de esta sucursal y extraemos solo lo necesario
    const payloadDTOs = this.sucursalActiva.sucursalProductoList.map(item => {
      return {
        idProducto: Number(item.producto.id),
        idSucursal: Number(idSucursalActual),
        precioSP: item.precioSucursalProducto
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
