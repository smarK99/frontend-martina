import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, BehaviorSubject, combineLatest, map, switchMap } from 'rxjs'; // Añadido switchMap
import { RepartosService } from '../../services/repartos-service';
import { AuthService } from '../../services/auth-service';
import { Reparto } from '../../model/reparto.model';
import { ActionBar } from '../action-bar/action-bar';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// --- INTERFACE PARA USUARIO SIMULADO (FAKE LOGIN) ---
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
  // ==========================================
  // 1. INYECCIÓN DE DEPENDENCIAS
  // ==========================================
  private repartosService = inject(RepartosService);
  private modalService = inject(NgbModal);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  // ==========================================
  // 2. VARIABLES DE ESTADO Y OBSERVABLES
  // ==========================================
  role$ = this.auth.role$;

  // Gatillo para recargar la tabla automáticamente
  private refresh$ = new BehaviorSubject<void>(undefined);
  repartos$!: Observable<Reparto[]>;
  visibleRepartos$!: Observable<Reparto[]>;

  // filtro reactivo
  private filterSubject = new BehaviorSubject<string>('');
  filter$ = this.filterSubject.asObservable();

  // demo: id del cliente "loggeado" y repartidor loggeado
  private CURRENT_CLIENT_ID = 1;
  private CURRENT_REPARTIDOR_ID = 2;

  // seleccionado para el modal de "Ver"
  selectedReparto: Reparto | null = null;

  // Info simulada del chofer logueado para el alta
  driverInfo: UsuarioAutenticado | null = null;

  // Modal de alta de reparto
  repartoForm: FormGroup;

  // ==========================================
  // 3. CONSTRUCTOR Y CICLO DE VIDA
  // ==========================================
  constructor() {
    // Definimos el formulario específico de Repartos (limpiado de campos de productos)
    this.repartoForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: ['']
    });

    // Conectamos la lista base al gatillo de refresco
    this.repartos$ = this.refresh$.pipe(
      switchMap(() => this.repartosService.getAll())
    );

    // Tu lógica original de filtrado por roles (INTACTA)
    this.visibleRepartos$ = combineLatest([this.repartos$, this.role$, this.filter$]).pipe(
      map(([repartos, role, filter]) => {
        const q = (filter || '').trim().toLowerCase();

        // 1) Base según rol
        let list: Reparto[] = [];
        if (!role) return [];
        if (role === 'admin') {
          list = repartos.slice();
        } else if (role === 'empleado') {
          // si el empleado es repartidor, ver solo sus repartos
          list = repartos.filter(r => r.usuario.idUsuario === this.CURRENT_REPARTIDOR_ID);
        } else if (role === 'cliente') {
          // cliente ve repartos que contienen sus pedidos
          list = repartos.filter(r => r.pedidosList.some(p => p.sucursal.id === this.CURRENT_CLIENT_ID));
        } else {
          list = repartos.slice();
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
  }

  ngOnInit() {
    // Simulamos la sesión usando tu variable CURRENT_REPARTIDOR_ID
    this.driverInfo = { id: this.CURRENT_REPARTIDOR_ID, nombre: 'Santiago Marquez (Simulado)' };
  }

  // ==========================================
  // 4. LÓGICA DE MODALES (DETALLE Y ALTA)
  // ==========================================
  
  // Modal de Detalles
  openDetailsModal(content: any, reparto: Reparto) {
    this.selectedReparto = reparto;
    this.modalService.open(content, { centered: true, size: 'lg' });
  }

  // Modal de Alta - Manejo inteligente con ng-bootstrap
  openModal(modalTemplate: any) {
    const modalRef = this.modalService.open(modalTemplate, { size: 'lg', centered: true });

    modalRef.result.then(
      () => { this.limpiarFormularioAlta(); }, // Cierre exitoso
      () => { this.limpiarFormularioAlta(); }  // Cierre por ESC o clic afuera
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

      console.log('Enviando DTO de Reparto al Backend:', payload);

      // Usando tu servicio inyectado
      this.repartosService.create(payload).subscribe({
        next: (respuesta) => {
          this.closeModal();
          this.refresh$.next(); // Actualiza tu tabla al instante
          
          setTimeout(() => {
            alert('¡Reparto creado con éxito!');
          }, 300);
        },
        error: (err) => {
          console.error('Error al intentar crear el reparto:', err);
          alert('Hubo un error al guardar el reparto. Revisa la consola.');
        }
      });

    } else {
      this.repartoForm.markAllAsTouched();
      alert('Por favor, completa el nombre del reparto.');
    }
  }

  // ==========================================
  // 5. HELPERS
  // ==========================================
  onFilterChange(value: string) {
    this.filterSubject.next(value ?? '');
  }

  totalReparto(reparto: Reparto | null): number {
    if (!reparto) return 0;
    return reparto.pedidosList.reduce((acc, p) => acc + (p.importeTotalPedido ?? 0), 0);
  }

  totalPedido(p: any): number {
    return p.importeTotalPedido ?? 0;
  }
}