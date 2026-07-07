import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
// 1. Importamos las herramientas HTTP
import { provideHttpClient, withInterceptors } from '@angular/common/http';
// 2. Importamos nuestro interceptor de seguridad (ajustá la ruta si quedó diferente)
import { jwtInterceptor } from './interceptors/jwt.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes), 
    provideClientHydration(withEventReplay()),
    // 3. Activamos el cliente HTTP y le pegamos el interceptor
    provideHttpClient(withInterceptors([jwtInterceptor]))
  ]
};