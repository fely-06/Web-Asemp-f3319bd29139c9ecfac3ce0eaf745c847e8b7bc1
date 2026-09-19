import { Component, OnInit, HostListener, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SesionService } from '../../core/services/sesion.service'; // 👈 IMPORTANTE

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class SidebarComponent implements OnInit {

  // 👇 ESTA propiedad permite usar sesion.tiene('permiso') en el HTML
  public sesion = inject(SesionService);

  isCollapsed = false;
  isMobile = false;

  public rol = localStorage.getItem('rol'); 

  // Control de tema
  currentTheme: 'default' | 'light' | 'dark' | 'custom' = 'default';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.checkScreenSize();
    this.replaceIcons();

    this.router.events.subscribe(() => {
      setTimeout(() => this.replaceIcons(), 50);
    });

    if (!(window as any).feather) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/feather-icons/dist/feather.min.js';
      script.onload = () => this.replaceIcons();
      document.body.appendChild(script);
    }

    // Aplicar tema guardado
    const storedTheme = localStorage.getItem('theme') as 'default' | 'light' | 'dark' | 'custom';
    if (storedTheme) {
      this.currentTheme = storedTheme;
      document.documentElement.setAttribute('data-theme', storedTheme);
    }

    // Observa cambios para actualizar contraste
    const observer = new MutationObserver(() => this.updateSidebarTextContrast());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'style']
    });

    this.updateSidebarTextContrast();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
    if (this.isMobile) this.isCollapsed = true;
  }

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    setTimeout(() => this.replaceIcons(), 200);
  }

  replaceIcons() {
    if ((window as any).feather) {
      (window as any).feather.replace();
    }
  }

  // Alternar tema
  toggleTheme(theme: 'default' | 'light' | 'dark' | 'custom') {
    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;
    localStorage.setItem('theme', theme);

    if (theme !== 'custom') {
      document.documentElement.style.removeProperty('--color-primary');
      document.documentElement.style.removeProperty('--color-navbar');
      document.documentElement.style.removeProperty('--color-background');
      document.documentElement.style.removeProperty('--color-text');
      document.documentElement.style.removeProperty('--color-text-sidebar');
    }

    if (theme === 'custom') {
      const cfg = localStorage.getItem('configuracion');
      if (cfg) {
        const c = JSON.parse(cfg);
        document.documentElement.style.setProperty('--color-primary', c.primaryColor);
        document.documentElement.style.setProperty('--color-navbar', c.navbarColor);
        document.documentElement.style.setProperty('--color-background', c.backgroundColor);
      }
    }

    this.updateSidebarTextContrast();
  }

  // Calcular automáticamente el color del texto del sidebar
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
