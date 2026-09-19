import { Component, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FeatherService } from '../../../core/services/feather.service';
import { AuthService } from '../../../core/services/auth.service'; // 👈 nuevo

import Swal from 'sweetalert2';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements AfterViewInit {
  email = '';
  password = '';
  showPassword = false;
  loading = false;
  error = ''; // 👈 nuevo

  constructor(
    private router: Router,
    private feather: FeatherService,
    private authSrv: AuthService // 👈 nuevo
  ) {}

  ngAfterViewInit(): void {
    this.feather.replace();
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
    this.feather.replace();
  }

  login(): void {
    if (this.loading) return;
if (!this.email || !this.password) {
  Swal.fire({
    icon: 'warning',
    title: 'Campos incompletos',
    text: 'Por favor, completa todos los campos',
    confirmButtonColor: '#3085d6'
  });
  return;
}

   // 👇 Llamada real al login
this.authSrv.login({ usuario: this.email, contrasena: this.password })
  .subscribe({
    next: () => {
      this.loading = false;
      Swal.fire({
        icon: 'success',
        title: 'Bienvenido',
        text: 'Inicio de sesión exitoso',
        confirmButtonColor: '#3085d6',
        timer: 1500,
        showConfirmButton: false
      });
      this.router.navigateByUrl('/dashboard/home');
    },
    error: (err: any) => {
      this.loading = false;
      const mensaje = err?.error || 'Credenciales inválidas';
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: mensaje,
        confirmButtonColor: '#d33'
      });
    }
  });
  }
}
