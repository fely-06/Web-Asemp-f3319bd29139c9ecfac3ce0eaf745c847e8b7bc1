import { Component, Input, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccionesService } from '../../../../core/services/acciones.service';
import { RolesAccionesService } from '../../../../core/services/roles-acciones.service';
import Swal from 'sweetalert2';

// Declarar feather en el ámbito global
declare const feather: any;

@Component({
  selector: 'app-roles-acciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roles.acciones.html',
  styleUrls: ['./roles.acciones.css']
})
export class RolesAcciones implements OnChanges, AfterViewInit {

  @Input() rol: any = null;
  @Input() cerrado!: Function;

  cargando = true;
  catalogos: any[] = [];
  permisosActuales: number[] = [];

  constructor(
    private accionesSrv: AccionesService,
    private rolesAccionesSrv: RolesAccionesService
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['rol'] && this.rol) {
      this.cargarTodo();
    }
  }

  ngAfterViewInit() {
    // Inicializar iconos cuando el componente se renderice
    this.initializeFeatherIcons();
  }

  async cargarTodo() {
    this.cargando = true;

    try {
      const accionesAgrupadas =
        (await this.accionesSrv.getAccionesAgrupadas().toPromise()) ?? [];

      const permisos =
        (await this.rolesAccionesSrv.getPorRol(this.rol.id).toPromise()) ?? [];

      this.catalogos = accionesAgrupadas;
      this.permisosActuales = permisos.map((x: any) => x.idAccion);

    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'No se pudieron cargar los permisos.', 'error');
    }

    this.cargando = false;
    
    // Inicializar iconos después de cargar los datos
    setTimeout(() => {
      this.initializeFeatherIcons();
    }, 100);
  }

  initializeFeatherIcons() {
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  }

  toggleAcordeon(cat: any) {
    cat.open = !cat.open;
    
    // Re-inicializar iconos después de abrir/cerrar acordeón
    setTimeout(() => {
      this.initializeFeatherIcons();
    }, 50);
  }

  // ... el resto de tus métodos permanecen igual

  tienePermiso(idAccion: number): boolean {
    return this.permisosActuales.includes(idAccion);
  }

  togglePermiso(idAccion: number) {
    if (this.tienePermiso(idAccion)) {
      this.permisosActuales = this.permisosActuales.filter(x => x !== idAccion);
    } else {
      this.permisosActuales.push(idAccion);
    }
  }


  // 🔥 NUEVO: Seleccionar todos los permisos
  seleccionarTodos() {
    const todosLosPermisos: number[] = [];
    this.catalogos.forEach(cat => {
      if (cat.acciones) {
        cat.acciones.forEach((acc: any) => {
          todosLosPermisos.push(acc.id);
        });
      }
    });
    this.permisosActuales = [...new Set(todosLosPermisos)]; // Eliminar duplicados
    
    // Feedback visual
    Swal.fire({
      icon: 'success',
      title: 'Todos seleccionados',
      text: `Se han seleccionado ${this.permisosActuales.length} permisos`,
      timer: 1500,
      showConfirmButton: false
    });
  }

  // 🔥 NUEVO: Deseleccionar todos los permisos
  deseleccionarTodos() {
    this.permisosActuales = [];
    
    // Feedback visual
    Swal.fire({
      icon: 'info',
      title: 'Todos deseleccionados',
      text: 'Se han removido todos los permisos',
      timer: 1500,
      showConfirmButton: false
    });
  }

  // 🔥 NUEVO: Seleccionar toda una categoría
  seleccionarCategoria(categoria: any) {
    if (!categoria.acciones || categoria.acciones.length === 0) return;

    const permisosCategoria = categoria.acciones.map((acc: any) => acc.id);
    
    // Verificar si ya están todos seleccionados
    const todosSeleccionados = permisosCategoria.every((id: number) => 
      this.permisosActuales.includes(id)
    );

    if (todosSeleccionados) {
      // Si ya están todos seleccionados, deseleccionar la categoría
      this.permisosActuales = this.permisosActuales.filter(id => 
        !permisosCategoria.includes(id)
      );
      
      Swal.fire({
        icon: 'info',
        title: 'Categoría deseleccionada',
        text: `Se han removido ${permisosCategoria.length} permisos de ${categoria.catalogo}`,
        timer: 1500,
        showConfirmButton: false
      });
    } else {
      // Si no están todos seleccionados, seleccionar la categoría
      permisosCategoria.forEach((id: number) => {
        if (!this.permisosActuales.includes(id)) {
          this.permisosActuales.push(id);
        }
      });
      
      Swal.fire({
        icon: 'success',
        title: 'Categoría seleccionada',
        text: `Se han agregado ${permisosCategoria.length} permisos de ${categoria.catalogo}`,
        timer: 1500,
        showConfirmButton: false
      });
    }
  }

  // 🔥 NUEVO: Obtener total de acciones
  getTotalAcciones(): number {
    let total = 0;
    this.catalogos.forEach(cat => {
      if (cat.acciones) {
        total += cat.acciones.length;
      }
    });
    return total;
  }

  getAccionesCount(cat: any): number {
    return cat.acciones ? cat.acciones.length : 0;
  }

  guardar() {
    const body = {
      idRol: this.rol.id,
      acciones: this.permisosActuales
    };

    this.rolesAccionesSrv.guardar(body).subscribe({
      next: () => {
        this.cerrar();
        setTimeout(() => {
          Swal.fire('Correcto', 'Permisos actualizados exitosamente.', 'success');
        }, 80);
      },
      error: () => {
        Swal.fire('Error', 'No se pudieron guardar los permisos.', 'error');
      }
    });
  }

  cerrar() {
    if (this.cerrado) {
      this.cerrado();
    }
  }
}