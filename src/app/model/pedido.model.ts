import { Producto } from './producto.model';

export interface Sucursal {
  id?: number;
  nombreSucursal: string;
  descripcionSucursal: string;
  direccionSucursal: string;
  fechaHoraAltaSucursal: string;
  fechaHoraBajaSucursal: string | null;
}

export interface SucursalProducto {
  id?: number;
  precioSucursalProducto: number;
  fechaHoraUltimaModificacion: string;
  producto: Producto;
}

export interface MetodoPago {
  id?: number;
  nombreMetodoPago: string;
  fechaHoraAltaMetodoPago: string;
  fechaHoraBajaMetodoPago: string | null;
}

export interface EstadoPedido {
  id?: number;
  nombreEstadoPedido: string;
  descripcionEstadoPedido: string;
  fechaHoraAltaEstadoPedido: string;
  fechaHoraBajaEstadoPedido: string | null;
}

export interface DetallePedido {
  id?: number;
  cantidadProductoPedido: number;
  subtotalDetallePedido: number;
  producto: Producto;
}

export interface Pedido {
  id: number;
  descipcionPedido: string;
  fechaHoraAltaPedido: string;
  fechaHoraBajaPedido?: string | null;
  fechaHoraEntregaPedido?: string | null;
  importeTotalPedido: number;
  sucursal: Sucursal;
  metodoPago: MetodoPago;
  estadoPedido: EstadoPedido;
  detallePedidoList: DetallePedido[];
}
