# Nueva York · sistema de información

Taller de datos, Tópicos de Sistemas de Información. Profesor Santiago Jiménez Londoño.

Grupo: Erick Santiago Ochoa Barrueto, Mariana Garcia Zapata y Santiago Vélez Blandón.
Sistema publicado: https://tallerdatosnyc.vercel.app
Repositorio: https://github.com/Zacks081/Taller_Datos_NYC
Revisado: 2026-11-03

## Para quién y qué pregunta

- Usuario: alguien que llega a Nueva York a vivir, a estudiar o de visita y quiere entender la ciudad por partes antes de moverse por ella: primero el borough, después los lugares y cómo llegar a ellos.
- Preguntas:
  - P1. ¿En qué se diferencian los cinco boroughs en población, área, parques, metro y patrimonio protegido? Respondida.
  - P2. ¿Cuáles de los lugares del archivo son patrimonio protegido y desde cuándo? Respondida.
  - P3. ¿Qué tan fácil es llegar en metro a cada lugar del archivo? Respondida en parte: medimos la distancia en línea recta a la estación más cercana y la mostramos como PROXY. La distancia a pie queda pendiente.
  - P4. ¿Cuáles de los lugares del archivo consulta más la gente en Wikipedia? Respondida. Es nueva: salió de integrar F12, como pidió el profesor.
- Escala y comparación: los cinco boroughs entre sí, y siete lugares concretos de la ciudad.
- Lo que decidimos no mostrar, y por qué:
  - Las direcciones y los números de lote (BBL) de los landmarks. F03 los trae, y cruzados con los permisos de la misma comisión (LPC Permit Application Information, dpm2-m9mq) dan el nombre del dueño de cada casa protegida. Del patrimonio solo publicamos el conteo por borough; los únicos puntos exactos son los siete lugares, que son monumentos públicos.
  - Las denuncias de la Policía (F16), porque cada fila describe a las personas de la denuncia.

## La réplica

- Del ejemplo de Lima replicamos el contrato (un JSON por tema con tema, probado, fuentes y cada cifra con valor, unidad, vigencia y fuente), un script de ingesta por fuente con solo la biblioteca estándar de Python, la verificación que sabe fallar y unas vistas en HTML y JavaScript sin framework con MapLibre.
- Lo que cambiamos para Nueva York:
  - En las tablas (boroughs, lugares) cada columna está descrita en un bloque «campos» con unidad, vigencia y fuente. Así la vista puede mostrar la procedencia de cualquier celda, no solo de las cifras sueltas.
  - Cada fuente lleva su propio día de prueba. F07 se probó el 2026-10-06 (se transcribió a mano) y las demás el día de la corrida.
  - La vigencia de las fuentes de NYC Open Data se lee del portal en cada corrida (versión 26c de Borough Boundaries, fecha de última actualización de cada conjunto). En la Entrega 1 estaba escrita a mano y ya había envejecido: el lago decía 26b.
  - El catálogo completo de fuentes también sale en el lago (lago/catalogo.json), y la vista de Fuentes lo lee de ahí.
- Fuentes: 17 catalogadas, 11 integradas, 3 candidatas, 2 descartadas y 1 que no existe (la inventó la IA). Están en lago/catalogo.json y en la hoja 1 del Excel.
- Huecos: no encontramos una fuente oficial y abierta con la historia de cada lugar por evento, ni una de seguridad que no traiga datos de personas. La API del Census (F10) pide llave y la descarga de QuickFacts bloquea los scripts, así que la población sigue transcrita a mano.

### Cómo se rehace

```
cd ingesta
python armar_lago.py
cd ..
python verificacion/verificar.py
```

No hay que instalar nada. El script consulta todas las fuentes y solo escribe el lago si todas respondieron; si una falla (pasó con NYC Open Data y con USGS mientras lo probábamos), reintenta y, si no logra, deja el lago anterior intacto. El 2026-11-02 borramos la carpeta lago, la rehicimos y salió idéntica.

## ¿Se puede usar?

