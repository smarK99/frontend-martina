import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, combineLatest, map, BehaviorSubject } from 'rxjs';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

// Servicios y Modelos
import { AuthService } from '../../services/auth-service';
import { PedidoService } from '../../services/pedido-service';
import { Pedido, Sucursal } from '../../model/pedido.model';
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
  pedidos$!: Observable<Pedido[]>;
  visiblePedidos$!: Observable<Pedido[]>;
  private CURRENT_CLIENT_ID = 1;

  // -- Modal Alta Pedido --
  pedidoForm: FormGroup;
  sucursales: Sucursal[] = [];
  productosDisponibles: any[] = [];
  itemsDelPedido: itemCarrito[] = [];
  tempProductoId: number | null = null;
  tempCantidad: number = 1;

  // -- Modal Ver Detalle --
  selectedPedido: Pedido | null = null;
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

    // Cargar observables
    this.pedidos$ = this.pedidoService.getAll();

    // Lógica reactiva de filtrado y roles
    this.visiblePedidos$ = combineLatest([this.pedidos$, this.role$, this.filter$]).pipe(
      map(([pedidos, role, filter]) => {
        const q = (filter || '').trim().toLowerCase();
        let list: Pedido[] = [];

        if (!role) return [];
        else if (role === 'admin') list = pedidos.slice();
        else if (role === 'cliente') list = pedidos.filter(p => p.sucursal.id === this.CURRENT_CLIENT_ID);
        else list = pedidos.slice();

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

    // //2. Cargar productos disponibles para el Modal de Nuevo Pedido
    // this.productoService.getAll().subscribe({
    //   next: (productos) => this.productosDisponibles = productos,
    //   error: (err) => console.error('Error al cargar productos', err)
    // });
  }

  //Cada vez que el usuario cambia la sucursal seleccionada, 
  // necesitamos actualizar la lista de productos disponibles 
  // y sus precios según esa sucursal. Para eso, nos suscribimos 
  // a los cambios del selector de sucursal y actualizamos la lista 
  // de productos en consecuencia.
  listenerCambioSucursal() {
    // Nos suscribimos a los cambios del selector de sucursal
    this.pedidoForm.get('idSucursal')?.valueChanges.subscribe(sucursalIdSeleccionada => {

      // 1. Buscamos el objeto sucursal completo en nuestro arreglo
      const sucursal = this.sucursales.find(s => s.id === Number(sucursalIdSeleccionada));

      if (sucursal && sucursal.sucursalProductoList) {
        // 2. Mapeamos la lista interna 'sucursalProductoList' a nuestro formato fácil de leer
        this.productosDisponibles = sucursal.sucursalProductoList.map((sp: any) => ({
          id: sp.producto.id,
          nombre: sp.producto.nombreProducto,
          precio: sp.precioSucursalProducto 
        }));
      } else {
        // Si la sucursal no tiene productos (o no hay sucursal), vaciamos la lista
        this.productosDisponibles = [];
      }

      // 3. UX IMPORTANTE: Si el usuario cambia de sucursal, limpiamos los items que 
      // haya seleccionado antes, porque los precios/productos ya no corresponden.
      this.tempProductoId = null;
      this.itemsDelPedido = [];
    });
  }


  // ==========================================
  // 4. LÓGICA: MODAL ALTA DE PEDIDO
  // ==========================================

  openModal(modalTemplate: any) {
    this.modalService.open(modalTemplate, { size: 'lg', centered: true });
  }

  closeModal() {
    this.modalService.dismissAll();
    this.pedidoForm.reset();
    this.itemsDelPedido = [];
    this.tempProductoId = null;
    this.tempCantidad = 1;
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
      const pedidoFinal = {
        ...this.pedidoForm.value,
        detalles: this.itemsDelPedido
      };
      console.log('Enviando al Backend:', pedidoFinal);
      // this.pedidoService.create(pedidoFinal).subscribe(...)
      this.closeModal();
    } else {
      this.pedidoForm.markAllAsTouched();
      if (this.itemsDelPedido.length === 0) {
        alert('Debes seleccionar una sucursal y agregar al menos un producto.');
      }
    }
  }


  // ==========================================
  // 5. LÓGICA: MODAL VER DETALLE
  // ==========================================

  abrirModalDetalle(pedidoId: number, modalTemplate: any) {
    this.modalService.open(modalTemplate, { size: 'lg', centered: true });
    this.selectedPedido = null;
    this.isLoadingDetalle = true;

    this.pedidoService.getOne(pedidoId).subscribe({
      next: (pedido: Pedido) => {
        // Asignamos el pedido directamente desde el backend a la variable
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
}