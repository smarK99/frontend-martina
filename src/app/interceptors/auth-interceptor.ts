import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  // Dejamos que la petición viaje hacia Java y "escuchamos" la respuesta
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si el error es 401 (No autorizado) o 403 (Prohibido)
      if (error.status === 401 || error.status === 403) {
        
        // 1. Limpiamos el token viejo o vencido
        localStorage.removeItem('token');
        localStorage.removeItem('usuario'); // O como se llame la variable donde guardás los datos

        // 2. Avisamos al usuario
        alert('Tu sesión ha expirado o no tienes permisos. Por favor, vuelve a iniciar sesión.');

        // 3. Lo pateamos al login
        router.navigate(['/login']);
      }
      
      // Si es otro tipo de error, lo dejamos pasar para que el componente lo maneje
      return throwError(() => error);
    })
  );
};