import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'; 

import { AuthService } from '../services/auth-service'; 
import { SessionExpiredComponent } from '../components/auth/session-expired.component'; 

let isSessionModalOpen = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const modalService = inject(NgbModal); 

  const manejarSesionExpirada = () => {
    // 1. Si el modal ya está abierto, evitamos que parpadee o se duplique
    if (isSessionModalOpen) {
      return;
    }

    // 2. EL BLINDAJE: Si el usuario apretó "Logout" manualmente, la app ya borró los tokens.
    // Verificamos si en ESTE momento existe algún token local.
    // (Nota: si usás otro nombre en localStorage distinto a 'token', cambialo acá)
    const tieneTokenGuardado = localStorage.getItem('token') !== null || authService.getRefreshToken() !== null;
    
    // Si ya no hay tokens en el sistema, significa que este error 401 es un fantasma. Lo ignoramos.
    if (!tieneTokenGuardado) {
      return;
    }

    isSessionModalOpen = true;
    
    authService.logout(); 
    modalService.dismissAll(); 

    const modalRef = modalService.open(SessionExpiredComponent, {
      backdrop: 'static',
      keyboard: false,
      centered: true
    });

    modalRef.result.finally(() => {
      isSessionModalOpen = false;
      router.navigate(['/login']);
    });
  };

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      
      if (error.status === 401) {
        const refreshToken = authService.getRefreshToken();
        
        // 3. EXCEPCIÓN: Ignoramos los errores 401 si vienen de peticiones de login, refresh o logout
        const isAuthRequest = req.url.includes('/api/auth/login') || 
                              req.url.includes('/api/auth/refresh') ||
                              req.url.includes('/logout'); // Evita conflicto si el backend tiene ruta de logout

        if (refreshToken && !isAuthRequest) {
          return authService.refreshToken().pipe(
            switchMap((newTokenData) => {
              const newAuthReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newTokenData.token}`
                }
              });
              return next(newAuthReq);
            }),
            catchError((refreshErr) => {
              manejarSesionExpirada();
              return throwError(() => refreshErr);
            })
          );
        } else if (!isAuthRequest) {
          manejarSesionExpirada();
        }
      }

      if (error.status === 403) {
        alert('No tenés permisos para realizar esta acción.'); 
      }

      return throwError(() => error);
    })
  );
};