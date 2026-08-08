import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'; 

// Ajustá estas rutas según las carpetas de tu proyecto
import { AuthService } from '../services/auth-service'; 
import { SessionExpiredComponent } from '../components/auth/session-expired.component'; 

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const modalService = inject(NgbModal); // Inyectamos el servicio de modales

  // Función auxiliar para no repetir la lógica visual
  const manejarSesionExpirada = () => {
    authService.logout(); // Limpia localStorage y estados
    
    // Cerramos cualquier otro modal que el usuario tuviera abierto (ej: viendo detalle de un pedido)
    modalService.dismissAll();

    // Abrimos el modal de sesión expirada obligando al usuario a interactuar con él (static)
    const modalRef = modalService.open(SessionExpiredComponent, {
      backdrop: 'static',
      keyboard: false,
      centered: true
    });

    // Sin importar cómo se cierre el modal, lo pateamos al login
    modalRef.result.then(
      () => router.navigate(['/login']),
      () => router.navigate(['/login'])
    );
  };

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      
      // Si el backend nos rechazó con un 401 (Token expirado/inválido)
      if (error.status === 401) {
        const refreshToken = authService.getRefreshToken();

        // Evitamos entrar en un bucle infinito si el error 401 vino del propio endpoint de login o refresh
        const isAuthRequest = req.url.includes('/api/auth/login') || req.url.includes('/api/auth/refresh');

        if (refreshToken && !isAuthRequest) {
          // Intentamos renovar el Access Token en silencio
          return authService.refreshToken().pipe(
            switchMap((newTokenData) => {
              // Renovación exitosa: Reintentamos la petición original con el nuevo Token
              const newAuthReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newTokenData.token}`
                }
              });
              return next(newAuthReq);
            }),
            catchError((refreshErr) => {
              // El Refresh Token también expiró (o es inválido): Mostramos modal y cerramos sesión
              manejarSesionExpirada();
              return throwError(() => refreshErr);
            })
          );
        } else if (!isAuthRequest) {
          // No había Refresh Token o el pedido de refresh falló: sesión expirada directa
          manejarSesionExpirada();
        }
      }

      // Si es un 403 (Sin permisos suficientes para esa función)
      if (error.status === 403) {
        alert('No tenés permisos para realizar esta acción.'); 
        // Nota: A futuro también podrías cambiar este alert por un Toast o un Modal chiquito
      }

      return throwError(() => error);
    })
  );
};