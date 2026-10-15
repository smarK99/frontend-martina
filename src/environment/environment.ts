export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api', // Cambia esta URL según tu backend
  // Otras configuraciones de desarrollo
  debug: true,
  logLevel: 'debug'
};

export const environmentProd = {
  production: true,
  apiUrl: 'https://congenial-theatrics-component.ngrok-free.dev/', // URL de producción
  debug: false,
  logLevel: 'error'
};