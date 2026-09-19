import { Injectable, ApplicationRef } from '@angular/core';
import feather from 'feather-icons';

@Injectable({ providedIn: 'root' })
export class FeatherService {
  constructor(appRef: ApplicationRef) {
    // Detecta cualquier cambio global de Angular (ej: guardar archivo o hot reload)
    appRef.isStable.subscribe((stable) => {
      if (stable) {
        this.replace();
      }
    });
  }

  replace(): void {
    try {
      feather.replace();
    } catch {
      // Si falla, no interrumpe el render
    }
  }
}
