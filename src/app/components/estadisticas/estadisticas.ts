import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
//import { NgChartsModule } from 'ng2-charts';
import { AuthService } from '../../services/auth-service';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

Chart.register(...registerables);

/** Tipos de datos de ejemplo (ajustalos a los reales) */
interface StatPedido {
  id: number;
  fecha: string; // ISO
  clienteNombre: string;
  total: number;
  items: { productoId: number; productoNombre: string; cantidad: number; precioUnitario?: number }[];
}

@Component({
  selector: 'app-estadisticas',
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './estadisticas.html',
  styleUrl: './estadisticas.css'
})
export class Estadisticas {

  private auth = inject(AuthService);
  role$: Observable<string | null> = this.auth.role$;

  // --- MOCK DATA (replace with backend calls) ---
  // pedidos de ejemplo (últimos 60 días)
  private pedidosMock: StatPedido[] = this.buildMockPedidos();

  // Derived stats (observables or plain values)
  ventasUltimos30Dias = 0;
  ventasUltimos7Dias = 0;
  pedidosUltimos30Dias = 0;
  ticketPromedio30Dias = 0;
  topProductos30Dias: { nombre: string; cantidad: number; monto: number }[] = [];
  top3Total: number = 0;
  // propiedad para la vista (top 10 con rank)
  topProductsForDisplay: { nombre: string; cantidad: number; monto: number; rank: number }[] = [];


  // Chart.js data/opts
  lineSalesData!: ChartData<'line', number[], string>;
  lineSalesOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { display: true },
      y: { display: true, beginAtZero: true }
    }
  };

  barTopProductsData!: ChartData<'bar', number[], string>;
  barTopProductsOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { callbacks: {} } },
    scales: { x: { display: true }, y: { display: true, beginAtZero: true } }
  };

  doughnutData!: ChartData<'doughnut', number[], string>;
  doughnutOptions: ChartOptions<'doughnut'> = { responsive: true, plugins: { legend: { position: 'bottom' } } };

  constructor() {
    // compute stats from mock dataset
    this.computeStats();

    // build charts
    this.buildLineChart();
    this.buildTopProductsCharts();
  }

  // -------------------------
  private computeStats() {
    const now = new Date();
    const daysAgo = (d: number) => {
      const dt = new Date(now);
      dt.setDate(dt.getDate() - d);
      return dt;
    };

    const inLast = (iso: string, days: number) => new Date(iso) >= daysAgo(days);

    // sales last 30 & 7 days
    const pedidos30 = this.pedidosMock.filter(p => inLast(p.fecha, 30));
    const pedidos7 = this.pedidosMock.filter(p => inLast(p.fecha, 7));

    this.ventasUltimos30Dias = pedidos30.reduce((s, p) => s + p.total, 0);
    this.ventasUltimos7Dias = pedidos7.reduce((s, p) => s + p.total, 0);
    this.pedidosUltimos30Dias = pedidos30.length;
    this.ticketPromedio30Dias = this.pedidosUltimos30Dias ? Math.round(this.ventasUltimos30Dias / this.pedidosUltimos30Dias) : 0;

    // aggregate top products in last 30 days
    const prodMap = new Map<string, { nombre: string; cantidad: number; monto: number }>();
    for (const p of pedidos30) {
      for (const it of p.items) {
        const key = `${it.productoId}|${it.productoNombre}`;
        const prev = prodMap.get(key) ?? { nombre: it.productoNombre, cantidad: 0, monto: 0 };
        prev.cantidad += it.cantidad;
        prev.monto += (it.precioUnitario ?? 0) * it.cantidad;
        prodMap.set(key, prev);
      }
    }
    const arr = Array.from(prodMap.values());
    arr.sort((a, b) => b.cantidad - a.cantidad);
    this.topProductos30Dias = arr;

    // calcular total de los top 3 (monto)
    this.top3Total = this.topProductos30Dias
      .slice(0, 3)
      .reduce((s, t) => s + (t.monto || 0), 0);

    // preparar el array que usará la plantilla (top 10 con rank)
    this.topProductsForDisplay = this.topProductos30Dias
      .slice(0, 10)
      .map((t, i) => ({ nombre: t.nombre, cantidad: t.cantidad, monto: t.monto ?? 0, rank: i + 1 }));

    // If no price info, we still can rank by cantidad; ensure arrays not empty
  }

  private buildLineChart() {
    // Build simple weekly aggregation for last 6 weeks
    const weeks = 6;
    const labels: string[] = [];
    const values: number[] = [];
    const now = new Date();
    for (let w = weeks - 1; w >= 0; w--) {
      const start = new Date(now);
      start.setDate(now.getDate() - (w * 7));
      const label = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      labels.push(label);
      // sum sales in that week (approx)
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() - 6); // 7-day window
      const weekEnd = new Date(start);
      const total = this.pedidosMock
        .filter(p => {
          const d = new Date(p.fecha);
          return d >= weekStart && d <= weekEnd;
        })
        .reduce((s, p) => s + p.total, 0);
      values.push(total);
    }

    this.lineSalesData = {
      labels,
      datasets: [
        {
          data: values,
          label: 'Ventas (ARS)',
          fill: true,
          tension: 0.35,
          borderColor: '#d81b27',
          backgroundColor: 'rgba(216,27,39,0.12)',
          pointRadius: 4
        }
      ]
    };
  }

  private buildTopProductsCharts() {
    // top 5 products by quantity
    const top = this.topProductos30Dias.slice(0, 5);
    const labels = top.map(t => t.nombre);
    const quantities = top.map(t => t.cantidad);
    const amounts = top.map(t => Math.round(t.monto));

    this.barTopProductsData = {
      labels,
      datasets: [
        {
          data: quantities,
          label: 'Unidades vendidas',
          backgroundColor: '#d81b27'
        }
      ]
    };

    this.doughnutData = {
      labels,
      datasets: [
        {
          data: amounts,
          backgroundColor: [
            '#d81b27',
            '#ff6b6b',
            '#ff9f89',
            '#ffb3a7',
            '#ffd1c1'
          ]
        }
      ]
    };
  }

  // utility: build mock orders for demo (replace with real api)
  private buildMockPedidos(): StatPedido[] {
    // build a small dataset across many dates and products
    const mockProducts = [
      { id: 1, nombre: 'Jamón y Queso', precio: 2500 },
      { id: 2, nombre: 'Pollo', precio: 2900 },
      { id: 3, nombre: 'Vegetariano', precio: 2700 },
      { id: 4, nombre: 'Atún', precio: 2800 },
      { id: 5, nombre: 'Milanesa', precio: 3000 }
    ];

    const pedidos: StatPedido[] = [];
    const now = new Date();

    let counter = 100;
    // create 60 random orders across last 45 days
    for (let i = 0; i < 60; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - Math.floor(Math.random() * 45)); // up to 45 days ago
      const itemsCount = Math.floor(Math.random() * 3) + 1;
      const items = [];
      let total = 0;
      for (let j = 0; j < itemsCount; j++) {
        const prod = mockProducts[Math.floor(Math.random() * mockProducts.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        items.push({ productoId: prod.id, productoNombre: prod.nombre, cantidad: qty, precioUnitario: prod.precio });
        total += prod.precio * qty;
      }
      pedidos.push({
        id: ++counter,
        fecha: d.toISOString(),
        clienteNombre: ['Juan', 'María', 'ACME', 'Lucía', 'Pedro'][Math.floor(Math.random() * 5)],
        total,
        items
      });
    }
    return pedidos;
  }

}