| Fuente | Licencia | Personas | Estado | Condición |
|---|---|---|---|---|
| F01 Borough Boundaries (DCP) | Public data sets shall be made available without any registration requirement, license requirement or restrictions on their use (NYC Administrative Code, 23-502 d) | No | Integrada | Citar la fuente y la versión |
| F02 MTA Subway Stations | So long as you are not doing anything malicious with NYS data, you may use it as you wish, subject to no other requirements (OPEN-NY Terms of Use) | No | Integrada | Ninguna |
| F03 Individual Landmark Sites (LPC) | La de NYC Open Data | Trae dirección y BBL | Integrada | Solo el conteo por borough y los registros de los siete lugares |
| F04 Scenic Landmarks (LPC) | La de NYC Open Data | No | Integrada | Ninguna |
| F05 Designated and Calendared Buildings and Sites (LPC) | La de NYC Open Data | No | Integrada | Solo el Puente de Brooklyn |
| F06 Parks Properties | La de NYC Open Data | No | Integrada | Ninguna |
| F07 QuickFacts (Census Bureau) | Data users who create their own estimates using data from disseminated tables and other data should cite the Census Bureau as the source of the original data only. | Solo conteos por zona | Integrada, transcrita | Citar al Census Bureau |
| F08 USGS Elevation Point Query Service | USGS-authored or produced data and information are considered to be in the U.S. Public Domain | No | Integrada | Ninguna |
| F09 Módulo Locations de la app anterior | Propia del grupo | No | Integrada | Solo IDs y nombres |
| F12 Wikimedia Pageviews API | All Analytics datasets are available under the Creative Commons CC0 dedication. | No | Integrada | Ninguna |
| F13 Wikidata Query Service | All structured data from the main, Property, Lexeme, and EntitySchema namespaces is available under the Creative Commons CC0 License | No | Integrada | Ninguna |
| F10 Census Data API | no declara | Solo conteos por zona | Candidata | Pide llave |
| F11 NOAA Climate Normals | no declara | No | Candidata | Sin términos de uso a la vista |
| F14 The Newest New Yorkers | no declara | Solo conteos por zona | Candidata | Solo página |
| F15 Population by Borough 1950-2040 | La de NYC Open Data | Solo conteos por zona | Descartada | Dato de 2014 |
| F16 NYPD Complaint Data | La de NYC Open Data | Personas identificables | Descartada | No se publica |
| F17 Entradas recientes de la app anterior | no declara | No | No existe | La inventó Lovable |

La página exacta de American Legal con la sección 23-502 responde a los scripts con un desafío de Cloudflare. El texto es el que copiamos en la Entrega 1; falta pegar el enlace exacto (pendiente).

## Verificación

verificacion/verificar.py revisa todo el lago y termina con error si algo falla. Tiene la base del taller (probado es un día, toda fuente con url y licencia, cada cifra con valor, unidad, vigencia y fuente conocida, ningún campo con nombre de dato personal, ningún texto con correo o celular) y le agregamos:

- Que cada columna de las tablas esté descrita en «campos» y cada fuente tenga su día de prueba.
- Entre los nombres de campo prohibidos también están dirección, propietario y BBL, que es lo que decidimos no publicar. Los teléfonos se buscan con el formato de Estados Unidos.
- De dominio: que estén los cinco boroughs con sus códigos; que la suma de su población dé la de la ciudad y la de sus áreas dé el área de la ciudad; que los parques quepan en cada borough; que cada uno de los siete lugares caiga dentro del polígono de su borough; que las fechas de designación estén entre 1965 y hoy; que la distancia al metro esté marcada como PROXY; que el catálogo y el lago digan lo mismo y que F17 no alimente nada; y que en la web no aparezcan el 8,336,000 ni las entradas inventadas de la app anterior.

Hoy pasa sin fallos. Para comprobar que sabe fallar, rompimos a propósito una copia del lago: le subimos mil habitantes a Brooklyn, le pusimos un campo bbl al hospital naval, metimos un correo y un teléfono en una nota, le quitamos la vigencia a la renta y movimos el hospital naval a Times Square. Esta es la salida (solo las líneas que fallaron):

```
FAIL ciudad.json: renta_mediana_bruta con valor, unidad, vigencia y fuente conocida  <- {'valor': 1821, 'unidad': 'dólares al mes', 'fuente': 'F07'}
FAIL lugares.json: toda columna descrita en campos  <- ['bbl']
FAIL lugares.json: ningún campo con nombre de dato personal  <- ['bbl']
FAIL lugares.json: ningún texto con correo o teléfono  <- Dudas: escribir a nombre@ejemplo.com o al 212-555-0100
FAIL boroughs: la suma de su población da la de la ciudad  <- 8585629 contra 8584629
FAIL boroughs: habitantes por estación cuadra con población y estaciones  <- 
FAIL lugares: cada punto cae dentro de su borough (F01)  <- ['LOC-006']

7 fallos
```

