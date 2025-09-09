export interface ProductoInsumo {
  id?: number;
  cantidadInsumo: number;
  insumo: {
    id: number;
    nombreInsumo: string;
    precioCompraInsumo?: number;
    fechaHoraAltaInsumo?: string; // ISO string del backend
  };
}

export interface Producto {
  id: number;
  nombreProducto: string;
  descripcion?: string;
  precio?: number;
  imagenUrl?: string; // URL a /assets/... o URL absoluta desde backend
  productoInsumoList?: ProductoInsumo[];
  fechaHoraAltaProducto?: string;
  fechaHoraBajaProducto?: string | null;
}