import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class MovCtaCteService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Traer el historial completo de un cliente
  obtenerHistorialPorSucursal(idSucursal: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/movimientos/sucursal/${idSucursal}`);
  }

  // Registrar un pago manual
  registrarMovimiento(movimiento: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/movimientos/registrar_mov`, movimiento);
  }
}
