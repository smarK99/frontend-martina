import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth-service';
import { Observable, combineLatest, map, BehaviorSubject } from 'rxjs'
import { ConteoStockService } from '../../services/conteo-stock-service';
import { ConteoStock } from '../../model/conteo-stock.model';
import { ActionBar } from '../action-bar/action-bar';

@Component({
  selector: 'app-stock',
  imports: [CommonModule, NgbModule, /*ActionBar*/],
  templateUrl: './stock.html',
  styleUrl: './stock.css'
})
export class Stock {
  private stockService = inject(ConteoStockService);
  private modalService = inject(NgbModal);
  private auth = inject(AuthService);

  role$ = this.auth.role$;

  counts$!: Observable<ConteoStock[]>;
  visibleCounts$!: Observable<ConteoStock[]>;

  // filtro reactivo
  private stockFilterSubject = new BehaviorSubject<string>('');
  stockFilter$ = this.stockFilterSubject.asObservable();

  // seleccionado para el modal
  selectedCount: ConteoStock | null = null;

  constructor() {
    this.counts$ = this.stockService.getAll();

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
            (c.usuario.nombreCompletoUsuario || '').toLowerCase().includes(q) ||
            c.id.toString().includes(q)
          );
        }

        return list.sort((a, b) => +new Date(b.fechaHoraAltaConteoStock) - +new Date(a.fechaHoraAltaConteoStock));
      })
    );
  }

  // llamado desde el template
  onStockFilterChange(value: string) {
    this.stockFilterSubject.next(value ?? '');
  }

  openDetailsModal(content: any, count: ConteoStock) {
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

  /**
 * Convierte un precio (que puede venir como string) a un número.
 * Es una función frágil, idealmente el backend debería enviar números.
 */
private parsePrice(precioRaw: any): number {
  let precio = 0;
  
  if (typeof precioRaw === 'string') {
    // Elimina símbolos no numéricos (ej: $ , espacios) y convierte coma a punto
    const cleaned = precioRaw.replace(/[^0-9\-,.\s]/g, '').trim().replace(',', '.');
    precio = parseFloat(cleaned) || 0;
  } else {
    precio = Number(precioRaw) || 0;
  }
  
  // Asegura que no sea NaN (Not a Number)
  return isNaN(precio) ? 0 : precio;
}

totalValue(): number {
  // Si no hay conteo seleccionado, el total es 0
  if (!this.selectedCount) {
    return 0;
  }

  // 1. Calcular total de Insumos
  const listaInsumos = this.selectedCount.csinsumosList || [];
  const totalInsumos = listaInsumos.reduce((acc, item) => {
    
    const cantidad = Number(item?.cantidadStockInsumo ?? 0);
    const precio = this.parsePrice(item?.insumo?.precioCompraInsumo);
    
    return acc + (cantidad * precio);
  }, 0);

  // 2. Calcular total de Productos
  const listaProductos = this.selectedCount.csproductosList || []; 
  const totalProductos = listaProductos.reduce((acc, item) => {
    
    const cantidad = Number(item?.cantidadStockProducto ?? 0); 
    const precio = this.parsePrice(item?.producto?.precioCostoProducto); 
    
    return acc + (cantidad * precio);
  }, 0);

  // 3. Sumar ambos totales
  const total = totalInsumos + totalProductos;

  // Redondear a 2 decimales
  return Math.round(total * 100) / 100;
}

}
