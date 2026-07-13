import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

// 1. Importamos el que pone el Token
import { jwtInterceptor } from './interceptors/jwt.interceptor';
// 2. Importamos el que echa al usuario si hay un 401
import { authInterceptor } from './interceptors/auth-interceptor'; 

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes), 
    provideClientHydration(withEventReplay()),
    
    // 3. UN SOLO provideHttpClient, y adentro la lista de interceptores separados por coma
    // Nota: El orden es clave. Primero agregamos el token, y después escuchamos posibles errores.
    provideHttpClient(
      withInterceptors([jwtInterceptor, authInterceptor])
    )
  ]
};