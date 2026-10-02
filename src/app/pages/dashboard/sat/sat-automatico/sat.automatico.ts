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
  clientes: any[] = [];                    // siempre ordenados alfabéticamente por razón social
  clientesSeleccionados: number[] = [];    // checklist: clientes incluidos en la programación
  clientesDiarios: number[] = [];          // subconjunto de los seleccionados que se descarga TODOS los días

  // Separación fija entre la solicitud de un cliente y la del siguiente (el backend fuerza mínimo 5)
  readonly INTERVALO_ENTRE_CLIENTES_MIN = 5;

  // Hora estimada de envío por cliente (vista previa del escalonado)
  planEnvio = new Map<number, Date>();

  tipoSolicitud: string = '';
  rangoInicio: string = '';
  rangoFin: string = '';
  fechaProgramada: string = '';

  intervalo = 30;
  maxReintentos = 3;

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
        // Solo clientes activos, en orden alfabético (es el mismo orden en que se harán las solicitudes)
        this.clientes = (data || [])
          .filter((c: any) => c.estatus !== false)
          .sort((a: any, b: any) =>
            (a.razon_social || '').localeCompare(b.razon_social || '', 'es', { sensitivity: 'base' })
          );
        this.actualizarPlan();
      },
      error: (err: any) => {
        console.error('Error al cargar clientes:', err);
      }
    });
  }

  getRfc(c: any): string {
    return c?.certificado?.rfc || '';
  }

  // Sin certificado SAT no se puede solicitar nada → no se deja seleccionar
  tieneCertificado(c: any): boolean {
    return !!c?.certificado;
  }

  clientesFiltrados() {
    const term = (this.filtroCliente || '').toLowerCase().trim();
    if (!term) return this.clientes;

    return this.clientes.filter((c: any) =>
      (c.razon_social || '').toLowerCase().includes(term) ||
      this.getRfc(c).toLowerCase().includes(term)
    );
  }

  estaSeleccionado(id: number): boolean {
    return this.clientesSeleccionados.includes(id);
  }

  esDiario(id: number): boolean {
    return this.clientesDiarios.includes(id);
  }

  toggleCliente(id: number) {
    if (this.estaSeleccionado(id)) {
      this.clientesSeleccionados = this.clientesSeleccionados.filter(x => x !== id);
      this.clientesDiarios = this.clientesDiarios.filter(x => x !== id);
    } else {
      this.clientesSeleccionados = [...this.clientesSeleccionados, id];
    }
    this.actualizarPlan();
  }

  // Marca / desmarca un cliente para que su descarga se repita todos los días
  toggleDiario(id: number) {
    if (!this.estaSeleccionado(id)) return;

    this.clientesDiarios = this.esDiario(id)
      ? this.clientesDiarios.filter(x => x !== id)
      : [...this.clientesDiarios, id];

    this.actualizarPlan();
  }

  seleccionarTodosFiltrados() {
    const idsFiltrados = this.clientesFiltrados()
      .filter((c: any) => this.tieneCertificado(c))
      .map((c: any) => c.id);
    const set = new Set<number>([...this.clientesSeleccionados, ...idsFiltrados]);
    this.clientesSeleccionados = Array.from(set);
    this.actualizarPlan();
  }

  limpiarSeleccion() {
    this.clientesSeleccionados = [];
    this.clientesDiarios = [];
    this.actualizarPlan();
  }

  // Clientes de una sola descarga (seleccionados y NO diarios)
  get clientesUnicosIds(): number[] {
    return this.clientesSeleccionados.filter(id => !this.esDiario(id));
  }

  // Clientes de descarga diaria
  get clientesDiariosSeleccionados(): number[] {
    return this.clientesSeleccionados.filter(id => this.esDiario(id));
  }

  // ===============================
  // VISTA PREVIA DEL ESCALONADO
  // (mismo criterio que el backend: primero los únicos, luego los diarios,
  //  cada grupo en orden alfabético, 5 min entre un cliente y el siguiente)
  // ===============================
  actualizarPlan() {
    this.planEnvio = new Map<number, Date>();
    if (!this.fechaProgramada) return;

    const inicio = new Date(this.fechaProgramada);
    if (isNaN(inicio.getTime())) return;

    const seleccionados = this.clientes.filter((c: any) => this.estaSeleccionado(c.id));
    const unicos = seleccionados.filter((c: any) => !this.esDiario(c.id));
    const diarios = seleccionados.filter((c: any) => this.esDiario(c.id));

    [...unicos, ...diarios].forEach((c: any, i: number) => {
      this.planEnvio.set(
        c.id,
        new Date(inicio.getTime() + i * this.INTERVALO_ENTRE_CLIENTES_MIN * 60_000)
      );
    });
  }

  horaEstimada(id: number): Date | null {
    return this.planEnvio.get(id) ?? null;
  }

  // Hora a la que saldrá la última solicitud
  horaUltimaSolicitud(): Date | null {
    let ultima: Date | null = null;
    this.planEnvio.forEach(d => { if (!ultima || d > ultima) ultima = d; });
    return ultima;
  }

  // ===============================
  // VALIDACIÓN
  // ===============================
  validarFormulario(): boolean {
    // El rango de fechas solo aplica a las descargas únicas; las diarias siempre bajan el día anterior
    const hayUnicos = this.clientesUnicosIds.length > 0;

    // Campos obligatorios
    if (!this.tipoSolicitud || !this.fechaProgramada || (hayUnicos && (!this.rangoInicio || !this.rangoFin))) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: hayUnicos
          ? 'Completa tipo de solicitud, rango de fechas y fecha programada.'
          : 'Completa tipo de solicitud y fecha programada.'
      });
      return false;
    }

    const programada = new Date(this.fechaProgramada);
    const ahora = new Date();

    // Fechas de rango
    if (hayUnicos) {
      const inicio = new Date(this.rangoInicio);
      const fin = new Date(this.rangoFin);

      if (inicio > fin) {
        Swal.fire({
          icon: 'warning',
          title: 'Rango de fechas inválido',
          text: 'La fecha de inicio no puede ser mayor a la fecha de fin.'
        });
        return false;
      }
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

    // Selección de clientes (checklist)
    if (this.clientesSeleccionados.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Clientes requeridos',
        text: 'Marca en la lista al menos un cliente.'
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

    const unicos = this.clientesUnicosIds;
    const diarios = this.clientesDiariosSeleccionados;
    const ultima = this.horaUltimaSolicitud();

    const hoy = new Date();
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    const dto = {
      tipoSolicitud: this.tipoSolicitud,

      // ====== IGUAL QUE EL MANUAL: cadenas "YYYY-MM-DD" ======
      // (las descargas diarias ignoran este rango: el backend usa siempre el día anterior)
      rangoInicio: this.rangoInicio || hoyStr,
      rangoFin: this.rangoFin || hoyStr,

      // ESTA sí va con hora en UTC, como ya lo tenías
      fechaProgramada: new Date(this.fechaProgramada).toISOString(),

      intervaloVerificacionMin: this.intervalo,
      maxReintentos: this.maxReintentos,

      // 5 min entre un cliente y el siguiente, en orden alfabético
      intervaloEntreClientesMin: this.INTERVALO_ENTRE_CLIENTES_MIN,
      clientesIds: unicos,
      clientesDiariosIds: diarios
    };

    const total = unicos.length + diarios.length;
    const horaUltima = ultima
      ? (ultima as Date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
      : '';

    Swal.fire({
      icon: 'question',
      title: 'Confirmar programación',
      html:
        `<b>${total}</b> cliente(s) en orden alfabético, una solicitud cada ` +
        `<b>${this.INTERVALO_ENTRE_CLIENTES_MIN} min</b>.<br>` +
        `Descarga única: <b>${unicos.length}</b> &nbsp;·&nbsp; Descarga diaria: <b>${diarios.length}</b><br>` +
        (horaUltima ? `La última solicitud saldrá el <b>${horaUltima}</b>.` : ''),
      showCancelButton: true,
      confirmButtonText: 'Programar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) return;

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
    this.clientesDiarios = [];
    this.filtroCliente = '';
    this.planEnvio = new Map<number, Date>();
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

  // ¿El job se repite todos los días?
  esDiaria(job: any): boolean {
    return job?.recurrencia === 'Diaria';
  }

  // Próxima hora en que saldrá una solicitud de este job (solo clientes que aún no se solicitan)
  proximoEnvio(job: any): Date | null {
    if (!job || job.estado === 'Terminado' || job.estado === 'Error') return null;

    const horas = (job.clientes || [])
      .filter((c: any) => c.estado === 'Pendiente' && c.fechaEnvioProgramada)
      .map((c: any) => new Date(c.fechaEnvioProgramada).getTime());

    return horas.length ? new Date(Math.min(...horas)) : null;
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
