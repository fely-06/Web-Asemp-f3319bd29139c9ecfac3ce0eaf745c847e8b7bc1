// src/app/core/services/auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs/operators';
import { SesionService } from './sesion.service';   // 👈 Importante para manejar permisos

// 👇 Con esto Angular conoce el servicio globalmente
@Injectable({ providedIn: 'root' })
export class AuthService {

  // URL base: https://localhost:7183/api/auth
  private api = `${environment.apiUrl}/api/auth`;

  constructor(
    private http: HttpClient,
    private sesion: SesionService          // 👈 Inyectamos SesionService
  ) {}

  // ======================================================
  // ===============  LOGIN DEL USUARIO ====================
  // ======================================================
  login(credenciales: { usuario: string; contrasena: string }) {

    // 👇 IMPORTANTE: el backend ahora regresa "permisos"
    return this.http.post<{
      token: string;
      usuario: string;
      rol: string;
      permisos: string[];
    }>(
      `${this.api}/login`,
      credenciales
    )
    .pipe(
      tap((res) => {

        // --- Guardar datos en localStorage ---
        localStorage.setItem('token', res.token);
        localStorage.setItem('usuario', res.usuario);
        localStorage.setItem('rol', res.rol);

        // 👇 Guardamos permisos en localStorage
        localStorage.setItem('permisos', JSON.stringify(res.permisos));

        // 👇 Guardamos permisos en memoria (sesión actual)
        this.sesion.setPermisos(res.permisos);
      })
    );
  }

  // ======================================================
  // ===============  OBTENER PERFIL  ======================
  // ======================================================
  getPerfil() {
    return this.http.get<{
      id: number;
      usuario: string;
      rol: string;
      permisos?: string[];
    }>(`${this.api}/me`);
  }

  // ======================================================
  // ===================== LOGOUT ==========================
  // ======================================================
  logout() {
    // Limpia el localStorage completo
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('rol');
    localStorage.removeItem('permisos');

    // Limpia permisos en la sesión actual
    this.sesion.setPermisos([]);
  }

  // ======================================================
  // ==================== TOKEN ============================
  // ======================================================
  get token() {
    return localStorage.getItem('token');
  }

  // ======================================================
  // ================ ESTADO DEL LOGIN =====================
  // ======================================================
  get estaAutenticado(): boolean {
    return !!this.token;
  }

  getRol(): string | null {
  return localStorage.getItem('rol');
}


// ======================================================
// =========== OBTENER CLIENTE_ID DEL TOKEN ==============
// ======================================================
getClienteId(): number | null {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    // Ajusta el nombre del claim si tu backend lo manda distinto
    return payload.cliente_id ? Number(payload.cliente_id) : null;

  } catch (e) {
    console.error('Error leyendo cliente_id del token:', e);
    return null;
  }
}



}
