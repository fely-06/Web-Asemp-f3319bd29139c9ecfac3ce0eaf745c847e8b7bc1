import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableroIvaService } from '../../../../core/services/tablero-iva.service';
import { TableroIva } from '../../../../core/models/tablero-iva.model';
import { ClientesService, ClienteLista } from '../../../../core/services/clientes.service';
import { Chart, ChartConfiguration, registerables, DoughnutControllerChartOptions } from 'chart.js';



// NUEVOS
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// Antes
// import * as XLSX from 'xlsx';

// Después
import ExcelJS from 'exceljs';

import { saveAs } from 'file-saver';
import Swal from 'sweetalert2';
import { IvaXmlDetalle, TableroIvaConDetalle } from '../../../../core/models/tablero-iva-detalle.model';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-tablero-iva',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe],
  templateUrl: './tablero-iva.component.html',
  styleUrls: ['./tablero-iva.component.css']
})
export class TableroIvaComponent implements OnInit, AfterViewInit, OnDestroy {

  // Variables para el buscador de cliente
  clienteId: number | null = null;
  clienteNombre: string = '';
  clientes: ClienteLista[] = []; // Lista completa de clientes
  clientesFiltrados: ClienteLista[] = []; // Clientes filtrados
  mostrarSugerencias: boolean = false;
  clienteSeleccionado: ClienteLista | null = null;
  clienteFijoNombre = '';
clienteFijoRfc = '';


  // Variables para fecha
  anio = new Date().getFullYear();
  mes = new Date().getMonth() + 1;

  // Variables de estado
  cargando = false;
  error: string | null = null;
  tablero: TableroIva | null = null;
  
  // Variables para gráficas
  chartMax = 0;
  chartData: any = null;
  chartInstance: Chart | null = null;
  porcentajeCausado = 0;
  porcentajeAcreditable = 0;

  // Referencia a la gráfica
  @ViewChild('pieChart') pieChart!: ElementRef<HTMLCanvasElement>;

  // Timer para manejar blur
  private blurTimer: any = null;

  // Meses para el select
  meses = [
    { id: 1, nombre: "Enero" }, { id: 2, nombre: "Febrero" }, { id: 3, nombre: "Marzo" },
    { id: 4, nombre: "Abril" }, { id: 5, nombre: "Mayo" }, { id: 6, nombre: "Junio" },
    { id: 7, nombre: "Julio" }, { id: 8, nombre: "Agosto" }, { id: 9, nombre: "Septiembre" },
    { id: 10, nombre: "Octubre" }, { id: 11, nombre: "Noviembre" }, { id: 12, nombre: "Diciembre" }
  ];

