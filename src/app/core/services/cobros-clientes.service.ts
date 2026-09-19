import { Injectable } from '@angular/core';
import { HttpClient,HttpResponse} from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface CobroCliente {
  id?: number;
  cliente_id: number;
  subtotal: number;
  descripcion: string;
  iva_porcentaje: number;
  iva_monto?: number;
  isr_ret: number;
  iva_ret: number;
  total?: number;
  mes: number;
  anio: number;
  estado_pago?: string;
  fecha_emision?: string;
  fecha_pago?: string;
  comprobante_pdf?: string;
  folio?: number;

  folio_formato?: string;
   // AGREGA ESTA LÍNEA:
  cliente?: string; // ← Nombre del cliente
}

@Injectable({
  providedIn: 'root'
})
export class CobrosClientesService {

  private url = `${environment.apiUrl}/cobros`;

  constructor(private http: HttpClient) {}


  // === NUEVO MÉTODO PARA EL RECIBO ===
  verRecibo(id: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${environment.apiUrl}/cobros/recibo/${id}`, {
      observe: 'response',
      responseType: 'blob'
    });
  }

  
  // LISTA GENERAL
lista(params: any = {}): Observable<CobroCliente[]> {
  return this.http.get<CobroCliente[]>(`${this.url}/lista`, { params });
}




  // BUSCAR
  buscar(id: number): Observable<CobroCliente> {
    return this.http.get<CobroCliente>(`${this.url}/buscar/${id}`);
  }

  // REGISTRAR
  registrar(data: CobroCliente): Observable<any> {
    return this.http.post(`${this.url}/registrar`, data);
  }

  // EDITAR
  editar(id: number, data: CobroCliente): Observable<any> {
    return this.http.put(`${this.url}/editar/${id}`, data);
  }

  // ELIMINAR
  eliminar(id: number): Observable<any> {
    return this.http.delete(`${this.url}/eliminar/${id}`);
  }

  // MARCAR COMO PAGADO
  pagar(id: number): Observable<any> {
    return this.http.put(`${this.url}/pagar/${id}`, {});
  }

  // ESTADO DE CUENTA HTML
  estadoCuenta(clienteId: number, anio: number): Observable<string> {
    return this.http.get(`${this.url}/estado-cuenta/${clienteId}/${anio}`, { responseType: 'text' });
  }

  // ESTADO DE CUENTA PDF
  descargarEstadoCuentaPdf(clienteId: number, anio: number): Observable<Blob> {
    return this.http.get(`${this.url}/estado-cuenta-pdf/${clienteId}/${anio}`, { responseType: 'blob' });
  }
// core/services/cobros-clientes.service.ts
confirmarPago(body: any): Observable<any> {
  return this.http.post(`${this.url}/confirmar-pago`, body);
}



tienePendientes(clienteId: number) {
  return this.http.get<{ pendiente: boolean }>(
    `${this.url}/cliente/${clienteId}/pendientes`
  );
}



}
