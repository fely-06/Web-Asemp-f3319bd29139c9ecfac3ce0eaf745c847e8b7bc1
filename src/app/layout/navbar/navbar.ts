// navbar.component.ts
import { Component, OnInit, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent implements OnInit {
  @Output() sidebarToggle = new EventEmitter<boolean>();

  pageTitle = 'Dashboard';
  breadcrumb = 'Inicio';
  userAvatar: string | null = null;
  userAvatarApellido: string | null = null;
  userName = 'Usuario Sistema';
  userApellido = 'Apellido Usuario';
  userRol = '';
  isSidebarOpen = true;
  currentTheme: 'default' | 'light' | 'dark' | 'custom' = 'default';
  isThemeMenuOpen = false;
  isUserMenuOpen = false; // 👈 Nuevo: control del menú usuario

  constructor(private router: Router, private authSrv: AuthService) {}

  ngOnInit(): void {
    this.replaceIcons();

    // OBTENER USUARIO LOGUEADO DESDE API
    this.authSrv.getPerfil().subscribe({
      next: (res: any) => {
        const nombreCompleto = `${res.nombres ?? ''} ${res.apellido_paterno ?? ''}`.trim();
        this.userName = nombreCompleto || res.usuario || 'Usuario';
        this.userAvatar = this.userName.charAt(0).toUpperCase();
        this.userApellido =  res.apellido_paterno || 'Apellido';
        this.userAvatarApellido = this.userApellido.charAt(0).toUpperCase();
        this.userRol = res.rol;
      },
      error: () => {
        this.userName = 'Invitado';
      }
    });

    // Escuchar cambios de ruta
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updatePageInfo(event.url);
      });

    // Aplicar tema guardado
    const storedTheme = localStorage.getItem('theme') as 'default' | 'light' | 'dark' | 'custom';
    if (storedTheme) {
      this.currentTheme = storedTheme;
      document.documentElement.setAttribute('data-theme', storedTheme);
    }

    if (this.currentTheme === 'custom') {
      this.applyStoredConfig();
    }

    // Detectar ruta actual si se recarga directamente
    this.updatePageInfo(this.router.url);
    this.applyThemeLogo(this.currentTheme);
    this.updateSidebarTextContrast();
  }

  // 👇 NUEVOS MÉTODOS PARA EL MENÚ DE USUARIO
  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    // Cerrar menú de tema si está abierto
    if (this.isUserMenuOpen) {
      this.isThemeMenuOpen = false;
    }
    this.replaceIcons();
  }

  goToProfile(): void {
    this.isUserMenuOpen = false;
    this.router.navigate(['/dashboard/perfil']);
    this.replaceIcons();
  }

  goToSettings(): void {
    this.isUserMenuOpen = false;
    this.router.navigate(['/dashboard/configuracion']);
    this.replaceIcons();
  }

logout(): void {
  this.isUserMenuOpen = false;

  // 🔹 Guardar preferencias visuales
  const theme = localStorage.getItem('theme');
  const config = localStorage.getItem('configuracion');
  const applyGlobally = localStorage.getItem('applyGlobally');

  // 🔹 Cerrar sesión (token / usuario)
  this.authSrv.logout();

  // 🔹 Limpiar storage
  localStorage.clear();

  // 🔹 Restaurar preferencias de UI
  if (theme) localStorage.setItem('theme', theme);
  if (config) localStorage.setItem('configuracion', config);
  if (applyGlobally) localStorage.setItem('applyGlobally', applyGlobally);

  // 🔹 Ir al login
  this.router.navigate(['/login']);

  // 🔹 Recargar para limpiar estado
  setTimeout(() => window.location.reload(), 200);
}



  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const themeSelector = document.querySelector('.theme-selector');
    const userMenuContainer = document.querySelector('.user-menu-container');
    
    // Cerrar menú de tema si se hace clic fuera
    if (themeSelector && !themeSelector.contains(event.target as Node)) {
      this.isThemeMenuOpen = false;
    }
    
    // Cerrar menú de usuario si se hace clic fuera
    if (userMenuContainer && !userMenuContainer.contains(event.target as Node)) {
      this.isUserMenuOpen = false;
    }
    
    this.replaceIcons();
  }

  // ... (el resto de tus métodos existentes se mantienen igual)
  private applyStoredConfig() {
    const stored = localStorage.getItem('configuracion');
    if (!stored) return;

    const c = JSON.parse(stored);
    if (c.primaryColor)
      document.documentElement.style.setProperty('--color-primary', c.primaryColor);
    if (c.backgroundColor) {
      document.documentElement.style.setProperty('--color-background', c.backgroundColor);
      document.documentElement.style.setProperty('--color-navbar', c.backgroundColor);
    }
    if (c.textColor)
      document.documentElement.style.setProperty('--color-text', c.textColor);

    if (c.logo) {
      const sidebarLogo = document.querySelector('.lOGO-img') as HTMLImageElement | null;
      if (sidebarLogo) sidebarLogo.src = c.logo;
    }
  }

  private applyThemeLogo(theme: string) {
    const sidebarLogo = document.querySelector('.lOGO-img') as HTMLImageElement | null;
    if (!sidebarLogo) return;

    const cfg = localStorage.getItem('configuracion');
    if (cfg) {
      const c = JSON.parse(cfg);
      if (c.logo) {
        sidebarLogo.src = c.logo;
        return;
      }
    }

    switch (theme) {
      case 'dark':
        sidebarLogo.src = 'assets/images/LOGO.png';
        break;
      default:
        sidebarLogo.src = 'assets/images/LOGO.png';
        break;
    }
  }

  replaceIcons() {
    setTimeout(() => {
      if ((window as any).feather) {
        (window as any).feather.replace();
      }
    }, 10);
  }