El despliegue en Vercel corre la verificación antes de publicar: si falla, no se publica.

## Bitácora de exploración

Lo importante era la herramienta de visualización, así que ahí probamos con los mismos datos. Para los demás tramos dejamos al final una tabla corta con lo que escogimos y por qué.

| Tramo | Herramienta | Qué pidió para empezar | Licencia | Dónde quedan los datos | ¿Se rehace con un comando? | Estado del proyecto | Qué resolvió | Qué no pudo | ¿Quedó? ¿Por qué? |
|---|---|---|---|---|---|---|---|---|---|
| Vistas | Lovable (la app de la Entrega 1) | Una cuenta y una descripción en lenguaje natural | Servicio comercial (no revisamos sus términos a fondo) | Escritos en el código de la app, alojada en lovable.app | No: se regenera conversando | Activo | Una estética que nos gustó y cinco módulos funcionando | No lee el lago. Inventó cifras y entradas (F17) y cinco módulos dan 404 | No. Los datos quedaban en su código y no había forma de mostrar la fuente de cada cifra. Nos quedamos con su estética |
| Vistas | HTML y JavaScript propios con MapLibre GL 4.7.1, en Vercel | Nada que instalar para las vistas; una cuenta de Vercel conectada al repositorio | MapLibre: BSD-3-Clause. Vercel: plan Hobby, solo para uso personal no comercial | En el repositorio (lago/) y en la CDN de Vercel | Sí: la compilación verifica el lago y lo copia a web/ | MapLibre sigue activo; usamos la 4.7.1 aunque ya va en la 6.16.0 (ver bitácora de IA) | Mapa por borough, la procedencia de cada cifra a un clic, teléfono, sin mapa base de terceros | Nos tocó programar cada vista; no hay editor visual | Sí. Ver la sección de abajo |
| Vistas | La misma web en GitHub Pages | Activar Pages en el repositorio | Gratis para repositorios públicos | En el repositorio y en la CDN de GitHub | Solo con una GitHub Action que verifique y copie el lago | Activo | Publicar el mismo sitio sin otra cuenta | No deja poner cabeceras propias ni tiene funciones de servidor | Casi. Ver la sección de abajo |
| Vistas | kepler.gl (demo en kepler.gl/demo, versión 3.3.0-alpha.19), probada el 2026-11-03 con lago/boroughs.geojson y lago/boroughs.json | Nada: abrir la página y arrastrar el archivo, sin cuenta ni llave | Texto del archivo LICENSE del repositorio: «Copyright contributors to the kepler.gl project. Permission is hereby granted, free of charge, to any person obtaining a copy of this software…». Es el texto de permiso de la licencia MIT (el archivo que copiamos no trae el nombre) | En el navegador de quien la usa. Según la propia herramienta: «kepler.gl is a client-side application with no server backend. Data lives only on your machine/browser. No information or map data is sent to any server.» Para compartir un enlace pide una cuenta propia en Dropbox o CARTO | No: el mapa se arma a mano en la interfaz | Activo: la demo mostraba un aviso de la versión 3.1 con DuckDB | Dibujó los cinco boroughs en un par de minutos desde boroughs.geojson y los coloreó por codigo_borough (escala quantile). Los datos no salen del navegador | No leyó boroughs.json: «Can not process uploaded file, unknown file format» (probablemente por el bloque de campos con fuente y vigencia, no lo comprobamos). El geojson solo trae código y nombre, así que el tooltip muestra solo esos dos campos, sin fuente, vigencia ni día de prueba. Coloreó por un código y no por una cifra. Para publicar un enlace hace falta una cuenta de un tercero. Dibuja un mapa base de terceros. No lo probamos en el teléfono | No. Es rápida para explorar los datos, pero no puede mostrar la procedencia de cada cifra, no lee nuestro contrato y publicar exige una cuenta externa |

### Las otras herramientas, en corto

