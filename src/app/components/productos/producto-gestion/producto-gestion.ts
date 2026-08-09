import { Component, inject, TemplateRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject, switchMap } from 'rxjs';

import { ProductoService } from '../../../services/producto-service';
import { CategoriaService } from '../../../services/categoria-service';
import { InsumosService } from '../../../services/insumos-service';
import { AuthService } from '../../../services/auth-service'; 
import { Producto } from '../../../model/producto.model';

interface ItemInsumoReceta {
  insumoId: number;
  nombreInsumo: string;
  cantidad: number;
}

@Component({
  selector: 'app-producto-gestion',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NgbModule],
  templateUrl: './producto-gestion.html',
  styleUrl: './producto-gestion.css'
})
export class ProductoGestion implements OnInit {
  
  // --- INYECCIONES DE SERVICIOS ---
  private categoriaService = inject(CategoriaService);
  private insumoService = inject(InsumosService);
  private authService = inject(AuthService); 
  private productoService = inject(ProductoService);
  private fb = inject(FormBuilder);
  private modalService = inject(NgbModal);

  role$ = this.authService.role$;

  @ViewChild('altaProductoModal') modalAltaProducto!: TemplateRef<any>;

  // --- VARIABLES DE DATOS Y FILTROS ---
  productosOriginales: Producto[] = [];
  productosFiltrados: Producto[] = [];
  insumosDisponibles: any[] = [];
  categoriasDisponibles: any[] = [];
  insumosDelProducto: ItemInsumoReceta[] = [];

  filtroCategoria: string | number = 'TODAS';
  filtroTexto: string = '';

  tempInsumoId: number | null = null;
  tempCantidadInsumo: number = 1;

  productoForm: FormGroup;
  private refresh$ = new BehaviorSubject<void>(undefined);

  // --- VARIABLES ALERTA Y BAJA ---
  productoABajar: number | null = null;
  @ViewChild('alertaModal') alertaModal!: TemplateRef<any>;
  mensajeAlerta: string = '';
  tipoAlerta: 'exito' | 'error' = 'exito';

  constructor() {
    this.productoForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      categoria: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadData();
    
    // Suscripción reactiva para cargar y filtrar productos localmente
    this.refresh$.pipe(
      switchMap(() => this.productoService.getAll())
    ).subscribe({
      next: (data) => {
        this.productosOriginales = data;
        this.aplicarFiltrosCombinados();
      },
      error: (err) => console.error('Error al cargar productos:', err)
    });
  }

  loadData(): void {
    this.categoriaService.getAll().subscribe(data => { this.categoriasDisponibles = data });
    this.insumoService.getAll().subscribe(data => { this.insumosDisponibles = data });
  }

  // ==========================================
  // LÓGICA DE FILTRADO COMBINADO
  // ==========================================
  aplicarFiltrosCombinados() {
    let temp = this.productosOriginales;

    // 1. Filtro por Categoría
    if (this.filtroCategoria !== 'TODAS') {
      temp = temp.filter(p => p.categoria?.id == this.filtroCategoria);
    }

    // 2. Filtro por Texto
    if (this.filtroTexto) {
      const q = this.filtroTexto.toLowerCase().trim();
      temp = temp.filter(p =>
        (p.id?.toString() || '').includes(q) ||
        (p.nombreProducto || '').toLowerCase().includes(q) ||
        (p.descripcionProducto || '').toLowerCase().includes(q)
      );
    }

    this.productosFiltrados = temp;
  }

  onFiltrarCategoria(event: any) {
    this.filtroCategoria = event.target.value;
    this.aplicarFiltrosCombinados();
  }

  onBuscarTexto(termino: string) {
    this.filtroTexto = termino;
    this.aplicarFiltrosCombinados();
  }

  // ==========================================
  // LÓGICA DE ALERTA GENÉRICA
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

