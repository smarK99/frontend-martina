import { Usuario } from './usuario.model';

export interface Gasto {
  idGasto?: number;
  nombreGasto: string;
  montoGasto: number;
  rendicion: Rendicion;
}

export interface Rendicion {
  id?: number;
  montoRecaudado: number;
  montoRendido: number;
  diferenciaMontos: number;
  usuario: Usuario;
  gastoList?: Gasto[] | null;
}

export interface EstadoReparto{
  id?: number;
  nombreEstadoReparto: string;
  descripcionEstadoReparto: string;
  fechaHoraAltaEstadoReparto?: string;
  fechaHoraBajaEstadoReparto?: string | null;
}

export interface Reparto{
    id: number;
    nombreReparto: string;
    descripcionReparto: string;
    fechaHoraFinReparto?: string | null;
    fechaHoraInicioReparto: string;
    usuario: Usuario;
    rendicion: Rendicion;
    estadoReparto: EstadoReparto;
    pedidosList: any[];
}