import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { forkJoin, of } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators'; // ⬅ importa retry

import { SatService } from '../../../core/services/sat.service';
import { environment } from '../../../../environments/environment';

import { HistorialVerificacionesComponent } from '../sat/historial-verificaciones/historial-verificaciones';

import { PermisoDirective } from '../../../shared/directivas/permiso.directive';

import { finalize } from 'rxjs/operators';

import { SatAutomaticoComponent } from './sat-automatico/sat.automatico';


//PAGINACION
import { NgxPaginationModule } from 'ngx-pagination';


type ArchivoTipo = 'xml' | 'pdf' | 'zip';
declare const feather: any;

interface ArchivoDto {
  nombre: string;
  tipo: ArchivoTipo;
  tamano?: number;
  bytes?: number;
  ruta?: string;
}

@Component({
  standalone: true,
  templateUrl: './sat.html',
  styleUrls: ['./sat.css'],
  imports: [
  CommonModule,
  FormsModule,
  NgxPaginationModule,
  HistorialVerificacionesComponent,
  PermisoDirective,
  SatAutomaticoComponent   // 👈 AGREGARLO AQUÍ
]


})
export class SatComponent implements OnInit {
  solicitudes: any[] = [];
  clientes: any[] = [];
  clientesFiltrados: any[] = [];
  solicitudesFiltradas: any[] = [];   // <<— AGREGA ESTA LÍNEA

  form: any = {};
  busquedaCliente = '';
  mostrarLista = false;

  filtro: 'todas' | 'pendientes' | 'terminadas' | 'error' = 'todas';
  cargando = false;



  //PAGINACION
  page = 1;
  itemsPerPage = 8;
  mostrandoDesde = 1;
  mostrandoHasta = 0;

  //----------------
totalSolicitudes = 0;
paginasTotales = 0;

// Filtros
texto = '';
//filtroEstado: number | null = null;
  // lista de estados a filtrar (0–6)
filtroEstados: number[] | null = null;
filtroTipo: string | null = null;
filtroFechaInicio: string | null = null;
filtroFechaFin: string | null = null;


//modal historial
historialVisible = false;
historialDatos: any[] = [];
solicitudHistorial: any = null;


//--------------------

  verificando: Record<number, boolean> = {};
  detalleAbierto = new Set<number>();
  archivos: Record<number, ArchivoDto[]> = {};


    temaActual: 'light' | 'dark' = 'light'; // modo visual actual
    

menuAbierto: number | null = null;
  constructor(private satService: SatService, private http: HttpClient) {
document.addEventListener('click', () => {
    this.menu.visible = false;
  });
}

  
tab: 'manual' | 'auto' = 'manual';







  ngOnInit() {
    this.cargarSolicitudes();
    this.cargarClientes();
    this.detectarTema();     // aplica modo claro/oscuro
  }
  

  fixDisplayDate(fecha: string): string {
  if (!fecha) return '';
  const soloFecha = fecha.split('T')[0]; // "2025-08-31"
  const [year, month, day] = soloFecha.split('-');
  return `${day}/${month}/${year}`;
}


onIntentarVerificar(s: any) {
  if (s.estado_solicitud === 3) {
    Swal.fire({
      icon: 'info',
      title: 'Verificación no disponible',
      text: 'Esta solicitud ya está terminada y no requiere una nueva verificación.',
      confirmButtonText: 'Entendido'
    });
    return;
  }

  this.onVerificar(s); // tu método original
}


// Nueva propiedad para controlar el despliegue
  filtersExpanded: boolean = false; // Puedes cambiar a false si quieres que inicie cerrado

  // Método para toggle del filtro
  toggleFilters(): void {
    this.filtersExpanded = !this.filtersExpanded;
  }

  // Método para limpiar filtros (opcional)
  limpiarFiltros(): void {
    this.texto = '';
    this.filtroTipo = null;
    this.filtroFechaInicio = null;
    this.filtroFechaFin = null;
    this.page = 1;
    this.cargarSolicitudes();
  }

solicitudFormExpanded: boolean = true;

