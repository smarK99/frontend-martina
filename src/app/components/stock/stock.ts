import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth-service';
import { Observable, combineLatest, map, BehaviorSubject, switchMap } from 'rxjs'
import { ConteoStockService } from '../../services/conteo-stock-service';
import { ConteoStock } from '../../model/conteo-stock.model';
import { ActionBar } from '../action-bar/action-bar';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { InsumosService } from '../../services/insumos-service';
import { ProductoService } from '../../services/producto-service';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// Interfaces para el manejo interno del formulario
interface ItemProductoStock {
  idProducto: number;
  nombre: string;
  cantidadStockProducto: number;
}

interface ItemInsumoStock {
  idInsumo: number;
  nombre: string;
  cantidadStockInsumo: number;
}

@Component({
  selector: 'app-stock',
  imports: [CommonModule, NgbModule, ReactiveFormsModule, FormsModule, ActionBar],
  templateUrl: './stock.html',
  styleUrl: './stock.css'
})
export class Stock {
  private fb = inject(FormBuilder);
  private stockService = inject(ConteoStockService);
  private modalService = inject(NgbModal);
  private productoService = inject(ProductoService);
  private insumoService = inject(InsumosService);
  private auth = inject(AuthService);
  private platformId = inject(PLATFORM_ID); //Soluciona problema de SSR con localStorage CANNOT GET /STOCK

  role$ = this.auth.role$;
  visibleCounts$!: Observable<ConteoStock[]>;

  // Tabla Principal
  private refresh$ = new BehaviorSubject<void>(undefined);
  counts$!: Observable<ConteoStock[]>;

  // Formulario y Listas
  conteoForm: FormGroup;
  productosDisponibles: any[] = [];
  insumosDisponibles: any[] = [];

  // Listas temporales (Carritos)
  productosContados: ItemProductoStock[] = [];
  insumosContados: ItemInsumoStock[] = [];

  // Variables para ngModel (Inputs temporales)
  tempProductoId: number | null = null;
  tempProductoCant: number = 0;
  tempInsumoId: number | null = null;
  tempInsumoCant: number = 0;

  // filtro reactivo
  private stockFilterSubject = new BehaviorSubject<string>('');
  stockFilter$ = this.stockFilterSubject.asObservable();

  // seleccionado para el modal
  selectedCount: ConteoStock | null = null;

  //Variable modo edicion/creacion (De la rama de Santi)
  isEditMode: boolean = false;
  idConteoEditando: number | null = null;

