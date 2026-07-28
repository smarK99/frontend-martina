import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth-service'; // Ajustá la ruta si varía

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

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
              // El Refresh Token también expiró (o es inválido): Cerramos sesión
              authService.logout();
              alert('Tu sesión ha expirado por completo. Por favor, volvé a iniciar sesión.');
              router.navigate(['/login']);
              return throwError(() => refreshErr);
            })
          );
        } else if (!isAuthRequest) {
          // No había Refresh Token: sesión expirada directa
          authService.logout();
          router.navigate(['/login']);
        }
      }

      // Si es un 403 (Sin permisos suficientes para esa función)
      if (error.status === 403) {
        alert('No tenés permisos para realizar esta acción.');
      }

      return throwError(() => error);
    })
  );
};