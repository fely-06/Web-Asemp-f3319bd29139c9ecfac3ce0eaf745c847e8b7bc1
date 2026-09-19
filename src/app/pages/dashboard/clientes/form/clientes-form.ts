import { Component, Input, Output, EventEmitter, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ClientesService } from '../../../../core/services/clientes.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-clientes-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './clientes-form.html',
  styleUrls: ['./clientes-form.css']
})
export class ClientesFormComponent {
  // ==============================================================
  // 🔹 Comunicación con el padre (clientes-list)
  // ==============================================================
  @Input() show = false;
  @Input() id: number | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  // Referencias a los inputs de archivo
  @ViewChild('cerInput') cerInput!: ElementRef;
  @ViewChild('keyInput') keyInput!: ElementRef;

  // ==============================================================
  // 🔹 Variables principales
  // ==============================================================
  cargando = false;
  form: any;
  rfcDetectado = false;
  mostrarContrasena = false;


  // 🔥 Nueva variable para controlar la visibilidad de retenciones
  mostrarRetenciones = false;

  // ✅ Información del certificado leído
  certInfo: any = null;

constructor(private fb: FormBuilder, private api: ClientesService) {
  this.form = this.fb.group({
    usuario_id: [null, Validators.required],  // obligatorio

    razon_social: ['', [Validators.required, Validators.minLength(3)]],

    telefono: [
      '',
      [
        Validators.pattern(/^(\+52\s?)?(\d{3})[-\s]?\d{3}[-\s]?\d{4}$/)
      ]
    ],

    correo_electronico: ['', [Validators.email]],

    direccion: [''],

    honorarios_subtotal: [
      0,
      [
        Validators.required,
        Validators.min(0),
        Validators.pattern(/^\d+(\.\d{1,2})?$/) // solo números y hasta 2 decimales
      ]
    ],

    rfc: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i)
      ]
    ],

    contrasena: [
      '',
      [
        Validators.required,
        Validators.minLength(6)
      ]
    ],

    cer: [null],
    key: [null],

    estatus: [true],

    // 🔥 NUEVOS CAMPOS
    usa_retenciones: [false],
    porc_isr_ret: [0.10],
    porc_iva_ret: [0.106667],
  });

  // 🔥 Validación dinámica de retenciones
  this.form.get("usa_retenciones")?.valueChanges.subscribe((val: boolean) => {

    if (val) {
      this.form.get("porc_isr_ret")?.setValidators([
        Validators.required, Validators.min(0)
      ]);

      this.form.get("porc_iva_ret")?.setValidators([
        Validators.required, Validators.min(0)
      ]);
    } else {
      this.form.get("porc_isr_ret")?.clearValidators();
      this.form.get("porc_iva_ret")?.clearValidators();
    }

    this.form.get("porc_isr_ret")?.updateValueAndValidity();
    this.form.get("porc_iva_ret")?.updateValueAndValidity();
  });
}


formatearTelefono() {
  let tel = this.form.get('telefono')?.value || '';

  // quitar todo lo que no sea dígito
  tel = tel.replace(/\D/g, '');

  // si empieza con 52, quitarlo temporalmente
  let tieneLada52 = false;
  if (tel.startsWith("52")) {
    tieneLada52 = true;
    tel = tel.substring(2);
  }

  // aplicar formato solo si hay 10 dígitos
  if (tel.length >= 4 && tel.length <= 6) {
    tel = tel.replace(/(\d{3})(\d{1,3})/, "$1-$2");
  } else if (tel.length > 6) {
    tel = tel.replace(/(\d{3})(\d{3})(\d{1,4})/, "$1-$2-$3");
  }

  if (tieneLada52) tel = "+52 " + tel;

  this.form.get('telefono')?.setValue(tel, { emitEvent: false });
}


// ==============================================================
  // 🔹 Cargar usuarios disponibles para asignar
  // ==============================================================
  usuariosDisponibles: any[] = [];

ngOnInit() {

  // 1) Cargar usuarios disponibles
  this.api.getUsuariosDisponibles().subscribe({
    next: (res) => {
      this.usuariosDisponibles = res;

      // ==========================================================
      // 🔥 AUTOLLENAR CUANDO SE SELECCIONA UN USUARIO (YA HAY DATOS)
      // ==========================================================
      this.form.get("usuario_id")?.valueChanges.subscribe((usuarioId: number) => {
        if (!usuarioId) return;

        const usuario = this.usuariosDisponibles.find(u => u.id === usuarioId);
        if (!usuario) return;

        const nombreCompleto =
          usuario.nombre_completo ||
          (usuario.nombres
            ? `${usuario.nombres} ${usuario.apellido_paterno ?? ''} ${usuario.apellido_materno ?? ''}`.trim()
            : usuario.usuario);

        this.form.patchValue({
          razon_social: nombreCompleto,
          correo_electronico: usuario.correo || '',
          telefono: usuario.telefono || ''
        });
      });

      // Si se está editando, cargar datos del cliente (AL FINAL)
      if (this.id) {
        this.cargarCliente();
      }
    },
    error: () => console.error('Error cargando usuarios disponibles')
  });

  // 2) Configuración del estado inicial de retenciones
  this.mostrarRetenciones = this.form.get('usa_retenciones')?.value;
}
  // ==============================================================


   // 🔥 Método para toggle de retenciones
  toggleRetenciones() {
    this.mostrarRetenciones = !this.mostrarRetenciones;
  }

