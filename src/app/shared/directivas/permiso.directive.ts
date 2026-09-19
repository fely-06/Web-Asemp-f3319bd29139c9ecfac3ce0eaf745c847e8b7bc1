import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { Utilerias } from '../../core/utilerias/utilerias';

@Directive({
  selector: '[permiso]',
  standalone: true
})
export class PermisoDirective {

  private _accion = '';

  constructor(
    private tpl: TemplateRef<any>,
    private view: ViewContainerRef
  ) {}

  @Input()
  set permiso(clave: string) {
    this._accion = clave;
    this.actualizarVista();
  }

  private actualizarVista() {
    this.view.clear();

    if (Utilerias.tienePermiso(this._accion)) {
      this.view.createEmbeddedView(this.tpl);
    }
  }
}
