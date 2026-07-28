import { Routes } from '@angular/router';
import { Productos } from './components/productos/productos';
import { Pedidos } from './components/pedidos/pedidos';
import { Stock } from './components/stock/stock';
import { Estadisticas } from './components/estadisticas/estadisticas';
import { Repartos } from './components/repartos/repartos';
import { LoginComponent } from './components/auth/login/login.component'; // <-- Asegúrate de importar tu LoginComponent

export const routes: Routes = [
    { path: 'login', component: LoginComponent }, // <-- Declaramos el login arriba de todo
    { path: 'productos', component: Productos },
    { path: 'pedidos', component: Pedidos },
    { path: 'stock', component: Stock },
    { path: 'repartos', component: Repartos },
    { path: 'estadisticas', component: Estadisticas },
    { path: '', pathMatch: 'full', redirectTo: 'login' }, // <-- Cambiamos la redirección inicial a login
    { path: '**', redirectTo: 'login' } // <-- Si ponen cualquier cosa, que los mande al login
];