  toggleSolicitudForm(): void {
    this.solicitudFormExpanded = !this.solicitudFormExpanded;
    if (!this.solicitudFormExpanded) {
    this.mostrarLista = false;   // 🔥 oculta autocomplete
  }

  }

  
  //------------------------------

menu = {
  visible: false,
  x: 0,
  y: 0,
  solicitud: null as any
};

abrirMenu(event: MouseEvent, s: any) {
  event.stopPropagation();

  // Si ya está abierto para esta solicitud → cerrar
  if (this.menu.visible && this.menu.solicitud?.id === s.id) {
    this.menu.visible = false;
    return;
  }

  const btn = event.currentTarget as HTMLElement;
  const rectBtn = btn.getBoundingClientRect();

  const tablaCard = btn.closest('.tabla-card') as HTMLElement;
  const rectTabla = tablaCard.getBoundingClientRect();

  this.menu = {
    visible: true,
    x: rectBtn.left - rectTabla.left,
    y: rectBtn.bottom - rectTabla.top + 8,
    solicitud: s
  };
}



//modal historial
abrirHistorialVerificaciones(s: any) {
  this.menu.visible = false;

  this.solicitudHistorial = s;

  this.satService.obtenerVerificaciones(s.id).subscribe({
    next: (data) => {
      this.historialDatos = data || [];
      this.historialVisible = true;
    },
    error: () => Swal.fire('Error', 'No se pudo cargar el historial.', 'error')
  });
}






  //FILTRO DE FECHAS
  onCambioFechas() {
  this.page = 1;

  // 1) Si no hay ninguna fecha -> sin filtro, recarga normal
  if (!this.filtroFechaInicio && !this.filtroFechaFin) {
    this.cargarSolicitudes();
    return;
  }

  // 2) Si solo hay una de las dos -> NO llames a la API todavía
  if (!this.filtroFechaInicio || !this.filtroFechaFin) {
    // aquí podrías mostrar un mensajito si quieres
    return;
  }

  // 3) Si ya hay las dos -> ahora sí filtra en backend
  this.cargarSolicitudes();
}


  //PAGINACION
actualizarRango() {
  if (this.totalSolicitudes === 0) {
    this.mostrandoDesde = 0;
    this.mostrandoHasta = 0;
    return;
  }
  
  const inicio = (this.page - 1) * this.itemsPerPage + 1;
  const fin = Math.min(inicio + this.itemsPerPage - 1, this.totalSolicitudes);
  
  this.mostrandoDesde = inicio;
  this.mostrandoHasta = fin;
}



