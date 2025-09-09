import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, combineLatest, map, BehaviorSubject } from 'rxjs';
import { AuthService } from '../../services/auth-service';
import { PedidoService } from '../../services/pedido-service';
import { Pedido } from '../../services/pedido-service';


@Component({
  selector: 'app-pedidos',
  imports: [CommonModule, RouterModule],
  templateUrl: './pedidos.html',
  styleUrl: './pedidos.css'
})
export class Pedidos {
  private pedidoService = inject(PedidoService);
  private auth = inject(AuthService);

  // Filtro de búsqueda (puedes poner debounceTime si querés)
  private filterSubject = new BehaviorSubject<string>(''); // texto del filtro
  // Si querés debounce: this.filterSubject.pipe(debounceTime(200))
  filter$ = this.filterSubject.asObservable();

  // Observables del auth
  role$ = this.auth.role$;           // Observable<string | null>
  isLoggedIn$ = this.auth.isLoggedIn$;

  // Observable con todos los pedidos (desde servicio)
  pedidos$!: Observable<Pedido[]>;

  // Observable con pedidos filtrados según rol (admin = todos, cliente = solo suyos)
  visiblePedidos$!: Observable<Pedido[]>;

  // DEMO: id del cliente actual. En tu proyecto reemplazar por el id real del usuario logueado.
  private CURRENT_CLIENT_ID = 1;

  constructor() {
    this.pedidos$ = this.pedidoService.getAll();

    // Combina la lista de pedidos con el rol y el filtro, y calcula qué mostrar
    this.visiblePedidos$ = combineLatest([this.pedidos$, this.role$, this.filter$]).pipe(
      map(([pedidos, role, filter]) => {
        const q = (filter || '').trim().toLowerCase();

        // 1) Determinar la lista base según rol
        let list: Pedido[] = [];
        if (!role) {
          // No logueado -> lista vacía
          return [];
        } else if (role === 'admin') {
          list = pedidos.slice(); // todos
        } else if (role === 'cliente') {
          list = pedidos.filter(p => p.clienteId === this.CURRENT_CLIENT_ID);
        } else {
          // empleado u otros roles -> mostramos todos (o ajustar según reglas)
          list = pedidos.slice();
        }

        // 2) Aplicar filtro de texto si corresponde
        if (q) {
          list = list.filter(p =>
            (p.clienteNombre || '').toLowerCase().includes(q) ||
            p.id.toString().includes(q) ||
            (p.estado || '').toLowerCase().includes(q)
          );
        }

        // 3) ordenar por fecha descendente y devolver
        return list.sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha));
      })
    );
  }

  // Método público llamado desde template:
  onFilterChange(value: string) {
    this.filterSubject.next(value ?? '');
  }

  // Helper: formatea fecha en template si querés usar aquí
  toShortDate(fechaIso: string) {
    const d = new Date(fechaIso);
    return d.toLocaleString();
  }

  // Acción de ejemplo: ver detalles / navegar
  verDetalles(id: number) {
    console.log('Ver detalles pedido', id);
  }
}
