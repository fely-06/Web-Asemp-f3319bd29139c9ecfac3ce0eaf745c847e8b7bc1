export interface IvaDetalle {
  pue: number;
  ppd: number;
  total: number;
}

export interface TableroIva {
  clienteId: number;
  rfc: string;
  anio: number;
  mes: number;
  ivaCausado: IvaDetalle;
  ivaAcreditable: IvaDetalle;
  ivaAPagar: number;
}
