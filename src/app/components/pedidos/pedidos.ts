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
  //Señal para forzar recarga de datos después de crear un pedido (si es que no queremos recargar toda la página)
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

    // Lógica reactiva de filtrado y roles
    this.visiblePedidos$ = combineLatest([this.pedidos$, this.role$, this.filter$]).pipe(
      map(([pedidos, role, filter]) => {
        const q = (filter || '').trim().toLowerCase();
        let list: any[] = [];

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
  }

  //Cada vez que el usuario cambia la sucursal seleccionada, 
  // necesitamos actualizar la lista de productos disponibles 
  // y sus precios según esa sucursal. Para eso, nos suscribimos 
  // a los cambios del selector de sucursal y actualizamos la lista 
  // de productos en consecuencia.
  listenerCambioSucursal() {
    this.pedidoForm.get('idSucursal')?.valueChanges.subscribe(sucursalId => {

      // 1. Si se reseteó el formulario o no hay selección, limpiamos todo.
      if (!sucursalId) {
        this.limpiarSeleccionProductos();
        return;
      }

      // 2. Buscamos el objeto sucursal completo en el array que cargamos al inicio.
      // (Usamos == loose equality por si el ID viene como string desde el select)
      const sucursalSeleccionada = this.sucursales.find(s => s.id == sucursalId);

      // 3. Verificamos que la sucursal exista y tenga la lista de productos-precios
      if (sucursalSeleccionada && sucursalSeleccionada.sucursalProductoList && sucursalSeleccionada.sucursalProductoList.length > 0) {

        console.log('Sucursal seleccionada:', sucursalSeleccionada.nombreSucursal);
        console.log('Lista de precios cruda (Backend):', sucursalSeleccionada.sucursalProductoList);

        // 4.Iteramos SOBRE LA RELACIÓN (SucursalProducto), no sobre productos globales.
        this.productosDisponibles = sucursalSeleccionada.sucursalProductoList.map((sp: any) => {
          // 'sp' es un objeto SucursalProducto
          return {
            // Usamos el ID del producto como valor para el select
            id: sp.producto.id || sp.producto.codProducto,
            // Usamos el nombre anidado del producto
            nombre: sp.producto.nombreProducto,
            // Usamos el precio específico de esta relación
            precio: sp.precioSucursalProducto
          };
        });

        console.log('Productos disponibles mapeados para el select:', this.productosDisponibles);

      } else {
        // Si la sucursal no tiene productos asignados en la tabla intermedia
        console.warn('Esta sucursal no tiene precios asignados.');
        this.productosDisponibles = [];
      }

      // Siempre limpiamos los inputs temporales al cambiar de sucursal
      this.tempProductoId = null;
      // Opcional: si quieres limpiar el carrito al cambiar de sucursal, descomenta esto:
      // this.itemsDelPedido = []; 
    });
  }


  // ==========================================
  // 4. LÓGICA: MODAL ALTA DE PEDIDO
  // ==========================================

  openModal(modalTemplate: any) {
    // Abrimos el modal y guardamos la referencia
    const modalRef = this.modalService.open(modalTemplate, { size: 'lg', centered: true });

    // Escuchamos cuando el modal se cierra (por CUALQUIER motivo)
    modalRef.result.then(
      (result) => { 
        // Se ejecuta si se cierra con éxito (ej: modal.close())
        this.limpiarFormularioAlta(); 
      },
      (reason) => { 
        // Se ejecuta si se descarta (clic afuera, botón X, ESC, o dismissAll())
        this.limpiarFormularioAlta(); 
      }
    );
  }

  closeModal() {
    this.modalService.dismissAll();
    this.pedidoForm.reset({ idSucursal: '' });
    this.itemsDelPedido = [];
    this.tempProductoId = null;
    this.tempCantidad = 1;
  }

  // Extraemos la limpieza a una función privada para mantener el orden
  private limpiarFormularioAlta() {
    // 1. Resetea el form y el select
    this.pedidoForm.reset({ idSucursal: '' }); 
    // 2. Limpia el carrito
    this.itemsDelPedido = [];
    // 3. Limpia las variables temporales
    this.tempProductoId = null;
    this.tempCantidad = 1;
    // 4. Limpia la lista del dropdown de productos
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
    // 1. Verificamos que el formulario sea válido y haya items
    if (this.pedidoForm.valid && this.itemsDelPedido.length > 0) {
      
      // 2. Armamos el Payload (DTO) EXACTO que pide el backend
      const payload = {
        // Forzamos a Number por si el select guardó un string
        idSucursal: Number(this.pedidoForm.value.idSucursal), 
        
        // Mapeamos el campo 'descripcion' del form a 'descripcionPedido'
        descripcionPedido: this.pedidoForm.value.descripcion || '', 
        
        // 3. Transformamos nuestro carrito a la lista que pide el backend
        dpdtoList: this.itemsDelPedido.map(item => ({
          idProducto: item.productoId,
          cantidadDetallePedido: item.cantidad
        }))
      };

      console.log('Enviando DTO al Backend:', payload);

      //4. Llamamos al servicio para guardar
      this.pedidoService.create(payload).subscribe({
        next: (respuesta) => {
          console.log('Pedido guardado exitosamente:', respuesta);
          
          // Opcional: Si quieres que la tabla principal se actualice sola, 
          // debes volver a llamar a tu servicio getAll() o agregar el nuevo 
          // pedido a tu lista local. Lo más simple es:
          // this.pedidos$ = this.pedidoService.getAll(); 
          // (Aunque como usas combineLatest en el constructor, podríamos necesitar 
          // un refetcher. Por ahora probemos que guarde).

          //Cerramos el modal (esto disparará la limpieza que hicimos antes)
          this.closeModal();
          
          // Esto avisa al constructor que debe volver a hacer el getAll()
          // Y como el combineLatest está conectado, la tabla se actualizará sola.
          this.refresh$.next();
          
          //Esperamos 300ms para que el modal desaparezca visualmente antes de lanzar el alert
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
      // Si el form es inválido, marcamos todo para que salten los errores rojos
      this.pedidoForm.markAllAsTouched();
      if (this.itemsDelPedido.length === 0) {
        alert('Debes seleccionar una sucursal y agregar al menos un producto al pedido.');
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
      next: (pedido: any) => {
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

  // Helper para limpiar cuando se cierra el modal o se deselecciona
  private limpiarSeleccionProductos() {
    this.productosDisponibles = [];
    this.tempProductoId = null;
    this.itemsDelPedido = [];
  }

}