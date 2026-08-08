import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductoGestion } from './producto-gestion/producto-gestion';
import { Categorias } from './categorias/categorias';
import { Insumos } from './insumos/insumos';
import { ActionBar } from "../action-bar/action-bar";
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth-service'; 
import { AsignarPrecios } from "./asignar-precios/asignar-precios"; 

// Unificamos las sucursales y sus precios en una sola vista
type VistaActiva = 'PRODUCTOS' | 'CATEGORIAS' | 'INSUMOS' | 'SUCURSALES';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, ProductoGestion, Categorias, Insumos, ActionBar, NgbModule, AsignarPrecios],
  templateUrl: './productos.html',
  styleUrl: './productos.css'
})
export class Productos {

  private authService = inject(AuthService);
  role$ = this.authService.role$;

  @ViewChild('productosGestion') productosGestion!: ProductoGestion;
  @ViewChild('categoriasGestion') categoriasGestion!: Categorias;
  @ViewChild('insumosGestion') insumosGestion!: Insumos;
  
  // Reutilizamos tu componente AsignarPrecios, pero ahora orquesta todo el ABM de sucursales
  @ViewChild('sucursalesGestion') sucursalesGestion!: AsignarPrecios; 
  
  vistaActual: VistaActiva = 'PRODUCTOS';

  get tituloPantalla(): string {
    switch (this.vistaActual) {
      case 'PRODUCTOS': return 'Gestión de Productos';
      case 'CATEGORIAS': return 'Gestión de Categorías';
      case 'INSUMOS': return 'Gestión de Insumos';
      case 'SUCURSALES': return 'Sucursales y Precios'; // Título unificado
      default: return 'Gestión';
    }
  }

  get textoBotonNuevo(): string {
    switch (this.vistaActual) {
      case 'PRODUCTOS': return 'Nuevo Producto';
      case 'CATEGORIAS': return 'Nueva Categoría';
      case 'INSUMOS': return 'Nuevo Insumo';
      case 'SUCURSALES': return 'Nueva Sucursal'; // Acción principal unificada
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
      case 'SUCURSALES':
        // Llamará al modal de alta dentro de asignar-precios
        this.sucursalesGestion?.abrirModalAlta(); 
        break;
    }
  }

  getImagenProducto(nombre: string): string {
    const nombreLimpio = nombre.toLowerCase();

    if (nombreLimpio.includes('crudo')) {
      return '/assets/jcrudo.jpg';
    } 
    if (nombreLimpio.includes('salame')) {
      return '/assets/salame-verdura.jpg'; 
    } 
    if (nombreLimpio.includes('cocido') || nombreLimpio.includes('jyq')) {
      return '/assets/jcocido.jpg';
    }

    return '/assets/martina-logo.png';
  }
}