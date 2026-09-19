import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RolesService {

  private url = environment.apiUrl + '/roles';

  constructor(private http: HttpClient) {}

  // LISTA
  getRoles() {
    return this.http.get<any[]>(`${this.url}/lista`);
  }

  // BUSCAR UNO
  getRol(id: number) {
    return this.http.get(`${this.url}/buscar/${id}`);
  }

  // CREAR
  createRol(data: any) {
    return this.http.post(`${this.url}/registrar`, data);
  }

  // EDITAR
  updateRol(id: number, data: any) {
    return this.http.put(`${this.url}/editar/${id}`, data);
  }

  // ELIMINAR
  deleteRol(id: number) {
    return this.http.delete(`${this.url}/eliminar/${id}`);
  }
}
