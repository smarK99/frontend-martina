import { Component, inject, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductoService } from '../../../services/producto-service';
import { BehaviorSubject, Observable, switchMap } from 'rxjs';
import { Producto } from '../../../model/producto.model';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CategoriaService } from '../../../services/categoria-service';
import { InsumosService } from '../../../services/insumos-service';
import { AuthService } from '../../../services/auth-service'; // <-- Importamos la seguridad

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
export class ProductoGestion {
  
  // --- INYECCIONES DE SERVICIOS ---
  private categoriaService = inject(CategoriaService);
  private insumoService = inject(InsumosService);
  private authService = inject(AuthService); // <-- Inyectamos el patovica

  // Exponemos el rol para que el HTML pueda leerlo
  role$ = this.authService.role$;

  @ViewChild('altaProductoModal') modalAltaProducto!: TemplateRef<any>;

  productos: Producto[] = [];
  insumosDisponibles: any[] = [];
  categoriasDisponibles: any[] = [];
  insumosDelProducto: ItemInsumoReceta[] = [];

  tempInsumoId: number | null = null;
  tempCantidadInsumo: number = 1;

  isModalOpen = false;
  productoForm: FormGroup;

  private refresh$ = new BehaviorSubject<void>(undefined);
  productos$!: Observable<any[]>;

  constructor(private productoService: ProductoService, private fb: FormBuilder, private modalService: NgbModal) {
    this.productoForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      categoria: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadData();
    this.productos$ = this.refresh$.pipe(
      switchMap(() => this.productoService.getAll())
    );
  }

  loadData(): void {
    this.categoriaService.getAll().subscribe(data => { this.categoriasDisponibles = data })
    this.insumoService.getAll().subscribe(data => { this.insumosDisponibles = data });
  }

  // --- MODAL LÓGICA ---
  agregarInsumo() {
    if (!this.tempInsumoId || this.tempCantidadInsumo <= 0) return;

    // Buscamos el insumo completo (asumiendo que tu ID se llama codInsumo o id)
    const insumoSeleccionado = this.insumosDisponibles.find(i => i.codInsumo == this.tempInsumoId || i.id == this.tempInsumoId);

    if (insumoSeleccionado) {
      // Verificamos si ya está en la lista para sumar cantidad en lugar de duplicar
      const existente = this.insumosDelProducto.find(item => item.insumoId === insumoSeleccionado.codInsumo);

      if (existente) {
        existente.cantidad += this.tempCantidadInsumo;
      } else {
        this.insumosDelProducto.push({
          insumoId: insumoSeleccionado.codInsumo || insumoSeleccionado.id,
          nombreInsumo: insumoSeleccionado.nombreInsumo,
          cantidad: this.tempCantidadInsumo
        });
      }

      // Reseteamos los inputs
      this.tempInsumoId = null;
      this.tempCantidadInsumo = 1;
    }
  }

  eliminarInsumo(index: number) {
    this.insumosDelProducto.splice(index, 1);
  }

  // 3. RECIBIR EL TEMPLATE Y ABRIRLO CON EL SERVICIO
  abrirModalAltaProducto() {
    const modalRef = this.modalService.open(this.modalAltaProducto, { size: 'lg', centered: true });

    modalRef.result.then(
      (result) => { this.limpiarFormularioAlta(); }, // Se cierra correctamente
      (reason) => { this.limpiarFormularioAlta(); }  // Se descarta (clic afuera, ESC)
    );
  }

  // 4. USAR EL SERVICIO PARA CERRAR TODO
  closeModal() {
    this.modalService.dismissAll(); // Cierra los modales activos
    this.productoForm.reset(); // Limpia el formulario
  }

  // Se encarga de vaciar absolutamente todo
  private limpiarFormularioAlta() {
    // 1. Resetea los campos de texto y selects del FormGroup
    this.productoForm.reset({
      nombre: '',
      categoria: '',
      descripcion: ''
    });
    
    // 2. Vacia la tabla de la receta
    this.insumosDelProducto = [];
    
    // 3. Vacia los campos temporales de selección de insumo
    this.tempInsumoId = null;
    this.tempCantidadInsumo = 1;
  }

  guardarProducto() {
    // 1. Verificamos que los campos obligatorios del form estén llenos
    if (this.productoForm.valid) {
      // 2. Armamos el DTO
      const payload = {
        nombreProducto: this.productoForm.value.nombre,
        descripcionProducto: this.productoForm.value.descripcion || '',
        idCategoria: Number(this.productoForm.value.categoria),

        // Mapeamos el arreglo de insumos a la estructura del backend
        apiList: this.insumosDelProducto.map(item => ({
          idInsumo: item.insumoId,
          cantidadI: item.cantidad
        }))
      };

      console.log('Enviando DTO de Producto al Backend:', payload);

      // 3. Enviamos al backend
      this.productoService.create(payload).subscribe({
        next: (respuesta) => {
          console.log('Producto creado exitosamente:', respuesta);

          // 4. Cerramos el modal (esto disparará la limpieza)
          this.closeModal();

          //Recargar la tabla de productos para que aparezca el nuevo producto sin necesidad de recargar la página
          this.refresh$.next();

          // 5. Alert con pequeño retraso para no bloquear la animación de cierre
          setTimeout(() => {
            alert('¡Producto creado con éxito!');
          }, 300);

          
        },
        error: (err) => {
          console.error('Error al intentar crear el producto:', err);
          alert('Hubo un error al guardar el producto. Revisa la consola para más detalles.');
        }
      });

    } else {
      // Si el form es inválido, marcamos todo para que los inputs se pongan en rojo
      this.productoForm.markAllAsTouched();
      alert('Por favor, completa todos los campos obligatorios del formulario principal.');
    }
  }


  // --- HELPER PARA IMÁGENES DINÁMICAS ---
  getImagenProducto(nombreProducto: string): string {
    if (!nombreProducto) return '/assets/martina-logo.png';
    
    const nombre = nombreProducto.toLowerCase();
    
    if (nombre.includes('cocido')) {
      return '/assets/jcocido.jpg';
    } else if (nombre.includes('crudo')) {
      return '/assets/jcrudo.jpg';
    } else if (nombre.includes('salame')) {
      return '/assets/salame-verdura.jpg';
    } else if (nombre.includes('jyq')) {
      return '/assets/jcocido.jpg';
    }
    
    // Fallback: Si no es ninguno de los 3, muestra el logo por defecto
    return '/assets/martina-logo.png';
  }


}
