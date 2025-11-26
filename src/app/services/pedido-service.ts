import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { Pedido } from '../model/pedido.model';

// export interface Pedido {
//   id: number;
//   fecha: string; // ISO date string desde backend
//   clienteId: number;
//   clienteNombre: string;
//   total: number;
//   estado: string;
// }

// const MOCK_PEDIDOS: Pedido[] = [
//   { id: 101, fecha: '2025-08-20T10:00:00', clienteId: 1, clienteNombre: 'Juan Pérez', total: 8200, estado: 'ENTREGADO' },
//   { id: 102, fecha: '2025-08-21T11:30:00', clienteId: 2, clienteNombre: 'María García', total: 5200, estado: 'EN PREPARACIÓN' },
//   { id: 103, fecha: '2025-08-21T12:15:00', clienteId: 3, clienteNombre: 'ACME S.A.', total: 21400, estado: 'ENVIADO' },
//   { id: 104, fecha: '2025-08-22T09:45:00', clienteId: 1, clienteNombre: 'Juan Pérez', total: 9900, estado: 'ENTREGADO' }
// ];


@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  // getAll(): Observable<Pedido[]> {
  //   return of(MOCK_PEDIDOS).pipe(delay(200));
  // }
  private baseUrl = `${environment.apiUrl}/pedido/getAll`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(this.baseUrl);
  }

}
