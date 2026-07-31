import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Producto } from '../model/producto.model';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {

  private baseUrl = `${environment.apiUrl}/producto`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.baseUrl);
  }
  
  create(productoDTO: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/crear`, productoDTO);
  }

  // Agregamos el método para la baja lógica
  delete(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/borrar/${id}`);
  }
}