import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-session-expired',
  standalone: true,
  template: `
    <div class="modal-header bg-warning border-0">
      <h5 class="modal-title fw-bold text-dark">
        <i class="bi bi-clock-history me-2"></i>Sesión Expirada
      </h5>
    </div>
    <div class="modal-body text-center py-4">
      <i class="bi bi-exclamation-circle text-warning mb-3 d-block" style="font-size: 3.5rem;"></i>
      <p class="fs-5 mb-1">Tu sesión ha expirado.</p>
      <p class="text-muted small">Por favor, vuelve a iniciar sesión para continuar.</p>
    </div>
    <div class="modal-footer bg-light border-0 justify-content-center">
      <button type="button" class="btn btn-warning px-5 fw-bold" (click)="entendido()">Entendido</button>
    </div>
  `
})
export class SessionExpiredComponent {
  constructor(public activeModal: NgbActiveModal) {}

  entendido() {
    this.activeModal.close('ok');
  }
}