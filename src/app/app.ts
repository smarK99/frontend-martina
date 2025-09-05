import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavBar } from "./components/nav-bar/nav-bar";

@Component({
  selector: 'app-root',
  imports: [RouterModule, NavBar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('martina-front-app');
}
