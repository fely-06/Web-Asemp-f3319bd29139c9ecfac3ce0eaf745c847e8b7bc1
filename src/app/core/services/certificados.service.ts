// core/services/certificados.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CertificadosService {
  private url = `${environment.apiUrl}/certificadossat`;

  constructor(private http: HttpClient) {}

  listar(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/lista`);
  }

  descargar(id: number, tipo: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.url}/descargar/${id}/${tipo}`, {
      observe: 'response',
      responseType: 'blob'
    }) as Observable<HttpResponse<Blob>>;   // ← casteo para quitar el error
  }
}
