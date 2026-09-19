import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';

import { SatJobsService } from '../../../../core/services/sat-jobs.service';
import { ClientesService } from '../../../../core/services/clientes.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-sat-automatico',
  standalone: true,
  templateUrl: './sat.automatico.html',
  styleUrls: ['./sat.automatico.css'],
  imports: [CommonModule, FormsModule, NgxPaginationModule]
})
export class SatAutomaticoComponent {
  // ===============================
  // FORMULARIO
  // ===============================
  clientes: any[] = [];
  clientesSeleccionados: number[] = [];

  tipoSolicitud: string = '';
  rangoInicio: string = '';
  rangoFin: string = '';
  fechaProgramada: string = '';

  intervalo = 30;
  maxReintentos = 3;

  modoClientes: 'todos' | 'manual' = 'todos';
  filtroCliente: string = '';

  // ===============================
  // JOBS Y PAGINACIÓN
  // ===============================
  cargando = false;
  jobs: any[] = [];
  jobsFiltrados: any[] = [];

  pageJobs = 1;
  itemsPorPagina = 10;
  totalPaginas = 1;

  terminoBusquedaJobs = '';
  criterioBusquedaJobs: 'id' | 'tipo' | 'estado' = 'id';

  ordenJobs = {
    columna: 'fechaProgramada',
    asc: false
  };

  temaActual: 'light' | 'dark' = 'light';

  logsSeleccionados: any[] = [];
  verLogs = false;
  jobSeleccionadoId: number | null = null;

  constructor(
    private clientesService: ClientesService,
    private satJobs: SatJobsService
  ) {}


  setTheme(theme: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}


  ngOnInit() {
    this.cargarClientes();
    this.cargarJobs();
    this.detectarTema();
    const saved = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
document.documentElement.setAttribute('data-theme', saved);

  }

  // ===============================
  // TEMA
  // ===============================
  private detectarTema(): void {
    const temaGuardado = localStorage.getItem('theme');
    this.temaActual = temaGuardado === 'dark' ? 'dark' : 'light';
  }

  // ===============================
  // CLIENTES
  // ===============================
  cargarClientes() {
    this.clientesService.getLista().subscribe({
      next: (data: any) => {
        this.clientes = data;
      },
      error: (err: any) => {
        console.error('Error al cargar clientes:', err);
      }
    });
  }

  clientesFiltrados() {
    const term = (this.filtroCliente || '').toLowerCase().trim();
    if (!term) return this.clientes;

    return this.clientes.filter((c: any) =>
      (c.razon_social || '').toLowerCase().includes(term) ||
      (c.rfc || '').toLowerCase().includes(term)
    );
  }

  toggleCliente(id: number) {
    if (this.clientesSeleccionados.includes(id)) {
      this.clientesSeleccionados = this.clientesSeleccionados.filter(x => x !== id);
    } else {
      this.clientesSeleccionados.push(id);
    }
  }

  seleccionarTodosFiltrados() {
    const idsFiltrados = this.clientesFiltrados().map((c: any) => c.id);
    const set = new Set<number>([...this.clientesSeleccionados, ...idsFiltrados]);
    this.clientesSeleccionados = Array.from(set);
  }

  limpiarSeleccion() {
    this.clientesSeleccionados = [];
  }

