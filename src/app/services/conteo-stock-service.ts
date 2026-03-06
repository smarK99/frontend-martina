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

  getAll(): Observable<ConteoStock[]> {
    return this.http.get<ConteoStock[]>(`${this.baseUrl}/getAll`);
  }

  create(stockDTO: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/crear`, stockDTO);
  }
}