  ngAfterViewInit(): void {
    // Reemplaza íconos Feather después de renderizar la vista
    setTimeout(() => feather?.replace(), 0);

    // Observa cambios de tema dinámicamente
    const observer = new MutationObserver(() => this.detectarTema());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }


private detectarTema(): void {
    // Detecta el tema almacenado en localStorage
    const temaGuardado = localStorage.getItem('theme');
    this.temaActual = temaGuardado === 'dark' ? 'dark' : 'light';
  }

// Helpers para agrupar por tipo en la vista de detalle
// ===== Modal: estado =====
modalAbierto = false;
solicitudActual: any = null;

// ===== Helpers para agrupar por tipo =====
pdfs = (id?: number) => (id ? (this.archivos[id] || []).filter(a => a.tipo === 'pdf') : []);
xmls = (id?: number) => (id ? (this.archivos[id] || []).filter(a => a.tipo === 'xml') : []);



// ===== Abrir detalle en modal y cargar info =====
abrirDetalle(s: any) {
  this.solicitudActual = { ...s };
  this.modalAbierto = true;   // sigues abriendo el mismo modal de siempre

  this.satService.ultimaDescarga(s.id).subscribe({
    next: (d: any) => {
      if (d) {
        this.solicitudActual._detalle = {
          archivoZip: d.archivo_zip,
          carpetaXml: d.carpeta_extraccion,
          carpetaPdf: d.carpeta_pdf || d.carpetaPdf
        };
      }

      // 🔥 CARGAR PDF Y XML EN PARALELO
      forkJoin({
        pdf: this.satService.listarArchivos(s.id, 'pdf').pipe(catchError(() => of([]))),
        xml: this.satService.listarArchivos(s.id, 'xml').pipe(catchError(() => of([]))),
      }).subscribe(({ pdf, xml }) => {

        const pdfs: ArchivoDto[] = (pdf ?? []).map((x: any) => ({
          nombre: x.nombre,
          tipo: 'pdf' as ArchivoTipo,
          bytes: x.tamano ?? x.bytes
        }));

        const xmls: ArchivoDto[] = (xml ?? []).map((x: any) => ({
          nombre: x.nombre,
          tipo: 'xml' as ArchivoTipo,
          bytes: x.tamano ?? x.bytes
        }));

        // opcional: ordenar por nombre
        pdfs.sort((a, b) => a.nombre.localeCompare(b.nombre));
        xmls.sort((a, b) => a.nombre.localeCompare(b.nombre));

        // 🔥 GUARDAR JUNTOS
        this.archivos[s.id] = [...pdfs, ...xmls];
      });
    },
    error: () => { }
  });
}


//generar pdf desde xml
generarPdf(xml: string, solicitudId: number) {
  this.satService.generarPdfDesdeXml(solicitudId, xml).subscribe({
    next: (res) => {
      const blob = res.body!;
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank"); // Abrir PDF en otra pestaña
    },
    error: () => {
      Swal.fire("Error", "No se pudo generar el PDF", "error");
    }
  });
}


/*abrirDetalle(s: any) {
  this.solicitudActual = { ...s };
  this.modalAbierto = true;

  this.satService.ultimaDescarga(s.id).subscribe({
    next: (d: any) => {
      if (!d) return;

      this.solicitudActual._detalle = {
        archivoZip: d.archivo_zip,
        carpetaXml: d.carpeta_extraccion,
        carpetaPdf: d.carpeta_pdf || d.carpetaPdf
      };

      // limpiar y cargar listas
      this.archivos[s.id] = [];

      this.satService.listarArchivos(s.id, 'pdf').subscribe({
        next: (lst: any[]) => {
          const pdfs = (lst ?? []).map(x => ({ nombre: x.nombre, tipo: 'pdf' as const, bytes: x.tamano ?? x.bytes }));
          this.archivos[s.id] = [...pdfs];
        }
      });

      this.satService.listarArchivos(s.id, 'xml').subscribe({
        next: (lst: any[]) => {
          const xmls = (lst ?? []).map(x => ({ nombre: x.nombre, tipo: 'xml' as const, bytes: x.tamano ?? x.bytes }));
          const prev = this.archivos[s.id] ?? [];
          this.archivos[s.id] = [...prev, ...xmls];
        }
      });
    },
    error: () => {}
  });
}
*/
// ===== Cerrar modal =====
cerrarModal() {
  this.modalAbierto = false;
  this.solicitudActual = null;
}

  
  // ===== Clientes =====
  cargarClientes() {
    this.http.get<any[]>(`${environment.apiUrl}/clientes/lista`).subscribe({
      next: data => {
        this.clientes = data ?? [];
        this.clientesFiltrados = data ?? [];
      },
      error: () => Swal.fire('Error', 'No se pudieron cargar los clientes', 'error')
    });
  }

  filtrarClientes() {
    const term = (this.busquedaCliente || '').toLowerCase();
    this.mostrarLista = term.length > 0;
    this.clientesFiltrados = this.clientes.filter((c: any) =>
      (c.razon_social || '').toLowerCase().includes(term) ||
      (c.rfc || '').toLowerCase().includes(term)
    );
  }

  seleccionarCliente(cli: any) {
    this.form.cliente_id = cli.id;
    this.busquedaCliente = cli.razon_social;
    this.mostrarLista = false;
  }


  // ===== Solicitudes =====
cargarSolicitudes(aplicarFiltro: boolean = false) {
  const filtros: any = {
    pagina: this.page,
    tamano: this.itemsPerPage
  };

  if (this.texto) filtros.texto = this.texto;
  if (this.filtroEstados != null) filtros.estadoLista = this.filtroEstados;

  if (this.filtroTipo) filtros.tipo = this.filtroTipo;
  if (this.filtroFechaInicio) filtros.fecha_inicio = this.filtroFechaInicio;
  if (this.filtroFechaFin) filtros.fecha_fin = this.filtroFechaFin;

  this.satService.getSolicitudesPaginado(filtros).subscribe({
    next: (resp: any) => {
      this.solicitudes = resp.datos;
      this.totalSolicitudes = resp.total;
      this.paginasTotales = resp.paginas;

      this.solicitudesFiltradas = [...resp.datos];

      if (aplicarFiltro) {
        this.actualizarFiltrado();  // ← ahora sí se filtra con datos reales
      }
      this.actualizarRango();
    },
    error: () => Swal.fire('Error', 'No se pudieron cargar las solicitudes', 'error')
  });
}


