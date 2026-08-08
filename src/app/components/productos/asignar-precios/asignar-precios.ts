import { Component, inject, TemplateRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject, forkJoin } from 'rxjs';

import { Sucursal } from '../../../model/pedido.model';
import { SucursalService } from '../../../services/sucursal-service';
import { SucursalProductoService } from '../../../services/sucursal-producto-service';
import { Producto } from '../../../model/producto.model';
import { ProductoService } from '../../../services/producto-service';

export interface PrecioVisual {
  id: number;
  nombreProducto: string;
  descripcionProducto: string;
  precio: number;
}

@Component({
  selector: 'app-asignar-precios',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './asignar-precios.html',
  styleUrl: './asignar-precios.css'
})
export class AsignarPrecios implements OnInit {

  private fb = inject(FormBuilder);
  private modalService = inject(NgbModal);
  private sucursalService = inject(SucursalService);
  private sucursalProductoService = inject(SucursalProductoService);
  private productoService = inject(ProductoService);

  // --- VARIABLES DE DATOS ---
  private refresh$ = new BehaviorSubject<void>(undefined);
  sucursales: Sucursal[] = [];
  allProductos: Producto[] = [];
  cargando = false;

  // --- VARIABLES PARA ABM SUCURSAL ---
  sucursalForm: FormGroup;
  isEditMode = false;
  sucursalSeleccionadaId: number | null = null;
  sucursalABajar: number | null = null;
  @ViewChild('sucursalModal') sucursalModal!: TemplateRef<any>;

  // --- VARIABLES PARA PRECIOS ---
  @ViewChild('preciosModal') modalPrecios!: TemplateRef<any>;
  sucursalActiva: Sucursal | null = null;
  listaPrecios: PrecioVisual[] = [];

  // --- ALERTA GENÉRICA ---
  @ViewChild('alertaModal') alertaModal!: TemplateRef<any>;
  mensajeAlerta: string = '';
  tipoAlerta: 'exito' | 'error' = 'exito';

  constructor() {
    // Inicializamos el formulario de la Sucursal
    this.sucursalForm = this.fb.group({
      nombreSucursal: ['', Validators.required],
      direccionSucursal: ['', Validators.required],
      descripcionSucursal: ['']
    });
  }

  ngOnInit() {
    // Enganchamos la carga de datos al gatillo reactivo
    this.refresh$.subscribe(() => {
      this.cargarDatos();
    });
  }

  cargarDatos() {
    this.cargando = true;
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

  // ==========================================
  // LÓGICA DE ALERTA GENÉRICA
  // ==========================================
  mostrarAlerta(mensaje: string, tipo: 'exito' | 'error') {
    this.mensajeAlerta = mensaje;
    this.tipoAlerta = tipo;
    
    this.modalService.open(this.alertaModal, { centered: true, size: 'sm', backdrop: 'static' });

    if (tipo === 'exito') {
      setTimeout(() => {
        this.modalService.dismissAll();
      }, 2000);
    }
  }

  // ==========================================
  // ABM DE SUCURSALES
  // ==========================================
  abrirModalAlta() {
    this.isEditMode = false;
    this.sucursalSeleccionadaId = null;
    this.sucursalForm.reset();
    this.modalService.open(this.sucursalModal, { size: 'md', centered: true, backdrop: 'static' });
  }

  abrirModalEdicion(sucursal: Sucursal) {
    this.isEditMode = true;
    this.sucursalSeleccionadaId = sucursal.id ?? null;
    
    this.sucursalForm.patchValue({
      nombreSucursal: sucursal.nombreSucursal,
      direccionSucursal: sucursal.direccionSucursal,
      descripcionSucursal: sucursal.descripcionSucursal
    });

    this.modalService.open(this.sucursalModal, { size: 'md', centered: true, backdrop: 'static' });
  }

  guardarSucursal() {
    if (this.sucursalForm.invalid) {
      this.sucursalForm.markAllAsTouched();
      return;
    }

    // Armamos el DTO (simulamos idUsuario: 1 por defecto, podés ajustarlo a tu lógica de sesión)
    const payload = {
      ...this.sucursalForm.value,
      idUsuario: 1 
    };

    if (this.isEditMode && this.sucursalSeleccionadaId) {
      this.sucursalService.update(this.sucursalSeleccionadaId, payload).subscribe({
        next: () => {
          this.modalService.dismissAll();
          this.refresh$.next();
          setTimeout(() => this.mostrarAlerta('Sucursal actualizada con éxito.', 'exito'), 300);
        },
        error: (err) => {
          console.error(err);
          this.mostrarAlerta('Error al actualizar la sucursal.', 'error');
        }
      });
    } else {
      this.sucursalService.create(payload).subscribe({
        next: () => {
          this.modalService.dismissAll();
          this.refresh$.next();
          setTimeout(() => this.mostrarAlerta('Sucursal creada con éxito.', 'exito'), 300);
        },
        error: (err) => {
          console.error(err);
          this.mostrarAlerta('Error al crear la sucursal.', 'error');
        }
      });
    }
  }

  abrirModalBaja(id: number | undefined, modalTemplate: any) {
    if (!id) return; // Si por algún motivo no hay ID, cortamos la ejecución acá
    
    this.sucursalABajar = id;
    this.modalService.open(modalTemplate, { centered: true, size: 'sm' });
  }

  confirmarBaja() {
    if (this.sucursalABajar) {
      this.sucursalService.delete(this.sucursalABajar).subscribe({
        next: () => {
          this.modalService.dismissAll();
          this.sucursalABajar = null;
          this.refresh$.next();
          setTimeout(() => this.mostrarAlerta('Sucursal eliminada exitosamente.', 'exito'), 300);
        },
        error: (err) => {
          console.error(err);
          this.mostrarAlerta('Error al eliminar la sucursal.', 'error');
        }
      });
    }
  }

  // ==========================================
  // GESTIÓN DE PRECIOS
  // ==========================================
  abrirModalPrecios(sucursal: Sucursal) {
    this.sucursalActiva = sucursal;

    this.listaPrecios = this.allProductos.map(producto => {
      const sucursalProducto = sucursal.sucursalProductoList.find(sp => sp.producto.id === producto.id);
      return {
        id: Number(producto.id),
        nombreProducto: producto.nombreProducto,
        descripcionProducto: producto.descripcionProducto,
        precio: sucursalProducto ? sucursalProducto.precioSucursalProducto : 0 
      };
    });

    this.modalService.open(this.modalPrecios, { 
      size: 'lg', 
      centered: true,
      scrollable: true, 
      backdrop: 'static'
    });
  } 
  
  guardarPrecios() {
    if (!this.sucursalActiva) return;
    const idSucursalActual = this.sucursalActiva.id;

    const payloadDTOs = this.listaPrecios.map(item => {
      return {
        idProducto: Number(item.id),
        idSucursal: Number(idSucursalActual),
        precioSP: item.precio
      };
    });

    this.sucursalProductoService.configPrecios(payloadDTOs).subscribe({
      next: () => {
        this.modalService.dismissAll();
        this.refresh$.next(); // Recarga la tabla para reflejar cambios
        setTimeout(() => this.mostrarAlerta(`Precios actualizados correctamente para ${this.sucursalActiva?.nombreSucursal}`, 'exito'), 300);
      },
      error: (err) => {
        console.error('Error al guardar los precios', err);
        this.mostrarAlerta('Hubo un error al guardar los precios. Revisa la consola.', 'error');
      }
    });
  }
}