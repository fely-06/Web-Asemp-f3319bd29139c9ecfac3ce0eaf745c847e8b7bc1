import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Interfaces base para tus combos
export interface RolCombo {
  id: number;
  nombre: string;
}

export interface DepartamentoCombo {
  id: number;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class ListasService {
  private api = environment.apiUrl; // Usa la misma variable global del entorno

  constructor(private http: HttpClient) {}

  // ====== ROLES ======
  getRoles(): Observable<RolCombo[]> {
    return this.http.get<RolCombo[]>(`${this.api}/roles/combo`);
  }

  // ====== DEPARTAMENTOS ======
  getDepartamentos(): Observable<DepartamentoCombo[]> {
    return this.http.get<DepartamentoCombo[]>(`${this.api}/departamentos/combo`);
  }
}
