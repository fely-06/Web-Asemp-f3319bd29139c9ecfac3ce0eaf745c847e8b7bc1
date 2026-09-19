import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CurrencyPipe, NgIf, NgClass, CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { CobrosClientesService } from '../../../../core/services/cobros-clientes.service';

@Component({
  selector: 'app-cobro-pago-modal',
  standalone: true,
  templateUrl: './cobro-pago-modal.component.html',
  styleUrls: ['./cobro-pago-modal.component.css'],
  imports: [
    CommonModule,
    CurrencyPipe
  ]
})
export class CobroPagoModalComponent {

  @Input() cobro: any = null;
  @Output() cerrado = new EventEmitter<void>();
  @Output() pagado = new EventEmitter<void>();

  pdfFile: File | null = null;

  constructor(private cobrosService: CobrosClientesService) {}

  cerrar() {
    this.cerrado.emit();
  }

  cargarPDF(event: any) {
    this.pdfFile = event.target.files[0] ?? null;
  }

  pagar() {
    const fd = new FormData();
    fd.append('cobro_id', this.cobro.id);

    this.cobrosService.confirmarPago(fd).subscribe({
      next: (resp) => {
        const rutaPdf = resp.data;

        Swal.fire({
          title: '¡Pago Registrado!',
          text: 'El pago se ha registrado correctamente y el recibo ha sido generado.',
          icon: 'success',
          confirmButtonColor: '#0061a8',
          timer: 2000,
          showConfirmButton: false
        });

        // ABRIR PDF
        if (rutaPdf) {
          window.open(rutaPdf, "_blank");
        }

        this.pagado.emit();
        this.cerrar();
      },
      error: () => {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo registrar el pago.',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }
}