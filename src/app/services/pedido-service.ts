import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../environment/environment';
import { HttpClient, HttpParams } from '@angular/common/http'; // <-- Agregamos HttpParams

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
  
  getPedidosDisponibles(): Observable<any>{
    return this.http.get(`${this.baseUrl}/pedido/disponibles_reparto`);
  }

  // --- NUEVO MÉTODO: Cancelar Pedido ---
  cancelarPedido(id: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/pedido/cancelar/${id}`, {});
  }

  // ==========================================
  // MÉTODOS DE PAGINACIÓN (Nuevos)
  // ==========================================
  
  getAllPaged(page: number, size: number): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<any>(`${this.baseUrl}/pedido/todos-paginados`, { params });
  }

  getBySucursalPaged(idSucursal: number, page: number, size: number): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<any>(`${this.baseUrl}/pedido/sucursal/${idSucursal}/paged`, { params });
  }


  // ==========================================
  // NUEVO: BÚSQUEDA COMBINADA (Texto + Sucursal)
  // ==========================================
  buscarPaginadoYFiltrado(termino: string, idSucursal: number, page: number, size: number): Observable<any> {
    const params = new HttpParams()
      .set('termino', termino)
      .set('idSucursal', idSucursal.toString())
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<any>(`${this.baseUrl}/pedido/busqueda-paginada`, { params });
  }

}