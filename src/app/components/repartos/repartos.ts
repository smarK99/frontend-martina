import { Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, BehaviorSubject, combineLatest, map, switchMap, debounceTime, distinctUntilChanged, tap, catchError, of } from 'rxjs'; 
import { RepartosService } from '../../services/repartos-service';
import { PedidoService } from '../../services/pedido-service';
import { AuthService } from '../../services/auth-service';
import { Reparto } from '../../model/reparto.model';
import { ActionBar } from '../action-bar/action-bar';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'app-repartos',
  imports: [CommonModule, NgbModule, ActionBar, ReactiveFormsModule],
  templateUrl: './repartos.html',
  styleUrl: './repartos.css'
})
export class Repartos implements OnInit {
  private repartosService = inject(RepartosService);
  private pedidoService = inject(PedidoService);
  private modalService = inject(NgbModal);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private platformId = inject(PLATFORM_ID);

  role$ = this.auth.role$;
  usuarioLogueadoId = this.obtenerIdUsuarioLogueado();

  // --- VARIABLES DE PAGINACIÓN Y FILTROS ---
  currentPage = 0;
  pageSize = 15;
  totalElements = 0;
  totalPages = 0;
  isLoadingTabla = false;
  repartos: Reparto[] = []; 

  private refresh$ = new BehaviorSubject<void>(undefined);
  repartos$!: Observable<Reparto[]>;
  visibleRepartos$!: Observable<Reparto[]>;
  private filterSubject = new BehaviorSubject<string>('');
  filter$ = this.filterSubject.asObservable();
  private dateFilterSubject = new BehaviorSubject<string>('');
  private estadoFilterSubject = new BehaviorSubject<number>(0); // <-- NUEVO: Control de estado
  
  private CURRENT_CLIENT_ID = 1;
  private CURRENT_REPARTIDOR_ID = 2;

  selectedReparto: Reparto | null = null;

  // Modal de alta de reparto
  repartoForm: FormGroup;

  //Variable para modal gasto
  gastoForm: FormGroup;
  repartoSeleccionadoId: number | null = null;

  //Variable para modal rendicion
  rendicionForm: FormGroup;

  pedidosDisponibles: any[] = []; 
  pedidosSeleccionados: Set<number> = new Set<number>();
  repartoActivoId: number | null = null;
  cargandoPedidos = false;

  // Importamos Validators si no los tienes
  // En tu constructor o OnInit:
  cobroForm: FormGroup;
  pedidoParaCobrar: any = null; // Guarda temporalmente el pedido que el repartidor clickeó

  @ViewChild('alertaModal') alertaModal!: TemplateRef<any>;
  mensajeAlerta: string = '';
  tipoAlerta: 'exito' | 'error' = 'exito';

