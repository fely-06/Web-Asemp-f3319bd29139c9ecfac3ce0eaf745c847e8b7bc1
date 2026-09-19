import { Component, EventEmitter, HostListener, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { UsuariosService, Usuario } from '../../../../core/services/usuarios.service';
import { ListasService, RolCombo, DepartamentoCombo } from '../../../../core/services/listas.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-usuarios-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios-form.html',
  styleUrls: ['./usuarios-form.css']
})
export class UsuariosForm implements OnInit {
  @Input() id: number | null = null;
  @Input() show = false;
  @Output() saved = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  usuario: Usuario = {
    id: 0,
    nombres: '',
    apellido_paterno: '',
    apellido_materno: '',
    correo: '',
    usuario: '',
    contrasena: '',
    estatus: true,
    rol_id: 0,
    departamento_id: 0
  };

  editando = false;
  mostrarCampoContrasena = false;
  campoContrasenaVisible = true;
  verContrasena = false;


  roles: RolCombo[] = [];
  departamentos: DepartamentoCombo[] = [];

  constructor(
    private usuariosSrv: UsuariosService,
    private listasSrv: ListasService
  ) {}

  ngOnInit(): void {
    this.cargarListas();

    if (this.id) {
      this.editando = true;
      this.campoContrasenaVisible = false;
      this.usuariosSrv.getById(this.id).subscribe({
        next: (res) => (this.usuario = res),
        error: (err) => {
          console.error('Error al cargar usuario', err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar el usuario.',
            confirmButtonColor: '#d33'
          });
        }
      });

      setTimeout(() => (this.campoContrasenaVisible = true), 250);
    }
  }

esClienteSeleccionado(): boolean {
  const rol = this.roles.find(r => r.id === this.usuario.rol_id);
  return rol ? rol.nombre.toLowerCase() === 'cliente' : false;
}



  cargarListas(): void {
    this.listasSrv.getRoles().subscribe({
      next: (res) => (this.roles = res),
      error: (err) => {
        console.error('Error al cargar roles', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar los roles.',
          confirmButtonColor: '#d33'
        });
      }
    });

    this.listasSrv.getDepartamentos().subscribe({
      next: (res) => (this.departamentos = res),
      error: (err) => {
        console.error('Error al cargar departamentos', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar los departamentos.',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  @HostListener('document:keydown.escape')
  cerrarPorTecla() {
    this.cerrar();
  }

  cerrarFondo(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal')) this.cerrar();
  }

  cerrar(): void {
    this.show = false;
    this.closed.emit();
  }

  guardar(form: NgForm): void {
  // Validaciones personalizadas
  if (!this.usuario.nombres || !this.usuario.usuario || (!this.editando && !this.usuario.contrasena)) {
    Swal.fire({
      icon: 'warning',
      title: 'Campos incompletos',
      text: 'Por favor, completa los campos obligatorios.',
      confirmButtonColor: '#f6c23e'
    });
    return;
  }

  if (!this.usuario.rol_id || this.usuario.rol_id === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Rol no seleccionado',
      text: 'Selecciona un rol antes de continuar.',
      confirmButtonColor: '#f6c23e'
    });
    return;
  }

  // ✅ Verifica el rol y anula el departamento si es cliente
  const rol = this.roles.find(r => r.id === this.usuario.rol_id);
  if (rol && rol.nombre.toLowerCase() === 'cliente') {
    this.usuario.departamento_id = null;
  } else if (!this.usuario.departamento_id || this.usuario.departamento_id === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Departamento no seleccionado',
      text: 'Selecciona un departamento antes de continuar.',
      confirmButtonColor: '#f6c23e'
    });
    return;
  }

  // Prepara datos
  const payload: any = { ...this.usuario };
  if (!this.editando) delete payload.id;
  if (this.editando && !payload.contrasena) delete payload.contrasena;

  // Crear o actualizar
  const req = this.editando
    ? this.usuariosSrv.update(this.usuario.id, payload)
    : this.usuariosSrv.create(payload);

  req.subscribe({
    next: () => {
      Swal.fire({
        icon: 'success',
        title: this.editando ? 'Usuario actualizado' : 'Usuario creado',
        text: this.editando
          ? 'El usuario ha sido actualizado correctamente.'
          : 'El usuario se ha creado correctamente.',
        confirmButtonColor: '#3085d6',
        timer: 1500,
        showConfirmButton: false
      });
      this.saved.emit();
      this.cerrar();
    },
    error: (err) => {
  console.error('Error al guardar usuario', err);

  let msg = 'Error desconocido';
  if (typeof err?.error === 'string') {
    msg = err.error;
  } else if (err?.error?.mensaje) {
    msg = err.error.mensaje;
  } else if (err?.error?.Message) {
    msg = err.error.Message;
  } else if (err?.message) {
    msg = err.message;
  }

  Swal.fire({
    icon: 'error',
    title: 'Error al guardar',
    html: `<div class="text-start">${msg}</div>`,
    confirmButtonColor: '#d33'
  });
}

  });
}


  toggleCampoContrasena(): void {
    this.mostrarCampoContrasena = !this.mostrarCampoContrasena;
    this.usuario.contrasena = '';
  }
}
