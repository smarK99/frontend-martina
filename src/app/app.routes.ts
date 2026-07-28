import { Routes } from '@angular/router';
import { Productos } from './components/productos/productos';
import { Pedidos } from './components/pedidos/pedidos';
import { Stock } from './components/stock/stock';
import { Estadisticas } from './components/estadisticas/estadisticas';
import { Repartos } from './components/repartos/repartos';

// Importaciones de Seguridad y Autenticación
import { LoginComponent } from './components/auth/login/login.component'; 
import { ResetPasswordComponent } from './components/auth/reset-password/reset-password';
import { Usuarios } from './components/usuarios/usuarios';
import { authGuard } from './guards/auth.guard'; 
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
    { 
        path: 'login', 
        component: LoginComponent 
    },
    { 
        path: 'reset-password', 
        component: ResetPasswordComponent 
    },
    { 
        // La vidriera es pública, no lleva guard
        path: 'productos', 
        component: Productos 
    },
    { 
        path: 'usuarios', 
        component: Usuarios,
        canActivate: [roleGuard] // Candado específico para usuarios
    },
    { 
        path: 'pedidos', 
        component: Pedidos,
        canActivate: [authGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_DUENIO', 'ROLE_EMPLEADO', 'ROLE_CLIENTE'] }
    },
    { 
        path: 'stock', 
        component: Stock,
        canActivate: [authGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_DUENIO', 'ROLE_STOCK'] }
    },
    { 
        path: 'repartos', 
        component: Repartos,
        canActivate: [authGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_DUENIO', 'ROLE_REPARTIDOR'] }
    },
    { 
        path: 'estadisticas', 
        component: Estadisticas,
        canActivate: [authGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_DUENIO'] }
    },
    { 
        // Redirección inicial a la vista pública
        path: '', 
        pathMatch: 'full', 
        redirectTo: 'productos' 
    },
    { 
        // Ruta comodín por si escriben cualquier cosa
        path: '**', 
        redirectTo: 'productos' 
    }
];