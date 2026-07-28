import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, map } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JwtDto } from '../model/jwt-dto'; 
import { LoginUsuario } from '../model/login-usuario';

export type Role = 'ROLE_ADMIN' | 'ROLE_DUENIO' | 'ROLE_STOCK' | 'ROLE_EMPLEADO' | 'ROLE_REPARTIDOR' | 'ROLE_CLIENTE' | null;

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
    private httpClient: HttpClient 
  ) {
    this.roleSubject = new BehaviorSubject<Role>(this.getInitialRole());
    this.role$ = this.roleSubject.asObservable();
    this.isLoggedIn$ = this.role$.pipe(map(r => !!r));
  }

  private formatRole(rawRole: string | undefined | null): Role {
    if (!rawRole) return null;
    let formatted = rawRole.toUpperCase();
    if (!formatted.startsWith('ROLE_')) {
      formatted = 'ROLE_' + formatted;
    }
    return formatted as Role;
  }

  private getInitialRole(): Role {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const payload = this.decodeToken(token);
      const authority = payload?.sub ? payload.authorities?.[0]?.authority : null;
      
      return this.formatRole(authority);
    } catch {
      return null;
    }
  }

  public login(loginUsuario: LoginUsuario): Observable<JwtDto> {
    return this.httpClient.post<JwtDto>(this.authURL + 'login', loginUsuario).pipe(
      tap((data: JwtDto) => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', data.username);
          // Guardamos el Refresh Token
          if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }
        }
        
        const payload = this.decodeToken(data.token);
        const rawRole = payload?.authorities?.[0]?.authority;
        
        const role = this.formatRole(rawRole);
        this.roleSubject.next(role);
      })
    );
  }

  // Pide un Access Token nuevo usando el Refresh Token
  public refreshToken(): Observable<JwtDto> {
    const refreshToken = this.getRefreshToken();
    return this.httpClient.post<JwtDto>(this.authURL + 'refresh', { refreshToken }).pipe(
      tap((data: JwtDto) => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('token', data.token);
          if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }
        }
      })
    );
  }

  public logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken'); 
      localStorage.removeItem('user');
      localStorage.removeItem('role'); 
    }
    this.roleSubject.next(null);
  }

  public getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }
    return null;
  }

  public getRefreshToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('refreshToken');
    }
    return null;
  }

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