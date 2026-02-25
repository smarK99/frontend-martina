import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { Pedido } from '../model/pedido.model';


@Injectable({
  providedIn: 'root'
})
export class PedidoService {

  private baseUrl = environment.apiUrl;
  
  constructor(private http: HttpClient) {}

  getAll(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.baseUrl}/pedido/getAll`);
  }

  getOne(id: number): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.baseUrl}/pedido/${id}`);
  }

  

}
