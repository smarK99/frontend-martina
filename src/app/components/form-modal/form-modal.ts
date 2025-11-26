import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-form-modal',
  imports: [],
  templateUrl: './form-modal.html',
  styleUrl: './form-modal.css'
})
export class FormModal {
  @Input() title: string = 'Formulario';
  @Input() actionButtonLabel: string = 'Guardar';
  @Input() isOpen: boolean = false;
  
  @Output() onClose = new EventEmitter<void>();
  @Output() onConfirm = new EventEmitter<void>();

  closeModal() {
    this.onClose.emit();
  }

  confirmAction() {
    this.onConfirm.emit();
  }
}