  // ===============================
  // VALIDACIÓN
  // ===============================
  validarFormulario(): boolean {
    // Campos obligatorios
    if (!this.tipoSolicitud || !this.rangoInicio || !this.rangoFin || !this.fechaProgramada) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Completa tipo de solicitud, rango de fechas y fecha programada.'
      });
      return false;
    }

    const inicio = new Date(this.rangoInicio);
    const fin = new Date(this.rangoFin);
    const programada = new Date(this.fechaProgramada);
    const ahora = new Date();

    // Fechas de rango
    if (inicio > fin) {
      Swal.fire({
        icon: 'warning',
        title: 'Rango de fechas inválido',
        text: 'La fecha de inicio no puede ser mayor a la fecha de fin.'
      });
      return false;
    }

    // Fecha programada futura
    if (programada <= ahora) {
      Swal.fire({
        icon: 'warning',
        title: 'Fecha programada inválida',
        text: 'La fecha y hora de ejecución deben ser futuras.'
      });
      return false;
    }

    // Intervalo mínimo (por si quieres reforzarlo)
    if (this.intervalo < 5) {
      Swal.fire({
        icon: 'warning',
        title: 'Intervalo inválido',
        text: 'El intervalo mínimo permitido es de 5 minutos.'
      });
      return false;
    }

    // Selección de clientes
    if (this.modoClientes === 'manual' && this.clientesSeleccionados.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Clientes requeridos',
        text: 'Selecciona al menos un cliente cuando uses la selección manual.'
      });
      return false;
    }

    if (this.modoClientes === 'todos' && this.clientes.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin clientes',
        text: 'No hay clientes activos para programar.'
      });
      return false;
    }

    return true;
  }

  // ===============================
  // JOBS AUTOMÁTICOS
  // ===============================
  cargarJobs() {
    this.satJobs.listarJobs().subscribe({
      next: (resp: any) => {
        this.jobs = resp;
        this.jobsFiltrados = [...resp];
        this.ordenarJobsPor('fechaProgramada');
        this.calcularTotalPaginas();
      },
      error: (err: any) => console.error('Error al cargar jobs:', err)
    });
  }


  crearJob() {
  if (!this.validarFormulario()) return;

  let idsClientes: number[] = [];

  if (this.modoClientes === 'todos') {
    idsClientes = this.clientes.map(c => c.id);
  } else {
    idsClientes = this.clientesSeleccionados;
  }

  const dto = {
    tipoSolicitud: this.tipoSolicitud,

    // ====== IGUAL QUE EL MANUAL: cadenas "YYYY-MM-DD" ======
    rangoInicio: this.rangoInicio,
    rangoFin: this.rangoFin,

    // ESTA sí va con hora en UTC, como ya lo tenías
    fechaProgramada: new Date(this.fechaProgramada).toISOString(),

    intervaloVerificacionMin: this.intervalo,
    maxReintentos: this.maxReintentos,
    clientesIds: idsClientes
  };

  this.cargando = true;

  this.satJobs.crearJob(dto).subscribe({
    next: (r: any) => {
      this.cargando = false;
      Swal.fire({
        icon: 'success',
        title: 'Solicitud creada',
        text: 'La solicitud automática se creó correctamente.'
      });
      this.cargarJobs();
      this.limpiarFormulario();
    },
    error: (err: any) => {
      console.error(err);
      this.cargando = false;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al crear la solicitud automática.'
      });
    }
  });
}


  // Este método debe ser el que uses en el botón "Crear solicitud automática"
  /*crearJob() {
    if (!this.validarFormulario()) {
      return;
    }

    let idsClientes: number[] = [];

    if (this.modoClientes === 'todos') {
      idsClientes = this.clientes.map(c => c.id);
    } else {
      idsClientes = this.clientesSeleccionados;
    }
const dto = {
  tipoSolicitud: this.tipoSolicitud,

  rangoInicio: this.fixDate(this.rangoInicio),
  rangoFin: this.fixDate(this.rangoFin),

  // ESTA SÍ SE ENVÍA EN UTC PORQUE INCLUYE HORA
  fechaProgramada: new Date(this.fechaProgramada).toISOString(),

  intervaloVerificacionMin: this.intervalo,
  maxReintentos: this.maxReintentos,
  clientesIds: idsClientes
};





    /*const dto = {
      tipoSolicitud: this.tipoSolicitud,
      rangoInicio: new Date(this.rangoInicio).toISOString(),
      rangoFin: new Date(this.rangoFin).toISOString(),
      fechaProgramada: new Date(this.fechaProgramada).toISOString(),
      intervaloVerificacionMin: this.intervalo,
      maxReintentos: this.maxReintentos,
      clientesIds: idsClientes
    };  AQUI TERMINA EL DTO 

    this.cargando = true;

    this.satJobs.crearJob(dto).subscribe({
      next: (r: any) => {
        this.cargando = false;
        Swal.fire({
          icon: 'success',
          title: 'Solicitud creada',
          text: 'La solicitud automática se creó correctamente.'
        });
        this.cargarJobs();
        this.limpiarFormulario();
      },
      error: (err: any) => {
        console.error(err);
        this.cargando = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Ocurrió un error al crear la solicitud automática.'
        });
      }
    });
  }*/

  limpiarFormulario() {
    this.tipoSolicitud = '';
    this.rangoInicio = '';
    this.rangoFin = '';
    this.fechaProgramada = '';
    this.intervalo = 30;
    this.maxReintentos = 3;
    this.clientesSeleccionados = [];
    this.filtroCliente = '';
    this.modoClientes = 'todos';
  }






fixDate(dateString: string): string {
  return `${dateString}T00:00:00`;  // SIN Z, SIN OFFSET, SIN UTC
}

