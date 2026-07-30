import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, combineLatest, map, BehaviorSubject, switchMap } from 'rxjs';
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

// Interfaz adaptada para la vista del Modal de "Ver Detalle"
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

  // -- RxJS / Tablas --
  private filterSubject = new BehaviorSubject<string>('');
  filter$ = this.filterSubject.asObservable();
  role$ = this.auth.role$;
  isLoggedIn$ = this.auth.isLoggedIn$;
  pedidos$!: Observable<any[]>;
  visiblePedidos$!: Observable<any[]>;
  private CURRENT_CLIENT_ID = 1;
  //Señal para forzar recarga de datos después de crear o cancelar un pedido
  private refresh$ = new BehaviorSubject<void>(undefined);

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


  // ==========================================
  // 3. CONSTRUCTOR Y CICLO DE VIDA
  // ==========================================

  constructor() {
    // Inicializar Formulario de Alta
    this.pedidoForm = this.fb.group({
      idSucursal: ['', Validators.required],
      descripcion: ['']
    });

    // Observable principal de pedidos, se recarga cada vez que "refresh$" emite señal
    this.pedidos$ = this.refresh$.pipe(
      switchMap(() => this.pedidoService.getAll())
    );

    // Lógica reactiva de filtrado y roles (Blindado)
    this.visiblePedidos$ = combineLatest([this.pedidos$, this.role$, this.filter$]).pipe(
      map(([pedidos, role, filter]) => {
        const q = (filter || '').trim().toLowerCase();
        let list: any[] = [];

        if (!role) return [];
        else if (role === 'ROLE_ADMIN' || role === 'ROLE_DUENIO' || role === 'ROLE_EMPLEADO') {
          // El personal interno ve absolutamente todos los pedidos
          list = pedidos.slice();
        } 
        else if (role === 'ROLE_CLIENTE') {
          // El cliente SOLO ve los que coinciden con su ID 
          // (Nota: Seguis usando CURRENT_CLIENT_ID = 1 por ahora, está perfecto para probar)
          list = pedidos.filter(p => p.sucursal.id === this.CURRENT_CLIENT_ID);
        } 
        else {
          // Si entra un Repartidor o alguien de Stock por error a esta URL, no ve nada
          return [];
        }

        if (q) {
          list = list.filter(p =>
            (p.sucursal.nombreSucursal || '').toLowerCase().includes(q) ||
            p.id.toString().includes(q) ||
            (p.estadoPedido.nombreEstadoPedido || '').toLowerCase().includes(q)
          );
        }

        return list.sort((a, b) => +new Date(b.fechaHoraAltaPedido) - +new Date(a.fechaHoraAltaPedido));
      })
    );
  }

  ngOnInit() {
    this.cargarDatosBackend();
    this.listenerCambioSucursal();
  }

  cargarDatosBackend() {
    //1. Cargar sucursales disponibles para el Modal de Nuevo Pedido
    this.sucursalService.getAll().subscribe({
      next: (data) => this.sucursales = data,
      error: (err) => console.error('Error al cargar sucursales', err)
    });
  }

  listenerCambioSucursal() {
    this.pedidoForm.get('idSucursal')?.valueChanges.subscribe(sucursalId => {

      // 1. Si se reseteó el formulario o no hay selección, limpiamos todo.
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


  // ==========================================
  // 4. LÓGICA: MODAL ALTA DE PEDIDO
  // ==========================================

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
            alert('¡Pedido registrado con éxito!');
          }, 300);
        },
        error: (err) => {
          console.error('Error al intentar guardar el pedido:', err);
          alert('Hubo un error al guardar el pedido. Revisa la consola.');
        }
      });
    } else {
      this.pedidoForm.markAllAsTouched();
      if (this.itemsDelPedido.length === 0) {
        alert('Debes seleccionar una sucursal y agregar al menos un producto al pedido.');
      }
    }
  }


  // ==========================================
  // 5. LÓGICA: MODAL VER DETALLE Y CANCELAR
  // ==========================================

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

  // --- NUEVO MÉTODO: CANCELAR PEDIDO ---
  // Variable para guardar temporalmente el ID del pedido a cancelar
  pedidoACancelar: number | null = null;

  // 1. Abre el modal bonito de Bootstrap
  abrirModalCancelacion(id: number, modalTemplate: any) {
    this.pedidoACancelar = id;
    this.modalService.open(modalTemplate, { centered: true, size: 'sm' });
  }

  // 2. Ejecuta la cancelación si el usuario hace clic en "Sí, cancelar"
  confirmarCancelacion() {
    if (this.pedidoACancelar) {
      this.pedidoService.cancelarPedido(this.pedidoACancelar).subscribe({
        next: (respuesta) => {
          this.modalService.dismissAll(); // Cerramos el modal
          this.pedidoACancelar = null;    // Limpiamos la variable
          this.refresh$.next();           // Recargamos la tabla al instante
        },
        error: (err) => {
          console.error('Error al cancelar el pedido:', err);
          alert('Ocurrió un error al intentar cancelar el pedido.');
        }
      });
    }
  }

  // ==========================================
  // 6. FUNCIONES HELPER (UTILIDADES)
  // ==========================================

  onFilterChange(value: string) {
    this.filterSubject.next(value ?? '');
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