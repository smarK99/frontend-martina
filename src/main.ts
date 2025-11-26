import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, {
  ...appConfig,
  providers: [
    ...(appConfig.providers ?? []),
    provideHttpClient(
      withFetch(),                 // <--- habilita fetch (recomendado para SSR)
      withInterceptorsFromDi()     // <--- opcional: permite interceptores inyectados
    ),
  ]
})
.catch((err) => console.error(err));