updatePageInfo(url: string): void {
  // 🔹 Quita parámetros, hashes, y limpia IDs numéricos o GUID
  let cleanUrl = url.split('?')[0].split('#')[0];

  // 🔹 Divide la ruta en segmentos
  const segments = cleanUrl.split('/').filter(Boolean);

  // 🔹 Si la última parte es un número o un GUID, la quitamos
  const last = segments[segments.length - 1];
  if (/^\d+$/.test(last) || /^[a-f0-9\-]{6,}$/.test(last)) {
    segments.pop();
  }

  // 🔹 Reconstruye la ruta limpia sin el ID
  cleanUrl = '/' + segments.join('/');

  // 🔹 Mapa de rutas con textos amigables
  const routeMap: { [key: string]: { title: string; breadcrumb: string } } = {
  '/dashboard/home': { title: 'Dashboard', breadcrumb: 'Inicio' },
  '/dashboard/configuracion': { title: 'Configuración', breadcrumb: 'Ajustes del Sistema' },

  // USUARIOS
  '/dashboard/usuarios': { title: 'Usuarios', breadcrumb: 'Gestión de Usuarios' },
  '/dashboard/usuarios/form': { title: 'Usuarios', breadcrumb: 'Registrar o Editar Usuario' },
  '/dashboard/usuarios/detalle': { title: 'Usuarios', breadcrumb: 'Detalle de Usuario' },

  // CLIENTES
  '/dashboard/clientes': { title: 'Clientes', breadcrumb: 'Gestión de Clientes' },

  // DEPARTAMENTOS
  '/dashboard/departamentos': { title: 'Departamentos', breadcrumb: 'Gestión de Departamentos' },
  '/dashboard/departamentos/form': { title: 'Departamentos', breadcrumb: 'Registrar Departamento' },
  '/dashboard/departamentos/detalle': { title: 'Departamentos', breadcrumb: 'Detalle de Departamento' },

  // SEGURIDAD DEL SISTEMA
  '/dashboard/seguridad': { title: 'Seguridad del Sistema', breadcrumb: 'Roles, Acciones y Permisos' },

  // CERTIFICADOS
  '/dashboard/certificados': { title: 'Certificados', breadcrumb: 'Descarga de Certificados' },

  // SAT
  '/dashboard/sat': { title: 'SAT', breadcrumb: 'Documentos Fiscales' },

   // 🔥 NUEVA RUTA DEL TABLERO IVA
  '/dashboard/impuestos/iva': { 
    title: 'Tablero IVA', 
    breadcrumb: 'Dashboard / Impuestos / IVA' 
  },

  // REPORTES
  '/dashboard/reportes': { title: 'Reportes', breadcrumb: 'Análisis y Reportes' },

  //cobros
  '/dashboard/cobros': { title: 'Cobros', breadcrumb: 'Gestión de Cobros' },
  '/dashboard/cobros/reportes': { title: 'Reportes de Cobros', breadcrumb: 'Reportes de Cobros' },

};


  // 🔹 Busca la coincidencia parcial más larga
  const match = Object.keys(routeMap)
    .sort((a, b) => b.length - a.length)
    .find(path => cleanUrl.startsWith(path));

  const info = match ? routeMap[match] : { title: 'Dashboard', breadcrumb: 'Inicio' };
  this.pageTitle = info.title;
  this.breadcrumb = info.breadcrumb;
}




  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
    this.sidebarToggle.emit(this.isSidebarOpen);
    this.replaceIcons();
  }

  toggleThemeMenu(): void {
    this.isThemeMenuOpen = !this.isThemeMenuOpen;
    // Cerrar menú de usuario si está abierto
    if (this.isThemeMenuOpen) {
      this.isUserMenuOpen = false;
    }
    this.replaceIcons();
  }

  setTheme(theme: 'default' | 'light' | 'dark' | 'custom'): void {
    this.isThemeMenuOpen = false;
    this.toggleTheme(theme);
    this.replaceIcons();
  }

  toggleTheme(theme: 'default' | 'light' | 'dark' | 'custom') {
    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;
    localStorage.setItem('theme', theme);

    if (theme !== 'custom') {
      document.documentElement.style.removeProperty('--color-primary');
      document.documentElement.style.removeProperty('--color-navbar');
      document.documentElement.style.removeProperty('--color-background');
      document.documentElement.style.removeProperty('--color-text');
    } else {
      const cfg = localStorage.getItem('configuracion');
      if (cfg) {
        const c = JSON.parse(cfg);
        document.documentElement.style.setProperty('--color-primary', c.primaryColor);
        document.documentElement.style.setProperty('--color-background', c.backgroundColor);
        document.documentElement.style.setProperty('--color-navbar', c.backgroundColor);
      }
    }

    this.updateSidebarTextContrast();
    this.applyThemeLogo(theme);
    this.replaceIcons();
  }

  updateSidebarTextContrast() {
    const bgColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-primary')
      .trim();

    if (bgColor.startsWith('#') && bgColor.length === 7) {
      const r = parseInt(bgColor.substring(1, 3), 16);
      const g = parseInt(bgColor.substring(3, 5), 16);
      const b = parseInt(bgColor.substring(5, 7), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const sidebarText = luminance > 0.6 ? '#1a1a1a' : '#ffffff';
      document.documentElement.style.setProperty('--color-text-sidebar', sidebarText);
    }
  }
}