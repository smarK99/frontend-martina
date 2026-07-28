import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../environment/environment';
import { ConteoStock } from '../model/conteo-stock.model';


@Injectable({
  providedIn: 'root'
})
export class ConteoStockService {

  private baseUrl = `${environment.apiUrl}/conteostock`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<any> {
    return this.http.get<any[]>(`${this.baseUrl}`);
  }

  create(stockDTO: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/crear`, stockDTO);
  }

  delete(id: any): Observable<any> {
    return this.http.delete(`${this.baseUrl}/delete/${id}`);
  }

  update(id: any, stockDTO: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/update/${id}`, stockDTO);
  }
}
