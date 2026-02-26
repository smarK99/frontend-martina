import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {

  private baseUrl = environment.apiUrl;
  
  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/pedido/getAll`);
  }

  getOne(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/pedido/${id}`);
  }

  create(pedidoDTO: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/pedido/realizar_pedido`, pedidoDTO);
  }
  

}
