// src/app/core/guards/auth.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  // Si no hay token o está vacío, redirige al login
  if (!token || token.trim() === '') {
    router.navigateByUrl('/login');
    return false;
  }

  // En el futuro podrías validar su expiración aquí
  return true;
};
