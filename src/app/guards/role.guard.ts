import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';
import { map, take } from 'rxjs';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.role$.pipe(
    take(1),
    map(role => {
      // Si el rol es el correcto, abrimos la puerta (true)
      if (role === 'ROLE_ADMIN' || role === 'ROLE_DUENIO') {
        return true;
      }
      
      // Si no tiene el rol, le negamos el acceso y lo pateamos a otra pantalla (ej: productos)
      return router.createUrlTree(['/productos']);
    })
  );
};