import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sat-historial-verificaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historial-verificaciones.html',
  styleUrls: ['./historial-verificaciones.css']
})
export class HistorialVerificacionesComponent {

  @Input() visible = false;
  @Input() historial: any[] = [];
  @Input() solicitud: any = null;

  @Output() cerrar = new EventEmitter<void>();

  /* ===============================
     PAGINACIÓN INTERNA DEL MODAL
     =============================== */
  page = 1;          // página actual
  pageSize = 10;     // cantidad de registros por página

  // Devuelve solo los registros que se deben mostrar en la página actual
  get historialPaginado() {
    const start = (this.page - 1) * this.pageSize;
    return this.historial.slice(start, start + this.pageSize);
  }

  // Total de páginas según el tamaño del historial
  get totalPaginas() {
    return Math.ceil(this.historial.length / this.pageSize);
  }

  cambiarPagina(nuevaPagina: number) {
    if (nuevaPagina < 1 || nuevaPagina > this.totalPaginas) return;
    this.page = nuevaPagina;
  }

  /* ===============================
     CERRAR MODAL
     =============================== */
  cerrarModal() {
    this.cerrar.emit();
    this.page = 1; // resetea a página 1 al cerrar
  }
}
