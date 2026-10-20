export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api', // Cambia esta URL según tu backend
  // Otras configuraciones de desarrollo
  debug: true,
  logLevel: 'debug'
};

export const environmentProd = {
  production: true,
  apiUrl: 'https://martina-backend.onrender.com/api', // URL de producción
  debug: false,
  logLevel: 'error'
};

//URL PRODUCCION NGROK
//'https://congenial-theatrics-component.ngrok-free.dev/api'