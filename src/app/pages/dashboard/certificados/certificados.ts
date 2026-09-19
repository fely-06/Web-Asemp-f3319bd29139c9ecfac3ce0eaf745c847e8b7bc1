import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { HttpResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { CertificadosService } from '../../../core/services/certificados.service';

declare const feather: any;

@Component({
  selector: 'app-certificados',
  standalone: true,
  templateUrl: './certificados.html',
  styleUrls: ['./certificados.css'],
  imports: [
    CommonModule,
    FormsModule,
    NgxPaginationModule
  ]
})
export class CertificadosComponent implements OnInit, AfterViewInit {



// 👇 roles
  esAdmin = false;
  esEmpleado = false;
  esCliente = false;
  
  // ==============================
  // VARIABLES PRINCIPALES (IGUAL QUE DEPARTAMENTOS)
  // ==============================

  certificados: any[] = [];            
  certificadosFiltrados: any[] = [];   
  terminoBusqueda = '';                
  criterioBusqueda: 'cliente' | 'rfc' | 'id' = 'cliente';
  page = 1;                            
  temaActual: 'light' | 'dark' = 'light';
  
  // ==============================
  // ORDENAMIENTO (IGUAL QUE DEPARTAMENTOS)
  // ==============================

  orden = {
    columna: '',
    asc: true
  };

  constructor(private certificadosService: CertificadosService) {
    this.detectarTema();
  }

  // ==============================
  // CICLO DE VIDA
  // ==============================

  ngOnInit(): void {
  const rol = localStorage.getItem('rol');

  this.esAdmin = rol === 'Administrador';
  this.esEmpleado = rol === 'Empleado';
  this.esCliente = rol === 'Cliente';

  this.cargarCertificados();
}


  ngAfterViewInit(): void {
    setTimeout(() => feather?.replace(), 0);
    const observer = new MutationObserver(() => this.detectarTema());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  // ==============================
  // TEMA E ÍCONOS
  // ==============================

  private refreshIcons(): void {
    setTimeout(() => feather?.replace(), 0);
  }

  private detectarTema(): void {
    const temaGuardado = localStorage.getItem('theme');
    this.temaActual = temaGuardado === 'dark' ? 'dark' : 'light';
  }

  // ==============================
  // CRUD - OBTENER DATOS
  // ==============================

  cargarCertificados(): void {
    this.certificadosService.listar().subscribe({
      next: res => {
        this.certificados = res;
        this.certificadosFiltrados = res;
        this.refreshIcons();
      },
      error: err => console.error('Error al cargar certificados', err)
    });
  }

  // ==============================
  // FILTRO DE BÚSQUEDA (IGUAL QUE DEPARTAMENTOS)
  // ==============================

  filtrarCertificados(): void {
    const t = this.terminoBusqueda.trim().toLowerCase();

    if (!t) {
      this.certificadosFiltrados = this.certificados;
      this.page = 1;
      return;
    }

    this.certificadosFiltrados = this.certificados.filter(c => {
      switch (this.criterioBusqueda) {
        case 'cliente': 
          return c.cliente?.toLowerCase().includes(t);
        case 'rfc': 
          return c.rfc?.toLowerCase().includes(t);
        case 'id': 
          return c.id?.toString().includes(t);
        default: 
          return false;
      }
    });

    this.page = 1;
  }

  // ==============================
  // ORDENAMIENTO (IGUAL QUE DEPARTAMENTOS)
  // ==============================

  ordenarPor(columna: string) {
    if (this.orden.columna === columna) {
      this.orden.asc = !this.orden.asc;
    } else {
      this.orden.columna = columna;
      this.orden.asc = true;
    }

    this.certificadosFiltrados.sort((a, b) => {
      let x = a[columna];
      let y = b[columna];

      if (x == null) x = '';
      if (y == null) y = '';

      if (typeof x === 'string') x = x.toLowerCase();
      if (typeof y === 'string') y = y.toLowerCase();

      return this.orden.asc ? (x > y ? 1 : -1) : (x > y ? -1 : 1);
    });
  }

  getIconoOrden(columna: string) {
    if (this.orden.columna !== columna) {
      return 'fas fa-sort orden-icon neutro';
    }
    return this.orden.asc
      ? 'fas fa-sort-up orden-icon activo'
      : 'fas fa-sort-down orden-icon activo';
  }

  // ==============================
  // DESCARGA DE ARCHIVOS
  // ==============================

  descargar(c: any, tipo: 'cer' | 'key' | 'pfx') {
    this.certificadosService.descargar(c.id, tipo).subscribe({
      next: (resp: HttpResponse<Blob>) => {
        const nombre = this.getNombreArchivo(c, tipo);
        const blob = resp.body as Blob;
        this.descargarArchivo(blob, nombre);
      },
      error: (e) => {
        const msg = e?.error || 'No se pudo descargar el archivo';
        Swal.fire('Error', msg, 'error');
      }
    });
  }

  // ==============================
  // VER CONTRASEÑA
  // ==============================

  verPassword(c: any) {
    // Si no tienes método getPassword, usa lo que ya tienes en el objeto
    const password = c.password || c.contrasena || c.clave || 'No disponible';
    
    Swal.fire({
      title: `Contraseña para ${c.rfc}`,
      html: `
        <div class="text-center">
          <p class="mb-2">Cliente: <strong>${c.cliente}</strong></p>
          <p class="mb-3">RFC: <code>${c.rfc}</code></p>
          <div class="password-display mb-3">
            <code style="font-size: 1.2rem; background: #f8f9fa; padding: 0.5rem 1rem; border-radius: 6px;">
              ${password}
            </code>
          </div>
          <small class="text-muted">Esta información es confidencial</small>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#0d6efd'
    });
  }

  private getNombreArchivo(c: any, tipo: 'cer' | 'key' | 'pfx'): string {
    const base = (c?.rfc || `certificado_${c?.id || ''}`).trim();
    return `${base}.${tipo}`;
  }

  private descargarArchivo(blob: Blob, nombre: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}