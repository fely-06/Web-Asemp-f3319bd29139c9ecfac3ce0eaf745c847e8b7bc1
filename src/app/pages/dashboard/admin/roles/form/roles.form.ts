import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-roles-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './roles.form.html'
})
export class RolesForm implements OnInit {

  id?: number;          // id si viene en la ruta (edición)
  modelo: any = {       // luego lo tipas como RolDTO
    nombre: '',
    descripcion: '',
    estatus: true
  };

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    // Leer id de la ruta: /roles/form/:id
    this.id = Number(this.route.snapshot.paramMap.get('id')) || undefined;

    if (this.id) {
      // aquí después llamarás al servicio para obtener el rol y llenar el modelo
      // this.rolesService.get(this.id).subscribe(...)
    }
  }

  guardar() {
    if (this.id) {
      // actualizar rol
      // this.rolesService.actualizar(this.modelo)...
    } else {
      // crear rol
      // this.rolesService.crear(this.modelo)...
    }

    // por ahora solo regresar
    this.router.navigateByUrl('/dashboard/roles');
  }
}
