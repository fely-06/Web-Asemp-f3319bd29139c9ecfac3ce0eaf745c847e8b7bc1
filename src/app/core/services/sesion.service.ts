import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SesionService {

  permisos: string[] = [];

  constructor() {
    const raw = localStorage.getItem('permisos');
    if (raw) {
      this.permisos = JSON.parse(raw);
    }
  }

  setPermisos(permisos: string[]) {
    this.permisos = permisos;
    localStorage.setItem('permisos', JSON.stringify(permisos));
  }

  tiene(clave: string) {
    return this.permisos.includes(clave);
  }
}