| Tramo | Qué usamos | Por qué esa y no otra |
|---|---|---|
| Ingesta | Python con la biblioteca estándar | No hay nada que instalar y así funcionó en el computador de cada integrante. dlt o Polars sobran para seis archivos pequeños |
| Lago | JSON en una carpeta del repositorio | El lago pesa menos de 200 KB y en JSON se lee y se compara en git. Parquet o DuckDB tendrían sentido con millones de filas |
| Mapa | GeoJSON simplificado en el servidor del portal | La capa pasó de 3,1 MB a unos 120 KB sin escribir un simplificador. PMTiles no hace falta a este tamaño |
| Verificación | Un verificar.py propio | La base del taller ya estaba en Python. Según la guía, en 2026 Soda Core cambió a una licencia que no es abierta y GX Cloud dejó de estar disponible; para este tamaño no necesitábamos ninguna de las dos |
| Protección | Ninguna compuerta, por decisión escrita | Ver la sección de protección |
| Versiones | Git y GitHub | Lo pide la entrega y Vercel publica directo desde ahí |

## Herramienta elegida para las vistas

- Qué necesitábamos mostrar: un mapa de los cinco boroughs, siete lugares con su patrimonio y su metro, y que cada cifra abriera a un clic su fuente, su vigencia y el día de prueba, también en el teléfono.
- Qué teníamos que proteger: nada que esté en el lago, porque lo delicado (direcciones y BBL) nunca entra. Por eso la protección no fue lo que decidió la herramienta. Lo que pesó fue poder mostrar la procedencia de cada número y no depender de un servicio que guarde los datos en su código, como pasó con Lovable.
- Por qué esta: con código propio cada número de la pantalla es un botón que lee su procedencia del mismo archivo del lago, y los textos de las respuestas se arman con los datos. Así ninguna cifra queda escrita a mano. MapLibre dibuja el mapa sin mapa base ni llave, solo con los polígonos de F01.
- Por qué Vercel y no GitHub Pages: las dos son gratis y sirven el mismo sitio. Vercel nos deja correr la verificación antes de cada despliegue (si falla, no se publica), copiar el lago a la web sin tener dos copias en el repositorio y poner cabeceras de seguridad. Además, si algún día entra un dato que sí haya que proteger, tiene funciones de servidor para una compuerta de verdad, como la de Lima. GitHub Pages no tiene nada de eso sin montar una GitHub Action, y aun así no puede proteger nada.
- También probamos kepler.gl con los mismos datos (ver la bitácora de exploración). Sirve para explorar, pero no muestra la procedencia de cada cifra.
- La que casi elegimos: seguir con Lovable, porque ya teníamos la app y nos gustaba cómo se veía. Para que la respuesta fuera otra, Lovable tendría que leer el lago sin copiar las cifras a su código y dejar mostrar la fuente de cada número.

## Protección

- Nivel: abierto, por decisión del grupo. Todas las fuentes integradas son públicas, sus licencias permiten reutilizarlas y ningún dato del lago apunta a una persona. Una clave aquí sería de adorno.
- Qué protegemos, y de quién: a los dueños de casas protegidas, para que nadie arme una lista con sus direcciones. Lo hacemos no guardando esos datos, y la verificación falla si alguien mete una dirección, un BBL, un correo o un teléfono en el lago.
- Pruebas de terminal: como el sistema es abierto, lo esperado es que el sitio y los archivos del lago respondan 200 a cualquiera. El 2026-11-03 corrimos esto contra el enlace publicado y todo dio 200:

```
foreach ($p in "/","/app.js","/estilos.css","/lago/ciudad.json","/lago/boroughs.json","/lago/boroughs.geojson","/lago/lugares.json","/lago/interes.json","/lago/catalogo.json") { "$p " + (curl.exe -s -o NUL -w "%{http_code}" "https://tallerdatosnyc.vercel.app$p") }
/ 200
/app.js 200
/estilos.css 200
/lago/ciudad.json 200
/lago/boroughs.json 200
/lago/boroughs.geojson 200
/lago/lugares.json 200
/lago/interes.json 200
/lago/catalogo.json 200
```
- Revisión de secretos: no usamos ninguna llave. El 2026-11-03 corrimos `git log -p | Select-String -Pattern "clave|secret|password|api_key|token"` sobre todo el historial. Todas las coincidencias son texto o nombres de variables (la palabra «clave» en verificar.py y app.js, el comentario del .gitignore, este README y los enunciados del profesor); ninguna es una llave, una contraseña o un token. El .gitignore deja fuera .env, la carpeta .vercel y la copia del lago dentro de web/.
- Cabeceras: la página trae una política de seguridad de contenido (solo carga scripts, estilos y fuentes del mismo sitio) y Vercel agrega X-Content-Type-Options, X-Frame-Options y Referrer-Policy.

