# Presupuesto Mix - Dashboard Inteligente con IA

Este proyecto es una aplicación web moderna construida con Next.js 14, React 19 y Tailwind CSS v4 para gestionar y optimizar el presupuesto de la comanda.

## Características Principales

1.  **Dashboard Dinámico**: Visualización en tiempo real del costo total y por persona.
2.  **Motor de IA (Simulado)**:
    *   Compara precios automáticamente entre 5 mercados principales (Metro, Plaza Vea, Tottus, Vivanda, Mercado Central).
    *   Encuentra la mejor oferta por ingrediente.
    *   Calcula el ahorro potencial total.
3.  **Interfaz Premium**:
    *   Diseño Dark Mode elegante.
    *   Gráficos interactivos de ahorro.
    *   Animaciones fluidas al expandir detalles y activar el modo IA.

## Tecnologías

*   **Framework**: Next.js 14 (App Router)
*   **Lenguaje**: TypeScript
*   **Estilos**: Tailwind CSS v4
*   **Visualización**: Recharts (Gráficos), Lucide React (Iconos)
*   **Animaciones**: Framer Motion

## Cómo Iniciar

1.  Instalar dependencias:
    ```bash
    npm install
    ```

2.  Correr el servidor de desarrollo:
    ```bash
    npm run dev
    ```

3.  Abrir [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura de Datos

Los datos de la comanda y los precios de mercado se encuentran en `src/data/budgetData.ts`. Puedes editar este archivo para agregar más platos o ajustar los precios base.