// ===============================
// CORRECCIÓN VISUAL DE FECHAS
// ===============================
fixDisplayDate(fecha: string): string {
  if (!fecha) return '';

  // Fecha viene como "2025-08-31T00:00:00"
  const soloFecha = fecha.split('T')[0]; // "2025-08-31"

  const [year, month, day] = soloFecha.split('-');

  return `${day}/${month}/${year}`; // 31/08/2025
}



  // ===============================
  // FILTRADO Y ORDENAMIENTO DE JOBS
  // ===============================
  filtrarJobs() {
    const termino = this.terminoBusquedaJobs.trim().toLowerCase();

    if (!termino) {
      this.jobsFiltrados = [...this.jobs];
    } else {
      this.jobsFiltrados = this.jobs.filter(job => {
        switch (this.criterioBusquedaJobs) {
          case 'id':
            return job.id.toString().includes(termino);
          case 'tipo':
            return this.getEstadoTexto(job.tipoSolicitud).toLowerCase().includes(termino);
          case 'estado':
            return this.getEstadoTexto(job.estado).toLowerCase().includes(termino);
          default:
            return false;
        }
      });
    }

    this.ordenarJobsPor(this.ordenJobs.columna);
    this.pageJobs = 1;
    this.calcularTotalPaginas();
  }

  ordenarJobsPor(columna: string) {
    if (this.ordenJobs.columna === columna) {
      this.ordenJobs.asc = !this.ordenJobs.asc;
    } else {
      this.ordenJobs.columna = columna;
      this.ordenJobs.asc = true;
    }

    this.jobsFiltrados.sort((a, b) => {
      let x = a[columna];
      let y = b[columna];

      if (x == null) x = '';
      if (y == null) y = '';

      if (columna === 'fechaProgramada') {
        x = new Date(x).getTime();
        y = new Date(y).getTime();
      } else if (typeof x === 'string') {
        x = x.toLowerCase();
        y = y.toLowerCase();
      }

      return this.ordenJobs.asc ? (x > y ? 1 : -1) : (x > y ? -1 : 1);
    });
  }

  getIconoOrdenJobs(columna: string) {
    if (this.ordenJobs.columna !== columna) {
      return 'fas fa-sort orden-icon neutro';
    }
    return this.ordenJobs.asc
      ? 'fas fa-sort-up orden-icon activo'
      : 'fas fa-sort-down orden-icon activo';
  }

  calcularTotalPaginas() {
    this.totalPaginas = Math.ceil(this.jobsFiltrados.length / this.itemsPorPagina);
  }

  // ===============================
  // UTILIDADES UI
  // ===============================
  getEstadoTexto(estado: string): string {
    const estados: {[key: string]: string} = {
      'pendiente': 'Pendiente',
      'ejecutando': 'Ejecutando',
      'completado': 'Completado',
      'error': 'Con error',
      'cancelado': 'Cancelado',
      'emitidos': 'Emitidos',
      'recibidos': 'Recibidos'
    };
    return estados[estado] || estado;
  }

  getEstadoRowClass(estado: string): string {
    const clases: {[key: string]: string} = {
      'pendiente': 'fila-pendiente',
      'ejecutando': 'fila-ejecutando',
      'completado': 'fila-completado',
      'error': 'fila-error',
      'cancelado': 'fila-cancelado'
    };
    return clases[estado] || '';
  }

  // ===============================
  // ACCIONES DE JOBS
  // ===============================
  eliminarJob(id: number, estado: string) {
    Swal.fire({
      title: `¿Eliminar la solicitud #${id}?`,
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) return;

      this.satJobs.eliminarJob(id).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Eliminada',
            text: 'La solicitud automática se eliminó correctamente.'
          });
          this.cargarJobs();
        },
        error: (err: any) => {
          console.error('Error al eliminar job:', err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo eliminar la solicitud automática.'
          });
        }
      });
    });
  }

  // ===============================
  // LOGS
  // ===============================
  abrirLogs(jobId: number) {
    this.jobSeleccionadoId = jobId;
    this.satJobs.obtenerLogs(jobId).subscribe({
      next: (logs: any) => {
        this.logsSeleccionados = logs || [];
        this.verLogs = true;
      },
      error: (err: any) => {
        console.error('Error cargando logs:', err);
        this.logsSeleccionados = [];
        this.verLogs = true;
      }
    });
  }

  cerrarLogs() {
    this.verLogs = false;
    this.logsSeleccionados = [];
    this.jobSeleccionadoId = null;
  }
}
