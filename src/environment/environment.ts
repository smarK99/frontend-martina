export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api', // Cambia esta URL según tu backend
  // Otras configuraciones de desarrollo
  debug: true,
  logLevel: 'debug'
};

export const environmentProd = {
  production: true,
  apiUrl: 'https://tu-backend-produccion.com/api', // URL de producción
  debug: false,
  logLevel: 'error'
};