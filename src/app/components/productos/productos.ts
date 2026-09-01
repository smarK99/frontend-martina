import { Component, ViewChild, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs'; // <-- IMPORTAMOS SUBSCRIPTION
import { ProductoGestion } from './producto-gestion/producto-gestion';
import { Categorias } from './categorias/categorias';
import { Insumos } from './insumos/insumos';
import { ActionBar } from "../action-bar/action-bar";
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth-service'; 
import { AsignarPrecios } from "./asignar-precios/asignar-precios"; 

type VistaActiva = 'PRODUCTOS' | 'CATEGORIAS' | 'INSUMOS' | 'SUCURSALES';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, ProductoGestion, Categorias, Insumos, ActionBar, NgbModule, AsignarPrecios],
  templateUrl: './productos.html',
  styleUrl: './productos.css'
})
export class Productos implements OnInit, OnDestroy { // <-- IMPLEMENTAMOS INTERFACES

  private authService = inject(AuthService);
  role$ = this.authService.role$;
  
  private roleSub!: Subscription; // <-- VARIABLE PARA LA SUSCRIPCIÓN

  @ViewChild('productosGestion') productosGestion!: ProductoGestion;
  @ViewChild('categoriasGestion') categoriasGestion!: Categorias;
  @ViewChild('insumosGestion') insumosGestion!: Insumos;
  @ViewChild('sucursalesGestion') sucursalesGestion!: AsignarPrecios; 
  
  vistaActual: VistaActiva = 'PRODUCTOS';

  ngOnInit() {
    // Escuchamos en tiempo real si el rol cambia
    this.roleSub = this.role$.subscribe(role => {
      // Si se desloguea o entra con un rol sin permisos administrativos, reseteamos la vista
      if (role !== 'ROLE_ADMIN' && role !== 'ROLE_DUENIO') {
        this.vistaActual = 'PRODUCTOS';
      }
    });
  }

  ngOnDestroy() {
    // Limpiamos la suscripción al destruir el componente para evitar fugas de memoria
    this.roleSub?.unsubscribe();
  }

  get tituloPantalla(): string {
    switch (this.vistaActual) {
      case 'PRODUCTOS': return 'Gestión de Productos';
      case 'CATEGORIAS': return 'Gestión de Categorías';
      case 'INSUMOS': return 'Gestión de Insumos';
      case 'SUCURSALES': return 'Sucursales y Precios'; 
      default: return 'Gestión';
    }
  }

  get textoBotonNuevo(): string {
    switch (this.vistaActual) {
      case 'PRODUCTOS': return 'Nuevo Producto';
      case 'CATEGORIAS': return 'Nueva Categoría';
      case 'INSUMOS': return 'Nuevo Insumo';
      case 'SUCURSALES': return 'Nueva Sucursal'; 
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