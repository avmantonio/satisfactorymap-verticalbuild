# Objective — Vertical Build Transfer

For agents: this is the product goal. Do not ask whether the app should “be an editor” — it already is. Do not re-grill the goal. Talk to Anto in Spanish.

---

Esta app **ya es un editor de partidas** (selección por rectángulo y por objeto, mover, copiar, pegar, borrar, rotar, Z en el panel de paste, filtros). El objetivo no es decidir si se edita. El objetivo es **quitarle la limitación 2D a esas mismas ediciones**: poder seleccionar secciones y/o objetos y moverlos, exportarlos e importarlos **ajustando el Z en serio**.

Satisfactory premia la verticalidad. El mapa zenital no: siluetas, pisos apilados ilegibles, el corte “correcto” imposible de elegir. Sin Z usable, el editor que ya existe trabaja a ciegas.

## MVP

**Añadir una vista de cortes** (A–A′ y B–B′ ligados al rectángulo, una ventana de Z) al editor actual. Sin cámara 3D. El corte alimenta las operaciones que ya existen (seleccionar, mover, copiar, exportar), no es un visor aparte.

## Producto deseado

El mismo editor, en **3D esquemático**: formas simplificadas, controles 3D, filtros (los de hoy), opacidad para interiores. Horizonte: `assets/02-schematic-3d-final.png`. No `assets/03` fotorrealista.

## Primer corte 3D

Antes de ese editor 3D, el primer corte es un **visor regional de solo lectura** de lo ya aplicado en el área delimitada: órbita, proxies honestos, presupuesto cerrado, el mismo frontend en navegador y Tauri. No mueve, no certifica colisiones, no anima flujo. El terreno no bloquea. Controles 3D, opacidad de interiores y el resto del producto deseado quedan después de esa entrega. Las directrices ya tomadas están en la sección Answer del ticket que les corresponde. Si no quedó nada por decidir, ese ticket está resuelto.

## Hechos del editor de hoy (no se preguntan)

- Selección: rectángulo, Ctrl+clic de objeto, Ctrl+A. Secciones **y** objetos ya están.
- Edición espacial: move / copy / paste / delete / rotate / Z en paste.
- Copy entre saves: clipboard (y se decidió además archivo con nombre, mismos bytes).
- No es un constructor: no coloca máquinas nuevas ni tiende cintas nuevas. Pegar no suelda; no se parte `FGConveyorChainActor`.
- Filtros de capas y filtro de altitud ya existen; el altitud es un gate, no una cámara.

## Este mapa de Wayfinder

Campaña hacia ese objetivo en la app real (browser y desktop): spec, prototipo, primer ship, después 3D esquemático. Scheme y Bearing: `map.md`. Cómo seguir: `CONTINUE.md`. El conteo de tickets no es “app lista”.
