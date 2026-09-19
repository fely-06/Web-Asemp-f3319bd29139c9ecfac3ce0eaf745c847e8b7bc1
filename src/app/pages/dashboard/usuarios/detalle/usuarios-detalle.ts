import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';     // 👈 para *ngIf, *ngFor
import { RouterModule } from '@angular/router';     // 👈 para [routerLink]
import { ActivatedRoute } from '@angular/router';
import { UsuariosService, Usuario } from '../../../../core/services/usuarios.service';

@Component({
  selector: 'app-usuarios-detalle',
  standalone: true,                                 // 👈 necesario
  templateUrl: './usuarios-detalle.html',
  styleUrls: ['./usuarios-detalle.css'],
  imports: [CommonModule, RouterModule]             // 👈 activa directivas y rutas
})
export class UsuariosDetalle implements OnInit {
  usuario?: Usuario;
  cargando = true;

  constructor(
    private route: ActivatedRoute,
    private usuariosSrv: UsuariosService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.usuariosSrv.getById(id).subscribe({
      next: data => {
        this.usuario = data;
        this.cargando = false;
      },
      error: _ => (this.cargando = false)
    });
  }
}
