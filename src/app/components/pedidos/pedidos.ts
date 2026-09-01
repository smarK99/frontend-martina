import { Component, inject, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, combineLatest, BehaviorSubject, switchMap, tap, catchError, of, debounceTime, distinctUntilChanged, map } from 'rxjs';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth-service';
import { PedidoService } from '../../services/pedido-service';
import { Sucursal } from '../../model/pedido.model';
import { ActionBar } from '../action-bar/action-bar';
import { ProductoService } from '../../services/producto-service';
import { SucursalService } from '../../services/sucursal-service';
import { MovCtaCteService } from '../../services/mov-cta-cte-service';

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
  private MovCtaCteService = inject(MovCtaCteService);
  private auth = inject(AuthService);
  private modalService = inject(NgbModal);
  private fb = inject(FormBuilder);

  // ==========================================
  // 2. VARIABLES DE ESTADO Y OBSERVABLES
  // ==========================================

  role$ = this.auth.role$;
  isLoggedIn$ = this.auth.isLoggedIn$;
  pedidos$!: Observable<any[]>;
  visiblePedidos$!: Observable<any[]>;
  private CURRENT_CLIENT_ID = 1;
  private refresh$ = new BehaviorSubject<void>(undefined);

  // --- VARIABLES DE PAGINACIÓN Y FILTRO ---
  currentPage = 0;
  pageSize = 15;
  totalElements = 0;
  totalPages = 0;
  
  filtroSucursal$ = new BehaviorSubject<number | ''>(''); 
  filterSubject = new BehaviorSubject<string>(''); // Controla el texto del buscador
  filter$ = this.filterSubject.asObservable(); // Alias para compatibilidad con la lógica reactiva previa
  dateFilterSubject = new BehaviorSubject<string>(''); // NUEVO: Controla la fecha
  estadoFilterSubject = new BehaviorSubject<number>(0); // NUEVO: Controla el estado
  
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
  // -- Historial de Movimientos de Cta Cte --
  historialCliente: any[] = [];
  deudaActual: number = 0;
  sucursalSeleccionadaId: number | null = null;

  // Formulario para registrar un pago manual 
  pagoForm: FormGroup;
  mostrandoFormularioPago = false;

  // ==========================================
  // ALERTA GENÉRICA (ÉXITO / ERROR)
  // ==========================================
  @ViewChild('alertaModal') alertaModal!: TemplateRef<any>;
  mensajeAlerta: string = '';
  tipoAlerta: 'exito' | 'error' = 'exito';

  modalConfirmacionRef: any; 

  mostrarAlerta(mensaje: string, tipo: 'exito' | 'error') {
    this.mensajeAlerta = mensaje;
    this.tipoAlerta = tipo;
    
    const modalRef = this.modalService.open(this.alertaModal, { centered: true, size: 'sm', backdrop: 'static' });
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

    this.pagoForm = this.fb.group({
      montoPagado: ['', [Validators.required, Validators.min(1)]],
      concepto: ['Abono en efectivo', Validators.required]
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
      this.dateFilterSubject.pipe(distinctUntilChanged()), // NUEVO: Filtro de fecha
      this.estadoFilterSubject.pipe(distinctUntilChanged()), // NUEVO: Filtro de estado
      this.refresh$,
      this.role$
    ]).pipe(
      tap(() => this.isLoadingTabla = true),
      switchMap(([sucursalId, termino, fecha, idEstado, _, role]) => {
        
        // Si no hay sucursal seleccionada, mandamos 0 para buscar en todas
        let idAFiltrar: number = Number(sucursalId) || 0;
        
        if (role === 'ROLE_CLIENTE') {
          idAFiltrar = this.CURRENT_CLIENT_ID;
        }

        // Llamamos directamente a la nueva Super Consulta del servicio (con los 6 parámetros)
        return this.pedidoService.buscarPaginadoYFiltrado(termino, idAFiltrar, fecha, idEstado, this.currentPage, this.pageSize).pipe(
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

  // NUEVOS METODOS PARA FECHA Y ESTADO
  onDateFilterChange(dateValue: string) {
    this.currentPage = 0; 
    this.dateFilterSubject.next(dateValue);
  }

  onEstadoFilterChange(estadoValue: string) {
    this.currentPage = 0;
    this.estadoFilterSubject.next(Number(estadoValue));
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
    this.modalConfirmacionRef = this.modalService.open(modalTemplate, { centered: true, size: 'sm' });
  }

  confirmarCancelacion() {
    if (this.pedidoACancelar) {
      this.pedidoService.cancelarPedido(this.pedidoACancelar).subscribe({
        next: (respuesta) => {
          if (this.modalConfirmacionRef) this.modalConfirmacionRef.close(); 
          this.pedidoACancelar = null;    
          this.refresh$.next();          
          this.mostrarAlerta('El pedido ha sido cancelado exitosamente.', 'exito');
        },
        error: (err) => {
          console.error('Error al cancelar el pedido:', err);
          if (this.modalConfirmacionRef) this.modalConfirmacionRef.close();
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

  // ==============================================
  // 7. LÓGICA: HISTORIAL DE MOVIMIENTOS DE CTA CTE
  // ==============================================

  abrirModalHistorial(content: any) {
    // Limpiamos estados anteriores
    this.sucursalSeleccionadaId = null;
    this.historialCliente = [];
    this.deudaActual = 0;
    this.mostrandoFormularioPago = false;
    
    this.modalService.open(content, { size: 'lg', centered: true, backdrop: 'static' });
  }

  // Se ejecuta cada vez que el usuario cambia el cliente en el <select>
  alCambiarSucursal(event: any) {
    const id = event.target.value;
    if (!id) {
      this.historialCliente = [];
      return;
    }
    
    this.sucursalSeleccionadaId = id;
    this.cargarHistorial(id);
  }

  cargarHistorial(idSucursal: number) {
    this.MovCtaCteService.obtenerHistorialPorSucursal(idSucursal).subscribe({
      next: (data) => {
        this.historialCliente = data;
        // Como viene ordenado DESC desde SQL, el primer elemento (índice 0) tiene el saldo más reciente
        if (data && data.length > 0) {
          this.deudaActual = data[0].saldoRestante;
        } else {
          this.deudaActual = 0;
        }
      },
      error: (err) => console.error('Error al cargar historial', err)
    });
  }

  registrarPagoManual() {
    if (this.pagoForm.invalid || !this.sucursalSeleccionadaId) return;

    // Armamos el payload con formato exacto para el Backend (Escenario B)
    const payload = {
      concepto: this.pagoForm.value.concepto,
      importePedido: 0, // No hay pedido nuevo, solo está pagando
      montoPagado: this.pagoForm.value.montoPagado,
      sucursal: { id: this.sucursalSeleccionadaId } // Referencia para el Backend
    };

    this.MovCtaCteService.registrarMovimiento(payload).subscribe({
      next: () => {
        // Refrescamos la tabla localmente para que aparezca la nueva fila
        this.cargarHistorial(this.sucursalSeleccionadaId!);
        this.mostrandoFormularioPago = false;
        this.pagoForm.reset({ concepto: 'Abono en efectivo' });
        setTimeout(() => alert('Pago registrado correctamente.'), 100);
      },
      error: (err) => alert('Error al registrar el pago: ' + err.message)
    });
  }

  // ==============================================
  // 8. LÓGICA: CANCELAR PEDIDO
  // ==============================================
  cancelarPedido(pedido: any) {
    const mensaje = `¿Estás seguro de que deseas cancelar el pedido #${pedido.id}? \nEsto anulará la deuda en la cuenta corriente del cliente.`;
    
    if (confirm(mensaje)) {
      this.pedidoService.cancelarPedido(pedido.id).subscribe({
        next: () => {
          // Cambiamos el estado localmente para no tener que recargar la página
          // Asegúrate de poner el nombre exacto que tiene el estado cancelado en tu base de datos
          if (pedido.estadoPedido) {
            pedido.estadoPedido.nombreEstadoPedido = 'CANCELADO';
          }
          setTimeout(() => alert("Pedido cancelado exitosamente."), 100);
        },
        error: (err) => {
          console.error("Error al cancelar:", err);
          alert("Error: No se pudo cancelar el pedido.");
        }
      });
    }
  }

}