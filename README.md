# Rodillas 🦵

App para acompañar la recuperación tras una **reconstrucción de LCA con cirugía de menisco en las dos rodillas**.

Es una app web instalable en el móvil (PWA): funciona sin conexión, no necesita cuenta ni servidor y **tus datos se quedan en tu teléfono**.

> ⚠️ Es una guía general basada en protocolos habituales de rehabilitación. Tu cirujano y tu fisioterapeuta conocen tu operación y **tienen la última palabra**. Si algo de la app no coincide con lo que te han dicho, haz caso a ellos y ajústalo en la app.

## Qué hace

- **Hoy**: día y semana desde la cirugía, fase actual y la lista de ejercicios del día. Toca el círculo de cada ejercicio cada vez que hagas una sesión; toca el nombre para ver cómo se hace, por qué y los avisos según tu cirugía.
- **Temporizador guiado**: para los isométricos, la extensión pasiva, el equilibrio, la bici, etc., con pitidos y vibración (repeticiones, tiempo de aguante y descanso).
- **Registro diario** de cada rodilla: dolor (0–10), hinchazón, flexión y extensión, más notas. Se guarda solo.
- **Avisos automáticos**: si registras mucho dolor o hinchazón, si a una rodilla le falta extensión, etc.
- **Progreso**: gráficos de flexión, extensión y dolor de cada rodilla, racha y calendario de constancia.
- **Plan por fases** (5 fases, de la protección al retorno al deporte) con objetivos, **criterios para avanzar** que puedes ir marcando, y **señales de alarma** (trombosis, infección…).
- **Se adapta a tu cirugía**:
  - *Sutura de menisco*: límite de 90° las primeras semanas, sin bici hasta las 6 semanas, sin sentadillas profundas, zancadas ni sentadilla búlgara hasta los 4 meses.
  - *Injerto de isquiotibiales*: sin peso muerto hasta las 8 semanas ni curl de isquios hasta las 10.
  - *Injerto rotuliano*: avisos al arrodillarse.
  - Si operaron cada rodilla en una fecha distinta, el plan sigue a la operada más recientemente.
  - Si no sabes el tipo, la app aplica lo más prudente.
- **Personalizable**: fija la fase que te diga tu fisio, oculta ejercicios que no te tocan y añade los que te mande.
- **Copia de seguridad**: exporta/importa tus datos en un archivo.

## Cómo usarla en el móvil

La app tiene que estar publicada en una dirección `https://` para poder instalarla.

### GitHub Pages

1. En GitHub, abre el repositorio → **Settings → Pages**.
2. En *Build and deployment → Source*, elige **Deploy from a branch**.
3. En *Branch*, elige la rama de la app y la carpeta **`/ (root)`**, y pulsa **Save**.
4. En 1–2 minutos estará en **<https://mirckoestudio-png.github.io/recuperacion/>**.

Con una cuenta gratuita de GitHub, Pages solo funciona si el repositorio es **público** (*Settings → General → Danger Zone → Change visibility*). Hacerlo público solo muestra el código de la app: tus registros nunca salen de tu móvil.

Cada vez que se suban cambios a esa rama, la web se actualiza sola.

### Alternativa: Netlify Drop

Entra en <https://app.netlify.com/drop> y arrastra la carpeta del proyecto.

Luego ábrela en el móvil y:

- **iPhone (Safari)**: botón Compartir → *Añadir a pantalla de inicio*.
- **Android (Chrome)**: menú ⋮ → *Instalar aplicación* o *Añadir a pantalla de inicio*.

Tras abrirla una vez, funciona sin conexión.

> Los datos se guardan en el navegador del móvil. Si borras los datos del navegador o cambias de teléfono, se pierden: usa **Ajustes → Exportar copia** de vez en cuando.

## Probarla en el ordenador

```bash
python3 -m http.server 8000
```

Y abre <http://localhost:8000>. (También funciona abriendo `index.html` directamente, pero sin modo offline.)

## Estructura

```
index.html            Página principal
css/styles.css        Estilos (modo claro y oscuro)
js/data.js            Contenido del protocolo: fases, ejercicios, señales de alarma, consejos
js/plan.js            Lógica: fase actual, ejercicios del día, precauciones, avisos, constancia
js/store.js           Fechas y almacenamiento local (export/import)
js/charts.js          Gráficos SVG
js/app.js             Pantallas e interacción
sw.js                 Service worker (modo sin conexión)
manifest.webmanifest  Datos para instalar la app
icons/                Iconos
tests/plan.test.js    Pruebas de la lógica (node tests/plan.test.js)
```

### Cambiar ejercicios o fases

Todo el contenido está en `js/data.js`. Cada ejercicio indica en qué fases aparece (`phases`), cuántas veces al día (`perDay`), la dosis, los pasos y, si hace falta, un temporizador (`timer`) o una fecha mínima según tu cirugía (`gate`).

Si publicas una versión nueva, cambia `CACHE` en `sw.js` (por ejemplo `rodillas-v2`) para que los móviles descarguen los archivos nuevos.
