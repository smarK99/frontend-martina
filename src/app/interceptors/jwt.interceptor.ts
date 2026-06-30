import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth-service'; // Revisá que esta ruta coincida con la tuya

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  // Inyectamos tu servicio para usar la función segura que armaste
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Si hay token, clonamos la petición y se lo inyectamos
  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }

  // Si no hay token, la dejamos pasar normal
  return next(req);
};