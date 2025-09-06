import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth-service';
import { Observable, combineLatest, map } from 'rxjs'
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

  // seleccionado para el modal
  selectedCount: StockCount | null = null;

  constructor() {
    this.counts$ = this.stockService.getAllCounts();

    // Solo mostrar datos a admin / empleado, si no devolver vacío
    this.visibleCounts$ = combineLatest([this.counts$, this.role$]).pipe(
      map(([counts, role]) => {
        if (role === 'admin' || role === 'empleado') {
          return counts.slice().sort((a, b) => +new Date(b.fechaHora) - +new Date(a.fechaHora));
        }
        return [];
      })
    );
  }

  openDetailsModal(content: any, count: StockCount) {
    this.selectedCount = count;
    this.modalService.open(content, { centered: true, size: 'lg' });
  }

  // Botón flotante - crear nuevo (sin funcionalidad por ahora)
  crearNuevoConteo() {
    // Por ahora solo log; en el futuro abrir formulario
    console.log('Crear nuevo conteo (pendiente).');
  }

  // Formatea el id con ceros a la izquierda: 1 -> 001
  formatId(id: number | undefined, width = 3): string {
    const s = (id ?? 0).toString();
    return s.padStart(width, '0');
  }

  // Calcula total del conteo (suma cantidad * precio si existiera precio; 
  // en tu mock no hay precio, pero dejo ejemplo por si lo querés usar)
  totalValue(): number {
    if (!this.selectedCount || !this.selectedCount.items ) return 0;
    // Si tus items tienen precioUnitario usa: return selectedCount.items.reduce(...)
    
    return this.selectedCount.items.reduce((total, item) => {
    const subtotal = item.precioUnitario * item.cantidadContada;
    return total + subtotal;
  }, 0);
  }

}
