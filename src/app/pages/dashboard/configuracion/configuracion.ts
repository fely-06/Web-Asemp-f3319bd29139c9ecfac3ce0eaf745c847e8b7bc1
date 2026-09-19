import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracion.html',
  styleUrls: ['./configuracion.css']
})
export class Configuracion implements OnInit {

  primaryColor = '#802020';
  backgroundColor = '#f4f7fa';
  textColor = '#1a1a1a';
  previewLogo: string | ArrayBuffer | null = null;

  currentTheme: 'default' | 'light' | 'dark' | 'custom' = 'default';
  applyGlobally = false;

  private applying = false;

  // =============================
  // INIT
  // =============================
  ngOnInit() {

    // 🔹 restaurar switch
    this.applyGlobally = localStorage.getItem('applyGlobally') === 'true';

    this.loadThemeState();
    this.restoreCustomThemeIfNeeded();
    this.syncInputsWithTheme();
    this.syncThemeLogo();
    this.updateFeatherIcons();

    // === Observador de cambios de tema ===
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'data-theme') {
          const newTheme = document.documentElement.getAttribute('data-theme');
          if (newTheme && newTheme !== this.currentTheme) {
            this.currentTheme = newTheme as any;
            this.syncInputsWithTheme();
            this.syncThemeLogo();
          }
        }
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    // === Escuchar cambios externos ===
    window.addEventListener('storage', (e) => {
      if (e.key === 'theme' && e.newValue && e.newValue !== this.currentTheme) {
        this.currentTheme = e.newValue as any;
        this.syncInputsWithTheme();
        this.syncThemeLogo();
      }
    });
  }

  // =============================
  // TEMA ACTUAL
  // =============================
  loadThemeState() {
    const storedTheme =
      localStorage.getItem('theme') as 'default' | 'light' | 'dark' | 'custom' | null;

    this.currentTheme =
      storedTheme ||
      (document.documentElement.getAttribute('data-theme') as any) ||
      'default';

    document.documentElement.setAttribute('data-theme', this.currentTheme);
  }

  // =============================
  // RESTAURAR TEMA CUSTOM (CLAVE)
  // =============================
  private restoreCustomThemeIfNeeded() {
    if (this.currentTheme !== 'custom') return;

    const cfg = localStorage.getItem('configuracion');
    if (!cfg) return;

    const c = JSON.parse(cfg);

    document.documentElement.style.setProperty('--color-primary', c.primaryColor);
    document.documentElement.style.setProperty('--color-background', c.backgroundColor);
    document.documentElement.style.setProperty('--color-navbar', c.backgroundColor);
    document.documentElement.style.setProperty('--color-text', c.textColor);

    this.primaryColor = c.primaryColor;
    this.backgroundColor = c.backgroundColor;
    this.textColor = c.textColor;
    this.previewLogo = c.logo || null;
  }

  // =============================
  // SINCRONIZAR INPUTS
  // =============================
  private syncInputsWithTheme() {
    const cfg = localStorage.getItem('configuracion');

    if (cfg && this.currentTheme === 'custom') {
      const c = JSON.parse(cfg);
      this.primaryColor = c.primaryColor || this.getComputedColor('--color-primary');
      this.backgroundColor = c.backgroundColor || this.getComputedColor('--color-background');
      this.textColor = c.textColor || this.getComputedColor('--color-text');
      this.previewLogo = c.logo || null;
      return;
    }

    this.primaryColor = this.getComputedColor('--color-primary');
    this.backgroundColor = this.getComputedColor('--color-background');
    this.textColor = this.getComputedColor('--color-text');
  }

  getComputedColor(v: string): string {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(v)
      .trim();
  }

  // =============================
  // TOGGLE APLICAR GLOBAL
  // =============================
  onToggleScope() {
    localStorage.setItem('applyGlobally', String(this.applyGlobally));

    if (this.applyGlobally) {
      this.applyTheme();
    } else {
      document.documentElement.style.removeProperty('--color-primary');
      document.documentElement.style.removeProperty('--color-background');
      document.documentElement.style.removeProperty('--color-navbar');
      document.documentElement.style.removeProperty('--color-text');

      const theme = localStorage.getItem('theme') || this.currentTheme || 'default';
      document.documentElement.setAttribute('data-theme', theme);
      this.syncInputsWithTheme();
    }
  }

  // =============================
  // APLICAR TEMA
  // =============================
  applyTheme() {
    if (this.applying || !this.applyGlobally) return;
    this.applying = true;

    this.currentTheme = 'custom';
    document.documentElement.setAttribute('data-theme', 'custom');
    localStorage.setItem('theme', 'custom');

    document.documentElement.style.setProperty('--color-primary', this.primaryColor);
    document.documentElement.style.setProperty('--color-background', this.backgroundColor);
    document.documentElement.style.setProperty('--color-navbar', this.backgroundColor);

    const calculatedTextColor = this.calculateTextColor(this.backgroundColor);
    document.documentElement.style.setProperty('--color-text', calculatedTextColor);
    this.textColor = calculatedTextColor;

    const sidebarLogo = document.querySelector('.logo-img') as HTMLImageElement | null;
    if (sidebarLogo && this.previewLogo) {
      sidebarLogo.src = this.previewLogo as string;
    }

    this.saveTemporaryConfig();
    this.applying = false;
  }

  // =============================
  // CONTRASTE
  // =============================
  calculateTextColor(bgHex: string): string {
    const hex = bgHex.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? '#1a1a1a' : '#e5e7eb';
  }

  // =============================
  // LOGO
  // =============================
  onLogoChange(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'Archivo demasiado grande',
        text: 'El tamaño máximo permitido es 2 MB.',
        confirmButtonColor: '#f6c23e'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.previewLogo = reader.result;
      this.saveTemporaryConfig();

      if (this.applyGlobally) {
        const sidebarLogo = document.querySelector('.logo-img') as HTMLImageElement | null;
        if (sidebarLogo) sidebarLogo.src = this.previewLogo as string;
      }

      this.updateFeatherIcons();
    };
    reader.readAsDataURL(file);
  }

  removeLogo() {
    this.previewLogo = null;
    this.saveTemporaryConfig();
    this.syncThemeLogo();
    this.updateFeatherIcons();
  }

  // =============================
  // TEMAS PREDEFINIDOS
  // =============================
  resetToTheme(themeName: 'default' | 'light' | 'dark') {
    if (this.applying) return;
    this.applying = true;

    this.currentTheme = themeName;
    localStorage.setItem('theme', themeName);
    document.documentElement.setAttribute('data-theme', themeName);

    document.documentElement.style.removeProperty('--color-primary');
    document.documentElement.style.removeProperty('--color-background');
    document.documentElement.style.removeProperty('--color-navbar');
    document.documentElement.style.removeProperty('--color-text');

    this.syncInputsWithTheme();
    this.syncThemeLogo();

    setTimeout(() => (this.applying = false), 150);
  }

  resetConfig() {
    const def = confirm('¿Restaurar al tema por defecto? (Cancelar = tema claro)');
    this.resetToTheme(def ? 'default' : 'light');
    this.updateFeatherIcons();
  }

  // =============================
  // LOGO POR TEMA
  // =============================
  private syncThemeLogo() {
    const sidebarLogo = document.querySelector('.logo-img') as HTMLImageElement | null;
    if (!sidebarLogo) return;

    const cfg = localStorage.getItem('configuracion');
    if (cfg && this.currentTheme === 'custom') {
      const c = JSON.parse(cfg);
      if (c.logo) {
        sidebarLogo.src = c.logo;
        this.previewLogo = c.logo;
        return;
      }
    }

    sidebarLogo.src = 'assets/images/LOGO.png';
  }

  // =============================
  // GUARDAR CONFIG
  // =============================
  saveTemporaryConfig() {
    localStorage.setItem('configuracion', JSON.stringify({
      primaryColor: this.primaryColor,
      backgroundColor: this.backgroundColor,
      textColor: this.textColor,
      logo: this.previewLogo,
      theme: this.currentTheme
    }));
  }

  saveConfig() {
    const isPreview = !this.applyGlobally;
    const root = document.documentElement;

    // ✅ variables correctas
    root.style.setProperty('--color-primary', this.primaryColor);
    root.style.setProperty('--color-background', this.backgroundColor);
    root.style.setProperty('--color-navbar', this.backgroundColor);
    root.style.setProperty('--color-text', this.textColor);

    if (isPreview) {
      Swal.fire({
        icon: 'info',
        title: 'Vista previa activa',
        text: 'Activa el interruptor para aplicar el tema en toda la página.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    localStorage.setItem('theme', 'custom');
    localStorage.setItem('applyGlobally', 'true');

    this.saveTemporaryConfig();

    Swal.fire({
      icon: 'success',
      title: 'Configuración guardada',
      text: 'Tu tema personalizado se ha aplicado correctamente.',
      timer: 1500,
      showConfirmButton: false
    });
  }

  // =============================
  // ICONOS
  // =============================
  private updateFeatherIcons() {
    setTimeout(() => {
      const f = (window as any).feather;
      if (f) f.replace();
    }, 100);
  }
}
