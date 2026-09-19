import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import feather from 'feather-icons';

// ===================================================
// Aplicar tema guardado antes de que Angular inicie
// ===================================================
(function applyStoredThemeEarly() {
  const root = document.documentElement;
  const storedTheme = localStorage.getItem('theme');

  if (storedTheme) {
    root.setAttribute('data-theme', storedTheme);

    if (storedTheme === 'custom') {
      const storedConfig = localStorage.getItem('configuracion');
      if (storedConfig) {
        const cfg = JSON.parse(storedConfig);

        if (cfg.primaryColor)
          root.style.setProperty('--color-primary', cfg.primaryColor);
        if (cfg.backgroundColor)
          root.style.setProperty('--color-background', cfg.backgroundColor);
        if (cfg.navbarColor)
          root.style.setProperty('--color-navbar', cfg.navbarColor || cfg.backgroundColor);

        const bg = (cfg.backgroundColor || '#ffffff').replace('#', '');
        const r = parseInt(bg.substring(0, 2), 16);
        const g = parseInt(bg.substring(2, 4), 16);
        const b = parseInt(bg.substring(4, 6), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const textColor = luminance > 0.6 ? '#1a1a1a' : '#f5f5f5';
        root.style.setProperty('--color-text', textColor);
      }
    } else {
      // limpia restos de tema custom
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-background');
      root.style.removeProperty('--color-navbar');
      root.style.removeProperty('--color-text');
    }
  } else {
    // sin tema previo → aplica default
    root.setAttribute('data-theme', 'default');
  }
})();

// ===================================================
// Iniciar Angular
// ===================================================
bootstrapApplication(App, appConfig)
  .catch(err => console.error(err));

// Activar íconos Feather
document.addEventListener('DOMContentLoaded', () => {
  feather.replace();
});
