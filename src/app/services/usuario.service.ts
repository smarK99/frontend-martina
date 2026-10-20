import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http'; // <-- Agregamos HttpParams
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  
  private baseUrl = `${environment.apiUrl}/usuario`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene la lista de todos los usuarios activos
   */
  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl);
  }

  /**
   * CU N°19: Alta de Usuario
   * Envía las credenciales y datos personales para crear un nuevo registro
   */
  create(payloadAlta: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/crear`, payloadAlta);
  }

  /**
   * CU N°19 (Camino Alternativo 1): Modificación de Usuario
   * Actualiza los datos permitidos del usuario según su ID
   */
  update(payloadModificacion: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/actualizar`, payloadModificacion);
  }

  /**
   * CU N°19 (Camino Alternativo 2): Baja Lógica de Usuario
   * Registra la fechaHoraBajaUsuario en el backend
   */
  baja(payloadBaja: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/baja`, payloadBaja);
  }

  /**
   * CU N°20 y N°21: Asignar y Revocar Roles
   * Envía el listado consolidado de roles (ROLE_XYZ) para impactar en la tabla intermedia
   */
  actualizarRoles(payloadRoles: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/roles`, payloadRoles);
  }

  cambiarClavePersonal(datos: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/cambiar-clave`, datos); 
  }
 
  /**
   * Envía el email al backend para solicitar el link de recuperación de clave
   */
  solicitarRecuperacionClave(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/recuperar-clave`, { email });
  }

  restablecerClaveConToken(token: string, nuevaClave: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/reset-password`, { token, nuevaClave });
  }

  // ==========================================
  // NUEVO: Búsqueda y Paginación
  // ==========================================
  buscarPaginadoYFiltrado(termino: string, page: number, size: number): Observable<any> {
    const params = new HttpParams()
      .set('termino', termino)
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<any>(`${this.baseUrl}/busqueda-paginada`, { params });
  }

}