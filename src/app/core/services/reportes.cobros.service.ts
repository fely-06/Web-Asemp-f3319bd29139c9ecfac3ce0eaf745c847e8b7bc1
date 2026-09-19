import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportesCobrosService {

  private api = environment.apiUrl + "/api/reportes/cobros";

  constructor(private http: HttpClient) {}

  obtenerLista(filtro: any) {
    return this.http.post<any[]>(`${this.api}/lista`, filtro);
  }

  descargarExcel(filtro: any) {
    return this.http.post(`${this.api}/excel`, filtro, {
      responseType: "blob"
    });
  }

  descargarPdf(filtro: any) {
    return this.http.post(`${this.api}/pdf/completo`, filtro, {
      responseType: "blob"
    });
  }
}
