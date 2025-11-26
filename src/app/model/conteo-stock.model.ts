import { Producto, Insumo } from './producto.model';
import { Usuario } from './usuario.model';

export interface ConteoStockProducto {
  id?: number;
  cantidadStockProducto: number;
  producto: Producto;
}

export interface ConteoStockInsumo {
  id?: number;
  cantidadStockInsumo: number;
  insumo: Insumo;
}

export interface ConteoStock {
  id: number;
  fechaHoraAltaConteoStock: string;
  usuario: Usuario;
  csproductosList: ConteoStockProducto[];
  csinsumosList: ConteoStockInsumo[];
}
