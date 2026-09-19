// cobros-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { CobrosClientesService, CobroCliente } from '../../../../core/services/cobros-clientes.service';
import { ClientesService } from '../../../../core/services/clientes.service';
import { CobrosFormComponent } from '../form/cobros-form';
import { FormsModule } from '@angular/forms';
import { CobroPagoModalComponent } from '../cobro-pago-modal/cobro-pago-modal.component';
import { HttpResponse } from '@angular/common/http';
import { NgxPaginationModule } from 'ngx-pagination';
import Swal from 'sweetalert2';

import { AuthService } from '../../../../core/services/auth.service';

declare const feather: any;

@Component({
  selector: 'app-cobros-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    CobrosFormComponent,
    CobroPagoModalComponent,
    NgxPaginationModule
  ],
  templateUrl: './cobros-list.html',
  styleUrls: ['./cobros-list.css']
})
export class CobrosListComponent implements OnInit {

  // ==============================
  // VARIABLES PRINCIPALES
  // ==============================
  lista: any[] = [];
  page = 1;
  temaActual: 'light' | 'dark' = 'light';

  showForm = false;
  idEditar: number | null = null;

  filtroMes = new Date().getMonth() + 1;
  filtroAnio = new Date().getFullYear();
  texto: string = "";
  modoFiltro: string = "todos";

  // ==============================
  // MODAL DE PAGO
  // ==============================
  modalAbierto = false;
  cobroSeleccionado: any = null;

  // ==============================
  // MENÚ FLOTANTE
  // ==============================
  menu = {
    visible: false,
    x: 0,
    y: 0,
    cobro: null as any
  };

  // ==============================
  // ORDENAMIENTO
  // ==============================
  orden = {
    columna: '',
    asc: true
  };

  constructor(
    private apiCobros: CobrosClientesService,
    private apiClientes: ClientesService,
    private authSrv: AuthService
  ) {
    document.addEventListener('click', () => {
      this.menu.visible = false;
    });
  }

esAdmin = false;
esEmpleado = false;
esCliente = false;

// permisos derivados
puedeGestionar = false; // pagar, editar, eliminar
ngOnInit() {
  this.authSrv.getPerfil().subscribe({
    next: (res: any) => {
      const rol = res.rol;

      this.esAdmin = rol === 'Administrador';
      this.esEmpleado = rol === 'Empleado';
      this.esCliente = rol === 'Cliente';

      // Admin y Empleado gestionan
      this.puedeGestionar = this.esAdmin || this.esEmpleado;

      // 🔴 CLAVE: filtro inicial
      this.modoFiltro = 'todos';

      // 🔴 CLAVE: primera carga
      this.cargar();

      this.detectarTema();
    },
    error: () => {
      // fallback seguro
      this.modoFiltro = 'todos';
      this.cargar();
      this.detectarTema();
    }
  });
}


  // ==============================
  // CARGA DE COBROS
  // ==============================
cargar() {
  const params: any = {};

  if (this.filtroMes) params.mes = this.filtroMes;
  if (this.filtroAnio) params.anio = this.filtroAnio;
  if (this.texto) params.texto = this.texto;

  // flags
  if (this.modoFiltro === 'pendientes') params.pendientes = true;
  if (this.modoFiltro === 'pagados') params.pagados = true;
  if (this.modoFiltro === 'atrasados') params.atrasados = true;

  // ✅ fallback: si no mandaste ninguno, manda TODOS
  if (!params.pendientes && !params.pagados && !params.atrasados) {
    params.todos = true;
  }

  this.apiCobros.lista(params).subscribe({
    next: res => {
      this.lista = res;
      if (this.orden.columna) this.aplicarOrdenamiento();
    }
  });
}


cambiarModo(modo: 'todos' | 'pendientes' | 'pagados' | 'atrasados') {
  this.modoFiltro = modo;
  this.cargar();
}


  // ==============================
  // MÉTODOS DEL MENÚ FLOTANTE
  // ==============================
  abrirMenu(event: MouseEvent, cobro: any) {
    event.stopPropagation();

    if (this.menu.visible && this.menu.cobro?.id === cobro.id) {
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
      cobro
    };
  }

  editarDesdeMenu() {
    this.editar(this.menu.cobro.id);
    this.menu.visible = false;
  }

  abrirModalPagoDesdeMenu() {
    this.abrirModalPago(this.menu.cobro);
    this.menu.visible = false;
  }

  verReciboDesdeMenu() {
    this.verRecibo(this.menu.cobro);
    this.menu.visible = false;
  }

  eliminarDesdeMenu() {
    this.eliminarCobro(this.menu.cobro);
    this.menu.visible = false;
  }

