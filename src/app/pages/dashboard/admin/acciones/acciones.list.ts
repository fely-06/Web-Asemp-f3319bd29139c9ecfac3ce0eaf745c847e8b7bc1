import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import Swal from 'sweetalert2';
import { AccionesService } from '../../../../core/services/acciones.service';

import { PermisoDirective } from '../../../../shared/directivas/permiso.directive';

declare const feather: any;

@Component({
  selector: 'app-acciones-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule,PermisoDirective],
  templateUrl: './acciones.list.html',
  styleUrls: ['./acciones.list.css']
})
export class AccionesList implements OnInit {

  // Variables principales
  acciones: any[] = [];
  accionesFiltradas: any[] = [];
  busqueda = '';
  page = 1;

  

  // Variables para el modal
  modalAbierto = false;
  editando = false;
  form: any = { 
    id: 0,
    nombre: '',
    catalogo_id: null
  };

  // Variables para el menú flotante
  menu = {
    visible: false,
    x: 0,
    y: 0,
    accion: null as any
  };

  constructor(private accionesSrv: AccionesService) {
    // Cerrar menú al hacer clic en cualquier parte
    document.addEventListener('click', () => {
      this.menu.visible = false;
    });
  }

  ngOnInit(): void {
    this.cargar();
    this.refrescarIconos();
  }


  //paginado
  getMostrando(): number {
  const inicio = (this.page - 1) * 8;
  const fin = this.page * 8;

  return this.accionesFiltradas.slice(inicio, fin).length;
}


// === ORDENAMIENTO ===
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

  this.accionesFiltradas.sort((a, b) => {
    let x = a[columna];
    let y = b[columna];

    if (x == null) x = '';
    if (y == null) y = '';

    if (typeof x === 'string') x = x.toLowerCase();
    if (typeof y === 'string') y = y.toLowerCase();

    return this.orden.asc ? (x > y ? 1 : -1) : (x > y ? -1 : 1);
  });
}

// Devuelve la clase del ícono según el estado
getIconoOrden(columna: string) {
  if (this.orden.columna !== columna) {
    // Columna sin ordenar
    return 'fas fa-sort orden-icon neutro';
  }
  // Columna activa
  return this.orden.asc
    ? 'fas fa-sort-up orden-icon activo'
    : 'fas fa-sort-down orden-icon activo';
}



  // ==============================
  // MENÚ FLOTANTE
  // ==============================
abrirMenu(event: MouseEvent, accion: any) {
  event.stopPropagation();

  if (this.menu.visible && this.menu.accion?.id === accion.id) {
    this.menu.visible = false;
    return;
  }

  const btn = event.currentTarget as HTMLElement;
  const rectBtn = btn.getBoundingClientRect();

  const tablaCard = btn.closest('.tabla-card') as HTMLElement;
  const rectTabla = tablaCard.getBoundingClientRect();

  const MENU_WIDTH = 250;
  const centerBtnX = rectBtn.left - rectTabla.left + rectBtn.width / 2;

  this.menu = {
    visible: true,
    x: centerBtnX - MENU_WIDTH / 2,
    y: rectBtn.bottom - rectTabla.top + 12,
    accion
  };
}

  editarDesdeMenu() {
    this.abrirModal(this.menu.accion);
    this.menu.visible = false;
  }

  eliminarDesdeMenu() {
    this.eliminar(this.menu.accion.id);
    this.menu.visible = false;
  }

  // ==============================
  // CARGAR DATOS
  // ==============================
  cargar() {
    this.accionesSrv.getAcciones().subscribe({
      next: res => {
        this.acciones = res;
        this.accionesFiltradas = res;
        this.refrescarIconos();
      },
      error: err => {
        console.error('Error al cargar acciones', err);
        Swal.fire('Error', 'No se pudieron cargar las acciones', 'error');
      }
    });
  }

  // ==============================
  // FILTRAR
  // ==============================
  filtrarAcciones() {
    const t = this.busqueda.toLowerCase();
    if (!t) {
      this.accionesFiltradas = this.acciones;
    } else {
      this.accionesFiltradas = this.acciones.filter(a =>
        a.nombre?.toLowerCase().includes(t) ||
        (a.catalogo_id && String(a.catalogo_id).includes(t))
      );
    }
    this.page = 1;
    this.refrescarIconos();
  }

  // ==============================
  // MODAL - ABRIR
  // ==============================
  abrirModal(accion: any = null) {
    this.modalAbierto = true;

    if (accion) {
      this.editando = true;
      this.form = { ...accion };
    } else {
      this.editando = false;
      this.form = { 
        id: 0,
        nombre: '',
        catalogo_id: null
      };
    }

    // Prevenir scroll del body cuando el modal está abierto
    document.body.classList.add('modal-open');
    this.refrescarIconos();
  }

  // ==============================
  // MODAL - CERRAR
  // ==============================
  cerrarModal() {
    this.modalAbierto = false;
    this.editando = false;
    this.form = { 
      id: 0,
      nombre: '',
      catalogo_id: null
    };
    
    // Restaurar scroll del body
    document.body.classList.remove('modal-open');
    this.refrescarIconos();
  }

  // ==============================
  // GUARDAR (CREAR O EDITAR)
  // ==============================
  guardar() {
    // Validaciones
    if (!this.form.nombre || this.form.nombre.trim().length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'El nombre de la acción es obligatorio',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    if (this.form.nombre.trim().length < 2) {
      Swal.fire({
        icon: 'warning',
        title: 'Nombre muy corto',
        text: 'El nombre de la acción debe tener al menos 2 caracteres',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    const body = {
      nombre: this.form.nombre.trim(),
      catalogo_id: this.form.catalogo_id || null
    };

    if (this.editando) {
      // EDITAR ACCIÓN
      this.accionesSrv.updateAccion(this.form.id, body).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Actualizada',
            text: 'Acción actualizada correctamente',
            confirmButtonColor: '#3085d6',
            timer: 1500
          });
          this.cerrarModal();
          this.cargar();
        },
        error: (err) => {
          console.error('Error al actualizar acción', err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo actualizar la acción',
            confirmButtonColor: '#d33'
          });
        }
      });
    } else {
      // CREAR NUEVA ACCIÓN
      this.accionesSrv.createAccion(body).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Creada',
            text: 'Acción creada correctamente',
            confirmButtonColor: '#3085d6',
            timer: 1500
          });
          this.cerrarModal();
          this.cargar();
        },
        error: (err) => {
          console.error('Error al crear acción', err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo crear la acción',
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }

  // ==============================
  // ELIMINAR
  // ==============================
  eliminar(id: number) {
    Swal.fire({
      title: '¿Eliminar acción?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.accionesSrv.deleteAccion(id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Eliminada',
              text: 'La acción ha sido eliminada correctamente.',
              confirmButtonColor: '#3085d6',
              timer: 1500,
              showConfirmButton: false
            });
            this.cargar();
          },
          error: (err) => {
            console.error('Error al eliminar acción', err);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo eliminar la acción.',
              confirmButtonColor: '#d33'
            });
          }
        });
      }
    });
  }

  // ==============================
  // REFRESCAR ÍCONOS FEATHER
  // ==============================
  private refrescarIconos() {
    setTimeout(() => {
      if ((window as any).feather) {
        (window as any).feather.replace();
      }
    }, 50);
  }

  // ==============================
  // CERRAR MODAL CON TECLA ESC
  // ==============================
 /* @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent) {
    if (this.modalAbierto) {
      this.cerrarModal();
    }
    if (this.menu.visible) {
      this.menu.visible = false;
    }
  }*/
}