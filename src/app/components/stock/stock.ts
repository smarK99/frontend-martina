import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth-service';
import { Observable, combineLatest, map, BehaviorSubject } from 'rxjs'
import { ConteoStockService } from '../../services/conteo-stock-service';
import { StockCount } from '../../services/conteo-stock-service';

@Component({
  selector: 'app-stock',
  imports: [CommonModule, NgbModule],
  templateUrl: './stock.html',
  styleUrl: './stock.css'
})
export class Stock {
  private stockService = inject(ConteoStockService);
  private modalService = inject(NgbModal);
  private auth = inject(AuthService);

  role$ = this.auth.role$;

  counts$!: Observable<StockCount[]>;
  visibleCounts$!: Observable<StockCount[]>;

  // filtro reactivo
  private stockFilterSubject = new BehaviorSubject<string>(''); 
  stockFilter$ = this.stockFilterSubject.asObservable();

  // seleccionado para el modal
  selectedCount: StockCount | null = null;

  constructor() {
    this.counts$ = this.stockService.getAllCounts();

    // Combina counts, role y filtro
    this.visibleCounts$ = combineLatest([this.counts$, this.role$, this.stockFilter$]).pipe(
      map(([counts, role, filter]) => {
        const q = (filter || '').trim().toLowerCase();

        // Si no tiene rol o no es admin/empleado, devolver vacío
        if (!(role === 'admin' || role === 'empleado')) return [];

        // lista base (todos los conteos) ordenada por fecha
        let list = counts.slice();

        // Si hay query, filtramos por empleadoNombre, id o productos dentro de items
        if (q) {
          list = list.filter(c =>
            (c.empleadoNombre || '').toLowerCase().includes(q) ||
            c.id.toString().includes(q) ||
            c.items.some(it => (it.nombre || '').toLowerCase().includes(q))
          );
        }

        return list.sort((a, b) => +new Date(b.fechaHora) - +new Date(a.fechaHora));
      })
    );
  }

  // llamado desde el template
  onStockFilterChange(value: string) {
    this.stockFilterSubject.next(value ?? '');
  }

  openDetailsModal(content: any, count: StockCount) {
    this.selectedCount = count;
    this.modalService.open(content, { centered: true, size: 'lg' });
  }

  // Botón flotante - crear nuevo (sin funcionalidad por ahora)
  crearNuevoConteo() {
    console.log('Crear nuevo conteo (pendiente).');
  }

  // Formatea el id con ceros a la izquierda: 1 -> 001
  formatId(id: number | undefined, width = 3): string {
    const s = (id ?? 0).toString();
    return s.padStart(width, '0');
  }

  totalValue(): number {
    if (!this.selectedCount || !this.selectedCount.items) return 0;
    return this.selectedCount.items.reduce((total, item) => {
      const precio = (item as any).precioUnitario ?? 0;
      const subtotal = precio * (item.cantidadContada ?? 0);
      return total + subtotal;
    }, 0);
  }
}
