import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component'; // <-- Corrección aquí

describe('LoginComponent', () => {
  let component: LoginComponent; // <-- Corrección aquí
  let fixture: ComponentFixture<LoginComponent>; // <-- Corrección aquí

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent] // <-- Corrección aquí
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginComponent); // <-- Corrección aquí
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});