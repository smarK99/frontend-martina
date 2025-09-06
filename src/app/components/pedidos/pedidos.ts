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

  //Filtro de busqueda
  // private filterSubject = new BehaviorSubject<string>(''); // texto del filtro
  // filter$ = this.filterSubject.asObservable();

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

    // Combina la lista de pedidos con el rol, y calcula qué mostrar
    this.visiblePedidos$ = combineLatest([this.pedidos$, this.role$ /*, this.filter$*/]).pipe(
      map(([pedidos, role/*, filter*/]) => {
        // const q = (filter || '').trim().toLowerCase();
        // let list = pedidos.slice();

        if (!role) {
          // No logueado -> devolver vacío (o podrías devolver un subset público)
          return [];
        }
        if (role === 'admin') {
          return pedidos.slice().sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha)); // últimos primero
        }
        if (role === 'cliente') {
          return pedidos
            .filter(p => p.clienteId === this.CURRENT_CLIENT_ID)
            .sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha));
        }

        // filtro por texto en el nombre del cliente (si hay query)
        // if (q) {
        //   list = list.filter(p =>
        //     (p.clienteNombre || '').toLowerCase().includes(q) ||
        //     p.id.toString().includes(q) ||
        //     (p.estado || '').toLowerCase().includes(q)
        //   );
        // }


        // empleado u otros roles -> mostrar todos pero sin datos sensibles (a criterio)
        return pedidos.slice().sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha));
      })
    );
  }

  // Método público llamado desde template:
  // onFilterChange(value: string) {
  //   this.filterSubject.next(value ?? '');
  // }

  // Helper: formatea fecha en template si querés usar aquí
  toShortDate(fechaIso: string) {
    const d = new Date(fechaIso);
    return d.toLocaleString();
  }

  // Acción de ejemplo: ver detalles / navegar
  verDetalles(id: number) {
    // this.router.navigate(['/pedidos', id]); // si tenés ruta configurada
    console.log('Ver detalles pedido', id);
  }
}
