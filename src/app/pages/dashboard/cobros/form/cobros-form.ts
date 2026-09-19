import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CobrosClientesService } from '../../../../core/services/cobros-clientes.service';
import { ClientesService } from '../../../../core/services/clientes.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cobros-form',
  standalone: true,
  templateUrl: './cobros-form.html',
  styleUrls: ['./cobros-form.css'],
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule
  ]
})
export class CobrosFormComponent implements OnInit {

  @Input() id: number | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  clientes: any[] = [];
  clientesFiltrados: any[] = [];
  cargando = false;
  clienteSeleccionado: any = null;
  clienteBusqueda: string = '';
  mostrarSugerencias: boolean = false;

  // se inicializa en el constructor
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private apiCobros: CobrosClientesService,
    private apiClientes: ClientesService
  ) {
    this.form = this.fb.group({
      cliente_id: [0, Validators.required],
      descripcion: ['', Validators.required],

      subtotal: [{ value: 0, disabled: true }],
      iva_porcentaje: [{ value: 16, disabled: true }],

      mes: [1, Validators.required],
      anio: [{ value: new Date().getFullYear(), disabled: true }],

      isr_ret: [{ value: 0, disabled: true }],
      iva_ret: [{ value: 0, disabled: true }],

      total: [{ value: 0, disabled: true }],

      estado_pago: ['PENDIENTE', Validators.required]
    });
  }

  ngOnInit() {
    // cargar clientes
    this.apiClientes.getLista().subscribe({
      next: res => {
        this.clientes = res;
        this.clientesFiltrados = [];
      }
    });

    // cargar modo edición
    if (this.id) this.cargarEditar();
  }

  // ==============================
  // BÚSQUEDA EN TIEMPO REAL
  // ==============================
  onClienteBusquedaChange() {
    if (!this.clienteBusqueda) {
      this.clientesFiltrados = [];
      this.mostrarSugerencias = false;
      this.form.patchValue({ cliente_id: 0 });
      this.clienteSeleccionado = null;
      this.limpiarDatosCliente();
      return;
    }

    // Filtrar clientes
    const busqueda = this.clienteBusqueda.toLowerCase();
    this.clientesFiltrados = this.clientes.filter(c => 
      c.razon_social.toLowerCase().includes(busqueda)
    );

    // Mostrar sugerencias si hay resultados
    this.mostrarSugerencias = this.clientesFiltrados.length > 0;
  }

  // ==============================
  // SELECCIONAR CLIENTE
  // ==============================
  seleccionarCliente(cliente: any) {
    this.clienteSeleccionado = cliente;
    this.clienteBusqueda = cliente.razon_social;
    this.form.patchValue({ cliente_id: cliente.id });
    this.clientesFiltrados = [];
    this.mostrarSugerencias = false;
    this.cargarDatosCliente();
  }

  // ==============================
  // LIMPIAR SELECCIÓN
  // ==============================
  limpiarSeleccion() {
    this.clienteSeleccionado = null;
    this.clienteBusqueda = '';
    this.form.patchValue({ cliente_id: 0 });
    this.clientesFiltrados = [];
    this.mostrarSugerencias = false;
    this.limpiarDatosCliente();
  }

  // ==============================
  // MANEJAR BLUR DEL INPUT
  // ==============================
  onInputBlur() {
    // Pequeño delay para permitir la selección con click
    setTimeout(() => {
      this.mostrarSugerencias = false;
    }, 200);
  }

  // ==============================
  // CARGAR DATOS DEL CLIENTE
  // ==============================
  cargarDatosCliente() {
    if (!this.clienteSeleccionado) return;

    const subtotal: number = this.clienteSeleccionado.honorarios_subtotal || 0;
    const usa_ret: boolean = this.clienteSeleccionado.usa_retenciones;

    const porcISR: number = this.clienteSeleccionado.porc_isr_ret || 0;
    const porcIVA: number = this.clienteSeleccionado.porc_iva_ret || 0;

    const ivaMonto = subtotal * 0.16;
    const isr = usa_ret ? subtotal * porcISR : 0;
    const ivaRet = usa_ret ? subtotal * porcIVA : 0;

    const total = subtotal + ivaMonto - isr - ivaRet;

    this.form.patchValue({
      subtotal,
      iva_porcentaje: 16,
      isr_ret: isr,
      iva_ret: ivaRet,
      total
    });
  }

  // ==============================
  // LIMPIAR DATOS DEL CLIENTE
  // ==============================
  limpiarDatosCliente() {
    this.form.patchValue({
      subtotal: 0,
      isr_ret: 0,
      iva_ret: 0,
      total: 0
    });
  }

  // ==============================
  // CARGAR MODO EDICIÓN
  // ==============================
  cargarEditar() {
    this.apiCobros.buscar(this.id!).subscribe({
      next: (c: any) => {
        // Buscar el cliente para mostrar su nombre
        const cliente = this.clientes.find(cli => cli.id === c.cliente_id);
        if (cliente) {
          this.clienteBusqueda = cliente.razon_social;
          this.clienteSeleccionado = cliente;
        }

        this.form.patchValue({
          cliente_id: c.cliente_id,
          descripcion: c.descripcion,
          subtotal: c.subtotal,
          iva_porcentaje: c.iva_porcentaje,
          mes: c.mes,
          anio: c.anio,
          isr_ret: c.isr_ret,
          iva_ret: c.iva_ret,
          total: c.total,
          estado_pago: c.estado_pago ?? 'PENDIENTE'
        });
      }
    });
  }

  // ==============================
  // ENVIAR FORMULARIO
  // ==============================
  enviar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      
      // Mostrar error específico si no hay cliente seleccionado
      if (!this.form.get('cliente_id')?.value || this.form.get('cliente_id')?.value === 0) {
        Swal.fire('Error', 'Debe seleccionar un cliente válido', 'error');
        return;
      }
      
      return;
    }

    const raw = this.form.getRawValue();

    // Validar que se haya seleccionado un cliente válido
    if (!raw.cliente_id || raw.cliente_id === 0) {
      Swal.fire('Error', 'Debe seleccionar un cliente válido', 'error');
      return;
    }

    const v = {
      cliente_id: raw.cliente_id,
      descripcion: raw.descripcion,
      subtotal: raw.subtotal,
      iva_porcentaje: raw.iva_porcentaje,
      isr_ret: raw.isr_ret,
      iva_ret: raw.iva_ret,
      total: raw.total,
      mes: raw.mes,
      anio: raw.anio,
      estado_pago: raw.estado_pago
    };

    this.cargando = true;

    // SI HAY id → EDITAR, SI NO → REGISTRAR
    const peticion = this.id
      ? this.apiCobros.editar(this.id, v)
      : this.apiCobros.registrar(v);

    peticion.subscribe({
      next: () => {
        this.cargando = false;
        const msg = this.id ? 'Pago actualizado' : 'Pago registrado';
        Swal.fire('Correcto', msg, 'success');
        this.saved.emit();
      },
      error: err => {
        console.error(err);
        this.cargando = false;
        Swal.fire('Error', 'No se pudo guardar el pago', 'error');
      }
    });
  }

  // ==============================
  // CERRAR MODAL
  // ==============================
  cerrar() {
    this.closed.emit();
  }

  // ==============================
  // OBTENER NOMBRE DEL MES
  // ==============================
  getMesNombre(mes: number): string {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[mes - 1] || '';
  }

  // ==============================
  // CERRAR AL HACER CLICK EN EL FONDO
  // ==============================
  cerrarFondo(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-bg')) {
      this.cerrar();
    }
  }
}