import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
}