cargarCliente() {
  if (!this.id) return;

  this.api.getByIdDetalle(this.id).subscribe({
    next: (cliente) => {

      const cert = cliente.certificados_sat?.[0];

      // Carga normal del cliente
      this.form.patchValue({
        usuario_id: cliente.usuario_id,
        razon_social: cliente.razon_social,
        telefono: cliente.telefono,
        correo_electronico: cliente.correo_electronico,
        direccion: cliente.direccion,
        honorarios_subtotal: cliente.honorarios_subtotal,
        rfc: cert?.rfc || '',
        contrasena: cert?.contrasena || '',
        estatus: cliente.estatus,
        usa_retenciones: cliente.usa_retenciones,
        porc_isr_ret: cliente.porc_isr_ret,
        porc_iva_ret: cliente.porc_iva_ret,
      });

      this.mostrarRetenciones = cliente.usa_retenciones;

      // ======================================================
      // 🔥 Autollenar datos del usuario asignado (solo en edición)
      // ======================================================
      const usuario = this.usuariosDisponibles.find(u => u.id === cliente.usuario_id);
      if (usuario) {

        // Construir nombre completo si existe
        const nombreCompleto =
          (usuario.nombres && usuario.apellido_paterno)
            ? `${usuario.nombres} ${usuario.apellido_paterno} ${usuario.apellido_materno ?? ''}`.trim()
            : usuario.usuario;  // fallback si no existen los nombres

        this.form.patchValue({
          razon_social: nombreCompleto,
          correo_electronico: usuario.correo || cliente.correo_electronico,
          telefono: usuario.telefono || cliente.telefono
        });
      }

    },
    error: (err) => console.error('Error al cargar cliente', err),
  });
}


  // ==============================================================
  // 🔹 Cerrar el modal
  // ==============================================================
  @HostListener('document:keydown.escape')
  cerrarPorTecla() {
    this.cerrarModal();
  }

  cerrarFondo(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal')) this.cerrarModal();
  }

  cerrarModal() {
    this.form.reset();
    this.rfcDetectado = false;
    this.certInfo = null;
    this.closed.emit();
  }

  // ==============================================================
  // 🔹 Archivos CER/KEY
  // ==============================================================
  async onFileChange(evt: Event, campo: 'cer' | 'key') {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      this.form.patchValue({ [campo]: null });
      return;
    }

    const ext = file.name.toLowerCase().split('.').pop();
    if (campo === 'cer' && ext !== 'cer') {
      Swal.fire('Archivo inválido', 'Solo se permiten archivos con extensión .cer', 'error');
      input.value = '';
      this.form.patchValue({ [campo]: null });
      return;
    }

    if (campo === 'key' && ext !== 'key') {
      Swal.fire('Archivo inválido', 'Solo se permiten archivos con extensión .key', 'error');
      input.value = '';
      this.form.patchValue({ [campo]: null });
      return;
    }

    if (file.size > 2_000_000) {
      Swal.fire('Archivo demasiado grande', 'El tamaño máximo permitido es de 2MB', 'warning');
      input.value = '';
      this.form.patchValue({ [campo]: null });
      return;
    }

    this.form.patchValue({ [campo]: file });

    if (campo === 'cer') {
      this.detectarRFC();
    }
  }

  // ==============================================================
  // 🔹 Detectar RFC automáticamente al subir .cer
  // ==============================================================
  detectarRFC() {
    const v = this.form.value;
    if (!v.cer) return;

    this.cargando = true;
    const fd = new FormData();
    fd.append('cer', v.cer as Blob);

    this.api.leerRFC(fd).subscribe({
  next: (res) => {
    this.cargando = false;
    const rfc = res.rfc || res.certificado?.rfc || res.data?.rfc;

    if (rfc) {
      this.form.patchValue({ rfc });
      if (!this.form.value.contrasena) this.form.patchValue({ contrasena: rfc });

      this.rfcDetectado = true;
      this.certInfo = res;

      Swal.fire({
        icon: 'success',
        title: 'RFC detectado correctamente',
        html: `
          <b>RFC:</b> ${res.rfc}<br>
          <b>Nombre:</b> ${res.nombre || '—'}<br>
          <b>Vigencia:</b> ${new Date(res.vigencia_inicio).toLocaleDateString()} a ${new Date(res.vigencia_fin).toLocaleDateString()}<br>
          <b>Mensaje:</b> ${res.mensaje || 'Certificado leído correctamente'}
        `,
        showConfirmButton: true,   // ✅ mantiene el botón
        confirmButtonText: 'OK',   // ✅ texto del botón
        confirmButtonColor: '#3085d6' // (opcional) color azul estándar
      });
    } else {
      Swal.fire('No se pudo obtener el RFC', 'Verifica el archivo .cer', 'warning');
    }
  },
  error: (err) => {
    console.error(err);
    this.cargando = false;
    Swal.fire('Error', 'No se pudo leer el RFC del certificado.', 'error');
  },
});

  }

  // ==============================================================
  // 🔹 Enviar formulario
  // ==============================================================
 enviar() {
  // 🔹 Validaciones dinámicas según el modo (nuevo o edición)
  if (!this.id) {
    // Nuevo cliente → archivos obligatorios
    this.form.get('cer')?.addValidators([Validators.required]);
    this.form.get('key')?.addValidators([Validators.required]);
  } else {
    // Edición → archivos opcionales
    this.form.get('cer')?.clearValidators();
    this.form.get('key')?.clearValidators();
  }

  this.form.updateValueAndValidity();

  // 🔹 Validación general del formulario
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    this.mostrarErrores();
    return;
  }

  // ===============================================================
  // 🔹 Construcción del FormData
  // ===============================================================
  const v = this.form.value;
  const fd = new FormData();

