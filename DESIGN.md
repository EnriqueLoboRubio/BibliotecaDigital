# **design.md \- Especificaciones de Diseño y Experiencia (UX/UI)**

Este documento complementa la arquitectura espacial (**ARQUITECTURE.md**) y las reglas de protección (**PROTECT.md**). Define las interacciones, estados de la interfaz, accesibilidad y decisiones de producto necesarias para garantizar que la biblioteca digital sea usable como herramienta de localización física.

## **1\. Validaciones Espaciales y Lo Que Ya Funciona**

> * **Metáfora Física Sólida:** La jerarquía *Habitación → estantería → cubo → profundidad → posición* es el eje central y funciona porque se puede explicar verbalmente frente al mueble.  
> * **Respeto al Contexto:** Atenuar el resto de los libros en lugar de ocultarlos durante una búsqueda permite mantener la referencia espacial del usuario.  
> * **Fidelidad de Datos:** Tratar los cubos desactivados como un dato real (enabled: false) evita interfaces engañosas y respeta las restricciones de PROTECT.md.  
> * **Representación Textual vs. Visual:** Mantener /books como una ruta secundaria refuerza que la aplicación es un mapa de localización física, no un catálogo genérico.

## **2\. Estructura de Rutas y Navegación**

Para evitar que los gestos de navegación (como el botón Atrás o el menú inferior) cambien de significado dependiendo del número de muebles, se establece el siguiente contrato estricto de rutas:

> * **/ (Home):** Siempre muestra el plano de la habitación. Si solo hay un mueble, se muestra como una pieza grande en el plano. Nunca actúa directamente como el 4x4.  
> * **/shelves:** Funciona como un índice o lista accesible (nombres, medidas, recuento de libros), no como un segundo mapa redundante.  
> * **/shelves/\[id\]:** Es la vista de la estantería (ej. rejilla 4x4) a tamaño útil.  
> * **Ficha del Libro:** En el contexto espacial (el mapa), la ficha debe abrirse como un panel o *overlay* (ej. hoja inferior en móvil, panel dividido en escritorio) gestionado por un parámetro como ?book=. La ruta directa /books/\[id\] queda reservada estrictamente para navegar desde el catálogo.

## **3\. Estados Visuales y Tipología de Cubos**

El componente ShelfCell debe poder representar visualmente diferentes densidades y estados físicos reales de un mueble tipo Kallax. Las siguientes reglas rigen su renderizado:

| Estado del Cubo | Condición (Datos) | Tratamiento UX/UI &nbsp; |
| :---- | :---- | :---- |
| Desactivado | enabled: false | Trama visual o etiqueta "Sin uso". Sin interacciones táctiles ni de teclado (disabled). |
| Vacío | enabled: true, sin libros | Hueco visible y texto explícito "0 libros" para diferenciarlo de un error de carga. |
| Múltiples profundidades | Algún libro con depth \> 1 | Texto explícito (ej. "3 detrás"), no solo un punto decorativo. |
| Desbordamiento (Overflow) | Libros \> capacidad visual del lomo | Mostrar máximo visible \+ " \+N " con el recuento real. El resto se ve al abrir el cubo. |

## **4\. Diseño de Búsqueda y Localización**

La búsqueda actúa como un **localizador espacial**. Debe guiar al usuario desde la pantalla hasta el libro físico sin ambigüedades:

> * **Flujo de Matching:** El campo de búsqueda (chrome) debe funcionar como un *combobox*. Busca y muestra una lista corta de *hits* (título, autor, frase de sitio). Solo al elegir un hit se salta a la localización espacial (atenúa el resto, marca el cubo con un anillo).  
> * **Resultados Múltiples:** Si hay varios hits, se debe ofrecer un enlace "Ver N resultados en el catálogo" y controles para navegar (Anterior/Siguiente) sin saltar ciegamente por el mapa.  
> * **Libros en Segunda Fila:** Si un *hit* tiene depth \> 1, se debe mostrar una instrucción física explícita ("Detrás \- hay que sacar los de delante") antes de obligar a abrir el cubo virtualmente.  
> * **Salida del Modo Localizador:** Presionar Esc o "Limpiar búsqueda" debe restaurar la opacidad completa de la estantería y remover los parámetros de búsqueda.

