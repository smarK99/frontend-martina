import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

type Role = 'admin' | 'cliente' | 'empleado' | null;

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private roleSubject: BehaviorSubject<Role>;
  role$: Observable<Role>;
  isLoggedIn$: Observable<boolean>;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // Inicializar el BehaviorSubject con el valor leído (si estamos en browser)
    this.roleSubject = new BehaviorSubject<Role>(this.getInitialRole());
    // Luego exponemos los observables usando el subject ya inicializado
    this.role$ = this.roleSubject.asObservable();
    this.isLoggedIn$ = this.role$.pipe(map(r => !!r));
  }

  private getInitialRole(): Role {
    // Protegemos el acceso a localStorage para ambientes no-browser (SSR/tests)
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const r = localStorage.getItem('role');
      return (r === 'admin' || r === 'cliente' || r === 'empleado') ? (r as Role) : null;
    } catch {
      return null;
    }
  }

  loginAs(role: Exclude<Role, null>, username?: string) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('role', role);
      if (username) localStorage.setItem('user', username);
    }
    this.roleSubject.next(role);
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('role');
      localStorage.removeItem('user');
    }
    this.roleSubject.next(null);
  }
}
