import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  
  private http = inject(HttpClient);
  // URL base de tu backend para el controlador de usuarios
  private apiURL = 'http://localhost:8080/api/usuarios'; 

  constructor() { }

  /**
   * Obtiene la lista de todos los usuarios activos
   */
  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiURL);
  }

  /**
   * CU N°19: Alta de Usuario
   * Envía las credenciales y datos personales para crear un nuevo registro
   */
  create(payloadAlta: any): Observable<any> {
    return this.http.post<any>(`${this.apiURL}/crear`, payloadAlta);
  }

  /**
   * CU N°19 (Camino Alternativo 1): Modificación de Usuario
   * Actualiza los datos permitidos del usuario según su ID
   */
  update(payloadModificacion: any): Observable<any> {
    return this.http.put<any>(`${this.apiURL}/actualizar`, payloadModificacion);
  }

  /**
   * CU N°19 (Camino Alternativo 2): Baja Lógica de Usuario
   * Registra la fechaHoraBajaUsuario en el backend
   */
  baja(payloadBaja: any): Observable<any> {
    return this.http.put<any>(`${this.apiURL}/baja`, payloadBaja);
  }

  /**
   * CU N°20 y N°21: Asignar y Revocar Roles
   * Envía el listado consolidado de roles (ROLE_XYZ) para impactar en la tabla intermedia
   */
  actualizarRoles(payloadRoles: any): Observable<any> {
    return this.http.put<any>(`${this.apiURL}/roles`, payloadRoles);
  }

  cambiarClavePersonal(datos: any): Observable<any> {
    // Apuntamos al endpoint que acabamos de crear en Java
    return this.http.post(`${this.apiURL}/cambiar-clave`, datos); 
  }
 
/**
   * Envía el email al backend para solicitar el link de recuperación de clave
   */
  solicitarRecuperacionClave(email: string): Observable<any> {
    return this.http.post(`${this.apiURL}/recuperar-clave`, { email });
  }

  restablecerClaveConToken(token: string, nuevaClave: string): Observable<any> {
    return this.http.post(`${this.apiURL}/reset-password`, { token, nuevaClave });
  }

}