### **El Lenguaje Físico (Frase Canónica)**

Se prohíben términos ambiguos como "Cubo 3x2" o el cruce del término "fila" (fila del mueble vs. fila de profundidad vs. fila de libros). El vocabulario estándar en UI será:

Forma Larga: "Estantería A, segunda fila desde arriba, tercera columna desde la izquierda, detrás, 7.º desde la izquierda."  
Forma Corta (UI densa): "2↑ 3← detrás \#7"

Vocabulario UI:  
\- Cubo (identificado por su fila y columna física).  
\- Frente / Medio / Fondo (o "a 2 libros de profundidad" si hay múltiples).  
\- Orden o Posición (nunca "fila" para referirse a la ubicación de un lomo).

## **5\. Responsividad, Ergonomía y Accesibilidad**

Un iPad o teléfono móvil es el dispositivo natural frente a una estantería. La UI debe adaptarse a escenarios táctiles de campo:

> * **Resolución Táctil:** Los lomos de 4–8 píxeles son inusables. En dispositivos móviles, la rejilla 4x4 se convierte en botones grandes táctiles (recuento \+ indicador \+ hit). Los lomos individuales solo se cargan y renderizan al hacer tap/entrar al cubo.  
> * **Split-Screen en Escritorio/Tablet:** Al abrir un cubo, la vista debe dividirse (rejilla a un lado, detalle abierto al otro) para no perder el contexto de la columna/fila que se está examinando.  
> * **Zoom y Pan:** Se permite el *pinch/scroll* nativo del mapa para accesibilidad visual, manteniendo el respeto a prefers-reduced-motion (evitar animaciones de paneo forzadas desde código).  
> * **Accesibilidad por Teclado:** Uso estricto de Tabulación entre cubos, Enter para abrir el cubo, y las flechas direccionales para navegar entre los lomos (para mitigar un tab-order de cientos de elementos).  
> * **Semántica para Screen Readers:** El mapa no puede depender de color/forma. Un grupo debe leerse como: *"Cubo fila 2 columna 1, 8 libros, 3 detrás"*. Todos los textos en español requieren lang="es" explícito.

## **6\. Altas y Modificaciones (El "Estado Vacío")**

Dado que PROTECT.md prohíbe explícitamente inyectar datos de prueba, la primera visita generará una estantería completamente vacía. Para que la aplicación no parezca rota, se requiere:

> * **Onboarding Espacial:** Documentar un primer uso guiado. ("La estantería está vacía. Selecciona un cubo para registrar el primer libro").  
> * **Flujo de Alta Mínimo (CRUD):** Proveer la superficie de interfaz para insertar un libro, editar su posición o moverlo. Sin la capacidad de registrar traslados visualmente, el mapa queda desactualizado y la herramienta falla en su propósito principal.  
> * **Gestión de Huecos:** En el detalle del cubo, habilitar resaltado visual de huecos y libros vecinos. Es fundamental para determinar físicamente "dónde insertar" (ej. "poner en posición 7 empujando el resto").

## **Resumen de Acción y Prioridades Técnicas**

> 1. Diseñar el **Empty State** y las superficies de Alta/Traslado para habilitar el uso real.  
> 2. Migrar la visualización móvil hacia **Cubos Táctiles**, reservando los lomos únicamente para la vista de detalle.  
> 3. Implementar la regla estricta de desbordamiento (Overflow) y los **tres estados visuales** del cubo (vacío habilitado, desactivado, libros al fondo).  
> 4. Separar la intención de búsqueda de catálogo de la **intención de localización espacial** (implementar *Combobox* de resultados).  
> 5. Normalizar el **Vocabulario Físico** en toda la UI y consolidar las rutas de navegación primaria (Home vs. Shelves).