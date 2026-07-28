import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, map } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JwtDto } from '../model/jwt-dto'; // Asegúrate de tener esta interfaz
import { LoginUsuario } from '../model/login-usuario'; // Interfaz para {username, password}

// Actualizamos los roles para que coincidan con Spring Security
export type Role = 'ROLE_ADMIN' | 'ROLE_DUEÑO' | 'ROLE_STOCK' | 'ROLE_EMPLEADO' | 'ROLE_REPARTIDOR' | 'ROLE_CLIENTE' | null;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private authURL = 'http://localhost:8080/api/auth/';

  private roleSubject: BehaviorSubject<Role>;
  role$: Observable<Role>;
  isLoggedIn$: Observable<boolean>;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private httpClient: HttpClient // Inyectamos HttpClient
  ) {
    this.roleSubject = new BehaviorSubject<Role>(this.getInitialRole());
    this.role$ = this.roleSubject.asObservable();
    this.isLoggedIn$ = this.role$.pipe(map(r => !!r));
  }

  private getInitialRole(): Role {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      // Extraemos el rol directamente del token guardado
      const payload = this.decodeToken(token);
      // Spring Security guarda las authorities en un array, tomamos la primera
      const authority = payload?.sub ? payload.authorities?.[0]?.authority : null;
      
      return authority ? (authority as Role) : null;
    } catch {
      return null;
    }
  }

  // Método REAL de login que llama al backend
  public login(loginUsuario: LoginUsuario): Observable<JwtDto> {
    return this.httpClient.post<JwtDto>(this.authURL + 'login', loginUsuario).pipe(
      tap((data: JwtDto) => {
        if (isPlatformBrowser(this.platformId)) {
          // Guardamos el token real
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', data.username);
        }
        
        // Decodificamos el token para saber qué rol obtuvo
        const payload = this.decodeToken(data.token);
        // Spring Security manda los roles dentro del token. 
        // Dependiendo de cómo lo configuramos, podrías necesitar ajustar esto.
        const role = payload?.authorities?.[0]?.authority as Role || null;
        
        this.roleSubject.next(role);
      })
    );
  }

  public logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role'); // Por si quedó de la versión anterior
    }
    this.roleSubject.next(null);
  }

  public getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }
    return null;
  }

  // Utilidad para leer el JWT sin librerías externas
  private decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      const decodedJson = atob(payload);
      return JSON.parse(decodedJson);
    } catch (e) {
      console.error('Error decodificando token', e);
      return null;
    }
  }
}