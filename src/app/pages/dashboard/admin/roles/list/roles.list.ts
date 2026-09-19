import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import Swal from 'sweetalert2';
import { RolesService } from '../../../../../core/services/roles.service';

import { RolesAcciones } from '../../roles.acciones/roles.acciones';

import { PermisoDirective } from '../../../../../shared/directivas/permiso.directive';




declare const feather: any;

@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, RolesAcciones,PermisoDirective],
  templateUrl: './roles.list.html',
  styleUrls: ['./roles.list.css']
})
export class RolesList implements OnInit {

  // Mantener las variables existentes pero agregar solo mejoras visuales
  roles: any[] = [];
  rolesFiltrados: any[] = [];
  busqueda = '';
  page = 1;

  modalAbierto = false;
  editando = false;
  form: any = { id: 0, nombre: '', descripcion: '' };

  // ==============================
  // VARIABLES PARA EL MENÚ FLOTANTE
  // ==============================
  menu = {
    visible: false,
    x: 0,
    y: 0,
    rol: null as any
  };

  
  constructor(private rolesSrv: RolesService) {
    // Cerrar menú al hacer clic en cualquier parte
    document.addEventListener('click', () => {
      this.menu.visible = false;
    });
  }

  ngOnInit(): void {
    this.cargar();
    this.refrescarIconos();
  }

  //ordenar tabla
  // ORDENAMIENTO UNIVERSAL
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

  this.rolesFiltrados.sort((a, b) => {
    let x = a[columna];
    let y = b[columna];

    if (x == null) x = '';
    if (y == null) y = '';

    if (typeof x === 'string') x = x.toLowerCase();
    if (typeof y === 'string') y = y.toLowerCase();

    return this.orden.asc ? (x > y ? 1 : -1) : (x > y ? -1 : 1);
  });
}

// Icono para encabezados
getIconoOrden(columna: string) {
  if (this.orden.columna !== columna) {
    return 'fas fa-sort orden-icon neutro';
  }
  return this.orden.asc
    ? 'fas fa-sort-up orden-icon activo'
    : 'fas fa-sort-down orden-icon activo';
}


  // ==============================
  // MENÚ FLOTANTE
  // ==============================
  abrirMenu(event: MouseEvent, rol: any) {
    event.stopPropagation();

    // Si el menú ya está abierto para este rol, cerrarlo
    if (this.menu.visible && this.menu.rol?.id === rol.id) {
      this.menu.visible = false;
      return;
    }

    const btn = event.currentTarget as HTMLElement;
    const rectBtn = btn.getBoundingClientRect();

    // Obtener la posición del contenedor de la tabla
    const tablaCard = btn.closest('.tabla-card') as HTMLElement;
    const rectTabla = tablaCard.getBoundingClientRect();

    const MENU_WIDTH = 250;
    const centerBtnX = rectBtn.left - rectTabla.left + rectBtn.width / 2;

    this.menu = {
      visible: true,
      x: centerBtnX - MENU_WIDTH / 2,
      y: rectBtn.bottom - rectTabla.top + 8,
      rol
    };
  }

  editarDesdeMenu() {
    this.abrirModal(this.menu.rol);
    this.menu.visible = false;
  }

  eliminarDesdeMenu() {
    this.eliminar(this.menu.rol.id);
    this.menu.visible = false;
  }



  //modulo o modal de permisos
  // Variable para abrir modal de permisos
mostrarPermisos = false;
rolSeleccionado: any = null;

abrirPermisos() {
  this.cerrarMenu();
  setTimeout(() => {
    this.rolSeleccionado = this.menu.rol;
    this.mostrarPermisos = true;
  }, 10);
}


cerrarPermisos() {
  this.mostrarPermisos = false;
}

cerrarMenu() {
  this.menu.visible = false;
}




  // ============================================================
  // Cargar roles desde API
  // ============================================================
  cargar() {
    this.rolesSrv.getRoles().subscribe({
      next: res => {
        this.roles = res;
        this.rolesFiltrados = res;
        this.refrescarIconos();
      }
    });
  }

  // ============================================================
  // Filtro de búsqueda
  // ============================================================
  filtrar() {
    const t = this.busqueda.toLowerCase();
    this.rolesFiltrados = this.roles.filter(r =>
      r.nombre.toLowerCase().includes(t) ||
      r.descripcion.toLowerCase().includes(t)
    );
    this.page = 1;
    this.refrescarIconos();
  }

  // ============================================================
  // Abrir modal (crear o editar)
  // ============================================================
  abrirModal(rol: any = null) {
    this.modalAbierto = true;

    if (rol) {
      this.editando = true;
      this.form = { ...rol };
    } else {
      this.editando = false;
      this.form = { id: 0, nombre: '', descripcion: '' };
    }

    this.refrescarIconos();
  }

  // ============================================================
  // Cerrar modal
  // ============================================================
  cerrarModal() {
    this.modalAbierto = false;
    this.refrescarIconos();
  }

  // ============================================================
  // Guardar (crear o editar)
  // ============================================================
  guardar() {
    if (!this.form.nombre.trim()) {
      Swal.fire('Error', 'El nombre del rol es obligatorio.', 'error');
      return;
    }

    if (this.editando) {
      // --- EDITAR ---
      this.rolesSrv.updateRol(this.form.id, this.form).subscribe({
        next: () => {
          Swal.fire('Correcto', 'Rol actualizado.', 'success');
          this.cerrarModal();
          this.cargar();
        }
      });
    } else {
      // --- CREAR ---
      this.rolesSrv.createRol(this.form).subscribe({
        next: () => {
          Swal.fire('Correcto', 'Rol creado.', 'success');
          this.cerrarModal();
          this.cargar();
        }
      });
    }
  }

  // ============================================================
  // Eliminar
  // ============================================================
  eliminar(id: number) {
    Swal.fire({
      title: '¿Eliminar rol?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (res.isConfirmed) {
        this.rolesSrv.deleteRol(id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'El rol fue eliminado.', 'success');
            this.cargar();
          }
        });
      }
    });
  }

  // ============================================================
  // Refresca íconos Feather cuando cambian elementos en pantalla
  // ============================================================
  private refrescarIconos() {
    setTimeout(() => {
      if ((window as any).feather) {
        (window as any).feather.replace();
      }
    }, 50);
  }
}