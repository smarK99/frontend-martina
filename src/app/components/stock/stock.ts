import { Component, inject, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth-service';
import { Observable, combineLatest, map, BehaviorSubject, switchMap, debounceTime, distinctUntilChanged, tap, catchError, of } from 'rxjs';
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
export class Stock implements OnInit {
  private fb = inject(FormBuilder);
  private stockService = inject(ConteoStockService);
  private modalService = inject(NgbModal);
  private productoService = inject(ProductoService);
  private insumoService = inject(InsumosService);
  private auth = inject(AuthService);
  private platformId = inject(PLATFORM_ID); //Soluciona problema de SSR con localStorage CANNOT GET /STOCK

  role$ = this.auth.role$;

  // --- VARIABLES DE PAGINACIÓN Y FILTROS ---
  currentPage = 0;
  pageSize = 15;
  totalElements = 0;
  totalPages = 0;
  isLoadingTabla = false;
  counts: ConteoStock[] = [];

  private refresh$ = new BehaviorSubject<void>(undefined);
  private stockFilterSubject = new BehaviorSubject<string>('');
  private dateFilterSubject = new BehaviorSubject<string>('');

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

  // seleccionado para el modal
  selectedCount: ConteoStock | null = null;

  //Variable modo edicion/creacion (De la rama de Santi)
  isEditMode: boolean = false;
  idConteoEditando: number | null = null;

  // ==========================================
  // ALERTA GENÉRICA (ÉXITO / ERROR)
  // ==========================================
  @ViewChild('alertaModal') alertaModal!: TemplateRef<any>;
  mensajeAlerta: string = '';
  tipoAlerta: 'exito' | 'error' = 'exito';

  constructor() {
    this.conteoForm = this.fb.group({
      idUsuario: [this.obtenerIdUsuarioLogueado(), Validators.required],
      descripcion: ['']
    });
  }

  ngOnInit() {
    //Cargar datos iniciales
    this.productoService.getAll().subscribe(data => this.productosDisponibles = data);
    this.insumoService.getAll().subscribe(data => this.insumosDisponibles = data);
    
    // Iniciar el listener de paginación
    this.configurarPaginacionReactiva();
  }

  // ==========================================
  // LÓGICA DE PAGINACIÓN REACTIVA COMBINADA
  // ==========================================
  configurarPaginacionReactiva() {
    combineLatest([
      this.stockFilterSubject.pipe(debounceTime(400), distinctUntilChanged()),
      this.dateFilterSubject.pipe(distinctUntilChanged()),
      this.refresh$,
      this.role$
    ]).pipe(
      tap(() => this.isLoadingTabla = true),
      switchMap(([termino, fecha, _, role]) => {
        
        // Seguridad: Si no tiene rol autorizado, corta la petición acá nomás.
        if (role !== 'ROLE_ADMIN' && role !== 'ROLE_DUENIO' && role !== 'ROLE_STOCK') {
          return of({ content: [], totalElements: 0, totalPages: 0 });
        }

        return this.stockService.buscarPaginadoYFiltrado(termino, fecha, this.currentPage, this.pageSize).pipe(
          catchError(error => {
            console.error('Error al traer el stock:', error);
            return of({ content: [], totalElements: 0, totalPages: 0 });
          })
        );
      })
    ).subscribe(response => {
      this.totalElements = response.totalElements || 0;
      this.totalPages = response.totalPages || 0;
      this.counts = response.content || [];
      this.isLoadingTabla = false;
    });
  }

  onStockFilterChange(value: string) {
    this.currentPage = 0;
    this.stockFilterSubject.next(value.trim());
  }

  onDateFilterChange(dateValue: string) {
    this.currentPage = 0;
    this.dateFilterSubject.next(dateValue);
  }

  cambiarPagina(nuevaPagina: number) {
    if (nuevaPagina >= 0 && nuevaPagina < this.totalPages) {
      this.currentPage = nuevaPagina;
      this.refresh$.next();
    }
  }

  // ==========================================
  // MANEJO DE MODALES Y ALERTAS
  // ==========================================
  mostrarAlerta(mensaje: string, tipo: 'exito' | 'error') {
    this.mensajeAlerta = mensaje;
    this.tipoAlerta = tipo;
    
    this.modalService.open(this.alertaModal, { centered: true, size: 'sm', backdrop: 'static' });

    if (tipo === 'exito') {
      setTimeout(() => {
        this.modalService.dismissAll();
      }, 2000);
    }
  }

  // --- ELIMINAR CONTEO ---
  conteoAEliminar: number | null = null;

  abrirModalEliminacion(id: number, modalTemplate: any) {
    this.conteoAEliminar = id;
    this.modalService.open(modalTemplate, { centered: true, size: 'sm' });
  }

  confirmarEliminacion() {
    if (this.conteoAEliminar) {
      this.stockService.delete(this.conteoAEliminar).subscribe({
        next: () => {
          this.modalService.dismissAll();
          this.conteoAEliminar = null;    
          this.refresh$.next();           
          this.mostrarAlerta('Conteo eliminado correctamente.', 'exito');
        },
        error: (err) => {
          console.error('Error al eliminar conteo', err);
          this.mostrarAlerta('Error al intentar eliminar el conteo.', 'error');
        }
      });
    }
  }

  // --- MODIFICAR CONTEO ---
  abrirModalEdicion(content: any, count: ConteoStock) {
    this.limpiarForm();
    this.isEditMode = true;
    this.idConteoEditando = count.id;

    this.conteoForm.patchValue({
      idUsuario: count.usuario?.idUsuario || this.obtenerIdUsuarioLogueado(),
    });

    if (count.csinsumosList) {
      this.insumosContados = count.csinsumosList.map(item => ({
        idInsumo: Number(item.insumo.id),
        nombre: item.insumo.nombreInsumo,
        cantidadStockInsumo: item.cantidadStockInsumo
      }));
    }

    if (count.csproductosList) {
      this.productosContados = count.csproductosList.map(item => ({
        idProducto: Number(item.producto.id),
        nombre: item.producto.nombreProducto,
        cantidadStockProducto: item.cantidadStockProducto
      }));
    }

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
      this.mostrarAlerta("Debes contar al menos un producto o insumo.", 'error');
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

    if (this.isEditMode && this.idConteoEditando) {
      this.stockService.update(this.idConteoEditando, payload).subscribe({
        next: () => {
          this.closeModal();
          this.refresh$.next();
          setTimeout(() => this.mostrarAlerta("Conteo modificado correctamente.", 'exito'), 300);
        },
        error: (err) => {
          console.error("Error al modificar conteo", err);
          this.mostrarAlerta("Error al modificar conteo", 'error');
        }
      });
    } else {
      this.stockService.create(payload).subscribe({
        next: () => {
          this.closeModal();
          this.refresh$.next();
          setTimeout(() => this.mostrarAlerta("Conteo registrado correctamente.", 'exito'), 300);
        },
        error: (err) => {
          console.error("Error al guardar conteo", err);
          this.mostrarAlerta("Error al guardar conteo", 'error');
        }
      });
    }
  }

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

  openDetailsModal(content: any, count: ConteoStock) {
    this.selectedCount = count;
    this.modalService.open(content, { centered: true, size: 'lg' });
  }

  formatId(id: number | undefined, width = 3): string {
    const s = (id ?? 0).toString();
    return s.padStart(width, '0');
  }

  // Obtiene el precio dinámico de la base de datos (incluso si la variable se llama distinto)
  obtenerPrecioProducto(prod: any): number {
    if (!prod) return 0;
    return this.parsePrice(prod.precioVentaProducto || prod.precioProducto || prod.precioVenta || 0);
  }

  private parsePrice(precioRaw: any): number {
    let precio = 0;
    if (typeof precioRaw === 'string') {
      const cleaned = precioRaw.replace(/[^0-9\-,.\s]/g, '').trim().replace(',', '.');
      precio = parseFloat(cleaned) || 0;
    } else {
      precio = Number(precioRaw) || 0;
    }
    return isNaN(precio) ? 0 : precio;
  }

  // ==========================================
  // AHORA CALCULA EL TOTAL DE INSUMOS + PRODUCTOS
  // ==========================================
  totalValue(c: ConteoStock): number {
    if (!c) return 0;

    const listaInsumos = c.csinsumosList || [];
    const totalInsumos = listaInsumos.reduce((acc, item) => {
      const cantidad = Number(item?.cantidadStockInsumo ?? 0);
      const precio = this.parsePrice(item?.insumo?.precioCompraInsumo);
      return acc + (cantidad * precio);
    }, 0);

    const listaProductos = c.csproductosList || [];
    const totalProductos = listaProductos.reduce((acc, item) => {
      const cantidad = Number(item?.cantidadStockProducto ?? 0);
      const precio = this.obtenerPrecioProducto(item?.producto);
      return acc + (cantidad * precio);
    }, 0);

    const total = totalInsumos + totalProductos;
    return Math.round(total * 100) / 100;
  }

  tieneAcceso(rolUsuario: string | null): boolean {
      if (!rolUsuario) return false;
      const rolLimpio = rolUsuario.toUpperCase().replace('ROLE_', ''); 
      return rolLimpio === 'ADMIN' || rolLimpio === 'EMPLEADO';
  }

  obtenerIdUsuarioLogueado(): number {
      if (isPlatformBrowser(this.platformId)) {
        const userId = localStorage.getItem('idUsuario');
        return userId ? Number(userId) : 2;
      }
      return 1;
  }

}