import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-action-bar',
  imports: [CommonModule],
  templateUrl: './action-bar.html',
  styleUrl: './action-bar.css'
})
export class ActionBar {
  @Input() title: string = '';
}