  /*setFiltro(f: 'todas'|'pendientes'|'terminadas'|'error') {
    this.filtro = f;
  }*/
setFiltro(tipo: 'todas' | 'pendientes' | 'terminadas' | 'error') {
  this.filtro = tipo;

  switch (tipo) {
    case 'pendientes': this.filtroEstados = [1, 2]; break;
    case 'terminadas': this.filtroEstados = [3]; break;
    case 'error': this.filtroEstados = [0, 4, 5, 6]; break;
    default: this.filtroEstados = null; break;
  }

  this.page = 1;

  this.cargarSolicitudes(true);  // ← AQUÍ
}



actualizarFiltrado() {

  let lista = [...this.solicitudesFiltradas];

  if (this.filtro === 'error') {

    lista = lista.filter(s => {

      const estado = Number(s.estado_solicitud);
      const codigo = s.codigo_estado?.toString() ?? null;

      const esEstadoError = [4, 5, 6, 0].includes(estado);

      // si codigo es null, vacío o distinto a 5000 = error
      const esCodigoError = !codigo || codigo !== '5000';

      return esEstadoError || esCodigoError;
    });
  }

  else if (this.filtro === 'terminadas') {
    lista = lista.filter(s =>
      Number(s.estado_solicitud) === 3 &&
      s.codigo_estado === '5000'
    );
  }

  else if (this.filtro === 'pendientes') {
    lista = lista.filter(s =>
      [1, 2].includes(Number(s.estado_solicitud))
    );
  }

  this.solicitudesFiltradas = lista;
}





