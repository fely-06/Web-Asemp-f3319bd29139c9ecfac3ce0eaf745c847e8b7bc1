import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { TableroIva } from '../models/tablero-iva.model';

import { TableroIvaConDetalle } from '../models/tablero-iva-detalle.model';

@Injectable({
  providedIn: 'root'
})
export class TableroIvaService {

  private baseUrl = `${environment.apiUrl}/tablero`;

  constructor(private http: HttpClient) {}

  // ==========================================================
  // TABLERO ACTUAL (RESUMIDO)
  // ==========================================================
  obtener(clienteId: number, anio: number, mes: number) {
    const params = new HttpParams()
      .set('clienteId', clienteId)
      .set('anio', anio)
      .set('mes', mes);

    return this.http.get<TableroIva>(`${this.baseUrl}/iva`, { params });
  }

  // ==========================================================
  // NUEVO → TABLERO + DETALLE XML (para Excel / PDF)
  // ==========================================================
 
  // NUEVO → obtiene resumen + detalle

obtenerConDetalle(clienteId: number, anio: number, mes: number) {
  const params = new HttpParams()
    .set('clienteId', clienteId)
    .set('anio', anio)
    .set('mes', mes);

  return this.http.get<TableroIvaConDetalle>(`${this.baseUrl}/iva/detalle`, { params });
}


}
