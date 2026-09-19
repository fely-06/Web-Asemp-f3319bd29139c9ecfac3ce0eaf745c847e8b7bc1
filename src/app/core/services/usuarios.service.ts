// src/app/core/services/usuarios.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Usuario {
  id: number;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  correo: string;
  usuario: string;
  contrasena?: string;
  estatus: boolean;
  rol_id: number;
   departamento_id?: number | null; // ✅ permite null

  // 👇 Agrega estos campos opcionales
  rol?: { id: number; nombre: string };
  departamento?: { id: number; nombre: string };
}


@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private api = `${environment.apiUrl}/usuarios`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.api}/lista`);
  }

  getById(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.api}/buscar/${id}`);
  }

  create(data: Usuario): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.api}/registrar`, data);
  }

  update(id: number, data: Usuario): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.api}/editar/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/eliminar/${id}`);
  }




  
  restablecerContrasena(id: number) {
  return this.http.put(`${this.api}/${id}/restablecer-password`, {});
}

actualizarContrasena(id: number, nueva: string) {
  return this.http.put(`${this.api}/${id}/actualizar-password`, { contrasena: nueva });
}


  
}
