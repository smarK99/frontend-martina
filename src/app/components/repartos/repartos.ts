import { Component, inject, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, BehaviorSubject, combineLatest, map, switchMap, debounceTime, distinctUntilChanged, tap, catchError, of } from 'rxjs'; 
import { RepartosService } from '../../services/repartos-service';
import { PedidoService } from '../../services/pedido-service';
import { AuthService } from '../../services/auth-service';
import { Reparto } from '../../model/reparto.model';
import { ActionBar } from '../action-bar/action-bar';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

interface UsuarioAutenticado {
  id: number;
  nombre: string;
}

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

  role$ = this.auth.role$;

  // --- VARIABLES DE PAGINACIÓN Y FILTROS ---
  currentPage = 0;
  pageSize = 15;
  totalElements = 0;
  totalPages = 0;
  isLoadingTabla = false;
  repartos: Reparto[] = []; 

  private refresh$ = new BehaviorSubject<void>(undefined);
  private filterSubject = new BehaviorSubject<string>('');
  private dateFilterSubject = new BehaviorSubject<string>('');
  private estadoFilterSubject = new BehaviorSubject<number>(0); // <-- NUEVO: Control de estado
  
  private CURRENT_CLIENT_ID = 1;
  private CURRENT_REPARTIDOR_ID = 2;

  selectedReparto: Reparto | null = null;
  driverInfo: UsuarioAutenticado | null = null;
  repartoForm: FormGroup;

  pedidosDisponibles: any[] = []; 
  pedidosSeleccionados: Set<number> = new Set<number>();
  repartoActivoId: number | null = null;
  cargandoPedidos = false;

  @ViewChild('alertaModal') alertaModal!: TemplateRef<any>;
  mensajeAlerta: string = '';
  tipoAlerta: 'exito' | 'error' = 'exito';

  constructor() {
    this.repartoForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: ['']
    });
  }

  ngOnInit() {
    this.driverInfo = { id: this.CURRENT_REPARTIDOR_ID, nombre: 'Santiago Marquez (Simulado)' };
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

  // --- NUEVO: Evento para el selector de estado ---
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
    if (this.repartoForm.valid && this.driverInfo) {
      const payload = {
        idUsuario: this.driverInfo.id,
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

  pedidoACancelarId: number | null = null;
  modalConfirmacionRef: any;

  abrirConfirmacionCancelacion(modalTemplate: any, idPedido: number) {
    this.pedidoACancelarId = idPedido;
    this.modalConfirmacionRef = this.modalService.open(modalTemplate, { centered: true, size: 'sm' });
  }

  ejecutarCancelacion() {
    if (!this.pedidoACancelarId) return;

    this.pedidoService.cancelarPedido(this.pedidoACancelarId).subscribe({
      next: () => {
        if (this.selectedReparto) {
          const pedido = this.selectedReparto.pedidosList.find(p => p.id === this.pedidoACancelarId);
          if (pedido) {
            pedido.estadoPedido.nombreEstadoPedido = 'CANCELADO';
          }
        }
        this.refresh$.next();
        this.modalConfirmacionRef.close();
        this.pedidoACancelarId = null;
        this.mostrarAlerta('Pedido cancelado exitosamente.', 'exito');
      },
      error: (err) => {
        console.error('Error al cancelar el pedido:', err);
        this.mostrarAlerta('No se pudo cancelar el pedido.', 'error');
        if (this.modalConfirmacionRef) this.modalConfirmacionRef.close();
      }
    });
  }
}