import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { ClientesService, ClienteLista, ClienteDetalle } from '../../../../core/services/clientes.service';

import { ClientesFormComponent } from '../form/clientes-form';

import { PermisoDirective } from '../../../../shared/directivas/permiso.directive';



import Swal from 'sweetalert2';

declare const feather: any;

interface ClienteListaOrdenable extends ClienteLista {
  rfc?: string;
  fecha_vigencia?: string;
}

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, ClientesFormComponent, PermisoDirective],
  templateUrl: './clientes-list.html',
  styleUrls: ['./clientes-list.css']
})
export class ClientesListComponent implements OnInit, AfterViewInit {

  // ==============================
  // VARIABLES PRINCIPALES
  // ==============================

  clientes: ClienteListaOrdenable[] = [];
clientesFiltrados: ClienteListaOrdenable[] = [];
  // lista filtrada para búsqueda
  terminoBusqueda = '';                // texto del input de búsqueda
  criterioBusqueda: 'razon_social' | 'rfc' | 'correo' | 'telefono' = 'razon_social'; // criterio seleccionado
  page = 1;                            // página actual para paginación

  temaActual: 'light' | 'dark' = 'light'; // modo visual actual
  mostrarModal = false;                   // controla la visibilidad del formulario modal
  editingId: number | null = null;        // ID del cliente a editar (null = nuevo registro)

  constructor(private clienteSrv: ClientesService) {
    document.addEventListener('click', () => {
    this.menu.visible = false;
  });
  }

  // ==============================
  // CICLO DE VIDA
  // ==============================

  ngOnInit(): void {
    this.cargarClientes();   // carga inicial de datos
    this.detectarTema();     // aplica modo claro/oscuro
  }

// ============================================================
// ORDENAMIENTO UNIVERSAL
// ============================================================



// ============================================================
// ORDENAMIENTO UNIVERSAL
// ============================================================

orden = {
  columna: '' as keyof ClienteListaOrdenable,
  asc: true
};

ordenarPor(columna: keyof ClienteListaOrdenable) {
  if (this.orden.columna === columna) {
    this.orden.asc = !this.orden.asc;
  } else {
    this.orden.columna = columna;
    this.orden.asc = true;
  }

  this.clientesFiltrados.sort((a, b) => {
    let x: any = a[columna];
    let y: any = b[columna];

    if (x == null) x = '';
    if (y == null) y = '';

    if (typeof x === 'string') x = x.toLowerCase();
    if (typeof y === 'string') y = y.toLowerCase();

    return this.orden.asc ? (x > y ? 1 : -1) : (x > y ? -1 : 1);
  });
}

getIconoOrden(columna: keyof ClienteListaOrdenable) {
  if (this.orden.columna !== columna) {
    return 'fas fa-sort orden-icon neutro';
  }
  return this.orden.asc
    ? 'fas fa-sort-up orden-icon activo'
    : 'fas fa-sort-down orden-icon activo';
}

// ==============================




menu = {
  visible: false,
  x: 0,
  y: 0,
  cliente: null as any
};
abrirMenu(event: MouseEvent, cliente: any) {
  event.stopPropagation();

  if (this.menu.visible && this.menu.cliente?.id === cliente.id) {
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
    cliente
  };
}
editarDesdeMenu() {
  this.abrirEditar(this.menu.cliente.id);
  this.menu.visible = false;
}

eliminarDesdeMenu() {
  this.eliminar(this.menu.cliente.id);
  this.menu.visible = false;
}




  ngAfterViewInit(): void {
    // Reemplaza íconos Feather después de renderizar la vista
    setTimeout(() => feather?.replace(), 0);

    // Observa cambios de tema dinámicamente
    const observer = new MutationObserver(() => this.detectarTema());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  // ==============================
  // MÉTODOS INTERNOS DE TEMA E ÍCONOS
  // ==============================

  private refreshIcons(): void {
    // Refresca íconos cuando cambian los datos
    setTimeout(() => feather?.replace(), 0);
  }

  private detectarTema(): void {
    // Detecta el tema almacenado en localStorage
    const temaGuardado = localStorage.getItem('theme');
    this.temaActual = temaGuardado === 'dark' ? 'dark' : 'light';
  }

  // ==============================
  // CRUD - OBTENER DATOS
  // ==============================

 cargarClientes(): void {
  this.clienteSrv.getLista().subscribe({
    next: res => {
      this.clientes = res.map(c => ({
        ...c,
        rfc: c.certificado?.rfc || '',
        fecha_vigencia: c.certificado?.fecha_vigencia_fin || ''

      }));

      this.clientesFiltrados = [...this.clientes];
      this.refreshIcons();
    },
    error: err => console.error('Error al cargar clientes', err)
  });
}

  // ==============================
  // FILTRO DE BÚSQUEDA
  // ==============================

  filtrarClientes(): void {
    const t = this.terminoBusqueda.trim().toLowerCase();

    // Si el campo de búsqueda está vacío, restaura lista completa
    if (!t) {
      this.clientesFiltrados = this.clientes;
      this.page = 1;
      return;
    }

    // Filtra clientes según el criterio seleccionado
    this.clientesFiltrados = this.clientes.filter(c => {
      switch (this.criterioBusqueda) {
        case 'razon_social': return c.razon_social?.toLowerCase().includes(t);
        case 'rfc': return c.certificado?.rfc?.toLowerCase().includes(t);
        case 'correo': return c.correo_electronico?.toLowerCase().includes(t);
        case 'telefono': return c.telefono?.includes(t);
        default: return false;
      }
    });

    this.page = 1; // reinicia la paginación
  }

  // ==============================
  // CONTROL DEL FORMULARIO MODAL
  // ==============================

  abrirModalNuevo(): void {
    // Abre el modal en modo “nuevo cliente”
    this.editingId = null;
    this.mostrarModal = true;
  }

  abrirEditar(id: number): void {
    // Abre el modal con los datos de un cliente existente
    this.editingId = id;
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    // Cierra el modal sin guardar
    this.mostrarModal = false;
  }

  onSaved(): void {
    // Refresca lista tras guardar y cierra el modal
    this.cargarClientes();
    this.cerrarModal();
  }

  // ==============================
  // ELIMINAR CLIENTE
  // ==============================

  eliminar(id: number): void {
    Swal.fire({
      title: '¿Eliminar cliente?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        // Llama al servicio para eliminar el cliente
        this.clienteSrv.eliminar(id).subscribe({
          next: () => {
            // Éxito
            Swal.fire({
              icon: 'success',
              title: 'Eliminado',
              text: 'El cliente ha sido eliminado correctamente.',
              confirmButtonColor: '#3085d6',
              timer: 1500,
              showConfirmButton: false
            });
            this.cargarClientes();
          },
          error: () => {
            // Error
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo eliminar el cliente.',
              confirmButtonColor: '#d33'
            });
          }
        });
      }
    });
  }
}
