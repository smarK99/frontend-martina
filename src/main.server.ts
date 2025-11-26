import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { App } from './app/app';
import { config } from './app/app.config.server';

const bootstrap = () =>
  bootstrapApplication(App, {
    ...config,
    providers: [
      ...(config.providers ?? []),
      provideHttpClient(
        withFetch(),                 // <--- habilita fetch para el server renderer
        withInterceptorsFromDi()     // <--- opcional
      ),      // HttpClient para renderizado en servidor
    ]
  });

export default bootstrap;