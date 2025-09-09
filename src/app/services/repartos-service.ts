import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface PedidoMini {
  id: number;
  fecha: string;
  clienteId: number;
  clienteNombre: string;
  total: number;
  estado: string;
}

export interface Reparto {
  id: number;
  fechaHoraInicio: string;
  fechaHoraFin?: string | null;
  repartidorId: number;
  repartidorNombre: string;
  estado: 'PENDIENTE' | 'EN_CURSO' | 'FINALIZADO';
  pedidos: PedidoMini[];
}

const MOCK_REPARTOS: Reparto[] = [
  {
    id: 301,
    fechaHoraInicio: '2025-09-07T08:00:00',
    fechaHoraFin: null,
    repartidorId: 21,
    repartidorNombre: 'Mateo García',
    estado: 'EN_CURSO',
    pedidos: [
      { id: 101, fecha: '2025-09-07T07:50:00', clienteId: 1, clienteNombre: 'Juan Pérez', total: 8200, estado: 'ENVIADO' },
      { id: 104, fecha: '2025-09-07T07:55:00', clienteId: 2, clienteNombre: 'María García', total: 9900, estado: 'ENVIADO' }
    ]
  },
  {
    id: 302,
    fechaHoraInicio: '2025-09-06T14:00:00',
    fechaHoraFin: '2025-09-06T15:30:00',
    repartidorId: 22,
    repartidorNombre: 'Lucas Díaz',
    estado: 'FINALIZADO',
    pedidos: [
      { id: 103, fecha: '2025-09-06T13:50:00', clienteId: 3, clienteNombre: 'ACME S.A.', total: 21400, estado: 'ENTREGADO' }
    ]
  },
  {
    id: 303,
    fechaHoraInicio: '2025-09-08T09:00:00',
    fechaHoraFin: null,
    repartidorId: 21,
    repartidorNombre: 'Mateo García',
    estado: 'PENDIENTE',
    pedidos: [
      { id: 105, fecha: '2025-09-08T08:45:00', clienteId: 4, clienteNombre: 'Lucía Moreno', total: 7200, estado: 'PENDIENTE' },
      { id: 106, fecha: '2025-09-08T08:50:00', clienteId: 5, clienteNombre: 'Pedro López', total: 4300, estado: 'PENDIENTE' }
    ]
  }
];


@Injectable({
  providedIn: 'root'
})
export class RepartosService {
  
  constructor() {}

  getAll(): Observable<Reparto[]> {
    return of(MOCK_REPARTOS).pipe(delay(200));
  }

}
