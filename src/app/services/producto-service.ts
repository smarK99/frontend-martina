import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Producto } from '../model/producto.model';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  // constructor(private http: HttpClient) {}

  // // Trae todos los productos (posible paginación opcional)
  // getAll(params?: { page?: number; size?: number; search?: string }): Observable<Producto[]> {
  //   let httpParams = new HttpParams();
  //   if (params?.page != null) httpParams = httpParams.set('page', String(params.page));
  //   if (params?.size != null) httpParams = httpParams.set('size', String(params.size));
  //   if (params?.search) httpParams = httpParams.set('search', params.search);

  //   return this.http.get<Producto[]>(`${this.base}/productos`, { params: httpParams }).pipe(
  //     // si necesitás mapear/parsear fechas -> hacerlo aquí
  //     map(list => list.map(p => ({
  //       ...p,
  //       // opcional: parse ISO string a string formateada o dejar tal cual
  //       fechaHoraAltaProducto: p.fechaHoraAltaProducto ?? null
  //     } as Producto))),
  //     catchError(err => {
  //       console.error('Error al traer productos', err);
  //       return throwError(() => err);
  //     })
  //   );
  // }

  // // Get por id
  // getById(id: number): Observable<Producto> {
  //   return this.http.get<Producto>(`${this.base}/productos/${id}`).pipe(catchError(err => throwError(() => err)));
  // }

  // // create/update/delete: ejemplos rápidos
  // create(payload: Partial<Producto>) {
  //   return this.http.post(`${this.base}/productos`, payload);
  // }

  // update(id: number, payload: Partial<Producto>) {
  //   return this.http.put(`${this.base}/productos/${id}`, payload);
  // }

  // delete(id: number) {
  //   return this.http.delete(`${this.base}/productos/${id}`);
  // }
}
