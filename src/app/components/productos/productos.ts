import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductoGestion } from './producto-gestion/producto-gestion';
import { Categorias } from './categorias/categorias';
import { Insumos } from './insumos/insumos';
import { ActionBar } from "../action-bar/action-bar";
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth-service'; // <-- Importamos el motor de seguridad

type VistaActiva = 'PRODUCTOS' | 'CATEGORIAS' | 'INSUMOS' | 'PRECIOS_SUCURSAL';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, ProductoGestion, Categorias, Insumos, ActionBar, NgbModule],
  templateUrl: './productos.html',
  styleUrl: './productos.css'
})
export class Productos {

  // Inyectamos el servicio para saber quién está mirando la pantalla
  private authService = inject(AuthService);
  role$ = this.authService.role$;

  @ViewChild('productosGestion') productosGestion!: ProductoGestion;
  @ViewChild('categoriasGestion') categoriasGestion!: Categorias;
  @ViewChild('insumosGestion') insumosGestion!: Insumos;
  
  vistaActual: VistaActiva = 'PRODUCTOS';

  get tituloPantalla(): string {
    switch (this.vistaActual) {
      case 'PRODUCTOS': return 'Gestión de Productos';
      case 'CATEGORIAS': return 'Gestión de Categorías';
      case 'INSUMOS': return 'Gestión de Insumos';
      case 'PRECIOS_SUCURSAL': return 'Precios por Sucursal';
      default: return 'Gestión';
    }
  }

  get textoBotonNuevo(): string {
    switch (this.vistaActual) {
      case 'PRODUCTOS': return 'Nuevo Producto';
      case 'CATEGORIAS': return 'Nueva Categoría';
      case 'INSUMOS': return 'Nuevo Insumo';
      case 'PRECIOS_SUCURSAL': return 'Ajustar Precios';
      default: return 'Nuevo';
    }
  }

  cambiarVista(nuevaVista: VistaActiva) {
    this.vistaActual = nuevaVista;
  }

  ejecutarAccionPrincipal() {
    switch (this.vistaActual) {
      case 'PRODUCTOS':
        this.productosGestion?.abrirModalAltaProducto();
        break;
      case 'CATEGORIAS':
        this.categoriasGestion?.abrirModalAltaCategoria();
        break;
      case 'INSUMOS':
        this.insumosGestion?.abrirModalAltaInsumo();
        break;
    }
  }
}