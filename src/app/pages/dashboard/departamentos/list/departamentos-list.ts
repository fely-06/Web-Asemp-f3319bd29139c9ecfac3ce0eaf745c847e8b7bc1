import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { DepartamentosService } from '../../../../core/services/departamentos.service';
import { DepartamentosFormComponent } from '../form/departamentos-form'; // ← Importación 

import { PermisoDirective } from '../../../../shared/directivas/permiso.directive';

import Swal from 'sweetalert2';

declare const feather: any;

@Component({
  selector: 'app-departamentos-list',
  standalone: true,
  templateUrl: './departamentos-list.html',
  styleUrls: ['./departamentos-list.css'],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NgxPaginationModule,
    DepartamentosFormComponent, // ← Agregar esta importación
    PermisoDirective
  ]
})
export class DepartamentosList implements OnInit, AfterViewInit {

  // ==============================
  // VARIABLES PRINCIPALES
  // ==============================

  departamentos: any[] = [];            
  departamentosFiltrados: any[] = [];   
  terminoBusqueda = '';                
  criterioBusqueda: 'nombre' | 'descripcion' = 'nombre';
  page = 1;                            
  temaActual: 'light' | 'dark' = 'light';
  
  // ==============================
  // VARIABLES PARA EL MODAL
  // ==============================
  mostrarModal = false;
  editingId: number | null = null;

  constructor(private departamentosService: DepartamentosService) {
    document.addEventListener('click', () => {
      this.menu.visible = false;
    });
  }

  // ==============================
  // MENÚ FLOTANTE
  // ==============================

  menu = {
    visible: false,
    x: 0,
    y: 0,
    departamento: null as any
  };

  abrirMenu(event: MouseEvent, departamento: any) {
    event.stopPropagation();

    if (this.menu.visible && this.menu.departamento?.id === departamento.id) {
      this.menu.visible = false;
      return;
    }

    const btn = event.currentTarget as HTMLElement;
    const rectBtn = btn.getBoundingClientRect();

    const tablaCard = btn.closest('.tabla-card') as HTMLElement;
    const rectTabla = tablaCard.getBoundingClientRect();

    const MENU_WIDTH = 300;
    const centerBtnX = rectBtn.left - rectTabla.left + rectBtn.width / 2;

    this.menu = {
      visible: true,
      x: centerBtnX - MENU_WIDTH / 2,
      y: rectBtn.bottom - rectTabla.top + 8,
      departamento
    };
  }

  editarDesdeMenu() {
    this.abrirEditar(this.menu.departamento.id);
    this.menu.visible = false;
  }

  eliminarDesdeMenu() {
    this.eliminar(this.menu.departamento.id);
    this.menu.visible = false;
  }

  // ==============================
  // CONTROL DEL MODAL
  // ==============================

  abrirModalNuevo(): void {
    this.editingId = null;
    this.mostrarModal = true;
  }

  abrirEditar(id: number): void {
    this.editingId = id;
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.editingId = null;
  }

  onSaved(): void {
    this.cargarDepartamentos();
    this.cerrarModal();
  }

  // ==============================
  // CICLO DE VIDA
  // ==============================

  ngOnInit(): void {
    this.cargarDepartamentos();
    this.detectarTema();
  }
// ============================================================
// ORDENAMIENTO UNIVERSAL
// ============================================================

orden = {
  columna: '',
  asc: true
};

ordenarPor(columna: string) {
  if (this.orden.columna === columna) {
    this.orden.asc = !this.orden.asc;
  } else {
    this.orden.columna = columna;
    this.orden.asc = true;
  }

  this.departamentosFiltrados.sort((a, b) => {
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



  ngAfterViewInit(): void {
    setTimeout(() => feather?.replace(), 0);
    const observer = new MutationObserver(() => this.detectarTema());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  // ==============================
  // MÉTODOS INTERNOS DE TEMA E ÍCONOS
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

  cargarDepartamentos(): void {
    this.departamentosService.lista().subscribe({
      next: res => {
        this.departamentos = res;
        this.departamentosFiltrados = res;
        this.refreshIcons();
      },
      error: err => console.error('Error al cargar departamentos', err)
    });
  }

  // ==============================
  // FILTRO DE BÚSQUEDA
  // ==============================

  filtrarDepartamentos(): void {
    const t = this.terminoBusqueda.trim().toLowerCase();

    if (!t) {
      this.departamentosFiltrados = this.departamentos;
      this.page = 1;
      return;
    }

    this.departamentosFiltrados = this.departamentos.filter(d => {
      switch (this.criterioBusqueda) {
        case 'nombre': return d.nombre?.toLowerCase().includes(t);
        case 'descripcion': return d.descripcion?.toLowerCase().includes(t);
        default: return false;
      }
    });

    this.page = 1;
  }

  // ==============================
  // ELIMINAR DEPARTAMENTO
  // ==============================

  eliminar(id: number): void {
    Swal.fire({
      title: '¿Eliminar departamento?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.departamentosService.eliminar(id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Eliminado',
              text: 'El departamento ha sido eliminado correctamente.',
              confirmButtonColor: '#3085d6',
              timer: 1500,
              showConfirmButton: false
            });
            this.cargarDepartamentos();
          },
          error: () => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo eliminar el departamento.',
              confirmButtonColor: '#d33'
            });
          }
        });
      }
    });
  }
}