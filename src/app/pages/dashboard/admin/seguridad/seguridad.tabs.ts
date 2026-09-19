import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// importar componentes existentes
import { RolesList } from '../roles/list/roles.list';
import { AccionesList } from '../acciones/acciones.list';
import { RolesAcciones } from '../roles.acciones/roles.acciones';

declare const feather: any;

@Component({
  selector: 'app-seguridad-tabs',
  standalone: true,
  imports: [
    CommonModule,
    RolesList,
    AccionesList,
  ],
  templateUrl: './seguridad.tabs.html',
  styleUrls: ['./seguridad.tabs.css']
})
export class SeguridadTabs implements AfterViewInit {
  activeTab: 'roles' | 'acciones' | 'permisos' = 'roles';

  ngAfterViewInit(): void {
    // Inicializar íconos Feather
    setTimeout(() => {
      if (typeof feather !== 'undefined') {
        feather.replace();
      }
    }, 100);
  }
}