## Nuestra posición

Respondemos una reflexión de «Pensar los datos» (Privacidad: Público no es inocuo) y una de «Pensar la seguridad» (Minimización: El dato más seguro es el que no se guarda), con evidencia de nuestro sistema.

### Datos · Privacidad: «Público no es inocuo»

¿Qué columnas de su lago, cruzadas entre sí o con otra fuente pública, señalan a una persona? Dentro del lago, ninguna. El problema está en una fuente que dejamos por fuera: F03 (Individual Landmark Sites) es pública y trae la dirección y el BBL de 1.532 sitios, muchos de ellos casas donde vive gente. Ni la dirección ni el BBL dicen quién es el dueño, pero si se cruzan con los permisos de la misma comisión (dpm2-m9mq) sale el nombre del propietario. Cada fuente es inocua sola y juntas no. Por eso del patrimonio solo publicamos cuántos landmarks hay en cada borough, y los únicos puntos exactos son los siete lugares, que son monumentos públicos. Para que la decisión no dependa de que alguien se acuerde, la verificación falla si aparece un campo llamado bbl, direccion o propietario; lo probamos rompiendo una copia del lago y lo atrapó.

¿Qué conteo mínimo por zona van a exigir antes de publicar, y por qué ese número? Exigimos mínimo 10 sitios por zona. Un conteo de uno o dos sitios en una zona permitiría señalar una casa concreta; con diez ya no. Hoy el borough con menos landmarks es Queens, con 86, y nuestra zona más pequeña es un borough entero, así que lo cumplimos con holgura. Todavía no está escrito en la verificación; sería una regla fácil de agregar. Lo que no comprobamos es si alguien, con otra fuente, podría llegar a una persona desde estos conteos; con boroughs enteros nos parece muy poco probable.

### Seguridad · Minimización: «El dato más seguro es el que no se guarda»

¿Qué columna de su lago podrían borrar hoy sin que ninguna pregunta del sistema pierda su respuesta? elevacion_referencia_m: no responde ninguna de las cuatro preguntas y la dejamos solo como contexto. Guardar de más también es una promesa de cuidar, aunque aquí el dato no sea delicado. Lo que más nos protege no es una clave sino lo que nunca entró al lago: las direcciones y los BBL de F03, que el script lee y descarta en memoria, y las denuncias de F16, porque cada fila describe a las personas de la denuncia. Por eso el sistema es abierto: no hay nada que valga la pena cuidar con una clave, y una clave de adorno daría la sensación de seguridad sin tenerla.

¿Dónde hay copias de sus datos fuera del repositorio? En varios lugares, y la que más nos preocupa es la de la app anterior de Lovable, que sigue publicada con la población sin año y las entradas inventadas; habría que despublicarla o ponerle un aviso que remita a este sistema. Hay además una copia del lago en Vercel, que es la misma información pública, los clones y el .zip en los computadores de cada integrante, el Excel del diccionario y las conversaciones con la IA donde pegamos salidas de los scripts. Como todo lo que está en el lago es público y no apunta a personas, esas copias no filtran nada, pero si algún día entrara un dato delicado habría que revisar cada una.

## Bitácora de IA

