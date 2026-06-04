import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductoGestion } from './producto-gestion/producto-gestion';
import { Categorias } from './categorias/categorias';
import { Insumos } from './insumos/insumos';
import { ActionBar } from "../action-bar/action-bar";
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

// Definimos los tipos de vistas posibles
type VistaActiva = 'PRODUCTOS' | 'CATEGORIAS' | 'INSUMOS' | 'PRECIOS_SUCURSAL';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, ProductoGestion, Categorias, Insumos, ActionBar, NgbModule],
  templateUrl: './productos.html',
  styleUrl: './productos.css'
})

export class Productos {

  //Declaracion de los hijos
  @ViewChild('productosGestion') productosGestion!: ProductoGestion;
  @ViewChild('categoriasGestion') categoriasGestion!: Categorias;
  @ViewChild('insumosGestion') insumosGestion!: Insumos;
  
  // Por defecto, arrancamos viendo los sándwiches
  vistaActual: VistaActiva = 'PRODUCTOS';

  // --- GETTERS DINÁMICOS PARA LA UI ---
  
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

  // --- MÉTODOS DE ACCIÓN ---

  cambiarVista(nuevaVista: VistaActiva) {
    this.vistaActual = nuevaVista;
  }

  ejecutarAccionPrincipal() {
    // Aquí decides qué modal abrir según dónde esté parado el usuario
    switch (this.vistaActual) {
      case 'PRODUCTOS':
        this.productosGestion?.abrirModalAltaProducto();
        console.log('Abriendo modal producto...');
        break;
      case 'CATEGORIAS':
        //this.categoriasGestion?.openModal('nuevaCategoria');
        console.log('Abriendo modal categoría...');
        break;
      case 'INSUMOS':
        //this.insumosGestion?.openModal('nuevoInsumo');
        console.log('Abriendo modal insumo...');
        break;
    }
  }
}