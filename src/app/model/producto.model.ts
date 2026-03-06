export interface Categoria {
  id?: number;
  nombreCategoria: string;
  descripcionCategoria: string;
  fechaHoraAltaCategoria?: string;
  fechaHoraBajaCategoria?: string | null;
}

// export interface UnidadMedida {
//   id?: number;
//   nombreUnidadMedida: string;
//   fechaHoraAltaUnidadMedida?: string;
//   fechaHoraBajaUnidadMedida?: string | null;
// }

export interface Insumo {
  id?: number;
  nombreInsumo: string;
  descipcionInsumo: string;
  precioCompraInsumo: number;
  fechaHoraAltaInsumo?: string;
  fechaHoraBajaInsumo?: string | null;
}

export interface Producto {
  id?: number;
  nombreProducto: string;
  descripcionProducto: string;
  fechaHoraAltaProducto?: string;
  fechaHoraBajaProducto?: string | null;
  categoria?: Categoria;
  productoInsumoList?: ProductoInsumo[];
}

export interface ProductoInsumo {
  id?: number;
  cantidadInsumo: number;
  insumo: Insumo;
}