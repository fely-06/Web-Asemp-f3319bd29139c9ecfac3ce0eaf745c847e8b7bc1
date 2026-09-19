import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AccionesService {

  private url = environment.apiUrl + '/acciones';

  constructor(private http: HttpClient) {}

  getAcciones() {
    return this.http.get<any[]>(`${this.url}/lista`);
  }

  getAccion(id: number) {
    return this.http.get<any>(`${this.url}/buscar/${id}`);
  }

  createAccion(data: any) {
    return this.http.post(`${this.url}/registrar`, data);
  }

  updateAccion(id: number, data: any) {
    return this.http.put(`${this.url}/editar/${id}`, data);
  }

  deleteAccion(id: number) {
    return this.http.delete(`${this.url}/eliminar/${id}`);
  }

  // 🔥 ESTE MÉTODO SÍ DEBE ESTAR AQUÍ
 getAccionesAgrupadas() {
    return this.http.get<any[]>(`${this.url}/agrupado`);
  }
}
