import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { Reparto } from '../model/reparto.model';

@Injectable({
  providedIn: 'root'
})
export class RepartosService {
  
  private baseUrl = `${environment.apiUrl}/reparto`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Reparto[]> {
    return this.http.get<Reparto[]>(`${this.baseUrl}/getAll`);
  }

  create(repartoDTO: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/crear`, repartoDTO);
  }

  asignarPedidos(repartoId: number, pedidosIds: number[]): Observable<any> {
    const payload = pedidosIds.map(id => ({ idPedido: id }));
    return this.http.post(`${this.baseUrl}/agregar_pedidos/${repartoId}`, payload);
  }

  cargarGasto(gastoDTO: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/cargar_gasto`, gastoDTO);
  }

  entregarPedido(entregaDTO: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/entregar_pedido`, entregaDTO);
  }

  finalizarReparto(repartoId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/finalizar/${repartoId}`, {});
  }

  realizarRendicion(rendicionDTO: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/realizar_rendicion`, rendicionDTO);
  }

}
