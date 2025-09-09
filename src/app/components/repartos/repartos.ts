import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, BehaviorSubject, combineLatest, map } from 'rxjs';
import { RepartosService, Reparto, PedidoMini } from '../../services/repartos-service';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-repartos',
  imports: [CommonModule, NgbModule],
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

  // seleccionado para el modal
  selectedReparto: Reparto | null = null;

  constructor() {
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
          list = repartos.filter(r => r.repartidorId === this.CURRENT_REPARTIDOR_ID);
        } else if (role === 'cliente') {
          // cliente ve repartos que contienen sus pedidos
          list = repartos.filter(r => r.pedidos.some(p => p.clienteId === this.CURRENT_CLIENT_ID));
        } else {
          list = repartos.slice();
        }

        // 2) aplicar filtro si hay (por repartidor, cliente o id)
        if (q) {
          list = list.filter(r =>
            r.id.toString().includes(q) ||
            (r.repartidorNombre || '').toLowerCase().includes(q) ||
            r.pedidos.some(p => (p.clienteNombre || '').toLowerCase().includes(q) || p.id.toString().includes(q))
          );
        }

        // 3) ordenar por fecha inicio descendente
        return list.sort((a, b) => +new Date(b.fechaHoraInicio) - +new Date(a.fechaHoraInicio));
      })
    );
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
    return reparto.pedidos.reduce((acc, p) => acc + (p.total ?? 0), 0);
  }

  totalPedido(p: PedidoMini): number {
    return p.total ?? 0;
  }

  crearNuevoReparto() {
    console.log('Crear nuevo reparto (pendiente)');
  }
}
