import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { UsuariosService, Usuario } from '../../../../core/services/usuarios.service';
import { UsuariosForm } from '../form/usuarios-form';

import { PermisoDirective } from '../../../../shared/directivas/permiso.directive';

import Swal from 'sweetalert2';

declare const feather: any;

interface UsuarioOrdenable extends Usuario {
  rol_nombre?: string;
  departamento_nombre?: string;
}

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, UsuariosForm, PermisoDirective],
  templateUrl: './usuarios-list.html',
  styleUrls: ['./usuarios-list.css']
})
export class UsuariosList implements OnInit, AfterViewInit {
 usuarios: UsuarioOrdenable[] = [];
usuariosFiltrados: UsuarioOrdenable[] = [];

  terminoBusqueda = '';
  criterioBusqueda: 'nombres' | 'apellidos' | 'usuario' | 'correo' | 'departamento' | 'rol' = 'nombres';
  page = 1;

  temaActual: 'light' | 'dark' = 'light';
  mostrarModal = false;
  editingId: number | null = null;

  
  constructor(private usuarioSrv: UsuariosService) {
 document.addEventListener("click", () => {
    this.menu.visible = false;
  });
  }



  ngOnInit(): void {
    this.cargarUsuarios();
    this.detectarTema();
  }

//ordenar tabla

// ============================================================
// ORDENAMIENTO UNIVERSAL
// ============================================================

orden = {
  columna: '' as keyof UsuarioOrdenable,
  asc: true
};

ordenarPor(columna: keyof UsuarioOrdenable) {
  if (this.orden.columna === columna) {
    this.orden.asc = !this.orden.asc;
  } else {
    this.orden.columna = columna;
    this.orden.asc = true;
  }

  this.usuariosFiltrados.sort((a, b) => {
    let x = a[columna];
    let y = b[columna];

    if (x == null) x = '';
    if (y == null) y = '';

    if (typeof x === 'string') x = x.toLowerCase();
    if (typeof y === 'string') y = y.toLowerCase();

    return this.orden.asc ? (x > y ? 1 : -1) : (x > y ? -1 : 1);
  });
}

getIconoOrden(columna: keyof UsuarioOrdenable) {
  if (this.orden.columna !== columna) {
    return 'fas fa-sort orden-icon neutro';
  }
  return this.orden.asc
    ? 'fas fa-sort-up orden-icon activo'
    : 'fas fa-sort-down orden-icon activo';
}
// ============================================================



// Menú flotante
menu = {
  visible: false,
  x: 0,
  y: 0,
  usuario: null as any
};

abrirMenu(event: MouseEvent, usuario: any) {
  event.stopPropagation();

  // Si ya está abierto para este usuario → cerrar
  if (this.menu.visible && this.menu.usuario?.id === usuario.id) {
    this.menu.visible = false;
    return;
  }

  const btn = event.currentTarget as HTMLElement;
  const rectBtn = btn.getBoundingClientRect();          // botón
  const tablaCard = btn.closest('.tabla-card') as HTMLElement;
  const rectTabla = tablaCard.getBoundingClientRect();  // contenedor

  // Ancho aproximado del menú (ajústalo si cambias el CSS)
  const MENU_WIDTH = 300;

  // Centro del botón, relativo al contenedor
  const centerBtnX = rectBtn.left - rectTabla.left + rectBtn.width / 2;

  this.menu = {
    visible: true,
    // centramos el menú en el botón
    x: centerBtnX - MENU_WIDTH / 2,
    y: rectBtn.bottom - rectTabla.top + 8,
    usuario
  };
}




editarDesdeMenu() {
  this.abrirEditar(this.menu.usuario.id);
  this.menu.visible = false;
}

eliminarDesdeMenu() {
  this.eliminar(this.menu.usuario.id);
  this.menu.visible = false;
}




  ngAfterViewInit(): void {
    setTimeout(() => feather?.replace(), 0);
    const observer = new MutationObserver(() => this.detectarTema());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  private refreshIcons(): void {
    setTimeout(() => feather?.replace(), 0);
  }

  private detectarTema(): void {
    const temaGuardado = localStorage.getItem('theme');
    this.temaActual = temaGuardado === 'dark' ? 'dark' : 'light';
  }

  cargarUsuarios(): void {
  this.usuarioSrv.getAll().subscribe({
    next: res => {
      this.usuarios = res.map(u => ({
        ...u,
        rol_nombre: u.rol?.nombre || '',
        departamento_nombre: u.departamento?.nombre || ''
      }));

      this.usuariosFiltrados = [...this.usuarios];
      this.refreshIcons();
    },
    error: err => console.error('Error al cargar usuarios', err)
  });
}


  filtrarUsuarios(): void {
    const t = this.terminoBusqueda.trim().toLowerCase();
    if (!t) {
      this.usuariosFiltrados = this.usuarios;
      this.page = 1;
      return;
    }
    this.usuariosFiltrados = this.usuarios.filter(u => {
      switch (this.criterioBusqueda) {
        case 'nombres': return u.nombres?.toLowerCase().includes(t);
        case 'apellidos': return `${u.apellido_paterno} ${u.apellido_materno}`.toLowerCase().includes(t);
        case 'usuario': return u.usuario?.toLowerCase().includes(t);
        case 'correo': return u.correo?.toLowerCase().includes(t);
        case 'departamento': return u.departamento?.nombre?.toLowerCase().includes(t) || false;
        case 'rol': return u.rol?.nombre?.toLowerCase().includes(t) || false;
        default: return false;
      }
    });
    this.page = 1;
  }

  // === MODAL CONTROL ===
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
  }

  onSaved(): void {
    this.cargarUsuarios();
    this.cerrarModal();
  }

 eliminar(id: number): void {
  Swal.fire({
    title: '¿Eliminar usuario?',
    text: 'Esta acción no se puede deshacer.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      this.usuarioSrv.delete(id).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Eliminado',
            text: 'El usuario ha sido eliminado correctamente.',
            confirmButtonColor: '#3085d6',
            timer: 1500,
            showConfirmButton: false
          });
          this.cargarUsuarios();
        },
        error: (err) => {
          console.error('Error al eliminar', err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo eliminar el usuario.',
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  });
}
}
