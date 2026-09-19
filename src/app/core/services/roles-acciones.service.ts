import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RolesAccionesService {

  private url = environment.apiUrl + '/rolesacciones';

  constructor(private http: HttpClient) {}

  // 🔥 Obtener permisos del rol
  getPorRol(idRol: number) {
    return this.http.get<any[]>(`${this.url}/por-rol/${idRol}`);
  }

  // 🔥 Guardar permisos del rol
  guardar(data: any) {
    return this.http.post(`${this.url}/guardar`, data);
  }
}
