import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { SesionService } from '../services/sesion.service';

export const permisoGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const sesion = inject(SesionService);

  const permisoRequerido = route.data?.['permiso'] as string;

  // Si no hay permiso definido, deja pasar
  if (!permisoRequerido)
    return true;

  // Validar permisos del usuario
  if (sesion.tiene(permisoRequerido)) {
    return true;
  }

  // Si no tiene permiso → redirige
  router.navigateByUrl('/dashboard/home');
  return false;
};
