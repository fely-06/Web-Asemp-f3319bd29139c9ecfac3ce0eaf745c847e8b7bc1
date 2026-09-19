// sat.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ArchivoTipo = 'pdf' | 'xml' | 'zip';

@Injectable({ providedIn: 'root' })
export class SatService {
  private solicitudesUrl = `${environment.apiUrl}/solicitudessat`;
  private descargasUrl   = `${environment.apiUrl}/api/sat/descargas`;

  constructor(private http: HttpClient) {}

// ---------- Solicitudes ----------

// Lista completa (dashboard)
getSolicitudes(): Observable<any[]> {
  return this.http.get<any[]>(`${this.solicitudesUrl}/lista`);
}

// Lista paginada (tabla SAT)
getSolicitudesPaginado(filtros: any): Observable<any> {
  return this.http.get(`${this.solicitudesUrl}/buscar`, {
    params: filtros
  });
}


  crearSolicitud(payload: any): Observable<any> {
    return this.http.post(`${this.solicitudesUrl}/registrar`, payload);
  }

  verificarSolicitud(id: number): Observable<any> {
    return this.http.post(`${this.solicitudesUrl}/${id}/verificar`, {});
  }

  eliminarSolicitud(id: number) {
    return this.http.delete(`${this.solicitudesUrl}/eliminar/${id}`);
  }

  // ---------- Descargas (metadatos) ----------
  ultimaDescarga(id: number): Observable<any> {
    return this.http.get(`${this.descargasUrl}/${id}/ultima`);
  }

  listarArchivos(solicitudId: number, tipo: 'pdf' | 'xml'): Observable<any[]> {
    return this.http.get<any[]>(`${this.descargasUrl}/${solicitudId}/archivos`, {
      params: { tipo }
    });
  }

  // ---------- Descargas como BLOB con JWT (evita 401) ----------
  getZipBlob(id: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.descargasUrl}/${id}/zip`, {
      observe: 'response',
      responseType: 'blob'
    });
  }

  getXmlZipBlob(id: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.descargasUrl}/${id}/xml`, {
      observe: 'response',
      responseType: 'blob'
    });
  }

  getPdfBlob(id: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.descargasUrl}/${id}/pdf`, {
      observe: 'response',
      responseType: 'blob'
    });
  }



obtenerVerificaciones(id: number) {
  return this.http.get<any[]>(`${environment.apiUrl}/solicitudessat/${id}/verificaciones`);
}


//generar pdf
generarPdfDesdeXml(solicitudId: number, xml: string) {
  return this.http.get(
    `${environment.apiUrl}/api/sat/descargas/${solicitudId}/generar-pdf`,
    { params: { xml }, responseType: 'blob', observe: 'response' }
  );
}







  getArchivoBlob(
    solicitudId: number,
    tipo: ArchivoTipo,
    nombre: string
  ): Observable<HttpResponse<Blob>> {
    const params = new HttpParams()
      .set('tipo', tipo)
      .set('nombre', nombre);
    return this.http.get(`${this.descargasUrl}/${solicitudId}/abrir`, {
      params,
      observe: 'response',
      responseType: 'blob'
    });
  }

  

  // ---------- (Opcional) URLs antiguas si aún las usabas en algún lado ----------
  urlZip(id: number)       { return `${this.descargasUrl}/${id}/zip`; }
  urlPdfUltimo(id: number) { return `${this.descargasUrl}/${id}/pdf`; }
  urlXmlZip(id: number)    { return `${this.descargasUrl}/${id}/xml`; }
  urlAbrirArchivo(solicitudId: number, tipo: ArchivoTipo, nombre: string) {
    return `${this.descargasUrl}/${solicitudId}/abrir?tipo=${tipo}&nombre=${encodeURIComponent(nombre)}`;
  }
}