  constructor() {
    this.repartoForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: ['']
    });

    // Conectamos la lista base al gatillo de refresco
    this.repartos$ = this.refresh$.pipe(
      switchMap(() => this.repartosService.getAll())
    );

    this.visibleRepartos$ = combineLatest([this.repartos$, this.role$, this.filter$]).pipe(
      map(([repartos, role, filter]) => {
        const q = (filter || '').trim().toLowerCase();

        // 1) Base según rol (Usando nomenclatura estricta)
        let list: Reparto[] = [];
        if (!role) return [];

        if (role === 'ROLE_ADMIN' || role === 'ROLE_DUENIO') {
          // Ven absolutamente todos los repartos
          list = repartos.slice();
        } else if (role === 'ROLE_REPARTIDOR') {
          // El repartidor ve exclusivamente los suyos
          list = repartos.filter(r => r.usuario.idUsuario === this.usuarioLogueadoId);
        } else {
          // Cualquier otro rol (como ROLE_CLIENTE o ROLE_STOCK) no ve nada acá
          return [];
        }

        // 2) aplicar filtro si hay (por repartidor, cliente o id)
        if (q) {
          list = list.filter(r =>
            r.id.toString().includes(q) ||
            (r.usuario.nombreCompletoUsuario || '').toLowerCase().includes(q) ||
            r.pedidosList.some(p => (p.sucursal.nombreSucursal || '').toLowerCase().includes(q) || p.id.toString().includes(q))
          );
        }

        // 3) ordenar por fecha inicio descendente
        return list.sort((a, b) => +new Date(b.fechaHoraInicioReparto) - +new Date(a.fechaHoraInicioReparto));
      })
    );

    // Inicializamos el formulario de gastos con validaciones
    this.gastoForm = this.fb.group({
      nombreGasto: ['', [Validators.required, Validators.maxLength(100)]],
      montoGasto: ['', [Validators.required, Validators.min(1)]] // Mínimo $1
    });

    // Inicializamos el formulario de rendición
    this.rendicionForm = this.fb.group({
      montoRendido: ['', [Validators.required, Validators.min(0)]]
    });

    this.cobroForm = this.fb.group({
      montoEfectivo: [0, [Validators.min(0)]],
      montoTransferencia: [0, [Validators.min(0)]]
    });
  }

  ngOnInit() {
    this.configurarPaginacionReactiva();
  }

  // ==========================================
  // LÓGICA DE PAGINACIÓN REACTIVA COMBINADA
  // ==========================================
  configurarPaginacionReactiva() {
    combineLatest([
      this.filterSubject.pipe(debounceTime(400), distinctUntilChanged()), 
      this.dateFilterSubject.pipe(distinctUntilChanged()),
      this.estadoFilterSubject.pipe(distinctUntilChanged()), // <-- Escuchamos cambios de estado
      this.refresh$,
      this.role$
    ]).pipe(
      tap(() => this.isLoadingTabla = true),
      switchMap(([termino, fecha, idEstado, _, role]) => {
        let idRepartidorAFiltrar = 0; 
        
        if (role === 'ROLE_REPARTIDOR') {
          idRepartidorAFiltrar = this.CURRENT_REPARTIDOR_ID;
        } else if (role !== 'ROLE_ADMIN' && role !== 'ROLE_DUENIO') {
          return of({ content: [], totalElements: 0, totalPages: 0 });
        }

        // Pasamos todos los filtros al servicio
        return this.repartosService.buscarPaginadoYFiltrado(termino, idRepartidorAFiltrar, fecha, idEstado, this.currentPage, this.pageSize).pipe(
          catchError(error => {
            console.error('Error al traer repartos:', error);
            return of({ content: [], totalElements: 0, totalPages: 0 });
          })
        );
      })
    ).subscribe(response => {
      this.totalElements = response.totalElements;
      this.totalPages = response.totalPages;
      this.repartos = response.content; 
      this.isLoadingTabla = false; 
    });
  }

  onFilterChange(value: string) {
    this.currentPage = 0; 
    this.filterSubject.next(value.trim());
  }

  onDateFilterChange(dateValue: string) {
    this.currentPage = 0; 
    this.dateFilterSubject.next(dateValue);
  }

  onEstadoFilterChange(estadoValue: string) {
    this.currentPage = 0;
    this.estadoFilterSubject.next(Number(estadoValue));
  }

  cambiarPagina(nuevaPagina: number) {
    if (nuevaPagina >= 0 && nuevaPagina < this.totalPages) {
      this.currentPage = nuevaPagina;
      this.refresh$.next(); 
    }
  }

  // ==========================================
  // ALERTA Y MODALES
  // ==========================================
  mostrarAlerta(mensaje: string, tipo: 'exito' | 'error') {
    this.mensajeAlerta = mensaje;
    this.tipoAlerta = tipo;
    
    const modalRef = this.modalService.open(this.alertaModal, { centered: true, size: 'sm', backdrop: 'static' });

    if (tipo === 'exito') {
      setTimeout(() => {
        modalRef.close(); 
      }, 2000);
    }
  }

  openDetailsModal(content: any, reparto: Reparto) {
    this.selectedReparto = reparto;
    this.modalService.open(content, { centered: true, size: 'lg' });
  }

  openModal(modalTemplate: any) {
    const modalRef = this.modalService.open(modalTemplate, { size: 'lg', centered: true });

    modalRef.result.then(
      () => { this.limpiarFormularioAlta(); },
      () => { this.limpiarFormularioAlta(); }  
    );
  }

  closeModal() {
    this.modalService.dismissAll();
  }

  private limpiarFormularioAlta() {
    this.repartoForm.reset({ nombre: '', descripcion: '' });
  }

  guardarReparto() {
    if (this.repartoForm.valid && this.usuarioLogueadoId) {
      
      const payload = {
        idUsuario: this.usuarioLogueadoId,
        nombreReparto: this.repartoForm.value.nombre,
        descripcionReparto: this.repartoForm.value.descripcion || ''
      };

      this.repartosService.create(payload).subscribe({
        next: (respuesta) => {
          this.closeModal();
          this.refresh$.next(); 
          setTimeout(() => {
            this.mostrarAlerta('¡Reparto creado con éxito!', 'exito');
          }, 300);
        },
        error: (err) => {
          console.error('Error al crear el reparto:', err);
          this.mostrarAlerta('Hubo un error al guardar el reparto.', 'error');
        }
      });
    } else {
      this.repartoForm.markAllAsTouched();
      this.mostrarAlerta('Por favor, completa el nombre del reparto.', 'error');
    }
  }

  abrirModalAsignacion(modalTemplate: any, idReparto: number) {
    this.repartoActivoId = idReparto;
    this.pedidosSeleccionados.clear(); 
    this.pedidosDisponibles = []; 
    this.cargandoPedidos = true;

    this.modalService.open(modalTemplate, { size: 'lg', centered: true, scrollable: true });

    this.pedidoService.getPedidosDisponibles().subscribe({
      next: (pedidos) => {
        this.pedidosDisponibles = pedidos;
        this.cargandoPedidos = false;
      },
      error: (err) => {
        console.error('Error cargando pedidos disponibles', err);
        this.cargandoPedidos = false;
      }
    });
  }

  toggleSeleccionPedido(idPedido: number) {
    if (this.pedidosSeleccionados.has(idPedido)) {
      this.pedidosSeleccionados.delete(idPedido);
    } else {
      this.pedidosSeleccionados.add(idPedido);    
    }
  }

  guardarAsignacion() {
    if (this.pedidosSeleccionados.size === 0 || !this.repartoActivoId) {
      this.mostrarAlerta('Debes seleccionar al menos un pedido.', 'error');
      return;
    }

    const pedidosIds = Array.from(this.pedidosSeleccionados);

    this.repartosService.asignarPedidos(this.repartoActivoId, pedidosIds).subscribe({
      next: (res) => { 
        this.closeModal(); 
        this.refresh$.next();
        setTimeout(() => {
          this.mostrarAlerta('¡Pedidos asignados con éxito!', 'exito');
        }, 300);
      },
      error: (err) => {
        console.error('Error al asignar', err);
        this.mostrarAlerta('Hubo un error al asignar los pedidos.', 'error');
      }
    });
  }

  // ==========================================
  // HELPERS
  // ==========================================
  cantidadPedidosActivos(reparto: Reparto | null): number {
    if (!reparto || !reparto.pedidosList) return 0;
    return reparto.pedidosList
      .filter(p => p.estadoPedido?.nombreEstadoPedido !== 'CANCELADO')
      .length;
  }

  totalReparto(reparto: Reparto | null): number {
    if (!reparto || !reparto.pedidosList) return 0;
    return reparto.pedidosList
      .filter(p => p.estadoPedido?.nombreEstadoPedido !== 'CANCELADO')
      .reduce((acc, p) => acc + (p.importeTotalPedido ?? 0), 0);
  }

  totalPedido(p: any): number {
    return p.importeTotalPedido ?? 0;
  }

  // --- LÓGICA DEL C.U. CARGAR GASTO ---
  
  abrirModalGasto(content: any, idReparto: number | null) {
    this.repartoSeleccionadoId = idReparto;
    this.gastoForm.reset(); // Limpiamos campos viejos
    this.modalService.open(content, { centered: true, backdrop: 'static' });
  }

  guardarGasto() {
    // 1. Verificamos que el formulario sea válido
    if (this.gastoForm.invalid) {
      this.gastoForm.markAllAsTouched();
      return;
    }

    // 2. Armamos el DTO exactamente como lo espera Java (CargarGastoDTO)
    const payload = {
      idReparto: this.repartoSeleccionadoId,
      nombreGasto: this.gastoForm.value.nombreGasto,
      montoGasto: this.gastoForm.value.montoGasto
    };

    console.log("Enviando Gasto:", payload);

    // 3. Enviamos al backend
    this.repartosService.cargarGasto(payload).subscribe({
      next: (res) => {
        alert("Gasto cargado exitosamente.");
        this.modalService.dismissAll();
        this.refresh$.next(); // Refrescamos la tabla para ver cambios
      },
      error: (err) => {
        console.error("Error al cargar gasto:", err);
        alert("Hubo un error al cargar el gasto: " + (err.error?.error || err.message));
      }
    });
  }

  //Modificaciones para el modal de gasto
  formatId(id: number | null): string {
    if (!id) return '';
    return id.toString().padStart(3, '0');
  }

  // --- LÓGICA C.U. "ENTREGAR PEDIDO" ---

  entregarPedido() {
    if (this.cobroForm.invalid || !this.pedidoParaCobrar) return;

    const payload = {
      idReparto: this.selectedReparto?.id,
      idPedido: this.pedidoParaCobrar.id,
      montoEfectivo: this.cobroForm.value.montoEfectivo,
      montoTransferencia: this.cobroForm.value.montoTransferencia
    };

    this.repartosService.entregarPedido(payload).subscribe({
      next: () => {
        this.refresh$.next(); // Actualiza tabla
        
        // Actualización optimista local
        const pedidoLocal = this.selectedReparto?.pedidosList.find((p: any) => p.id === payload.idPedido);
        if (pedidoLocal) pedidoLocal.estadoPedido.nombreEstadoPedido = 'ENTREGADO';
        
        this.modalService.dismissAll();
        setTimeout(() => alert("¡Pedido entregado con éxito!"), 300);
      },
      error: (err) => alert("Error al registrar la entrega.")
    });
  }

  // Abre el modal pasándole los datos del pedido
  abrirModalCobro(content: any, pedido: any) {
    this.pedidoParaCobrar = pedido;
    
    // Pre-llenamos el input de efectivo con el total del pedido por defecto 
    // (Asumiendo que el 90% de las veces pagan exacto en efectivo).
    this.cobroForm.reset({
      montoEfectivo: pedido.importeTotalPedido,
      montoTransferencia: 0
    });
    
    this.modalService.open(content, { centered: true });
  }

  // --- LÓGICA PARA FINALIZAR REPARTO ---
  finalizarReparto(repartoId: number) {

    if (this.tienePedidosPendientes(this.selectedReparto)) {
      alert("Entrega los pedidos pendientes!");
      return;
    }

    this.repartosService.finalizarReparto(repartoId).subscribe({
      next: () => {
        
        this.refresh$.next();
        setTimeout(() => alert("¡Reparto finalizado con éxito!"), 300);

        if (this.selectedReparto && this.selectedReparto.estadoReparto) {
          this.selectedReparto.estadoReparto.nombreEstadoReparto = 'FINALIZADO';
        }
      },
      error: (err) => {
        alert("Hubo un error al finalizar el reparto.");
      }
    });
  }

  tienePedidosPendientes(reparto: any): boolean {
    if (!reparto || !reparto.pedidosList) return false;
    
    // El método .some() frena y devuelve true apenas encuentra uno que cumpla la condición
    return reparto.pedidosList.some((p: any) => p.estadoPedido.nombreEstadoPedido !== 'ENTREGADO');
  }

  // --- LÓGICA C.U. REALIZAR RENDICIÓN ---
  realizarRendicion(idReparto: number) {
    if (this.rendicionForm.invalid) {
      this.rendicionForm.markAllAsTouched();
      return;
    }

    const payload = {
      idReparto: idReparto,
      montoRendido: this.rendicionForm.value.montoRendido
    };

    if (confirm('¿Confirmas que el monto contado es correcto? Esta acción cerrará la caja del reparto.')) {
      this.repartosService.realizarRendicion(payload).subscribe({
        next: (rendicionActualizada) => {
          this.refresh$.next();
        
          if (this.selectedReparto) {
            this.selectedReparto.rendicion = rendicionActualizada;
          }
          
          setTimeout(() => alert("Caja rendida exitosamente."), 300);
        },
        error: (err) => {
          console.error("Error al rendir caja:", err);
          alert("Error: " + (err.error?.error || "No se pudo realizar la rendición"));
        }
      });
    }
  }

  obtenerIdUsuarioLogueado(): number {
    // Verificamos si este código se está ejecutando en el navegador real
    if (isPlatformBrowser(this.platformId)) {
      const userId = localStorage.getItem('idUsuario');
      return userId ? Number(userId) : 2;
    }
    
    // Si se está ejecutando en el servidor (al hacer F5), devolvemos un ID por defecto
    return 1;
  }

}