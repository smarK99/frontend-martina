import { Sucursal } from "./pedido.model";

export interface MovCtaCte {
  id?: number;
  fechaHora: Date;
  concepto?: string;
  importePedido: number;
  montoPagado: number;
  saldoRestante: number;
  sucursal: Sucursal;
}