import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';
import { map, take } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Leemos qué roles tienen permiso para entrar a esta ruta desde el app.routes
  const rolesPermitidos = route.data?.['roles'] as Array<string>;

  return authService.role$.pipe(
    take(1), // Tomamos el valor actual y completamos
    map(role => {
      
      // 1. Si la ruta exige roles y el usuario no está logueado
      if (rolesPermitidos && !role) {
        router.navigate(['/login']); // Afuera, al login
        return false;
      }

      // 2. Si el usuario está logueado, verificamos si su rol está en la lista permitida
      if (rolesPermitidos && rolesPermitidos.length > 0) {
        if (rolesPermitidos.includes(role!)) {
          return true; // ¡Pasa el peaje!
        } else {
          // Si tiene sesión pero no el rol adecuado, lo rebotamos a la vidriera
          router.navigate(['/productos']); 
          return false;
        }
      }

      // 3. Si la ruta no especifica roles (es pública), lo dejamos pasar
      return true;
    })
  );
};