  constructor(
    private tableroSvc: TableroIvaService,
    private clientesSvc: ClientesService,
    private authSrv: AuthService   // 👈 AÑADIR
  ) {
    Chart.register(...registerables);
  }


temaActual: 'light' | 'dark' = 'light';
private themeObserver: MutationObserver | null = null;

usuarioNombreCompleto = 'Sistema ASEMP';

esAdmin = false;
esEmpleado = false;
esCliente = false;

ngOnInit() {
 this.detectarTema(); // <-- AGREGAR ESTA LÍNEA
  this.authSrv.getPerfil().subscribe({
    next: (res: any) => {

      const rol = res.rol;

      this.esAdmin = rol === 'Administrador';
      this.esEmpleado = rol === 'Empleado';
      this.esCliente = rol === 'Cliente';

      // Nombre para PDF / Excel
      this.usuarioNombreCompleto =
        `${res.nombres ?? ''} ${res.apellido_paterno ?? ''}`.trim()
        || res.usuario
        || 'Sistema ASEMP';

      // ===============================
      // ADMIN
      // ===============================
      if (this.esAdmin) {
        this.cargarClientes();

        const clienteGuardado = localStorage.getItem('ultimoClienteConsultado');
        if (clienteGuardado) {
          try {
            const cliente: ClienteLista = JSON.parse(clienteGuardado);
            this.clienteSeleccionado = cliente;
            this.clienteNombre = cliente.razon_social;
            this.clienteId = cliente.id;
          } catch (e) {
            console.error('Error al cargar cliente guardado', e);
          }
        }
      }

      // ===============================
      // CLIENTE
      // ===============================
      if (this.esCliente) {
        // 🔥 NO USAMOS clienteId
        this.clienteId = undefined as any;

        // 🔥 Tomamos el cliente desde el perfil
        if (res.cliente) {
          this.clienteSeleccionado = {
            id: res.cliente.id,
            razon_social: res.cliente.razon_social
          } as ClienteLista;

          this.clienteNombre = res.cliente.razon_social;
        }

        localStorage.removeItem('ultimoClienteConsultado');
      }
    },

    error: () => {
      this.usuarioNombreCompleto = 'Sistema ASEMP';
    }
  });

}

ngAfterViewInit() {
  // Observar cambios en el tema
  this.themeObserver = new MutationObserver(() => this.detectarTema());
  this.themeObserver.observe(document.documentElement, { 
    attributes: true, 
    attributeFilter: ['data-theme'] 
  });
  
  // Si ya tienes código aquí, agrega esto al inicio
}

  
//=============================================================================================

//TABLERO
// TABLERO
// TABLERO DETALLE (para exportar)
tableroDetalle: TableroIva | null = null;
detalleIva: IvaXmlDetalle[] = [];


// Carga resumen + detalle de XML para exportar
async cargarDetalle(): Promise<void> {
  if (!this.clienteId) return;

  return new Promise<void>((resolve, reject) => {
    this.tableroSvc
      .obtenerConDetalle(this.clienteId!, this.anio, this.mes)
      .subscribe({
        next: (resp: TableroIvaConDetalle) => {
          this.tableroDetalle = resp.resumen;
          this.detalleIva = resp.detalleXml;
          resolve();
        },
        error: (err) => {
          console.error('Error al cargar detalle IVA:', err);
          reject(err);
        }
      });
  });
}



async exportarPDF() {
  if (!this.clienteId || !this.anio || !this.mes) return;

  await this.cargarDetalle();

  const doc = new jsPDF("p", "mm", "letter");

  // ✅ DECLARACIÓN ÚNICA DE startY (ANTES DE USARLO)
  let startY = 0;

  // =====================================================
  // HEADER ASEMP — ESTILO QUESTPDF (ROW)
  // =====================================================
  const marginX = 20;
  const headerY = 12;

  const logo = new Image();
  logo.src = "assets/images/Logo-de-la Empresa.png";

  await new Promise<void>((resolve, reject) => {
    logo.onload = () => resolve();
    logo.onerror = () => reject("No se pudo cargar el logo");
  });

  const logoWidth = 32;
  const logoHeight = 16;

  doc.addImage(logo, "PNG", marginX, headerY, logoWidth, logoHeight);

  const textStartX = marginX + logoWidth + 8;

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(122, 0, 60);
  doc.text("ASEMP — Reporte Tablero de Impuestos", textStartX, headerY + 7);

  // Fecha
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Fecha de generación: ${new Date().toLocaleDateString("es-MX")}`,
    textStartX,
    headerY + 13
  );

  // Línea fina
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.4);
  doc.line(20, headerY + 20, 195, headerY + 20);

  // =====================================================
  // INICIO DEL CONTENIDO
  // =====================================================
  startY = headerY + 26;

  // ===========================
  // DATOS DEL CLIENTE
  // ===========================
  // ===========================
// DATOS DEL CLIENTE (USANDO startY)
// ===========================
// ===========================
// DATOS DEL CLIENTE — TARJETA SUAVE
// ===========================
const cardX = 18;
const cardY = startY;
const cardWidth = 175;
const cardHeight = 26;

// Fondo
doc.setFillColor(245, 247, 250);
doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, "F");

// Borde sutil
doc.setDrawColor(220, 220, 220);
doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3);

// Contenido
let textY = cardY + 8;

doc.setFontSize(11);
doc.setFont("helvetica", "normal");
doc.setTextColor(90, 90, 90);
doc.text("Cliente:", cardX + 6, textY);
doc.setFont("helvetica", "bold");
doc.setTextColor(30, 30, 30);
doc.text(this.clienteSeleccionado?.razon_social ?? "", cardX + 30, textY);

textY += 7;

doc.setFont("helvetica", "normal");
doc.setTextColor(90, 90, 90);
doc.text("RFC:", cardX + 6, textY);
doc.setFont("helvetica", "bold");
doc.setTextColor(30, 30, 30);
doc.text(this.tableroDetalle?.rfc ?? "", cardX + 30, textY);

doc.text("Periodo:", cardX + 100, textY);
doc.text(`${this.getNombreMes(this.mes)} ${this.anio}`, cardX + 125, textY);


// ===========================
// GENERADO POR (DENTRO DE LA TARJETA)
// ===========================
// ===========================
// GENERADO POR (DEBAJO DE PERIODO, DERECHA)
// ===========================
const generadoPor = this.usuarioNombreCompleto;


doc.setFontSize(9);
doc.setFont("helvetica", "italic");
doc.setTextColor(120, 120, 120);

doc.text(
  `Generado por: ${generadoPor}`,
  cardX + cardWidth - 6,
  textY + 6,
  { align: "right" }
);


startY = cardY + cardHeight + 8;



  // ===========================
  // TABLA DEL TABLERO CON COLORES
  // ===========================
  const resumenHead = [["Concepto", "PUE", "PPD", "Total"]];
  const resumenBody = [
    [
      "IVA Causado",
      (this.tablero?.ivaCausado?.pue ?? 0).toFixed(2),
      (this.tablero?.ivaCausado?.ppd ?? 0).toFixed(2),
      (this.tablero?.ivaCausado?.total ?? 0).toFixed(2),
    ],
    [
      "IVA Acreditable",
      (this.tablero?.ivaAcreditable?.pue ?? 0).toFixed(2),
      (this.tablero?.ivaAcreditable?.ppd ?? 0).toFixed(2),
      (this.tablero?.ivaAcreditable?.total ?? 0).toFixed(2),
    ],
    ["IVA Neto", "", "", (this.tablero?.ivaAPagar ?? 0).toFixed(2)],
  ];

autoTable(doc, {
  startY,
  head: [['Concepto', 'PUE', 'PPD', 'Total']],
  body: resumenBody,

  styles: { 
    fontSize: 10,
    cellPadding: 3
  },

  // 🔵 Encabezado azul fuerte
  headStyles: { 
    fillColor: [30, 90, 180],  // azul fuerte
    textColor: 255,
    fontStyle: 'bold'
  },

  // 🎨 Colores de las filas como tu frontend
  didParseCell: (data) => {
    if (data.section === 'body') {
      if (data.row.index === 0) data.cell.styles.fillColor = [220, 235, 255];  // azul pastel
      if (data.row.index === 1) data.cell.styles.fillColor = [215, 244, 225];  // verde pastel
      if (data.row.index === 2) data.cell.styles.fillColor = [255, 230, 230];  // rosa pastel
    }
  }
});


  startY = (doc as any).lastAutoTable.finalY + 10;

  // ===========================
  // GRÁFICA DONUT CENTRADA
  // ===========================
if (this.chartInstance) {

  const img = this.chartInstance.toBase64Image();

  // Título centrado
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text("Distribución del IVA", 105, startY, { align: "center" });

  // Tamaño de la gráfica
  const chartWidth = 60;
  const chartHeight = 60;
  const chartX = (doc.internal.pageSize.getWidth() - chartWidth) / 2;
  const chartY = startY + 5;

  // Insertar gráfica
  doc.addImage(img, "PNG", chartX, chartY, chartWidth, chartHeight);

  // ======================================================
  // 🔷 NÚMERO CENTRAL (SE MANTIENE)
  // ======================================================
  const totalCentral =
    (this.tablero?.ivaCausado.total ?? 0) +
    (this.tablero?.ivaAcreditable.total ?? 0);

  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');

  doc.text(
    `MX$${totalCentral.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
    chartX + chartWidth / 2,
    chartY + chartHeight / 2,
    { align: "center" }
  );

  // ======================================================
  // 🔵 PORCENTAJES A LA DERECHA (OPCIÓN B)
  // ======================================================

  const totalCausado = this.tablero?.ivaCausado.total ?? 0;
  const totalAcred = this.tablero?.ivaAcreditable.total ?? 0;
  const total = totalCausado + totalAcred;

  const p1 = total > 0 ? ((totalCausado / total) * 100).toFixed(1) : "0.0";
  const p2 = total > 0 ? ((totalAcred / total) * 100).toFixed(1) : "0.0";

  // Texto a la derecha
  const textX = chartX + chartWidth + 10;
  const textY1 = chartY + 10;
  const textY2 = chartY + 22;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");

  // IVA Causado (azul)
  doc.setTextColor(79, 158, 255);
  doc.text(`IVA Causado: ${p1}%`, textX, textY1);

  // IVA Acreditable (verde)
  doc.setTextColor(110, 231, 183);
  doc.text(`IVA Acreditable: ${p2}%`, textX, textY2);

  // Restaurar color negro
  doc.setTextColor(0, 0, 0);

  // Actualizar posición Y
  startY = chartY + chartHeight + 20;
}