  // ==============================
  // ORDENAMIENTO
  // ==============================
  ordenarPor(columna: string) {
    if (this.orden.columna === columna) {
      this.orden.asc = !this.orden.asc;
    } else {
      this.orden.columna = columna;
      this.orden.asc = true;
    }
    this.aplicarOrdenamiento();
  }

  aplicarOrdenamiento() {
    this.lista.sort((a, b) => {
      let x = a[this.orden.columna];
      let y = b[this.orden.columna];

      if (x == null) x = '';
      if (y == null) y = '';

      if (typeof x === 'string') x = x.toLowerCase();
      if (typeof y === 'string') y = y.toLowerCase();

      return this.orden.asc ? (x > y ? 1 : -1) : (x > y ? -1 : 1);
    });
  }

  getIconoOrden(columna: string) {
    if (this.orden.columna !== columna) {
      return 'fas fa-sort orden-icon';
    }
    return this.orden.asc
      ? 'fas fa-sort-up orden-icon activo'
      : 'fas fa-sort-down orden-icon activo';
  }

  // ==============================
  // DETECCIÓN DE TEMA
  // ==============================
  private detectarTema() {
    const temaGuardado = localStorage.getItem('theme');
    this.temaActual = temaGuardado === 'dark' ? 'dark' : 'light';
  }

  ngAfterViewInit(): void {
    setTimeout(() => feather?.replace(), 0);
    const observer = new MutationObserver(() => this.detectarTema());
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['data-theme'] 
    });
  }

  // ==============================
  // DATOS
  // ==============================
  meses = [
    { id: 1, nombre: "Enero" }, { id: 2, nombre: "Febrero" }, { id: 3, nombre: "Marzo" },
    { id: 4, nombre: "Abril" }, { id: 5, nombre: "Mayo" }, { id: 6, nombre: "Junio" },
    { id: 7, nombre: "Julio" }, { id: 8, nombre: "Agosto" }, { id: 9, nombre: "Septiembre" },
    { id: 10, nombre: "Octubre" }, { id: 11, nombre: "Noviembre" }, { id: 12, nombre: "Diciembre" }
  ];

  // ==============================
  // FORMULARIO DE COBROS
  // ==============================
  abrirNuevo() {
    this.idEditar = null;
    this.showForm = true;
  }

  editar(id: number) {
    this.idEditar = id;
    this.showForm = true;
  }

  // ==============================
  // MODAL DE PAGO
  // ==============================
  abrirModalPago(cobro: any) {
    this.cobroSeleccionado = cobro;
    this.modalAbierto = true;
  }

  // ==============================
  // VER RECIBO PDF
  // ==============================
  private openInline(resp: HttpResponse<Blob>): void {
    const blob = resp.body;
    if (!blob) {
      Swal.fire('Error', 'Respuesta vacía del servidor.', 'error');
      return;
    }

    const contentType = resp.headers.get('Content-Type') || 'application/pdf';
    const file = new Blob([blob], { type: contentType });
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
  }

  verRecibo(cobro: any) {
    if (!cobro.comprobante_pdf) {
      Swal.fire('Advertencia', 'Este cobro no tiene recibo generado.', 'warning');
      return;
    }

    this.apiCobros.verRecibo(cobro.id).subscribe({
      next: resp => this.openInline(resp),
      error: (err: any) => {
        let msg = 'No se pudo abrir el recibo.';

        if (typeof err.error === 'string') {
          msg = err.error;
        } else if (err.error?.mensaje) {
          msg = err.error.mensaje;
        }

        if (err.status === 404) {
          Swal.fire('Advertencia', msg, 'warning');
        } else if (err.status === 401 || err.status === 403) {
          Swal.fire('Error', 'No autorizado para ver el recibo.', 'error');
        } else {
          Swal.fire('Error', msg, 'error');
        }
      }
    });
  }

  // ==============================
  // ELIMINAR COBRO
  // ==============================
  eliminarCobro(cobro: any) {
    if (!cobro.id) { return; }

    Swal.fire({
      title: '¿Eliminar cobro?',
      text: `Folio ${cobro.folio_formato || cobro.folio}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d'
    }).then(result => {
      if (!result.isConfirmed) return;

      this.apiCobros.eliminar(cobro.id).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Eliminado',
            text: 'El cobro ha sido eliminado correctamente.',
            confirmButtonColor: '#3085d6',
            timer: 1500,
            showConfirmButton: false
          });
          this.cargar();
        },
        error: err => {
          console.error(err);
          Swal.fire('Error', 'No se pudo eliminar el cobro', 'error');
        }
      });
    });
  }
}