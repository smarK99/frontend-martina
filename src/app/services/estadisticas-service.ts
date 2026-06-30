import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EstadisticasService {
  private baseUrl = environment.apiUrl;
  
  constructor(private http: HttpClient) {}

  getVtasPorSucursal(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/estadisticas/vtas_por_sucursal`);
  }

  getProdsMasVendidos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/estadisticas/prods_mas_vendidos`);
  }

  getRecaud30Dias(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/estadisticas/recaudacion_30dias`);
  }

  getRecaud7Dias(): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/estadisticas/recaudacion_7dias`);
  }
}