  // ===========================
  // SALTO DE PÁGINA -> EMITIDOS
  // ===========================
  const emitidos = this.detalleIva.filter((x) => x.tipoMovimiento === "Emitido");

  doc.addPage();
  startY = 20;

  if (emitidos.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text("COMPROBANTES EMITIDOS", 14, startY);
    startY += 6;

    autoTable(doc, {
      startY,
      head: [["UUID", "Tipo", "Método", "Emisor", "Receptor", "IVA", "Retenido", "Incluido"]],
      body: emitidos.map((x) => [
        x.uuid,
        x.tipoCfdi,
        x.metodoPago,
        x.rfcEmisor,
        x.rfcReceptor,
        x.ivaTrasladado,
        x.ivaRetenido,
        x.incluidoEnCalculo ? "Sí" : "No",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 144, 255] },
    });
  }

  // ===========================
  // SALTO DE PÁGINA -> RECIBIDOS
  // ===========================
  const recibidos = this.detalleIva.filter((x) => x.tipoMovimiento === "Recibido");

  doc.addPage();
  startY = 20;

  if (recibidos.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("COMPROBANTES RECIBIDOS", 14, startY);
    startY += 6;

    autoTable(doc, {
      startY,
      head: [["UUID", "Tipo", "Método", "Emisor", "Receptor", "IVA", "Retenido", "Incluido"]],
      body: recibidos.map((x) => [
        x.uuid,
        x.tipoCfdi,
        x.metodoPago,
        x.rfcEmisor,
        x.rfcReceptor,
        x.ivaTrasladado,
        x.ivaRetenido,
        x.incluidoEnCalculo ? "Sí" : "No",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [46, 204, 113] },
    });
  }

  // ===========================
  // VISTA PREVIA
  // ===========================
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);