  // ==========================================
  // LÓGICA DE RECETA (INSUMOS)
  // ==========================================
  agregarInsumo() {
    if (!this.tempInsumoId || this.tempCantidadInsumo <= 0) return;

    const insumoSeleccionado = this.insumosDisponibles.find(i => i.codInsumo == this.tempInsumoId || i.id == this.tempInsumoId);

    if (insumoSeleccionado) {
      const existente = this.insumosDelProducto.find(item => item.insumoId === (insumoSeleccionado.codInsumo || insumoSeleccionado.id));

      if (existente) {
        existente.cantidad += this.tempCantidadInsumo;
      } else {
        this.insumosDelProducto.push({
          insumoId: insumoSeleccionado.codInsumo || insumoSeleccionado.id,
          nombreInsumo: insumoSeleccionado.nombreInsumo,
          cantidad: this.tempCantidadInsumo
        });
      }

      this.tempInsumoId = null;
      this.tempCantidadInsumo = 1;
    }
  }

  eliminarInsumo(index: number) {
    this.insumosDelProducto.splice(index, 1);
  }

  // ==========================================
  // ALTA DE PRODUCTO
  // ==========================================
  abrirModalAltaProducto() {
    const modalRef = this.modalService.open(this.modalAltaProducto, { size: 'lg', centered: true });

    modalRef.result.then(
      () => { this.limpiarFormularioAlta(); }, 
      () => { this.limpiarFormularioAlta(); }  
    );
  }

  closeModal() {
    this.modalService.dismissAll(); 
    this.productoForm.reset(); 
  }

  private limpiarFormularioAlta() {
    this.productoForm.reset({
      nombre: '',
      categoria: '',
      descripcion: ''
    });
    this.insumosDelProducto = [];
    this.tempInsumoId = null;
    this.tempCantidadInsumo = 1;
  }

  guardarProducto() {
    if (this.productoForm.valid) {
      const payload = {
        nombreProducto: this.productoForm.value.nombre,
        descripcionProducto: this.productoForm.value.descripcion || '',
        idCategoria: Number(this.productoForm.value.categoria),
        apiList: this.insumosDelProducto.map(item => ({
          idInsumo: item.insumoId,
          cantidadI: item.cantidad
        }))
      };

      this.productoService.create(payload).subscribe({
        next: (respuesta) => {
          this.closeModal();
          this.refresh$.next();
          setTimeout(() => {
            this.mostrarAlerta('¡Producto creado con éxito!', 'exito');
          }, 300);
        },
        error: (err) => {
          console.error('Error al intentar crear el producto:', err);
          this.mostrarAlerta('Hubo un error al guardar el producto.', 'error');
        }
      });

    } else {
      this.productoForm.markAllAsTouched();
      this.mostrarAlerta('Completá los campos obligatorios del formulario.', 'error');
    }
  }

  // ==========================================
  // BAJA DE PRODUCTOS
  // ==========================================
  abrirModalBaja(id: number | undefined, modalTemplate: any) {
    if (!id) return; 
    this.productoABajar = id;
    this.modalService.open(modalTemplate, { centered: true, size: 'sm' });
  }

  confirmarBaja() {
    if (this.productoABajar) {
      this.productoService.delete(this.productoABajar).subscribe({
        next: () => {
          this.modalService.dismissAll();
          this.productoABajar = null;
          this.refresh$.next(); 
          setTimeout(() => this.mostrarAlerta('Producto eliminado exitosamente.', 'exito'), 300);
        },
        error: (err) => {
          console.error(err);
          this.mostrarAlerta('Error al eliminar el producto.', 'error');
        }
      });
    }
  }

  // ==========================================
  // HELPER PARA IMÁGENES DINÁMICAS
  // ==========================================
  getImagenProducto(nombreProducto: string): string {
    if (!nombreProducto) return '/assets/martina-logo.png';
    
    const nombre = nombreProducto.toLowerCase();
    
    if (nombre.includes('cocido')) return '/assets/jcocido.jpg';
    if (nombre.includes('crudo')) return '/assets/jcrudo.jpg';
    if (nombre.includes('salame')) return '/assets/salame-verdura.jpg';
    if (nombre.includes('jyq')) return '/assets/jcocido.jpg';
    
    return '/assets/martina-logo.png';
  }
}