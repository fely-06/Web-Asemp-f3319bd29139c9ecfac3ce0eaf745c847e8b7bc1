import { Component, OnInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { ReportesCobrosService } from '../../../../core/services/reportes.cobros.service';
import { ClientesService } from '../../../../core/services/clientes.service';
import Swal from 'sweetalert2';

declare const feather: any;

@Component({
  selector: 'app-reportes-cobros',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule],
  templateUrl: './reportes.cobros.html',
  styleUrls: ['./reportes.cobros.css']
})
export class ReportesCobrosComponent implements OnInit {

  @ViewChild('clienteInput') clienteInput!: ElementRef;

  // ==============================
  // VARIABLES PRINCIPALES
  // ==============================
  filtro = {
    Mes: new Date().getMonth() + 1,
    Anio: new Date().getFullYear(),
    ClienteId: 0,
    ClienteNombre: '',
    Tipo: 'PENDIENTES'
  };

  meses = [
    { id: 1, nombre: 'Enero' }, { id: 2, nombre: 'Febrero' }, { id: 3, nombre: 'Marzo' },
    { id: 4, nombre: 'Abril' }, { id: 5, nombre: 'Mayo' }, { id: 6, nombre: 'Junio' },
    { id: 7, nombre: 'Julio' }, { id: 8, nombre: 'Agosto' }, { id: 9, nombre: 'Septiembre' },
    { id: 10, nombre: 'Octubre' }, { id: 11, nombre: 'Noviembre' }, { id: 12, nombre: 'Diciembre' }
  ];

  tipos = [
    { id: 'PENDIENTES', nombre: 'Pendientes' },
    { id: 'PAGADOS', nombre: 'Pagados' },
    { id: 'ATRASADOS', nombre: 'Atrasados' }
  ];

  clientes: any[] = [];
  clientesFiltrados: any[] = [];
  mostrarSugerencias = false;
  lista: any[] = [];
  listaOrdenada: any[] = [];
  page = 1;
  temaActual: 'light' | 'dark' = 'light';

  // ==============================
  // ORDENAMIENTO
  // ==============================
  orden = {
    columna: '',
    asc: true
  };

  constructor(
    private reporteService: ReportesCobrosService,
    private clienteService: ClientesService
  ) {}


esCliente = false;

ngOnInit(): void {
  const rol = localStorage.getItem('rol'); // 'Administrador' | 'Empleado' | 'Cliente'
  this.esCliente = rol === 'Cliente';

  if (this.esCliente) {
    Swal.fire({
      icon: 'error',
      title: 'Acceso no permitido',
      text: 'No tienes permiso para ver reportes de cobros'
    });
    return;
  }

  this.cargarClientes();
  this.buscar();
  this.detectarTema();
}



  ngAfterViewInit(): void {
    setTimeout(() => feather?.replace(), 0);
    const observer = new MutationObserver(() => this.detectarTema());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const isInsideAutocomplete = target.closest('.autocomplete-container');
    
    if (!isInsideAutocomplete) {
      this.mostrarSugerencias = false;
    }
  }

  private detectarTema(): void {
    const temaGuardado = localStorage.getItem('theme');
    this.temaActual = temaGuardado === 'dark' ? 'dark' : 'light';
  }

  // ==============================
// MÉTODO PARA OBTENER NOMBRE DEL MES
// ==============================
// ==============================
// MÉTODO PARA OBTENER NOMBRE DEL MES - MEJORADO
// ==============================
getNombreMes(mes: any): string {
  if (!mes) return '-';
  
  // Si ya es un nombre de mes, devuélvelo directamente
  if (typeof mes === 'string') {
    // Verificar si es un nombre de mes válido
    const nombreMes = mes.trim();
    const mesEncontrado = this.meses.find(m => 
      m.nombre.toLowerCase() === nombreMes.toLowerCase()
    );
    
    if (mesEncontrado) {
      return mesEncontrado.nombre;
    }
    
    // Si no es un nombre válido, intentar convertir a número
    const numeroMes = parseInt(mes, 10);
    if (!isNaN(numeroMes) && numeroMes >= 1 && numeroMes <= 12) {
      return this.meses.find(m => m.id === numeroMes)?.nombre || '-';
    }
    
    return '-';
  }
  
  // Si es un número
  if (typeof mes === 'number') {
    const numeroMes = mes;
    if (numeroMes >= 1 && numeroMes <= 12) {
      return this.meses.find(m => m.id === numeroMes)?.nombre || '-';
    }
    return '-';
  }
  
  return '-';
}

