import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

// ================================================================
// 🔹 MODELOS DE DATOS
// ================================================================

export interface CertificadoResumen {
  rfc?: string;
  contrasena?: string;
  archivo_cer?: string;
  archivo_key?: string;
  archivo_pfx?: string;
  fecha_vigencia_inicio?: string;
  fecha_vigencia_fin?: string;
}

// 👇 Para la lista (usa /lista-certificados)
export interface ClienteLista {
  id: number;
  usuario_id?: number;
  razon_social: string;
  telefono?: string;
  correo_electronico?: string;
  direccion?: string;
  honorarios_subtotal?: number;
  estatus?: boolean;
  certificado?: CertificadoResumen; // campo único simplificado
}

// 👇 Para el formulario de edición (usa /buscar-con-detalle/{id})
export interface ClienteDetalle {
  id: number;
  usuario_id: number;
  razon_social: string;
  telefono?: string;
  correo_electronico?: string;
  direccion?: string;
  honorarios_subtotal?: number;
  estatus: boolean;

  // NUEVOS CAMPOS
  usa_retenciones: boolean;
  porc_isr_ret: number;
  porc_iva_ret: number;


  certificados_sat?: CertificadoResumen[]; // lista completa de certificados
}

// ================================================================
// 🔹 SERVICIO PRINCIPAL
// ================================================================

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private url = `${environment.apiUrl}/clientes`;

  constructor(private http: HttpClient) {}

  // 🔸 Obtener lista de clientes con certificado resumido
  getLista(): Observable<ClienteLista[]> {
    return this.http.get<ClienteLista[]>(`${this.url}/lista-certificados`);
  }

  // 🔸 Obtener cliente con sus certificados completos (para editar)
getByIdDetalle(id: number): Observable<ClienteDetalle> {
  return this.http.get<ClienteDetalle>(`${this.url}/buscar-con-detalle/${id}`);
}


  // 🔸 Registrar cliente completo (.cer + .key)
  registrarCompleto(fd: FormData): Observable<any> {
    return this.http.post(`${this.url}/registrar-completo`, fd);
  }

  // 🔸 Eliminar cliente
  eliminar(id: number): Observable<any> {
    return this.http.delete(`${this.url}/eliminar/${id}`);
  }

  // 🔸 Leer RFC desde archivos .cer y .key
  leerRFC(formData: FormData) {
    return this.http.post<any>(`${environment.apiUrl}/certificadossat/leerRFC`, formData);
  }

  // 🔸 Obtener usuarios disponibles para asignar a clientes
  getUsuariosDisponibles() {
    return this.http.get<any[]>(`${environment.apiUrl}/usuarios/disponibles`);
  }


  getListaConCertificados() {
  return this.http.get(this.url + '/lista-con-certificados');
}

}
