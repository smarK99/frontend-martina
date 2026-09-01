import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Sucursal } from '../model/pedido.model'; // Ojo con esta ruta, asegurate de que sea la correcta

@Injectable({
  providedIn: 'root'
})
export class SucursalService {
  
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Obtener todas las sucursales activas
  getAll(): Observable<Sucursal[]> {
    return this.http.get<Sucursal[]>(`${this.baseUrl}/sucursal`);
  }

  // Crear una nueva sucursal
  create(sucursalData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/sucursal/crear`, sucursalData);
  }

  // Actualizar una sucursal existente
  update(id: number, sucursalData: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/sucursal/modificar/${id}`, sucursalData);
  }

  // Borrar lógicamente una sucursal
  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/sucursal/borrar/${id}`);
  }
}