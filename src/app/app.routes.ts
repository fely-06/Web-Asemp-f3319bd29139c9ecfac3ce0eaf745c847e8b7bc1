import { Routes } from '@angular/router';

// =======================================================
// AUTH
// =======================================================
import { Login } from './pages/auth/login/login';
import { authGuard } from '../app/core/guards/auth.guard';
import { permisoGuard } from '../app/core/guards/permiso.guard';

// =======================================================
// LAYOUT & HOME
// =======================================================
import { LayoutComponent } from './layout/layout';
import { HomeComponent } from './pages/dashboard/home/home';

// =======================================================
// CONFIGURACIÓN
// =======================================================
import { Configuracion } from './pages/dashboard/configuracion/configuracion';

// =======================================================
// USUARIOS
// =======================================================
import { UsuariosList } from './pages/dashboard/usuarios/list/usuarios-list';
import { UsuariosForm } from './pages/dashboard/usuarios/form/usuarios-form';
import { UsuariosDetalle } from './pages/dashboard/usuarios/detalle/usuarios-detalle';

// =======================================================
// CLIENTES
// =======================================================
import { ClientesListComponent } from './pages/dashboard/clientes/list/clientes-list';

// =======================================================
// DEPARTAMENTOS
// =======================================================
import { DepartamentosList } from './pages/dashboard/departamentos/list/departamentos-list';
import { DepartamentosFormComponent } from './pages/dashboard/departamentos/form/departamentos-form';


//========================================================
// Cobros
//========================================================

import { CobrosListComponent } from './pages/dashboard/cobros/list/cobros-list';


//======================================================
//Reportes Cobros
//======================================================

import { ReportesCobrosComponent } from './pages/dashboard/cobros/reportes/reportes.cobros';

// =======================================================
// RUTAS PRINCIPALES
// =======================================================

export const routes: Routes = [

  // LOGIN
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },

  // DASHBOARD
  {
    path: 'dashboard',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [

      // HOME
      { path: 'home', component: HomeComponent },

      // CONFIGURACIÓN (solo admin)
      {
        path: 'configuracion',
        component: Configuracion,
        canActivate: [permisoGuard],
        data: { soloAdmin: true }
      },

      // USUARIOS
      {
        path: 'usuarios',
        component: UsuariosList,
        canActivate: [permisoGuard],
        data: { permiso: 'usuarios.ver' }
      },
      {
        path: 'usuarios/form',
        component: UsuariosForm,
        canActivate: [permisoGuard],
        data: { permiso: 'usuarios.crear' }
      },
      {
        path: 'usuarios/form/:id',
        component: UsuariosForm,
        canActivate: [permisoGuard],
        data: { permiso: 'usuarios.editar' }
      },
      {
        path: 'usuarios/detalle/:id',
        component: UsuariosDetalle,
        canActivate: [permisoGuard],
        data: { permiso: 'usuarios.ver' }
      },

      // CLIENTES
      {
        path: 'clientes',
        component: ClientesListComponent,
        canActivate: [permisoGuard],
        data: { permiso: 'clientes.ver' }
      },

      // DEPARTAMENTOS
      {
        path: 'departamentos',
        component: DepartamentosList,
        canActivate: [permisoGuard],
        data: { permiso: 'departamentos.ver' }
      },
      {
        path: 'departamentos/form',
        component: DepartamentosFormComponent,
        canActivate: [permisoGuard],
        data: { permiso: 'departamentos.crear' }
      },
      {
        path: 'departamentos/form/:id',
        component: DepartamentosFormComponent,
        canActivate: [permisoGuard],
        data: { permiso: 'departamentos.editar' }
      },

      // SAT
      {
        path: 'sat',
        loadComponent: () =>
          import('./pages/dashboard/sat/sat').then(m => m.SatComponent),
        canActivate: [permisoGuard],
        data: { permiso: 'sat.ver' }
      },
      
      // COBROS
      {
  path: 'cobros',
  component: CobrosListComponent,
  canActivate: [permisoGuard],
  data: { permiso: 'ccobros.ver' }
},


{
  path: 'cobros/reportes',
  loadComponent: () =>
    import('./pages/dashboard/cobros/reportes/reportes.cobros')
      .then(m => m.ReportesCobrosComponent),
  canActivate: [permisoGuard],
  data: { permiso: 'ccobros.ver' }
},


      // =======================================================
      // SEGURIDAD DEL SISTEMA (ROLES, ACCIONES, PERMISOS)
      // =======================================================
      {
  path: 'seguridad',
  loadComponent: () =>
    import('./pages/dashboard/admin/seguridad/seguridad.tabs')
      .then(m => m.SeguridadTabs),
  canActivate: [permisoGuard],
  data: { permiso: 'roles.ver' }
},
 // CERTIFICADOS
      {
        path: 'certificados',
        loadComponent: () =>
          import('./pages/dashboard/certificados/certificados').then(m => m.CertificadosComponent),
        canActivate: [permisoGuard],
        data: { permiso: 'certificados.ver' }
      },

      // TABLERO IVA
{
  path: 'impuestos/iva',
  loadComponent: () =>
    import('./pages/dashboard/impuestos/tablero-iva/tablero-iva.component')
      .then(m => m.TableroIvaComponent),
  canActivate: [permisoGuard],
  data: { permiso: 'impuestos.ver' }   // ← Debes crear este permiso en tu sistema RBAC
},


      // DEFAULT
      { path: '', redirectTo: 'home', pathMatch: 'full' }
    ]
  },

  // WILDCARD
  { path: '**', redirectTo: 'login' }
];
