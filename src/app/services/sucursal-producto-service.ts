import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Sucursal, SucursalProducto } from '../model/pedido.model';

export interface SucursalProductoDTO {
  idProducto: number;
  idSucursal: number;
  precioSP: number;
}

@Injectable({
  providedIn: 'root'
})
export class SucursalProductoService {
  
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  //Metodo para modificar los precios de los productos de una sucursal específica
  configPrecios(dtos: SucursalProductoDTO[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/sucursal_producto/configurar_precio`, dtos);
  }

}