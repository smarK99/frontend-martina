import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CategoriaService {
  private baseUrl = environment.apiUrl;
  
  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/categoria`);
  }

  delete(id: any): Observable<any> {
    return this.http.delete(`${this.baseUrl}/categoria/borrar/${id}`);
  }

  create(categoria: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/categoria/crear`, categoria);
  }

  update(id: any, categoria: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/categoria/${id}`, categoria);
  }

}

