import { Routes } from '@angular/router';
import { Productos } from './components/productos/productos';
import { Pedidos } from './components/pedidos/pedidos';
import { Stock } from './components/stock/stock';
import { Estadisticas } from './components/estadisticas/estadisticas';
import { Repartos } from './components/repartos/repartos';
// Agregamos los imports correctos basados en tu estructura:
import { LoginComponent } from './components/auth/login/login.component'; 
import { authGuard } from './guards/auth.guard'; 

export const routes: Routes = [
    { 
        path: 'login', 
        component: LoginComponent 
    },
    { 
        // La vidriera es pública, no lleva guard
        path: 'productos', 
        component: Productos 
    },
    { 
        path: 'pedidos', 
        component: Pedidos,
        canActivate: [authGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_DUEÑO', 'ROLE_EMPLEADO', 'ROLE_CLIENTE'] }
    },
    { 
        path: 'stock', 
        component: Stock,
        canActivate: [authGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_DUEÑO', 'ROLE_STOCK'] }
    },
    { 
        path: 'repartos', 
        component: Repartos,
        canActivate: [authGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_DUEÑO', 'ROLE_REPARTIDOR'] }
    },
    { 
        path: 'estadisticas', 
        component: Estadisticas,
        canActivate: [authGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_DUEÑO'] }
    },
    { path: '', pathMatch: 'full', redirectTo: 'productos' },
    { path: '**', redirectTo: 'productos' } // Catch-all para URLs que no existen
];