  // ==============================
  // ORDENAMIENTO UNIVERSAL
  // ==============================
  ordenarPor(columna: string) {
    if (this.orden.columna === columna) {
      this.orden.asc = !this.orden.asc;
    } else {
      this.orden.columna = columna;
      this.orden.asc = true;
    }

    this.listaOrdenada.sort((a, b) => {
      let x = a[columna];
      let y = b[columna];

      if (x == null) x = '';
      if (y == null) y = '';

      if (typeof x === 'string') x = x.toLowerCase();
      if (typeof y === 'string') y = y.toLowerCase();

      // Manejo especial para fechas
      if (columna === 'fechaPago' && x && y) {
        const dateX = new Date(x);
        const dateY = new Date(y);
        return this.orden.asc ? (dateX > dateY ? 1 : -1) : (dateX > dateY ? -1 : 1);
      }

      // Manejo especial para números
      if (columna === 'total' || columna === 'anio' || columna === 'mes') {
        const numX = parseFloat(x) || 0;
        const numY = parseFloat(y) || 0;
        return this.orden.asc ? (numX > numY ? 1 : -1) : (numX > numY ? -1 : 1);
      }

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

  cargarClientes() {
    this.clienteService.getLista().subscribe({
      next: (r: any[]) => {
        this.clientes = r;
        this.clientesFiltrados = r.slice(0, 5);
      },
      error: (err) => {
        console.error('Error al cargar clientes:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar los clientes',
          confirmButtonColor: '#3085d6'
        });
      }
    });
  }

  filtrarClientes(event: any) {
    const texto = event?.target?.value || '';
    
    if (!texto.trim()) {
      this.clientesFiltrados = this.clientes.slice(0, 5);
      this.mostrarSugerencias = true;
      return;
    }

    const textoLower = texto.toLowerCase();
    this.clientesFiltrados = this.clientes.filter(cliente =>
      cliente.razon_social?.toLowerCase().includes(textoLower) ||
      (cliente.rfc && cliente.rfc.toLowerCase().includes(textoLower))
    ).slice(0, 10);

    this.mostrarSugerencias = true;
  }

  seleccionarCliente(cliente: any) {
    this.filtro.ClienteId = cliente.id;
    this.filtro.ClienteNombre = cliente.razon_social;
    this.mostrarSugerencias = false;
    this.buscar();
  }

  limpiarCliente() {
    this.filtro.ClienteId = 0;
    this.filtro.ClienteNombre = '';
    this.clientesFiltrados = this.clientes.slice(0, 5);
    this.mostrarSugerencias = true;
    this.buscar();
  }

  buscar() {
    this.reporteService.obtenerLista(this.filtro).subscribe({
      next: (r: any[]) => {
        this.lista = r;
        this.listaOrdenada = [...r];
        this.page = 1;
        setTimeout(() => feather?.replace(), 0);
      },
      error: (err) => {
        console.error('Error al buscar:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar los datos',
          confirmButtonColor: '#3085d6'
        });
      }
    });
  }

  // ==============================
  // EXPORTACIÓN EXCEL
  // ==============================
 mostrarVistaPreviaExcel(datos: any[]) {
  const htmlPreview = `
    <div style="max-height:400px; overflow:auto; text-align:left;">
      <h4>Vista previa del Excel</h4>

      <table style="width:100%; border-collapse: collapse; font-size:12px;">
        <thead>
          <tr style="background:#e8e8e8; font-weight:bold;">
            <th>Cliente</th>
            <th>RFC</th>
            <th>Mes</th>
            <th>Año</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Folio</th>
            <th>Fecha Pago</th>
          </tr>
        </thead>
        <tbody>
          ${datos.slice(0, 20).map(item => `
            <tr>
              <td>${item.cliente || ''}</td>
              <td>${item.rfc || ''}</td>
              <td>${this.getNombreMes(item.mes)}</td>
              <td>${item.anio || ''}</td>
              <td>${item.total || '0.00'}</td>
              <td>${item.estadoPago || ''}</td>
              <td>${item.folio || ''}</td>
              <td>${item.fechaPago || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <small style="color:#888;">Mostrando primeros 20 registros…</small>
    </div>
  `;

  Swal.fire({
    title: 'Vista previa del Excel',
    html: htmlPreview,
    width: "80%",
    showCancelButton: true,
    confirmButtonText: 'Descargar Excel',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#1d6f42',
    cancelButtonColor: '#6c757d'
  }).then(result => {
    if (result.isConfirmed) {
      this.descargarExcelReal();
    }
  });
}

  descargarExcel() {
    if (!this.listaOrdenada || this.listaOrdenada.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos',
        text: 'No hay información para exportar.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    this.mostrarVistaPreviaExcel(this.listaOrdenada);
  }

  descargarExcelReal() {
    this.reporteService.descargarExcel(this.filtro).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_Cobros_${this.filtro.Tipo}_${this.filtro.Mes}_${this.filtro.Anio}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar Excel:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo descargar el archivo Excel',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  // ==============================
  // EXPORTACIÓN PDF
  // ==============================
  private verPDF(blob: Blob) {
    const url = URL.createObjectURL(blob);

    Swal.fire({
      title: 'Vista previa del PDF',
      html: `<iframe src="${url}" width="100%" height="600px"></iframe>`,
      width: '80%',
      showConfirmButton: true,
      confirmButtonText: 'Descargar PDF',
      showCancelButton: true,
      cancelButtonText: 'Cerrar',
      didClose: () => URL.revokeObjectURL(url)
    }).then(result => {
      if (result.isConfirmed) {
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `Reporte_Cobros_${this.filtro.Tipo}_${this.filtro.Mes}_${this.filtro.Anio}.pdf`;
        a.click();
        URL.revokeObjectURL(downloadUrl);
      }
    });
  }

  descargarPdf() {
    if (!this.listaOrdenada || this.listaOrdenada.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos',
        text: 'No hay información para exportar.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    this.reporteService.descargarPdf(this.filtro).subscribe({
      next: (blob: Blob) => {
        this.verPDF(blob);
      },
      error: (err) => {
        console.error('Error al descargar PDF:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo descargar el archivo PDF',
          confirmButtonColor: '#d33'
        });
      }
    });
  }
}