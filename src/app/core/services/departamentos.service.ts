import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DepartamentosService {

  private url = environment.apiUrl + '/departamentos/';


  constructor(private http: HttpClient) {}

  lista() {
    return this.http.get<any[]>(this.url + 'lista');
  }

  buscar(id: number) {
    return this.http.get<any>(this.url + 'buscar/' + id);
  }

  crear(body: any) {
    return this.http.post<any>(this.url + 'registrar', body);
  }

  editar(id: number, body: any) {
    return this.http.put<any>(this.url + 'editar/' + id, body);
  }

  eliminar(id: number) {
    return this.http.delete<any>(this.url + 'eliminar/' + id);
  }

  combo() {
    return this.http.get<any[]>(this.url + 'combo');
  }
}
