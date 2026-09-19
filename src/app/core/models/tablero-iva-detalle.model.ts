import { TableroIva } from './tablero-iva.model';

// ===============================
// DETALLE POR CADA XML
// ===============================
export interface IvaXmlDetalle {
  tipoMovimiento: string;   // Emitido / Recibido
  rutaArchivo: string;
  nombreXml: string;

  uuid: string;
  fecha: string | null;

  tipoCfdi: string;         // I, E, P, N, etc.
  metodoPago: string;       // PUE, PPD, etc.
  rfcEmisor: string;
  rfcReceptor: string;

  ivaTrasladado: number;
  ivaRetenido: number;

  incluidoEnCalculo: boolean;
  motivoExclusion: string;
}

// ===============================
// RESPUESTA COMPLETA DEL EXPORT
// ===============================
export interface TableroIvaConDetalle {
  resumen: TableroIva;          // Lo que ya usas en tu tablero
  detalleXml: IvaXmlDetalle[];  // La lista del detalle
}
