import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

// 1. Importamos el que inyecta el Token en las cabeceras
import { jwtInterceptor } from './interceptors/jwt.interceptor';
// 2. Importamos el que maneja el Refresh Token y ataja el Error 401
import { authInterceptor } from './interceptors/auth-interceptor'; 

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes), 
    provideClientHydration(withEventReplay()),
    
    // 3. Registramos AMBOS interceptores. El orden es clave: primero token, después errores.
    provideHttpClient(
      withInterceptors([jwtInterceptor, authInterceptor])
    )
  ]
};