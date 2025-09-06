import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface StockItem {
  id: number;
  nombre: string;
  cantidadContada: number;
  precioUnitario: number;
  unidad?: string;
}

export interface StockCount {
  id: number;
  fechaHora: string; // ISO string
  empleadoId: number;
  empleadoNombre: string;
  items: StockItem[];
}

const MOCK_COUNTS: StockCount[] = [
  {
    id: 201,
    fechaHora: '2025-09-01T09:30:00',
    empleadoId: 11,
    empleadoNombre: 'Lucía Moreno',
    items: [
      { id: 1, nombre: 'Sándwich Jamón y Queso', cantidadContada: 120, precioUnitario: 3000 },
      { id: 2, nombre: 'Pan de sándwich (kg)', cantidadContada: 32, precioUnitario: 5000, unidad: 'kg' }
    ]
  },
  {
    id: 202,
    fechaHora: '2025-09-05T08:15:00',
    empleadoId: 12,
    empleadoNombre: 'Gonzalo Rojas',
    items: [
      { id: 1, nombre: 'Sándwich de Pollo', cantidadContada: 85, precioUnitario: 4200 },
      { id: 3, nombre: 'Jamon Cocido (uds)', cantidadContada: 10, precioUnitario: 8000, unidad: 'uds' }
    ]
  }
];


@Injectable({
  providedIn: 'root'
})
export class ConteoStockService {

  constructor() { }

  // Simula llamada HTTP
  getAllCounts(): Observable<StockCount[]> {
    return of(MOCK_COUNTS).pipe(delay(200));
  }
}