| Tramo | Herramienta | Qué le encargamos | Qué entregó | Qué le corregimos |
|---|---|---|---|---|
| Rastreo (E1) | Claude | Un documento base de la ciudad | NEW_YORK_CITY.md, sin enlaces | Cruzamos las cifras con las fuentes; nombra unos «Queensway Tunnel systems» que no existen |
| Vistas (E1) | Lovable | La interfaz del archivo | Una app con cifras escritas en el código | El Navy Yard como ruina, Hudson Yards en el Upper West Side, 8,336,000 habitantes sin año, cuatro entradas inventadas |
| Ingesta (E1) | Claude | Proponer fuentes y probarlas | Consultas a F01 a F08; F10 pidió llave | Su herramienta no abría F12 ni F13 |
| Ingesta (E2) | Claude Code | Correr el lago en nuestro computador | El lago salió igual salvo las fechas y un cambio real de F06; avisó que Windows escribía los archivos con CRLF | Nada; arregló el fin de línea |
| Ingesta (E2) | Claude Code | Probar F12 y F13 con curl | Respondieron las dos y las integró con su licencia | Nada |
| Permiso (E2) | Claude Code | Copiar las licencias tal como aparecen | Los textos de OPEN-NY, Census y Wikimedia | Puso un enlace a American Legal que no había abierto; lo quitamos y quedó pendiente |
| Contrato (E2) | Claude Code | Revisar la vigencia | Vio que F01 ya iba en la versión 26c y propuso leerla del portal | Nada |
| Ingesta (E2) | Claude Code | Rehacer el lago | Al fallar NYC Open Data y USGS, el lago quedó a medias | Le pedimos que el script escribiera solo con todas las fuentes completas y que reintentara |
| Vistas (E2) | Claude Code | Construir las vistas con MapLibre | Un mapa que salía vacío y un cuadro de procedencia con «null» | Lo vimos en capturas de escritorio y teléfono y se corrigió |
| Vistas (E2) | Claude Code | Escoger la versión de MapLibre | La 4.7.1, de 2024, que tenía en la memoria | La última es la 6.16.0 (2026-10-25). Nos quedamos con la 4.7.1 porque ya está probada, pero queda anotado |
| Vistas (E2) | Claude Code | Escribir las respuestas con los datos | En la P2 agregó que 1965 fue «la primera tanda de designaciones» | No está en el lago; lo quitó al releer |
| Lago (E2) | Claude Code | Quitar los datos de la app anterior | Cambió los puntos de Central Park y Hudson Yards por los de Wikidata | Nada; cambiaron dos distancias al metro |
| Vistas (E2) | Claude | Guiarnos en la prueba de kepler.gl y armar la fila de la bitácora | Una lista de cosas por comprobar (columnas, tooltip, color, unir con boroughs.json, compartir, licencia) y un borrador de la conclusión | Nada que corregir. No pudo abrir la página de GitHub de kepler.gl, así que la licencia y la frase sobre los datos las copiamos nosotros de la herramienta |
| Posición (E2) | Claude | Reescribir las dos reflexiones de «Nuestra posición» respondiendo las preguntas de las láminas Pensar los datos y Pensar la seguridad | Dos textos con evidencia del sistema (F03 cruzada con dpm2-m9mq, columna sobrante, copias fuera del repositorio) y un mínimo de 10 sitios por zona | El número del mínimo lo puso Claude porque el grupo no tenía uno escrito; hay que confirmarlo o cambiarlo. El conteo más bajo (Queens, 86) salió de lago/boroughs.json |
| Terminal (E2) | Claude Code | Probar la conexión | Dejó un comando esperando entrada y la terminal se colgó dos minutos | Lo detuvo |

El detalle de cada fila está en la hoja «3. Bitácora IA» del Excel (docs/entrega2).

## Revisión cruzada

- Tres cifras auditadas por otro grupo: (pendiente)
- Ataque de otro grupo: (pendiente; como el sistema es abierto, la prueba es que no encuentre nada que no debía estar publicado)
- Vueltas atrás en la ruta: de las vistas al contrato, cuando necesitamos la procedencia de cada celda y no solo de las cifras sueltas; de la verificación a la ingesta, cuando el lago quedó a medias; y del permiso a la ingesta, cuando cambiamos los puntos que venían de la app hecha por IA.

## Qué hay en el repositorio

- ingesta/: un script por fuente, el catálogo (catalogo.py), los lugares (lugares_app.py), las cifras transcritas de F07 (declarados.py) y armar_lago.py.
- lago/: ciudad.json, boroughs.json, boroughs.geojson, lugares.json, interes.json y catalogo.json.
- verificacion/verificar.py
- web/: las vistas (index.html, app.js, estilos.css), las tipografías y MapLibre. Al desplegar se le copia lago/.
- vercel.json: la configuración del despliegue.
- docs/: el enunciado, la retroalimentación, lo entregado en la Entrega 1, las plantillas y el Excel actualizado (docs/entrega2).

Para verlo en el computador: copiar el lago a web/lago y servir la carpeta web.

```
mkdir -p web/lago && cp lago/*.json lago/*.geojson web/lago/
python -m http.server 8000 -d web
```
