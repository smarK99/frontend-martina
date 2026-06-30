import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InsumosService {
  private baseUrl = environment.apiUrl;
  
  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/insumo`);
  }

  delete(id: any): Observable<any> {
    return this.http.delete(`${this.baseUrl}/insumo/borrar/${id}`);
  }

  create(insumo: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/insumo/crear`, insumo);
  }

  update(id: any, insumo: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/insumo/${id}`, insumo);
  }
}
