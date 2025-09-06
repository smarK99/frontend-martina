import { Routes } from '@angular/router';
import { Productos } from './components/productos/productos';
import { Pedidos } from './components/pedidos/pedidos';
import { Stock } from './components/stock/stock';
import { Historial } from './components/historial/historial';
import { Estadisticas } from './components/estadisticas/estadisticas';

export const routes: Routes = [
    { path: 'productos', component: Productos },
    { path: 'pedidos', component: Pedidos },
    { path: 'stock', component: Stock },
    { path: 'historial', component: Historial },
    { path: 'estadisticas', component: Estadisticas },
    { path: '', pathMatch: 'full', redirectTo: 'productos' },
    { path: '**', redirectTo: 'productos' }
];
