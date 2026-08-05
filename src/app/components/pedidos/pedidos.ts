import { Component, inject, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
// AÑADIDOS debounceTime y distinctUntilChanged para el buscador
import { Observable, combineLatest, BehaviorSubject, switchMap, tap, catchError, of, debounceTime, distinctUntilChanged } from 'rxjs';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

// Servicios y Modelos
import { AuthService } from '../../services/auth-service';
import { PedidoService } from '../../services/pedido-service';
import { Sucursal } from '../../model/pedido.model';
import { ActionBar } from '../action-bar/action-bar';
import { ProductoService } from '../../services/producto-service';
import { SucursalService } from '../../services/sucursal-service';

// --- INTERFACES LOCALES ---
interface itemCarrito {
  productoId: number;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
}

export interface PedidoSeleccionado {
  id: number;
  fecha: string;
  clienteNombre: string;
  estado: string;
  total: number;
  listaItems: { productoNombre: string, cantidad: number, precioUnitario: number }[];
}

@Component({
  selector: 'app-pedidos',
  imports: [CommonModule, RouterModule, ActionBar, ReactiveFormsModule, FormsModule],
  templateUrl: './pedidos.html',
  styleUrl: './pedidos.css'
})
export class Pedidos implements OnInit {

  // ==========================================
  // 1. INYECCIÓN DE DEPENDENCIAS
  // ==========================================
  private pedidoService = inject(PedidoService);
  private productoService = inject(ProductoService);
  private sucursalService = inject(SucursalService);
  private auth = inject(AuthService);
  private modalService = inject(NgbModal);
  private fb = inject(FormBuilder);

  // ==========================================
  // 2. VARIABLES DE ESTADO Y OBSERVABLES
  // ==========================================

  role$ = this.auth.role$;
  isLoggedIn$ = this.auth.isLoggedIn$;
  private CURRENT_CLIENT_ID = 1;
  private refresh$ = new BehaviorSubject<void>(undefined);

  // --- VARIABLES DE PAGINACIÓN Y FILTRO ---
  currentPage = 0;
  pageSize = 15;
  totalElements = 0;
  totalPages = 0;
  
  filtroSucursal$ = new BehaviorSubject<number | ''>(''); 
  filterSubject = new BehaviorSubject<string>(''); // NUEVO: Controla el texto del buscador
  
  // AHORA USAMOS VARIABLES NORMALES (Sin Async Pipe)
  isLoadingTabla = false;
  pedidos: any[] = [];

  // -- Modal Alta Pedido --
  pedidoForm: FormGroup;
  sucursales: Sucursal[] = [];
  productosDisponibles: any[] = [];
  itemsDelPedido: itemCarrito[] = [];
  tempProductoId: number | null = null;
  tempCantidad: number = 1;

  // -- Modal Ver Detalle --
  selectedPedido: any | null = null;
  isLoadingDetalle: boolean = false;
  pedidoACancelar: number | null = null;

  // ==========================================
  // ALERTA GENÉRICA (ÉXITO / ERROR)
  // ==========================================
  @ViewChild('alertaModal') alertaModal!: TemplateRef<any>;
  mensajeAlerta: string = '';
  tipoAlerta: 'exito' | 'error' = 'exito';

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

  constructor() {
    this.pedidoForm = this.fb.group({
      idSucursal: ['', Validators.required],
      descripcion: ['']
    });
  }

  ngOnInit() {
    this.cargarDatosBackend();
    this.listenerCambioSucursal();
    this.configurarPaginacionReactiva();
  }

  // LÓGICA REACTIVA DE PAGINACIÓN Y BÚSQUEDA COMBINADA
  configurarPaginacionReactiva() {
    combineLatest([
      this.filtroSucursal$,
      this.filterSubject.pipe(debounceTime(400), distinctUntilChanged()), // Espera a que el usuario deje de tipear
      this.refresh$,
      this.role$
    ]).pipe(
      tap(() => this.isLoadingTabla = true),
      switchMap(([sucursalId, termino, _, role]) => {
        
        // Si no hay sucursal seleccionada, mandamos 0 para buscar en todas
        let idAFiltrar: number = Number(sucursalId) || 0;
        
        if (role === 'ROLE_CLIENTE') {
          idAFiltrar = this.CURRENT_CLIENT_ID;
        }

        // Llamamos directamente a la nueva Super Consulta del servicio
        return this.pedidoService.buscarPaginadoYFiltrado(termino, idAFiltrar, this.currentPage, this.pageSize).pipe(
          catchError(error => {
            console.error('🚨 Error crítico al traer pedidos del backend:', error);
            // Si hay error devolvemos una página vacía para apagar el spinner
            return of({ content: [], totalElements: 0, totalPages: 0 });
          })
        );
      })
    ).subscribe(response => {
      this.totalElements = response.totalElements;
      this.totalPages = response.totalPages;
      this.pedidos = response.content; 
      this.isLoadingTabla = false; 
    });
  }

  cargarDatosBackend() {
    this.sucursalService.getAll().subscribe({
      next: (data) => this.sucursales = data,
      error: (err) => console.error('Error al cargar sucursales', err)
    });
  }

  listenerCambioSucursal() {
    this.pedidoForm.get('idSucursal')?.valueChanges.subscribe(sucursalId => {
      if (!sucursalId) {
        this.limpiarSeleccionProductos();
        return;
      }

      const sucursalSeleccionada = this.sucursales.find(s => s.id == sucursalId);

      if (sucursalSeleccionada && sucursalSeleccionada.sucursalProductoList && sucursalSeleccionada.sucursalProductoList.length > 0) {
        this.productosDisponibles = sucursalSeleccionada.sucursalProductoList.map((sp: any) => {
          return {
            id: sp.producto.id || sp.producto.codProducto,
            nombre: sp.producto.nombreProducto,
            precio: sp.precioSucursalProducto
          };
        });
      } else {
        console.warn('Esta sucursal no tiene precios asignados.');
        this.productosDisponibles = [];
      }

      this.tempProductoId = null;
    });
  }

  cambiarPagina(nuevaPagina: number) {
    if (nuevaPagina >= 0 && nuevaPagina < this.totalPages) {
      this.currentPage = nuevaPagina;
      this.refresh$.next(); 
    }
  }

  // NUEVO METODO PARA EL TEXTO DEL BUSCADOR
  onFilterChange(value: string) {
    this.currentPage = 0; 
    this.filterSubject.next(value.trim()); 
  }

  onSucursalFilterChange(event: any) {
    this.currentPage = 0; 
    this.filtroSucursal$.next(event.target.value);
  }

  openModal(modalTemplate: any) {
    const modalRef = this.modalService.open(modalTemplate, { size: 'lg', centered: true });

    modalRef.result.then(
      (result) => { this.limpiarFormularioAlta(); },
      (reason) => { this.limpiarFormularioAlta(); }
    );
  }

  closeModal() {
    this.modalService.dismissAll();
    this.pedidoForm.reset({ idSucursal: '' });
    this.itemsDelPedido = [];
    this.tempProductoId = null;
    this.tempCantidad = 1;
  }

  private limpiarFormularioAlta() {
    this.pedidoForm.reset({ idSucursal: '' }); 
    this.itemsDelPedido = [];
    this.tempProductoId = null;
    this.tempCantidad = 1;
    this.limpiarSeleccionProductos();
  }

  agregarItem() {
    if (!this.tempProductoId || this.tempCantidad <= 0) return;
    const productoSeleccionado = this.productosDisponibles.find(p => p.id == this.tempProductoId);

    if (productoSeleccionado) {
      const existente = this.itemsDelPedido.find(i => i.productoId === productoSeleccionado.id);

      if (existente) {
        existente.cantidad += this.tempCantidad;
      } else {
        this.itemsDelPedido.push({
          productoId: productoSeleccionado.id,
          nombreProducto: productoSeleccionado.nombre,
          cantidad: this.tempCantidad,
          precioUnitario: productoSeleccionado.precio
        });
      }
      this.tempProductoId = null;
      this.tempCantidad = 1;
    }
  }

  eliminarItem(index: number) {
    this.itemsDelPedido.splice(index, 1);
  }

  get totalEstimado() {
    return this.itemsDelPedido.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0);
  }

  guardarPedido() {
    if (this.pedidoForm.valid && this.itemsDelPedido.length > 0) {
      const payload = {
        idSucursal: Number(this.pedidoForm.value.idSucursal), 
        descripcionPedido: this.pedidoForm.value.descripcion || '', 
        dpdtoList: this.itemsDelPedido.map(item => ({
          idProducto: item.productoId,
          cantidadDetallePedido: item.cantidad
        }))
      };

      this.pedidoService.create(payload).subscribe({
        next: (respuesta) => {
          this.closeModal();
          this.refresh$.next(); 
          setTimeout(() => {
          this.mostrarAlerta('¡Pedido registrado con éxito!', 'exito');
          }, 300);
        },
        error: (err) => {
          this.mostrarAlerta('Hubo un error al guardar el pedido. Revisa la consola.', 'error');
        }
      });
    } else {
      this.pedidoForm.markAllAsTouched();
      if (this.itemsDelPedido.length === 0) {
        this.mostrarAlerta('Debes seleccionar una sucursal y agregar al menos un producto al pedido.', 'error');
      }
    }
  }

  abrirModalDetalle(pedidoId: number, modalTemplate: any) {
    this.modalService.open(modalTemplate, { size: 'lg', centered: true });
    this.selectedPedido = null;
    this.isLoadingDetalle = true;

    this.pedidoService.getOne(pedidoId).subscribe({
      next: (pedido: any) => {
        this.selectedPedido = pedido;
        this.isLoadingDetalle = false;
      },
      error: (err) => {
        console.error('Error al obtener el detalle del pedido:', err);
        this.isLoadingDetalle = false;
      }
    });
  }

  cerrarModalDetalle() {
    this.modalService.dismissAll();
    this.selectedPedido = null;
  }

  abrirModalCancelacion(id: number, modalTemplate: any) {
    this.pedidoACancelar = id;
    this.modalService.open(modalTemplate, { centered: true, size: 'sm' });
  }

  confirmarCancelacion() {
    if (this.pedidoACancelar) {
      this.pedidoService.cancelarPedido(this.pedidoACancelar).subscribe({
        next: (respuesta) => {
          this.modalService.dismissAll(); 
          this.pedidoACancelar = null;    
          this.refresh$.next();          
          this.mostrarAlerta('El pedido ha sido cancelado exitosamente.', 'exito');
        },
        error: (err) => {
          console.error('Error al cancelar el pedido:', err);
          this.mostrarAlerta('Ocurrió un error al intentar cancelar el pedido.', 'error');
        }
      });
    }
  }

  toShortDate(fechaIso: string) {
    const d = new Date(fechaIso);
    return d.toLocaleString();
  }

  private limpiarSeleccionProductos() {
    this.productosDisponibles = [];
    this.tempProductoId = null;
    this.itemsDelPedido = [];
  }
}