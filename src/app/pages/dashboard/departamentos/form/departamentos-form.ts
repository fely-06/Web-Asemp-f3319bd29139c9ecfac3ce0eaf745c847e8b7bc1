import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepartamentosService } from '../../../../core/services/departamentos.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-departamentos-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './departamentos-form.html',
  styleUrls: ['./departamentos-form.css']
})
export class DepartamentosFormComponent {
  // ==============================================================
  // 🔹 Comunicación con el padre (departamentos-list)
  // ==============================================================
  @Input() show = false;
  @Input() id: number | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  // ==============================================================
  // 🔹 Variables principales
  // ==============================================================
  cargando = false;
  model: any = {
    nombre: '',
    descripcion: ''
  };

  constructor(private departamentosService: DepartamentosService) {}

  // ==============================================================
  // 🔹 Cargar datos si estamos editando
  // ==============================================================
  ngOnInit() {
    if (this.id) {
      this.cargar();
    }
  }

  cargar() {
    if (!this.id) return;
    
    this.departamentosService.buscar(this.id).subscribe({
      next: (res) => {
        this.model = res;
      },
      error: (err) => console.error('Error al cargar departamento', err)
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
    if ((event.target as HTMLElement).classList.contains('modal')) {
      this.cerrarModal();
    }
  }

  cerrarModal() {
    this.model = { nombre: '', descripcion: '' };
    this.closed.emit();
  }

  // ==============================================================
  // 🔹 Guardar departamento
  // ==============================================================
  guardar() {
    if (!this.model.nombre || this.model.nombre.trim().length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'El nombre del departamento es obligatorio',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    this.cargando = true;

    const body = {
      nombre: this.model.nombre.trim(),
      descripcion: this.model.descripcion?.trim() || ''
    };

    if (this.id) {
      // Editar departamento existente
      this.departamentosService.editar(this.id, body).subscribe({
        next: () => {
          this.cargando = false;
          Swal.fire({
            icon: 'success',
            title: 'Actualizado',
            text: 'Departamento actualizado correctamente',
            confirmButtonColor: '#3085d6',
            timer: 1500
          });
          this.saved.emit();
        },
        error: (err) => {
          this.cargando = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo actualizar el departamento',
            confirmButtonColor: '#d33'
          });
        }
      });
    } else {
      // Crear nuevo departamento
      this.departamentosService.crear(body).subscribe({
        next: () => {
          this.cargando = false;
          Swal.fire({
            icon: 'success',
            title: 'Creado',
            text: 'Departamento creado correctamente',
            confirmButtonColor: '#3085d6',
            timer: 1500
          });
          this.saved.emit();
        },
        error: (err) => {
          this.cargando = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo crear el departamento',
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }
}