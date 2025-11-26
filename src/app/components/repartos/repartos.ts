import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, BehaviorSubject, combineLatest, map } from 'rxjs';
import { RepartosService } from '../../services/repartos-service';
import { AuthService } from '../../services/auth-service';
import { Reparto } from '../../model/reparto.model';
import { Pedido } from '../../model/pedido.model';
import { ActionBar } from '../action-bar/action-bar';
import { FormModal } from '../form-modal/form-modal';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-repartos',
  imports: [CommonModule, NgbModule, ActionBar, FormModal, ReactiveFormsModule],
  templateUrl: './repartos.html',
  styleUrl: './repartos.css'
})
export class Repartos {
  private repartosService = inject(RepartosService);
  private modalService = inject(NgbModal);
  private auth = inject(AuthService);

  role$ = this.auth.role$;

  repartos$!: Observable<Reparto[]>;
  visibleRepartos$!: Observable<Reparto[]>;

  // filtro reactivo
  private filterSubject = new BehaviorSubject<string>('');
  filter$ = this.filterSubject.asObservable();

  // demo: id del cliente "loggeado" y repartidor loggeado (reemplazalos por valores reales)
  private CURRENT_CLIENT_ID = 1;
  private CURRENT_REPARTIDOR_ID = 21;

  // seleccionado para el modal de "Ver"
  selectedReparto: Reparto | null = null;

  //Modal de alta de reparto
  isModalOpen = false;
  repartoForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.repartos$ = this.repartosService.getAll();

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

     // Definimos el formulario específico de Repartos
    this.repartoForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      precio: [0, [Validators.required, Validators.min(1)]],
      categoria: ['', Validators.required],
      imagenUrl: ['']
    });
  }

  onFilterChange(value: string) {
    this.filterSubject.next(value ?? '');
  }

  openDetailsModal(content: any, reparto: Reparto) {
    this.selectedReparto = reparto;
    this.modalService.open(content, { centered: true, size: 'lg' });
  }

  // helpers
  totalReparto(reparto: Reparto | null): number {
    if (!reparto) return 0;
    return reparto.pedidosList.reduce((acc, p) => acc + (p.importeTotalPedido ?? 0), 0);
  }

  totalPedido(p: Pedido): number {
    return p.importeTotalPedido ?? 0;
  }

  crearNuevoReparto() {
    console.log('Crear nuevo reparto (pendiente)');
  }

  //---MODAL---
  openModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.repartoForm.reset(); // Limpiar al cerrar
  }

  guardarReparto() {
    if (this.repartoForm.valid) {
      console.log('Guardando Reparto:', this.repartoForm.value);
      // Aquí llamas a tu servicio: this.repartoService.create(...)
      this.closeModal();
    } else {
      this.repartoForm.markAllAsTouched(); // Mostrar errores si faltan datos
    }
  }
}