  constructor() {
    // Conectamos la tabla al gatillo de refresco (Tu lógica reactiva)
    this.counts$ = this.refresh$.pipe(
      switchMap(() => this.stockService.getAll())
    );

    // Combina counts, role y filtro
    this.visibleCounts$ = combineLatest([this.counts$, this.role$, this.stockFilter$]).pipe(
      map(([counts, role, filter]) => {
        const q = (filter || '').trim().toLowerCase();

        // ESCUDO: Si no tiene rol o no es del equipo interno, devolver vacío (Tu seguridad)
        if (role !== 'ROLE_ADMIN' && role !== 'ROLE_DUENIO' && role !== 'ROLE_STOCK') {
          return [];
        }

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

    this.conteoForm = this.fb.group({
      idUsuario: [this.obtenerIdUsuarioLogueado(), Validators.required], // ID del empleado logueado (Mejora de Santi)
      descripcion: ['']
    });
  }

  ngOnInit() {
    //Cargar datos iniciales
    this.productoService.getAll().subscribe(data => this.productosDisponibles = data);
    this.insumoService.getAll().subscribe(data => this.insumosDisponibles = data);
  }

  // --- ELIMINAR CONTEO ---
  eliminarConteo(id: any) {
    const confirmar = confirm('¿Estás seguro de que deseas eliminar este conteo de stock?');
    if (confirmar) {
      this.stockService.delete(id).subscribe({
        next: () => {
          console.log('Conteo eliminado exitosamente');
          this.refresh$.next(); // Recargar la lista de conteos
        },
        error: (err) => {
          console.error('Error al eliminar conteo', err);
        }
      });
    }
  }

  // --- MODIFICAR CONTEO ---
  abrirModalEdicion(content: any, count: ConteoStock) {
    this.limpiarForm();
    this.isEditMode = true;
    this.idConteoEditando = count.id;

    // 1. Cargamos datos básicos al formulario (si aplica)
    this.conteoForm.patchValue({
      idUsuario: count.usuario?.idUsuario || this.obtenerIdUsuarioLogueado(),
      // Si tienes otros campos en el form, ponlos aquí
    });

    // 2. Precargamos el "carrito" de insumos
    if (count.csinsumosList) {
      this.insumosContados = count.csinsumosList.map(item => ({
        idInsumo: Number(item.insumo.id),
        nombre: item.insumo.nombreInsumo,
        cantidadStockInsumo: item.cantidadStockInsumo
      }));
    }

    // 3. Precargamos el "carrito" de productos 
    if (count.csproductosList) {
      this.productosContados = count.csproductosList.map(item => ({
        idProducto: Number(item.producto.id),
        nombre: item.producto.nombreProducto,
        cantidadStockProducto: item.cantidadStockProducto
      }));
    }

    // 4. Abrimos el mismo modal
    this.modalService.open(content, { size: 'lg', centered: true, backdrop: 'static' });
  }


  // --- LÓGICA PRODUCTOS ---
  agregarProducto() {
    if (!this.tempProductoId || this.tempProductoCant < 0) return;
    const prod = this.productosDisponibles.find(p => p.id == this.tempProductoId);
    if (prod) {
      this.productosContados.push({
        idProducto: prod.id,
        nombre: prod.nombreProducto,
        cantidadStockProducto: this.tempProductoCant
      });
      this.tempProductoId = null;
      this.tempProductoCant = 0;
    }
  }

  eliminarProducto(index: number) {
    this.productosContados.splice(index, 1);
  }

  // --- LÓGICA INSUMOS ---
  agregarInsumo() {
    if (!this.tempInsumoId || this.tempInsumoCant < 0) return;
    const ins = this.insumosDisponibles.find(i => i.id == this.tempInsumoId);
    if (ins) {
      this.insumosContados.push({
        idInsumo: ins.id,
        nombre: ins.nombreInsumo,
        cantidadStockInsumo: this.tempInsumoCant
      });
      this.tempInsumoId = null;
      this.tempInsumoCant = 0;
    }
  }

  eliminarInsumo(index: number) {
    this.insumosContados.splice(index, 1);
  }

  // --- GUARDADO ---
  guardarConteo() {
    if (this.productosContados.length === 0 && this.insumosContados.length === 0) {
      alert("Debes contar al menos un producto o insumo.");
      return;
    }

    const payload = {
      idUsuario: this.obtenerIdUsuarioLogueado(),
      productoDTOList: this.productosContados.map(p => ({
        idProducto: p.idProducto,
        cantidadStockProducto: p.cantidadStockProducto
      })),
      insumoDTOList: this.insumosContados.map(i => ({
        idInsumo: i.idInsumo,
        cantidadStockInsumo: i.cantidadStockInsumo
      }))
    };

    //Muestro el payload en consola para depuración
    console.log("Payload a enviar:", JSON.stringify(payload, null, 2));

    //Preguntamos si es edicion o creacion
    if (this.isEditMode && this.idConteoEditando) {
      // Si estamos editando, llamamos a UPDATE
      this.stockService.update(this.idConteoEditando, payload).subscribe({
        next: () => {
          this.closeModal();
          this.refresh$.next();
          setTimeout(() => alert("Conteo modificado correctamente."), 300);
        },
        error: (err) => console.error("Error al modificar conteo", err)
      });
    } else {
      // Si es nuevo, llamamos a CREATE
      this.stockService.create(payload).subscribe({
        next: () => {
          this.closeModal();
          this.refresh$.next();
          setTimeout(() => alert("Conteo registrado correctamente."), 300);
        },
        error: (err) => console.error("Error al guardar conteo", err)
      });
    }
  }

  // --- MODAL ---
  openModal(content: any) {
    this.limpiarForm();
    this.isEditMode = false;
    this.idConteoEditando = null;
    this.modalService.open(content, { size: 'lg', centered: true, backdrop: 'static' });
  }

  closeModal() {
    this.modalService.dismissAll();
  }

  private limpiarForm() {
    this.conteoForm.reset({ idUsuario: this.obtenerIdUsuarioLogueado(), descripcion: '' });
    this.productosContados = [];
    this.insumosContados = [];
    this.tempProductoId = null;
    this.tempInsumoId = null;
  }

  // llamado desde el template
  onStockFilterChange(value: string) {
    this.stockFilterSubject.next(value ?? '');
  }

  openDetailsModal(content: any, count: ConteoStock) {
    this.selectedCount = count;
    this.modalService.open(content, { centered: true, size: 'lg' });
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

totalValue(c: ConteoStock): number {
  // Si no hay conteo, el total es 0
  if (!c) {
    return 0;
  }

  // 1. Calcular total de Insumos
  const listaInsumos = c.csinsumosList || [];
  const totalInsumos = listaInsumos.reduce((acc, item) => {
    
    const cantidad = Number(item?.cantidadStockInsumo ?? 0);
    const precio = this.parsePrice(item?.insumo?.precioCompraInsumo);
    
    return acc + (cantidad * precio);
  }, 0);

  // 2. Sumar ambos totales
  const total = totalInsumos;

  // 4. Redondear a 2 decimales
  return Math.round(total * 100) / 100;
}

tieneAcceso(rolUsuario: string | null): boolean {
    if (!rolUsuario) return false;
    const rolLimpio = rolUsuario.toUpperCase().replace('ROLE_', ''); // Lo pasa a mayúsculas y le saca el ROLE_ si lo tiene
    return rolLimpio === 'ADMIN' || rolLimpio === 'EMPLEADO';
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