import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Sucursal } from '../model/pedido.model';

@Injectable({
  providedIn: 'root'
})
export class SucursalService {
  
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Método para obtener todas las sucursales con fechaHoraBajaSucursal nula (sucursales activas)
  getAll():Observable<Sucursal[]> {
    return this.http.get<Sucursal[]>(`${this.baseUrl}/sucursal`);
  }

}
