import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth-service';
import { EstadisticasService } from '../../services/estadisticas-service'; // Servicio real
import { Observable, forkJoin } from 'rxjs';
import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

Chart.register(...registerables);

// --- INTERFACES PARA DATOS REALES DEL BACKEND ---
// Proyecciones tal cual vienen de Java (nativeQuery)
interface ProductosMasVendidosProjection {
  nombreProducto: string;
  cantidadTotal: number;
  montoTotal: number;
}

// Proyección para tu nueva métrica (monto total ventas por sucursal)
interface VentasSucursalProjection {
  nombreSucursal: string; // Coincide con getNombreSucursal();
  montoTotalVentas: number; // Coincide con getMontoTotalVentas();
}


// --- INTERFACES PARA VISUALIZACIÓN EN EL FRONT (MISMAS QUE TENÍAS) ---
// Agregamos interfaz para mostrar la tabla de sucursales con rank
interface VentasSucursalForDisplay {
  nombreSucursal: string;
  montoTotal: number;
  rank: number;
}

@Component({
  selector: 'app-estadisticas',
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './estadisticas.html',
  styleUrl: './estadisticas.css'
})
export class Estadisticas implements OnInit {

  private auth = inject(AuthService);
  private statsService = inject(EstadisticasService); // Servicio real
  
  role$: Observable<string | null> = this.auth.role$;
  datosCargados = false; // Bandera para esperar a que carguen los datos

  // --- VARIABLES DE VISTA (MISMAS QUE TENÍAS) ---
  ventasUltimos30Dias = 0;
  ventasUltimos7Dias = 0;
  pedidosUltimos30Dias = 0; 
  ticketPromedio30Dias = 0; // Pendiente de endpoint real
  topProductos30Dias: { nombre: string; cantidad: number; monto: number }[] = [];
  top3Total = 0;
  topProductsForDisplay: { nombre: string; cantidad: number; monto: number; rank: number }[] = [];

  // --- NUEVA VARIABLE PARA LA TABLA DE SUCURSALES ---
  ventasSucursalForDisplay: VentasSucursalForDisplay[] = [];


  // --- CONFIGURACIÓN DE GRÁFICOS (QUEDA IGUAL) ---
  lineSalesData!: ChartData<'line', number[], string>;
  lineSalesOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    interaction: { mode: 'index', intersect: false },
    scales: { x: { display: true }, y: { display: true, beginAtZero: true } }
  };

  barTopProductsData!: ChartData<'bar', number[], string>;
  barTopProductsOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { x: { display: true }, y: { display: true, beginAtZero: true } }
  };

  doughnutData!: ChartData<'doughnut', number[], string>;
  doughnutOptions: ChartOptions<'doughnut'> = { responsive: true, plugins: { legend: { position: 'bottom' } } };

  ngOnInit() {
    this.cargarDatosReales();
  }

  private cargarDatosReales() {
    // forkJoin dispara todas las peticiones al mismo tiempo y espera a que terminen
    forkJoin({
      ventas30: this.statsService.getRecaud30Dias(),
      ventas7: this.statsService.getRecaud7Dias(),
      productos: this.statsService.getProdsMasVendidos(), 
      ventasSucursal: this.statsService.getVtasPorSucursal() 
    }).subscribe({
      next: (resultados) => {
        // 1. Asignar los valores directos
        this.ventasUltimos30Dias = resultados.ventas30.totalVentas || 0;
        this.pedidosUltimos30Dias = resultados.ventas30.totalPedidos || 0;
        this.ventasUltimos7Dias = resultados.ventas7 || 0;

        // 2. Calcular el ticket promedio 
        this.ticketPromedio30Dias = this.pedidosUltimos30Dias > 0 
          ? this.ventasUltimos30Dias / this.pedidosUltimos30Dias 
          : 0;

        // 3. Mapear productos
        this.topProductos30Dias = resultados.productos.map(p => ({
          nombre: p.nombreProducto,
          cantidad: p.cantidadTotal,
          // Ahora usamos el monto real que programaste en la query
          monto: p.montoTotal 
        }));

        // 4. Preparar la tabla Top 10 productos
        this.topProductsForDisplay = this.topProductos30Dias
          .slice(0, 10)
          .map((t, i) => ({ ...t, rank: i + 1 }));

        // 5. Preparar Top 3 Total
        this.top3Total = this.topProductos30Dias
          .slice(0, 3)
          .reduce((s, t) => s + (t.monto || 0), 0);


        // 6. MAPEAR Y PREPARAR TU NUEVA TABLA DE SUCURSALES
        // Asignamos el ranking basándonos en el orden que ya trae la query (DESC)
        this.ventasSucursalForDisplay = resultados.ventasSucursal.map((s, i) => ({
          nombreSucursal: s.nombreSucursal,
          montoTotal: s.montoTotalVentas,
          rank: i + 1 // Add rank for display
        }));


        // 6. Construir los gráficos
        this.buildTopProductsCharts();
        this.buildLineChartMock(); // Temporal hasta tener el endpoint real

        this.datosCargados = true;
      },
      error: (err) => {
        console.error('Error cargando estadísticas', err);
        alert('No se pudieron cargar las métricas desde el servidor.');
      }
    });
  }

  private buildTopProductsCharts() {
    const top = this.topProductos30Dias.slice(0, 5);
    const labels = top.map(t => t.nombre);
    const quantities = top.map(t => t.cantidad);
    
    // Ahora podemos usar los montos reales para el gráfico de dona
    const amounts = top.map(t => Math.round(t.monto)); 

    this.barTopProductsData = {
      labels,
      datasets: [{ data: quantities, label: 'Unidades vendidas', backgroundColor: '#d81b27' }]
    };

    this.doughnutData = {
      labels,
      datasets: [{
        data: amounts,
        backgroundColor: ['#d81b27', '#ff6b6b', '#ff9f89', '#ffb3a7', '#ffd1c1']
      }]
    };
  }

  // Se mantiene solo como puente visual hasta que programes el backend
  private buildLineChartMock() {
    const labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5', 'Semana 6'];
    const values = [0, 0, 0, 0, 0, 0]; // Todo en cero hasta que esté el backend real

    this.lineSalesData = {
      labels,
      datasets: [{
        data: values, label: 'Ventas (ARS)', fill: true, tension: 0.35,
        borderColor: '#d81b27', backgroundColor: 'rgba(216,27,39,0.12)', pointRadius: 4
      }]
    };
  }
}