// ✅ agrega esta línea
if (this.id) fd.append('id', String(this.id));
  // Campos principales
  fd.append('usuario_id', String(v.usuario_id));
  fd.append('razon_social', v.razon_social ?? '');
  fd.append('telefono', v.telefono ?? '');
  fd.append('correo_electronico', v.correo_electronico ?? '');
  fd.append('direccion', v.direccion ?? '');
  fd.append('honorarios_subtotal', String(v.honorarios_subtotal ?? 0));
  fd.append('rfc', v.rfc ?? '');
  fd.append('contrasena', v.contrasena ?? '');
  fd.append('estatus', this.form.get('estatus')?.value ? 'true' : 'false');

  // ✅ Archivos: solo si el usuario seleccionó nuevos
  if (v.cer instanceof File) fd.append('cer', v.cer);
  if (v.key instanceof File) fd.append('key', v.key);

  fd.append('usa_retenciones', this.form.value.usa_retenciones ? 'true' : 'false');
fd.append('porc_isr_ret', String(this.form.value.porc_isr_ret));
fd.append('porc_iva_ret', String(this.form.value.porc_iva_ret));


  // ===============================================================
  // 🔹 Envío a la API
  // ===============================================================
  this.cargando = true;

  this.api.registrarCompleto(fd).subscribe({
    next: (res) => {
      this.cargando = false;
      Swal.fire({
  icon: 'success',
  title: 'Cliente actualizado correctamente',
  html: `
    <b>${res.mensaje || res?.mensaje || 'Operación completada correctamente.'}</b><br>
    ${res.certificado?.rfc ? `<b>RFC:</b> ${res.certificado.rfc}<br>` : ''}
    ${res.certificado?.fecha_inicio ? `<b>Vigencia:</b> ${res.certificado.fecha_inicio} a ${res.certificado.fecha_fin}<br>` : ''}
    ${res.razon_social ? `<b>Cliente:</b> ${res.razon_social}<br>` : ''}
  `,
  confirmButtonColor: '#3085d6'
});


      // Limpieza final
      this.form.reset();
      this.rfcDetectado = false;
      this.certInfo = null;
      this.saved.emit();
      this.cerrarModal();
    },
    error: (err) => {
  this.cargando = false;

  console.error('ERROR COMPLETO BACKEND:', err);

  const detalle =
    err?.error?.detalle ||
    err?.error?.error ||
    err?.error?.message ||
    err?.message ||
    JSON.stringify(err?.error, null, 2) ||
    'Error desconocido';

  Swal.fire({
    icon: 'error',
    title: 'Error al registrar',
    html: `<pre style="text-align:left;white-space:pre-wrap">${detalle}</pre>`,
    confirmButtonText: 'OK'
  });
}

  });
}


  // ==============================================================
  // 🔹 Mostrar errores del formulario
  // ==============================================================
  mostrarErrores() {
    const errores: string[] = [];

    if (this.form.get('razon_social')?.errors)
      errores.push('• Razón Social es obligatoria (mínimo 3 caracteres)');

    if (this.form.get('honorarios_subtotal')?.errors)
      errores.push('• Honorarios Subtotal es obligatorio y debe ser mayor a 0');

    if (this.form.get('contrasena')?.errors)
      errores.push('• Contraseña del Certificado es obligatoria');

    if (this.form.get('cer')?.errors)
      errores.push('• Archivo .cer es obligatorio');

    if (this.form.get('key')?.errors)
      errores.push('• Archivo .key es obligatorio');

    if (this.form.get('correo_electronico')?.errors)
      errores.push('• El formato del correo electrónico no es válido');

    Swal.fire({
      icon: 'warning',
      title: 'Campos incompletos',
      html: errores.join('<br>'),
      confirmButtonText: 'Corregir'
    });
  }
}