  Swal.fire({
  title: "Vista Previa del PDF",
  html: `<iframe src="${url}" width="100%" height="600px"></iframe>`,
  width: "80%",
  showCancelButton: true,
  confirmButtonText: "Descargar",
  cancelButtonText: "Cerrar"
}).then(result => {
  if (result.isConfirmed) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_IVA_${this.mes}_${this.anio}.pdf`;
    a.click();
  }
});


}








private async cargarImagenBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}




async descargarExcelReal() {
  if (!this.tableroDetalle || !this.detalleIva.length) return;

  const wb = new ExcelJS.Workbook();

  // ==========================
  // COLORES
  // ==========================
  const GUINDA = 'FF7A003C';     // argb (FF + hex)
  const AZUL_HDR = 'FF1F4E79';
  const GRIS_TARJ = 'FFF4F6F8';
  const AZUL_SUAVE = 'FFE8F3FF';
  const VERDE_SUAVE = 'FFE6F6E6';
  const ROSA_SUAVE = 'FFFCE4EC';
  const BORDE = 'FFD9D9D9';

  const t = this.tableroDetalle;

  const generadoPor = this.usuarioNombreCompleto ?? 'Sistema ASEMP';
  const fechaGen = new Date().toLocaleDateString('es-MX');

  // ==========================
  // HOJA 1: RESUMEN
  // ==========================
  const wsResumen = wb.addWorksheet('Resumen', {
    views: [{ state: 'frozen', ySplit: 6 }] // congela encabezado/cliente
  });

  // Columnas (A-D)
  wsResumen.columns = [
    { width: 18 },
    { width: 24 },
    { width: 16 },
    { width: 26 },
  ];

  // --------------------------
  // LOGO (imagen)
  // --------------------------
  // Ajusta la ruta a tu logo real
  const logoBase64 = await this.cargarImagenBase64('assets/images/Logo-de-la Empresa.png');
  const logoId = wb.addImage({ base64: logoBase64, extension: 'png' });

  // Tamaño real aproximado del logo MRD (ajusta si quieres)
const LOGO_WIDTH = 110;      // ancho fijo
const LOGO_RATIO = 110 / 230; // proporción aproximada (alto/ancho)
const LOGO_HEIGHT = LOGO_WIDTH * LOGO_RATIO;

wsResumen.addImage(logoId, {
  tl: { col: 0.15, row: 0.25 },  // pequeño margen
  ext: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT
  }
});


  // --------------------------
  // HEADER GUINDA (B1:D2) para dejar espacio al logo en A
  // --------------------------
  wsResumen.mergeCells('B1:D1');
  wsResumen.getCell('B1').value = 'ASEMP — Reporte Tablero de Impuestos';
  wsResumen.getCell('B1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  wsResumen.getCell('B1').alignment = { horizontal: 'center', vertical: 'middle' };
  ['B1','C1','D1'].forEach(a => {
    wsResumen.getCell(a).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GUINDA } };
  });

  wsResumen.mergeCells('B2:D2');
  wsResumen.getCell('B2').value = `Fecha de generación: ${fechaGen}`;
  wsResumen.getCell('B2').font = { italic: true, size: 11, color: { argb: 'FFFFFFFF' } };
  wsResumen.getCell('B2').alignment = { horizontal: 'center', vertical: 'middle' };
  ['B2','C2','D2'].forEach(a => {
    wsResumen.getCell(a).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GUINDA } };
  });

 

  // Altura filas header
  wsResumen.getRow(1).height = 26;
  wsResumen.getRow(2).height = 18;

  // --------------------------
  // FILA 3 vacía
  // --------------------------
  wsResumen.addRow([]);
  wsResumen.getRow(3).height = 8;

  // --------------------------
  // TARJETA CLIENTE (A4:D5)
  // --------------------------
  wsResumen.getCell('A4').value = 'Cliente:';
  wsResumen.getCell('B4').value = this.clienteSeleccionado?.razon_social ?? '';
  wsResumen.getCell('C4').value = 'Periodo:';
  wsResumen.getCell('D4').value = `${this.getNombreMes(this.mes)} ${this.anio}`;

  wsResumen.getCell('A5').value = 'RFC:';
  wsResumen.getCell('B5').value = t.rfc ?? '';
  wsResumen.getCell('C5').value = 'Generado por:';
  wsResumen.getCell('D5').value = generadoPor;

  // estilo tarjeta
  ['A4','B4','C4','D4','A5','B5','C5','D5'].forEach(addr => {
    const cell = wsResumen.getCell(addr);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_TARJ } };
    cell.border = {
      top: { style: 'thin', color: { argb: BORDE } },
      left: { style: 'thin', color: { argb: BORDE } },
      bottom: { style: 'thin', color: { argb: BORDE } },
      right: { style: 'thin', color: { argb: BORDE } },
    };
    cell.alignment = { vertical: 'middle' };
  });

  // labels bold + valores bold
  ['A4','C4','A5','C5'].forEach(a => wsResumen.getCell(a).font = { bold: true, size: 11 });
  ['B4','D4','B5','D5'].forEach(a => wsResumen.getCell(a).font = { bold: true, size: 11 });

  wsResumen.getRow(4).height = 20;
  wsResumen.getRow(5).height = 20;

  // --------------------------
  // FILA 6 vacía
  // --------------------------
  wsResumen.addRow([]);
  wsResumen.getRow(6).height = 8;

  // --------------------------
  // TABLA RESUMEN (fila 7+)
  // --------------------------
  wsResumen.addRow(['Concepto', 'PUE', 'PPD', 'Total']);

  const rowHeader = wsResumen.getRow(7);
  rowHeader.height = 18;
  rowHeader.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_HDR } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: BORDE } },
      left: { style: 'thin', color: { argb: BORDE } },
      bottom: { style: 'thin', color: { argb: BORDE } },
      right: { style: 'thin', color: { argb: BORDE } },
    };
  });

  // filas
  const r8 = wsResumen.addRow(['IVA Causado', t.ivaCausado.pue, t.ivaCausado.ppd, t.ivaCausado.total]);
  const r9 = wsResumen.addRow(['IVA Acreditable', t.ivaAcreditable.pue, t.ivaAcreditable.ppd, t.ivaAcreditable.total]);
  const r10 = wsResumen.addRow(['IVA Neto', '', '', t.ivaAPagar]);

  const applyRowFill = (rowNumber: number, argb: string) => {
    const row = wsResumen.getRow(rowNumber);
    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
      cell.border = {
        top: { style: 'thin', color: { argb: BORDE } },
        left: { style: 'thin', color: { argb: BORDE } },
        bottom: { style: 'thin', color: { argb: BORDE } },
        right: { style: 'thin', color: { argb: BORDE } },
      };
      cell.alignment = { vertical: 'middle' };
    });
  };

  applyRowFill(8, AZUL_SUAVE);
  applyRowFill(9, VERDE_SUAVE);
  applyRowFill(10, ROSA_SUAVE);

  // Formato numérico/moneda para columnas B-D en filas 8-10
  const moneyFmt = '$#,##0.00';
  [8, 9, 10].forEach(rn => {
    ['B','C','D'].forEach(col => {
      const c = wsResumen.getCell(`${col}${rn}`);
      if (typeof c.value === 'number') {
        c.numFmt = moneyFmt;
      }
      c.alignment = { horizontal: 'right', vertical: 'middle' };
    });
  });

  // ==========================
  // HOJA 2: EMITIDOS (con header azul)
  // ==========================
  const wsEmitidos = wb.addWorksheet('Emitidos', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  wsEmitidos.columns = [
    { header: 'UUID', key: 'uuid', width: 40 },
    { header: 'Tipo', key: 'tipo', width: 6 },
    { header: 'Método', key: 'metodo', width: 10 },
    { header: 'Emisor', key: 'emisor', width: 18 },
    { header: 'Receptor', key: 'receptor', width: 18 },
    { header: 'IVA', key: 'iva', width: 12 },
    { header: 'Retenido', key: 'retenido', width: 12 },
    { header: 'Incluido', key: 'incluido', width: 10 },
  ];

  // Header azul
  const eh = wsEmitidos.getRow(1);
  eh.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_HDR } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  this.detalleIva
    .filter(x => x.tipoMovimiento === 'Emitido')
    .forEach(x => {
      const row = wsEmitidos.addRow({
        uuid: x.uuid,
        tipo: x.tipoCfdi,
        metodo: x.metodoPago,
        emisor: x.rfcEmisor,
        receptor: x.rfcReceptor,
        iva: Number(x.ivaTrasladado ?? 0),
        retenido: Number(x.ivaRetenido ?? 0),
        incluido: x.incluidoEnCalculo ? 'Sí' : 'No'
      });

      // Formato numérico
      row.getCell('F').numFmt = moneyFmt;
      row.getCell('G').numFmt = moneyFmt;
      row.getCell('F').alignment = { horizontal: 'right' };
      row.getCell('G').alignment = { horizontal: 'right' };
    });

  // ==========================
  // HOJA 3: RECIBIDOS (con header azul)
  // ==========================
  const wsRecibidos = wb.addWorksheet('Recibidos', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  wsRecibidos.columns = wsEmitidos.columns as any;

  const rh = wsRecibidos.getRow(1);
  rh.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_HDR } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  this.detalleIva
    .filter(x => x.tipoMovimiento === 'Recibido')
    .forEach(x => {
      const row = wsRecibidos.addRow({
        uuid: x.uuid,
        tipo: x.tipoCfdi,
        metodo: x.metodoPago,
        emisor: x.rfcEmisor,
        receptor: x.rfcReceptor,
        iva: Number(x.ivaTrasladado ?? 0),
        retenido: Number(x.ivaRetenido ?? 0),
        incluido: x.incluidoEnCalculo ? 'Sí' : 'No'
      });

      row.getCell('F').numFmt = moneyFmt;
      row.getCell('G').numFmt = moneyFmt;
      row.getCell('F').alignment = { horizontal: 'right' };
      row.getCell('G').alignment = { horizontal: 'right' };
    });

  // ==========================
  // DESCARGA
  // ==========================
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `IVA_${t.rfc}_${this.mes}_${this.anio}.xlsx`
  );
}




async exportarExcel() {
  if (!this.detalleIva || this.detalleIva.length === 0) {
    Swal.fire('Sin datos', 'No hay detalle de IVA para exportar.', 'warning');
    return;
  }

  const htmlPreview = `
    <div style="max-height:400px; overflow:auto; text-align:left;">
      <h4>Vista previa del detalle</h4>
      <table style="width:100%; border-collapse: collapse; font-size:11px;">
        <thead>
          <tr style="background:#e8e8e8;">
            <th>UUID</th><th>Tipo</th><th>Método</th><th>Emisor</th>
            <th>Receptor</th><th>IVA</th><th>Retenido</th><th>Incluido</th>
          </tr>
        </thead>
        <tbody>
          ${this.detalleIva
            .slice(0, 30)
            .map(
              x => `
            <tr>
              <td>${x.uuid}</td>
              <td>${x.tipoCfdi}</td>
              <td>${x.metodoPago}</td>
              <td>${x.rfcEmisor}</td>
              <td>${x.rfcReceptor}</td>
              <td>${x.ivaTrasladado}</td>
              <td>${x.ivaRetenido}</td>
              <td>${x.incluidoEnCalculo ? 'Sí' : 'No'}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      <small>Muestra de los primeros 30 registros…</small>
    </div>
  `;

  Swal.fire({
    title: 'Vista previa del Excel',
    html: htmlPreview,
    width: '90%',
    showCancelButton: true,
    confirmButtonText: 'Descargar Excel',
    cancelButtonText: 'Cancelar'
  }).then(async result => {
    if (result.isConfirmed) {
      await this.descargarExcelReal();
    }
  });
}



  //=============================================================================================



  // Método para cargar todos los clientes
  cargarClientes() {
    this.clientesSvc.getLista().subscribe({
      next: (res) => {
        this.clientes = res;
        this.clientesFiltrados = [];
      },
      error: (err) => {
        console.error('Error al cargar lista de clientes:', err);
        this.clientes = [];
      }
    });
  }

  // ==============================
  // MÉTODOS DEL BUSCADOR DE CLIENTE
  // ==============================
  
  onClienteBusquedaChange() {
    if (!this.clienteNombre) {
      this.clientesFiltrados = [];
      this.mostrarSugerencias = false;
      this.clienteSeleccionado = null;
      this.clienteId = null;
      return;
    }

    // Filtrar clientes en tiempo real
    const busqueda = this.clienteNombre.toLowerCase().trim();
    this.clientesFiltrados = this.clientes.filter(c => 
      c.razon_social.toLowerCase().includes(busqueda)
    );

    // Mostrar sugerencias si hay resultados
    this.mostrarSugerencias = this.clientesFiltrados.length > 0;
  }

  seleccionarCliente(cliente: ClienteLista) {
    this.clienteSeleccionado = cliente;
    this.clienteNombre = cliente.razon_social;
    this.clienteId = cliente.id;
    this.clientesFiltrados = [];
    this.mostrarSugerencias = false;
    
    // Guardar en localStorage para próximas consultas
    localStorage.setItem('ultimoClienteConsultado', JSON.stringify(cliente));
  }

  limpiarSeleccion() {
    this.clienteSeleccionado = null;
    this.clienteNombre = '';
    this.clienteId = null;
    this.clientesFiltrados = [];
    this.mostrarSugerencias = false;
    this.tablero = null;
    this.chartData = null;
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
    localStorage.removeItem('ultimoClienteConsultado');
  }

  onInputBlur() {
    // Pequeño delay para permitir la selección con click
    this.blurTimer = setTimeout(() => {
      this.mostrarSugerencias = false;
    }, 200);
  }

  onInputFocus() {
    if (this.blurTimer) {
      clearTimeout(this.blurTimer);
    }
    if (this.clienteNombre && this.clienteNombre.trim().length >= 2) {
      this.onClienteBusquedaChange();
    }
  }

  // ==============================
  // MÉTODO PRINCIPAL DE CONSULTA
  // ==============================
  
  consultar() {
    this.error = null;
    this.tablero = null;
    this.chartData = null;
    this.mostrarSugerencias = false;

    // Limpiar gráfica anterior si existe
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }

    // Validaciones
    if (!this.clienteId && !this.clienteSeleccionado) {
      this.error = 'Debe seleccionar un cliente.';
      return;
    }

    // Si se seleccionó desde búsqueda pero no se asignó ID
    if (this.clienteSeleccionado && !this.clienteId) {
      this.clienteId = this.clienteSeleccionado.id;
    }

    // Si hay nombre pero no se seleccionó cliente, intentar buscar en la lista
    if (!this.clienteSeleccionado && this.clienteNombre && this.clienteNombre.trim().length >= 2) {
      const clienteEncontrado = this.clientes.find(
        c => c.razon_social.toLowerCase().includes(this.clienteNombre.toLowerCase().trim())
      );
      
      if (clienteEncontrado) {
        this.clienteSeleccionado = clienteEncontrado;
        this.clienteId = clienteEncontrado.id;
      } else {
        this.error = 'Cliente no encontrado. Seleccione uno de la lista.';
        return;
      }
    }

    this.cargando = true;

    // ========================================================
  //          🔥 AQUÍ ESTÁ LA VERSIÓN CORRECTA DEL SUBSCRIBE
  // ========================================================
  this.tableroSvc.obtener(this.clienteId!, this.anio, this.mes).subscribe({
    
    next: async (resp) => {
      this.tablero = resp;
      this.cargando = false;

      // Preparar datos
      this.prepararDatosGrafica();

      setTimeout(() => {
        this.crearGraficaCircular();
      }, 50);

      // 🔥 Cargamos el DETALLE para PDF/Excel
      await this.cargarDetalle();
      console.log("DETALLE CARGADO:", this.detalleIva);
    },

    error: (err) => {
      console.error('Error al obtener tablero:', err);
      this.error = 'No se encontraron datos para el periodo seleccionado.';
      this.cargando = false;
    }
  });

  }

  // ==============================
  // MÉTODOS PARA GRÁFICAS
  // ==============================
  
  prepararDatosGrafica() {
    if (!this.tablero) return;

    const ivaCausado = Math.abs(this.tablero.ivaCausado?.total || 0);
    const ivaAcreditable = Math.abs(this.tablero.ivaAcreditable?.total || 0);
    
    this.chartMax = Math.max(ivaCausado, ivaAcreditable, 1);

    const total = ivaCausado + ivaAcreditable;
    
    // Calcular porcentajes para la gráfica circular
    this.porcentajeCausado = total > 0 ? (ivaCausado / total) * 100 : 0;
    this.porcentajeAcreditable = total > 0 ? (ivaAcreditable / total) * 100 : 0;
    
    this.chartData = {
      labels: ['IVA Causado', 'IVA Acreditable'],
      datasets: [
        {
          data: [ivaCausado, ivaAcreditable],
          backgroundColor: [
            'rgba(79, 158, 255, 0.8)',
            'rgba(110, 231, 183, 0.8)'
          ],
          borderColor: [
            'rgba(79, 158, 255, 1)',
            'rgba(110, 231, 183, 1)'
          ],
          borderWidth: 2,
          hoverOffset: 10
        }
      ],
      total: total
    };
  }

   crearGraficaCircular() {
    if (!this.chartData || !this.pieChart) return;

    const ctx = this.pieChart.nativeElement.getContext('2d');
    if (!ctx) return;

    // Destruir gráfica anterior si existe
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const config = {
      type: 'doughnut' as const,
      data: this.chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const label = context.label || '';
                const value = context.parsed;
                const total = context.dataset?.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value.toLocaleString('es-MX', {
                  style: 'currency',
                  currency: 'MXN'
                })} (${percentage}%)`;
              }
            }
          }
        }
      }
    };
    this.chartInstance = new Chart(ctx, config);
    console.log(
  "CANVAS REAL SIZE:",
  this.pieChart.nativeElement.clientWidth,
  this.pieChart.nativeElement.clientHeight
);

  }

  // Alternativa simplificada sin Chart.js (para gráficas SVG)
  crearGraficaSVG() {
    // Esta función sería para crear gráficas SVG manualmente si no quieres usar Chart.js
    console.log('Creando gráfica SVG alternativa...');
  }

  // Método para obtener el porcentaje de la barra
  getBarPercent(value: number): number {
    if (!this.chartMax || this.chartMax <= 0) return 0;
    return Math.round((value / this.chartMax) * 100);
  }

  // ==============================
  // MÉTODOS AUXILIARES
  // ==============================
  
  getNombreMes(m: number): string {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[m - 1] || '';
  }

  getNombreMesSelect(m: number): string {
    const mesObj = this.meses.find(item => item.id === m);
    return mesObj ? mesObj.nombre : '';
  }

  // Método para formatear moneda
  formatoMoneda(valor: number): string {
    return valor.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Método para obtener el tipo de saldo
  getTipoSaldo(): string {
    if (!this.tablero) return '';
    return this.tablero.ivaAPagar < 0 ? 'Saldo a Favor' : 'Saldo por Pagar';
  }

  // Método para obtener clase CSS según el tipo de saldo
  getClaseSaldo(): string {
    if (!this.tablero) return '';
    return this.tablero.ivaAPagar < 0 ? 'text-success' : 'text-danger';
  }

  // Método para obtener icono según el tipo de saldo
  getIconoSaldo(): string {
    if (!this.tablero) return '';
    return this.tablero.ivaAPagar < 0 ? 'fa-arrow-down' : 'fa-arrow-up';
  }

  // Método para reiniciar consulta
  reiniciarConsulta() {
    this.limpiarSeleccion();
    this.anio = new Date().getFullYear();
    this.mes = new Date().getMonth() + 1;
    this.error = null;
    this.tablero = null;
    this.chartData = null;
    this.porcentajeCausado = 0;
    this.porcentajeAcreditable = 0;
  }

  // Método para cambiar mes
  cambiarMes(direccion: number) {
    let nuevoMes = this.mes + direccion;
    if (nuevoMes > 12) {
      nuevoMes = 1;
      this.anio++;
    } else if (nuevoMes < 1) {
      nuevoMes = 12;
      this.anio--;
    }
    this.mes = nuevoMes;
  }

  // Método para validar si se puede consultar
puedeConsultar(): boolean {
  if (this.esCliente) {
    return !this.cargando; // solo mes/año
  }

  return (!!this.clienteId || !!this.clienteSeleccionado) && !this.cargando;
}



  // Método para limpiar errores
  limpiarError() {
    this.error = null;
  }

  // Método para obtener el resumen de datos
  getResumenDatos(): { causado: number, acreditable: number, saldo: number, periodo: string, cliente: string } | null {
    if (!this.tablero) return null;
    
    return {
      causado: this.tablero.ivaCausado?.total || 0,
      acreditable: this.tablero.ivaAcreditable?.total || 0,
      saldo: this.tablero.ivaAPagar || 0,
      periodo: `${this.getNombreMes(this.tablero.mes)} ${this.tablero.anio}`,
      cliente: this.clienteSeleccionado?.razon_social || 'Cliente no seleccionado'
    };
  }

  // Método para obtener el ángulo de la gráfica circular (para SVG alternativo)
  getAnguloCircular(porcentaje: number): number {
    return (porcentaje / 100) * 360;
  }

  // Método para obtener el offset de la gráfica circular (para SVG alternativo)
  getCircularOffset(): number {
    return 282.6 - (this.porcentajeCausado / 100 * 282.6);
  }

  // Método para obtener la porción de la gráfica circular (para SVG alternativo)
  getCircularPorcion(porcentaje: number): number {
    return (porcentaje / 100) * 282.6; // 282.6 es la circunferencia de un círculo con radio 45
  }

  ngOnDestroy() {
     // Limpiar observer del tema
  if (this.themeObserver) {
    this.themeObserver.disconnect();
  }
  
  // Limpiar timer
  if (this.blurTimer) {
    clearTimeout(this.blurTimer);
  }
  
  // Destruir gráfica
  if (this.chartInstance) {
    this.chartInstance.destroy();
  }
  }

  // Agregar este método privado (en cualquier lugar dentro de la clase):
private detectarTema(): void {
  const temaGuardado = localStorage.getItem('theme');
  this.temaActual = temaGuardado === 'dark' ? 'dark' : 'light';

   // Debug: ver en consola
  console.log('Tema detectado:', this.temaActual, 
              'data-theme en HTML:', document.documentElement.getAttribute('data-theme'));
}
}