  /*getSolicitudesFiltradas() {
    switch (this.filtro) {
      case 'pendientes': return this.solicitudes.filter(s => s.estado_solicitud === 1);
      case 'terminadas': return this.solicitudes.filter(s => s.estado_solicitud === 3);
      case 'error':     return this.solicitudes.filter(s => s.estado_solicitud === 0);
      default:          return this.solicitudes;
    }
  }*/
getSolicitudesFiltradas() {
  // Sin filtro de estados → devuelve todo
  if (!this.filtroEstados) {
    return this.solicitudes;
  }

  return this.solicitudes.filter(s => {
    const estado = Number(s.estado_solicitud);
    const codigo = s.codigo_estado?.toString() ?? null;

    // Coincidencia normal por estado (0,1,2 / 3 / 4,5,6)
    const coincideEstado = this.filtroEstados!.includes(estado);

    // Si el filtro actual NO es "error", usamos sólo estado
    if (this.filtro !== 'error') {
      return coincideEstado;
    }

    // Para "Con error", además de 4,5,6 consideramos códigos SAT ≠ 5000
    const esCodigoError = codigo !== null && codigo !== '5000';

    return coincideEstado || esCodigoError;
  });
}




crearSolicitud() {
  const f = this.form || {};
  if (!f.cliente_id || !f.tipo_solicitud || !f.fecha_inicio || !f.fecha_fin) {
    Swal.fire('Advertencia', 'Debe completar todos los campos', 'warning');
    return;
  }

  this.cargando = true;

  // NUEVO: Swal de carga mientras se llama al servicio
  Swal.fire({
    title: 'Creando solicitud',
    text: 'Consultando SAT, por favor espere…',
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  this.satService.crearSolicitud(f).subscribe({
    next: () => {
      this.cargando = false;

      // NUEVO: cerrar el Swal de carga
      Swal.close();

      // IGUAL que antes
      Swal.fire('Éxito', 'Solicitud creada correctamente', 'success');
      this.cargarSolicitudes();
    },
    error: () => {
      this.cargando = false;

      // NUEVO: cerrar el Swal de carga
      Swal.close();

      // IGUAL que antes
      Swal.fire('Error', 'Error creando la solicitud', 'error');
    }
  });
}


cambiarPagina(p: number) {
  if (p < 1 || p > this.paginasTotales) return;
  this.page = p;
  this.cargarSolicitudes();
}

// Agrega este método a tu componente SatComponent
cambiarItemsPorPagina() {
  this.page = 1; // Volver a la primera página cuando cambia el tamaño
  this.cargarSolicitudes(); // Esto hará que el backend reciba el nuevo itemsPerPage
}



//carga
// al inicio de la clase
cargandoPantalla = false;

onVerificar(s: any) {
  this.verificando[s.id] = true;

  Swal.fire({
    title: 'Verificando solicitud',
    text: 'Consultando SAT, por favor espere…',
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  this.satService.verificarSolicitud(s.id).subscribe({
    next: (res: any) => {
      this.verificando[s.id] = false;

      // Cerrar el loading ANTES de lanzar el mensaje final
      Swal.close();

      if (res?.detalles) {
        s._detalle = {
          archivoZip: res.detalles.archivoZip,
          carpetaXml: res.detalles.carpetaXml,
          carpetaPdf: res.detalles.carpetaPdf
        };
      }

      if (res?.ok && res?.detalles?.estado === 3) {
        Swal.fire(
          'Completado',
          'Solicitud verificada y CFDIs descargados en el servidor.',
          'success'
        );
      } else {
        Swal.fire(
          'Verificación',
          res?.mensaje || 'Solicitud aún en proceso.',
          'info'
        );
      }

      this.cargarSolicitudes();
    },
    error: (e) => {
      this.verificando[s.id] = false;

      // Cerrar el loading ANTES del mensaje de error
      Swal.close();

      Swal.fire(
        'Error',
        e?.error?.mensaje || 'No se pudo verificar la solicitud.',
        'error'
      );
    }
  });
}


// estado para evitar dobles cargas
cargandoDetalle: Record<number, boolean> = {};

toggleDetalle(s: any) {
  const id = s.id;

  if (this.detalleAbierto.has(id)) { this.detalleAbierto.delete(id); return; }
  this.detalleAbierto.add(id);

  this.satService.ultimaDescarga(id).subscribe({
    next: (d: any) => {
      if (d) {
        s._detalle = {
          archivoZip: d.archivo_zip,
          carpetaXml: d.carpeta_xml || d.carpeta_extraccion,
          carpetaPdf: d.carpeta_pdf || d.carpetaPdf
        };
      }

      forkJoin({
        pdf: this.satService.listarArchivos(id, 'pdf')
              .pipe(
                retry({ count: 2, delay: 400 }),   // ⬅ AQUI
                catchError(() => of([]))
              ),
        xml: this.satService.listarArchivos(id, 'xml')
              .pipe(
                retry({ count: 2, delay: 400 }),   // ⬅ Y AQUI
                catchError(() => of([]))
              )
      })
      .pipe(
        map(({ pdf, xml }: any) => {
          const toDto = (x: any, tipo: 'pdf'|'xml') => ({
            nombre: x.nombre,
            tipo,
            bytes: x.tamano ?? x.bytes,
            ruta: x.ruta
          });
          const pdfs = (pdf ?? []).map((x: any) => toDto(x, 'pdf'));
          const xmls = (xml ?? []).map((x: any) => toDto(x, 'xml'));
          pdfs.sort((a: any,b: any) => a.nombre.localeCompare(b.nombre));
          xmls.sort((a: any,b: any) => a.nombre.localeCompare(b.nombre));
          return [...pdfs, ...xmls];
        })
      )
      .subscribe({
        next: (todos: any[]) => { this.archivos[id] = todos; },
        error: () => { this.archivos[id] = []; }
      });
    }
  });
}
  // ===== Descarga/Abrir con JWT =====
  private filenameFromDisposition(cd: string | null | undefined, fallback: string) {
    if (!cd) return fallback;
    const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(cd);
    try { return decodeURIComponent((m?.[1] ?? fallback)); } catch { return fallback; }
  }

  private openInline(resp: any) {
    const blob = resp.body as Blob;
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  private async saveWithPicker(blob: Blob, suggestedName: string, mime: string) {
    const w: any = window as any;
    if (w.showSaveFilePicker) {
      const ext = suggestedName.split('.').pop()?.toLowerCase() || '';
      // aceptar xml correctamente
      const accept: Record<string, string[]> = {};
      if (mime === 'application/xml') {
        accept['application/xml'] = ['.xml'];
        accept['text/xml'] = ['.xml'];
      } else {
        accept[mime] = [`.${ext}`];
      }

      const handle = await w.showSaveFilePicker({
        suggestedName,
        types: [{ description: mime, accept }]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  }

  private async saveResponseWithPicker(resp: any, suggestedName: string, mime: string) {
    const blob = resp.body as Blob;
    await this.saveWithPicker(blob, suggestedName, mime);
  }

  // ===== Botones fila: PREVIEW =====
  abrirZip(s: any) { // ZIP: mejor descargar directo
    this.descargarUltimoZip(s);
  }

  abrirUltimoPdf(s: any) {
    this.satService.getPdfBlob(s.id).subscribe({
      next: resp => this.openInline(resp),
      error: () => Swal.fire('Error', 'No se pudo abrir el PDF', 'error')
    });
  }

  abrirUltimoXml(s: any) {
    this.satService.listarArchivos(s.id, 'xml').subscribe({
      next: (lst: any[]) => {
        if (!lst?.length) { Swal.fire('Aviso', 'No hay XML disponibles', 'info'); return; }
        const nombre = lst[0].nombre;
        this.satService.getArchivoBlob(s.id, 'xml', nombre).subscribe({
          next: resp => this.openInline(resp),
          error: () => Swal.fire('Error', 'No se pudo abrir el XML', 'error')
        });
      },
      error: () => Swal.fire('Error', 'No se pudo listar XML', 'error')
    });
  }

  // ===== Botones fila: DESCARGAR CON PICKER =====
  descargarUltimoZip(s: any) {
    this.satService.getZipBlob(s.id).subscribe({
      next: resp => this.saveResponseWithPicker(resp, `sat_${s.id}.zip`, 'application/zip'),
      error: () => Swal.fire('Error', 'No se pudo descargar ZIP', 'error')
    });
  }

  descargarUltimoPdf(s: any) {
    this.satService.getPdfBlob(s.id).subscribe({
      next: resp => this.saveResponseWithPicker(resp, `factura_${s.id}.pdf`, 'application/pdf'),
      error: () => Swal.fire('Error', 'No se pudo descargar el PDF', 'error')
    });
  }

  descargarUltimoXml(s: any) {
    this.satService.listarArchivos(s.id, 'xml').subscribe({
      next: (lst: any[]) => {
        if (!lst?.length) { Swal.fire('Aviso', 'No hay XML disponibles', 'info'); return; }
        const nombre = lst[0].nombre;
        this.satService.getArchivoBlob(s.id, 'xml', nombre).subscribe({
          next: resp => this.saveResponseWithPicker(resp, nombre, 'application/xml'),
          error: () => Swal.fire('Error', 'No se pudo descargar el XML', 'error')
        });
      },
      error: () => Swal.fire('Error', 'No se pudo listar XML', 'error')
    });
  }

  // ===== Detalle: abrir o descargar individual =====
  abrirArchivo(solId: number, tipo: ArchivoTipo, nombre: string) {
    const inline = tipo === 'pdf' || tipo === 'xml';
    this.satService.getArchivoBlob(solId, tipo, nombre).subscribe({
      next: resp => inline ? this.openInline(resp)
                           : this.saveResponseWithPicker(resp, nombre, 'application/zip'),
      error: () => Swal.fire('Error', 'No se pudo abrir/descargar el archivo', 'error')
    });
  }

  descargarArchivo(solId: number, tipo: ArchivoTipo, nombre: string) {
    const mime = tipo === 'pdf' ? 'application/pdf' : tipo === 'xml' ? 'application/xml' : 'application/zip';
    this.satService.getArchivoBlob(solId, tipo, nombre).subscribe({
      next: resp => this.saveResponseWithPicker(resp, nombre, mime),
      error: () => Swal.fire('Error', 'No se pudo descargar el archivo', 'error')
    });
  }

  copiarRuta(txt: string) {
    if (!txt) return;
    navigator.clipboard?.writeText(txt)
      .then(() => Swal.fire('Copiado', 'Ruta copiada al portapapeles', 'success'))
      .catch(() => Swal.fire('Aviso', 'No se pudo copiar la ruta', 'info'));
  }

  eliminar(s: any) {
    Swal.fire({
      title: 'Eliminar solicitud',
      text: 'Esto eliminará la solicitud y sus verificaciones. ¿Continuar?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar'
    }).then(res => {
      if (!res.isConfirmed) return;
      this.satService.eliminarSolicitud(s.id).subscribe({
        next: () => {
          this.solicitudes = this.solicitudes.filter(x => x.id !== s.id);
          Swal.fire('Listo', 'Solicitud eliminada', 'success');
        },
        error: (e) => {
          Swal.fire('Error', e?.error?.mensaje || 'No se pudo eliminar', 'error');
        }
      });
    });
  }
}
