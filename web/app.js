/* Nueva York · archivo urbano
   Todo lo que se muestra sale de lago/ (lo copia ahí el despliegue). Aquí no hay cifras
   escritas a mano: los textos de las respuestas se arman con los datos del lago, y cada
   número es un botón que abre su fuente, su vigencia y el día en que se probó. */
(function () {
  'use strict';

  const ARCHIVOS = {
    ciudad: 'ciudad.json', boroughs: 'boroughs.json', territorio: 'boroughs.geojson',
    lugares: 'lugares.json', interes: 'interes.json', catalogo: 'catalogo.json'
  };
  const L = {};
  const RAMPA = ['#395d3a', '#487c4a', '#579c5a', '#69bd6d', '#81dd85'];
  const C = { superficie: '#111512', apagado: '#1d201d', borde: '#2a302b', metal: '#515752', senal: '#6ec272', hueso: '#e9e8e2' };

  const NOMBRES = {
    poblacion_estimada: 'Población estimada', poblacion_censo_2020: 'Población en el censo de 2020',
    area_tierra_km2: 'Área de tierra', renta_mediana_bruta: 'Renta mediana bruta',
    elevacion_referencia_m: 'Elevación de referencia', estaciones_metro: 'Estaciones de metro',
    habitantes_por_estacion: 'Habitantes por estación', landmarks_individuales: 'Landmarks individuales',
    area_parques_km2: 'Área de parques', pct_area_parques: 'Parte del área en parques',
    fecha_designacion: 'Fecha de designación', codigo_lpc: 'Número de la LPC', anio_inicio: 'Año de inicio',
    anio_apertura: 'Año de apertura', estacion_cercana: 'Estación más cercana', lineas_estacion: 'Líneas de día',
    distancia_estacion_m: 'Distancia a la estación', vistas_wikipedia_12m: 'Vistas en Wikipedia (12 meses)'
  };
  const METRICAS = ['poblacion_estimada', 'area_tierra_km2', 'estaciones_metro', 'habitantes_por_estacion',
    'landmarks_individuales', 'area_parques_km2', 'pct_area_parques'];
  const CORTOS = { poblacion_estimada: 'Población', area_tierra_km2: 'Área', estaciones_metro: 'Estaciones',
    habitantes_por_estacion: 'Hab. por estación', landmarks_individuales: 'Landmarks',
    area_parques_km2: 'Parques', pct_area_parques: '% en parques' };

  /* ─── Utilidades ─────────────────────────────────────────── */
  function h(tag, attrs, ...hijos) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    hijos.flat(Infinity).forEach(c => { if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c))); });
    return el;
  }
  const SVG = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, ...hijos) {
    const el = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null) el.setAttribute(k, v);
    hijos.flat().forEach(c => { if (c != null) el.append(c instanceof Node ? c : document.createTextNode(String(c))); });
    return el;
  }
  const lista = f => (Array.isArray(f) ? f : f ? [f] : []);

  function num(v) {
    if (v == null) return '—';
    const decimales = Number.isInteger(v) ? 0 : (String(v).split('.')[1] || '').length;
    return new Intl.NumberFormat('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(v);
  }
  function conUnidad(v, unidad) {
    if (v == null) return '—';
    if (unidad === 'km²') return num(v) + ' km²';
    if (unidad === '%') return num(v) + ' %';
    if (unidad === 'dólares al mes') return 'US$ ' + num(v);
    if (/^metros/.test(unidad || '')) return num(v) + ' m';
    if (typeof v === 'number' && !/^año$/.test(unidad || '')) return num(v);
    return String(v);
  }
  function fecha(iso) {
    if (!iso) return '—';
    const [a, m, d] = iso.split('-').map(Number);
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${d} de ${meses[m - 1]} de ${a}`;
  }
  function dms(lat, lon) {
    const f = (x, pos, neg, ancho) => {
      const a = Math.abs(x), g = Math.floor(a), mi = Math.floor((a - g) * 60), se = Math.round(((a - g) * 60 - mi) * 60);
      return `${String(g).padStart(ancho, '0')}°${String(mi).padStart(2, '0')}′${String(se).padStart(2, '0')}″${x >= 0 ? pos : neg}`;
    };
    return `${f(lat, 'N', 'S', 2)} ${f(lon, 'E', 'W', 3)}`;
  }
  function nombreBorough(cod) {
    const f = L.boroughs.filas.find(b => b.codigo_borough === cod);
    return f ? f.nombre_borough : String(cod);
  }
  function nombreLugar(f) {
    return f.nombre_oficial || f.articulo_wikipedia.replace(/_/g, ' ').replace(/\s*\(.*\)$/, '');
  }
  function fuenteDe(id) { return L.catalogo.fuentes.find(f => f.id === id); }

  /* ─── Procedencia: cada número abre de dónde salió ───────── */
  const REG = [];
  function cifra(texto, meta, clase) {
    const i = REG.push(meta) - 1;
    return h('button', { class: 'cifra' + (clase ? ' ' + clase : ''), type: 'button', 'data-reg': i,
      'aria-label': `${texto}. Ver la fuente de ${meta.titulo}` }, texto);
  }
  function metaCifra(clave) {
    const c = L.ciudad.cifras[clave];
    return { titulo: NOMBRES[clave] + ' · ciudad', valor: conUnidad(c.valor, c.unidad), unidad: c.unidad,
      archivo: 'ciudad.json', campo: clave, fuentes: lista(c.fuente), vigencia: c.vigencia,
      calculo: c.calculo, nota: c.nota, aviso: c.aviso, proxy: c.proxy };
  }
  function metaCampo(tema, campo, fila, titulo) {
    const doc = L[tema], c = doc.campos[campo];
    const fuentes = c.fuente === 'grupo' ? [] : c.fuente_por_fila ? [fila[c.fuente_por_fila]] : lista(c.fuente);
    return { titulo: titulo || NOMBRES[campo] || campo, valor: conUnidad(fila[campo], c.unidad), unidad: c.unidad,
      archivo: ARCHIVOS[tema], campo, fuentes, vigencia: c.vigencia, calculo: c.calculo,
      nota: c.nota, aviso: c.aviso, proxy: c.proxy, doc };
  }
  function cifraCampo(tema, campo, fila, titulo) {
    const m = metaCampo(tema, campo, fila, titulo);
    return cifra(m.valor, m);
  }

  function abrirProcedencia(m) {
    const cuerpo = document.getElementById('proc-cuerpo');
    const doc = m.doc || L[Object.keys(ARCHIVOS).find(k => ARCHIVOS[k] === m.archivo)];
    // Todo va dentro de h(): replaceChildren convertiría en texto los null y las listas
    cuerpo.replaceChildren(h('div', {},
      h('p', { class: 'rotulo', id: 'proc-titulo' }, m.titulo, m.proxy ? h('span', { class: 'etiqueta proxy' }, 'Proxy') : null),
      h('p', { class: 'proc-valor' }, m.valor),
      h('p', { class: 'proc-que' }, 'Unidad: ', m.unidad || '—', ' · Archivo del lago: ', h('span', { class: 'mono' }, `lago/${m.archivo} → ${m.campo}`)),
      m.aviso ? h('div', { class: 'aviso' }, h('p', { class: 'rotulo' }, m.proxy ? 'Dato aproximado' : 'Aviso'), m.aviso) : null,
      h('dl', { class: 'datos' },
        h('dt', {}, 'Vigencia'), h('dd', {}, m.vigencia || '—'),
        m.calculo ? [h('dt', {}, 'Cálculo'), h('dd', {}, m.calculo)] : null,
        m.nota ? [h('dt', {}, 'Nota'), h('dd', {}, m.nota)] : null),
      m.fuentes.length ? m.fuentes.map(id => {
        const enArchivo = (doc.fuentes || []).find(f => f.id === id) || {};
        const cat = fuenteDe(id) || {};
        return h('div', { class: 'proc-fuente' },
          h('p', {}, h('span', { class: 'id' }, id), h('strong', {}, cat.nombre || enArchivo.nombre)),
          h('p', { class: 'tenue' }, cat.entidad || ''),
          h('dl', { class: 'datos' },
            h('dt', {}, 'Probada'), h('dd', {}, enArchivo.probado || cat.probado || '—',
              enArchivo.estado === 'declarado' ? ' (declarada: transcrita, no consultada por script)' : ''),
            h('dt', {}, 'Licencia'), h('dd', {}, h('blockquote', {}, cat.licencia || enArchivo.licencia))),
          h('p', {}, h('a', { href: cat.url || enArchivo.url, rel: 'noopener', target: '_blank' }, cat.url || enArchivo.url)),
          cat.donde_licencia ? h('p', {}, 'Licencia tomada de: ', h('a', { href: cat.donde_licencia, rel: 'noopener', target: '_blank' }, cat.donde_licencia)) : null);
      }) : h('p', { class: 'proc-fuente tenue' }, 'Decisión del grupo, no viene de una fuente externa.')));
    document.getElementById('procedencia').showModal();
  }

  /* ─── Tooltip ────────────────────────────────────────────── */
  const tip = document.getElementById('tooltip');
  function mostrarTip(x, y, valor, etiqueta) {
    tip.replaceChildren(h('strong', {}, valor), etiqueta);
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    tip.style.left = Math.min(x + 14, window.innerWidth - r.width - 8) + 'px';
    tip.style.top = Math.max(8, y - r.height - 12) + 'px';
  }
  function ocultarTip() { tip.hidden = true; }
  function conTip(el, valor, etiqueta) {
    el.addEventListener('pointermove', e => mostrarTip(e.clientX, e.clientY, valor, etiqueta));
    el.addEventListener('pointerleave', ocultarTip);
    el.addEventListener('focus', () => { const r = el.getBoundingClientRect(); mostrarTip(r.left, r.top, valor, etiqueta); });
    el.addEventListener('blur', ocultarTip);
    return el;
  }

  /* ─── Piezas comunes ─────────────────────────────────────── */
  function cabeza(titulo, bajada) {
    return h('header', { class: 'modulo-cabeza' }, h('h1', {}, titulo), bajada ? h('p', { class: 'bajada' }, bajada) : null);
  }
  function seccion(num, titulo, ...hijos) {
    return h('section', { class: 'seccion' }, h('h2', {}, num ? h('span', { class: 'num' }, num) : null, titulo), ...hijos);
  }
  /* «Fuente: F07 · vigencia … · probada …», con el ID abriendo la procedencia */
  function credito(meta) {
    const doc = meta.doc || L[Object.keys(ARCHIVOS).find(k => ARCHIVOS[k] === meta.archivo)];
    const probados = meta.fuentes.map(id => ((doc.fuentes || []).find(f => f.id === id) || {}).probado).filter(Boolean);
    // La procedencia del crédito es la del campo, no la de una fila en particular
    const m = { ...meta, titulo: 'Fuente del gráfico', valor: NOMBRES[meta.campo] || meta.campo };
    return h('p', { class: 'credito' }, 'Fuente: ', cifra(meta.fuentes.join(' + ') || 'grupo', m),
      ' · vigencia ', meta.vigencia || '—', probados.length ? ' · probada ' + [...new Set(probados)].join(', ') : '');
  }

  function barras(filas, { valor, etiqueta, meta, clase, alClic }) {
    const max = Math.max(...filas.map(valor));
    return h('div', { class: 'barras', role: 'list' }, filas.map(f => {
      const m = meta(f), v = valor(f);
      const marca = h('span', { class: 'barra-marca' + (clase ? ' ' + clase : '') });
      // proporcional al espacio que queda después de reservar sitio para la cifra
      marca.style.width = `calc((100% - 5.5rem) * ${(v / max).toFixed(4)})`;
      const fila = h('button', { class: 'barra-fila', type: 'button', role: 'listitem',
        'aria-label': `${etiqueta(f)}: ${m.valor}. Ver la fuente`,
        onclick: () => { if (alClic) alClic(f); abrirProcedencia(m); } },
        h('span', { class: 'nombre' }, etiqueta(f)),
        h('span', { class: 'barra-pista' }, marca, h('span', { class: 'barra-valor' }, m.valor)));
      return conTip(fila, m.valor, etiqueta(f));
    }));
  }

  function tablaGemela(cabeceras, filas) {
    return h('details', { class: 'tabla-gemela' }, h('summary', {}, 'Ver como tabla'),
      h('div', { class: 'tabla-env' }, h('table', {},
        h('thead', {}, h('tr', {}, cabeceras.map(c => h('th', { scope: 'col', class: c.num ? 'num' : null }, c.t)))),
        h('tbody', {}, filas.map(f => h('tr', {}, f.map((c, i) => i === 0
          ? h('th', { scope: 'row' }, c) : h('td', { class: cabeceras[i].num ? 'num' : null }, c))))))));
  }

  /* ─── Mapa (MapLibre, sin mapa base: solo los polígonos del lago) ── */
  let mapaActivo = null;
  function caja(geojson) {
    let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
    geojson.features.forEach(f => f.geometry.coordinates.forEach(p => p.forEach(a => a.forEach(([x, y]) => {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }))));
    return [[x0, y0], [x1, y1]];
  }
  /* Se crea en el siguiente cuadro: el contenedor tiene que estar ya en la página,
     porque MapLibre mide su tamaño al crearse. */
  function crearMapa(contenedor) {
    return new Promise(res => requestAnimationFrame(() => res(montarMapa(contenedor))));
  }
  function montarMapa(contenedor) {
    if (mapaActivo) { mapaActivo.remove(); mapaActivo = null; }
    if (!contenedor.isConnected) return Promise.resolve(null);  // ya se cambió de módulo
    try {
      const b = caja(L.territorio);
      const map = new maplibregl.Map({
        container: contenedor, style: { version: 8, sources: {}, layers: [] },
        bounds: b, fitBoundsOptions: { padding: 16 }, maxBounds: [[b[0][0] - .4, b[0][1] - .3], [b[1][0] + .4, b[1][1] + .3]],
        dragRotate: false, pitchWithRotate: false, attributionControl: false
      });
      map.touchZoomRotate.disableRotation();
      map.on('error', e => console.error('Mapa:', e.error && (e.error.message || e.error)));
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new maplibregl.AttributionControl({ compact: true,
        customAttribution: `Límites: F01 (DCP), ${L.territorio.campos.geometry.vigencia} · MapLibre` }));
      mapaActivo = map;
      return new Promise(res => map.on('load', () => res(map)));
    } catch (e) {
      contenedor.replaceChildren(h('div', { class: 'error-carga' },
        'Este navegador no pudo dibujar el mapa (necesita WebGL). La tabla y las barras tienen los mismos datos.'));
      return Promise.resolve(null);
    }
  }
  function colorRampa(t) {
    const x = Math.max(0, Math.min(1, t)) * (RAMPA.length - 1), i = Math.min(Math.floor(x), RAMPA.length - 2), f = x - i;
    const a = RAMPA[i].match(/\w\w/g).map(v => parseInt(v, 16)), b = RAMPA[i + 1].match(/\w\w/g).map(v => parseInt(v, 16));
    return '#' + a.map((v, k) => Math.round(v + (b[k] - v) * f).toString(16).padStart(2, '0')).join('');
  }

  /* ─── 01 Resumen ─────────────────────────────────────────── */
  function vistaResumen() {
    const c = L.ciudad.cifras, punto = c.elevacion_referencia_m.punto;
    const tarjeta = clave => {
      const m = metaCifra(clave);
      return h('div', { class: 'hud tarjeta' }, h('p', { class: 'rotulo' }, NOMBRES[clave]),
        h('span', { class: 'valor' }, cifra(m.valor, m)),
        m.unidad === 'km²' ? null : h('span', { class: 'unidad' }, m.unidad),
        h('p', { class: 'pie-dato' }, `${m.fuentes.join(' + ')} · ${m.vigencia}`));
    };
    const estado = estadoPreguntas();
    return [
      h('div', { class: 'portada' },
        h('div', {}, h('p', { class: 'rotulo' }, 'Archivo raíz // acceso abierto'), h('h1', {}, 'Nueva York'),
          h('p', { class: 'sub' }, 'Archivo urbano · sistema de información')),
        h('p', { class: 'coord' }, dms(punto[0], punto[1]), h('br'), 'Punto de referencia (F08)')),
      h('p', { class: 'bajada prosa', style: null }, 'Para quien llega a Nueva York a vivir, a estudiar o de visita y quiere entender la ciudad por partes: primero los boroughs, después los lugares y cómo llegar a ellos en metro. Cada número subrayado se puede tocar: dice de qué fuente sale, qué periodo cubre y qué día la probamos.'),
      h('div', { class: 'tarjetas' }, ['poblacion_estimada', 'poblacion_censo_2020', 'area_tierra_km2', 'renta_mediana_bruta', 'elevacion_referencia_m'].map(tarjeta)),
      seccion('', 'Preguntas del sistema',
        h('div', { class: 'preguntas-lista' }, estado.map(p => h('a', { class: 'hud pregunta-enlace', href: p.enlace },
          h('p', { class: 'rotulo' }, h('span', {}, p.id), h('span', { class: 'etiqueta ' + p.clase }, p.estado)),
          h('p', {}, p.texto))))),
      seccion('', 'Estado del lago',
        h('div', { class: 'tabla-env' }, h('table', {},
          h('thead', {}, h('tr', {}, ['Archivo', 'Tema', 'Probado', 'Fuentes'].map(t => h('th', { scope: 'col' }, t)))),
          h('tbody', {}, Object.entries(ARCHIVOS).map(([k, archivo]) => h('tr', {},
            h('th', { scope: 'row', class: 'mono' }, 'lago/' + archivo), h('td', {}, L[k].tema), h('td', { class: 'num' }, L[k].probado),
            h('td', { class: 'mono' }, k === 'catalogo' ? `${L[k].fuentes.length} fuentes` : L[k].fuentes.map(f => f.id).join(' ')))))))),
    ];
  }

  function estadoPreguntas() {
    return [
      { id: 'P1', texto: '¿En qué se diferencian los cinco boroughs en población, área, parques, metro y patrimonio protegido?', estado: 'Respondida', clase: 'ok', enlace: '#/boroughs' },
      { id: 'P2', texto: '¿Cuáles de los lugares del archivo son patrimonio protegido y desde cuándo?', estado: 'Respondida', clase: 'ok', enlace: '#/preguntas' },
      { id: 'P3', texto: '¿Qué tan fácil es llegar en metro a cada lugar del archivo?', estado: 'En parte (proxy)', clase: 'parcial', enlace: '#/preguntas' },
      { id: 'P4', texto: '¿Cuáles de los lugares del archivo consulta más la gente en Wikipedia?', estado: 'Respondida', clase: 'ok', enlace: '#/preguntas' }
    ];
  }

  /* ─── 02 Boroughs (P1) ───────────────────────────────────── */
  let metrica = 'poblacion_estimada', boroughSel = 1;
  function vistaBoroughs() {
    const contMapa = h('div', { class: 'mapa', role: 'region', 'aria-label': 'Mapa de los boroughs' });
    const ficha = h('div', { class: 'hud ficha-borough', 'aria-live': 'polite' });
    const leyenda = h('div'), avisoCaja = h('div'), ranking = h('div'), creditoCaja = h('div');
    const chips = METRICAS.map(k => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(k === metrica),
      onclick: () => { metrica = k; chips.forEach((c, i) => c.setAttribute('aria-pressed', String(METRICAS[i] === k))); pintar(); } }, CORTOS[k]));
    const filas = L.boroughs.filas;
    let map = null;

    function pintarFicha() {
      const f = filas.find(b => b.codigo_borough === boroughSel);
      ficha.replaceChildren(h('p', { class: 'rotulo' }, `Borough ${f.codigo_borough} de 5`), h('h3', {}, f.nombre_borough),
        h('dl', { class: 'datos' }, METRICAS.map(k => [h('dt', {}, NOMBRES[k]),
          h('dd', {}, cifraCampo('boroughs', k, f, `${NOMBRES[k]} · ${f.nombre_borough}`),
            L.boroughs.campos[k].aviso ? h('span', { class: 'etiqueta proxy', title: 'Mezcla años: ver aviso' }, 'Aviso') : null)])));
    }
    function pintar() {
      const campo = L.boroughs.campos[metrica], vals = filas.map(f => f[metrica]);
      const min = Math.min(...vals), max = Math.max(...vals);
      const color = v => colorRampa(max === min ? 1 : (v - min) / (max - min));
      const ejemplo = metaCampo('boroughs', metrica, filas[0], NOMBRES[metrica]);
      leyenda.replaceChildren(h('div', { class: 'leyenda' }, h('span', {}, conUnidad(min, campo.unidad)),
        h('span', { class: 'rampa', 'aria-hidden': 'true' }), h('span', {}, conUnidad(max, campo.unidad)),
        h('span', {}, `${NOMBRES[metrica]} (${campo.unidad})`)));
      creditoCaja.replaceChildren(credito(ejemplo));
      avisoCaja.replaceChildren(campo.aviso ? h('div', { class: 'aviso' }, h('p', { class: 'rotulo' }, 'Aviso'), campo.aviso) : '');
      const orden = [...filas].sort((a, b) => b[metrica] - a[metrica]);
      ranking.replaceChildren(barras(orden, { valor: f => f[metrica], etiqueta: f => f.nombre_borough,
        meta: f => metaCampo('boroughs', metrica, f, `${NOMBRES[metrica]} · ${f.nombre_borough}`),
        alClic: f => { boroughSel = f.codigo_borough; pintarFicha(); resaltar(); } }));
      if (map) {
        const datos = { ...L.territorio, features: L.territorio.features.map(ft => {
          const fila = filas.find(b => b.codigo_borough === ft.properties.codigo_borough);
          return { ...ft, properties: { ...ft.properties, color: color(fila[metrica]), valor: fila[metrica] } };
        }) };
        map.getSource('boroughs').setData(datos);
      }
      pintarFicha();
    }
    function resaltar() { if (map) map.setFilter('borough-sel', ['==', ['get', 'codigo_borough'], boroughSel]); }

    crearMapa(contMapa).then(m => {
      map = m;
      if (!map) return;
      map.addSource('boroughs', { type: 'geojson', data: L.territorio });
      map.addLayer({ id: 'borough-relleno', type: 'fill', source: 'boroughs', paint: { 'fill-color': ['coalesce', ['get', 'color'], C.apagado], 'fill-opacity': .92 } });
      map.addLayer({ id: 'borough-borde', type: 'line', source: 'boroughs', paint: { 'line-color': C.superficie, 'line-width': 2 } });
      map.addLayer({ id: 'borough-sel', type: 'line', source: 'boroughs', paint: { 'line-color': C.hueso, 'line-width': 2 }, filter: ['==', ['get', 'codigo_borough'], boroughSel] });
      map.on('mousemove', 'borough-relleno', e => {
        const p = e.features[0].properties;
        map.getCanvas().style.cursor = 'pointer';
        mostrarTip(e.originalEvent.clientX, e.originalEvent.clientY, conUnidad(p.valor, L.boroughs.campos[metrica].unidad), `${p.nombre_borough} · ${NOMBRES[metrica]}`);
      });
      map.on('mouseleave', 'borough-relleno', () => { map.getCanvas().style.cursor = ''; ocultarTip(); });
      map.on('click', 'borough-relleno', e => { boroughSel = e.features[0].properties.codigo_borough; pintarFicha(); resaltar(); });
      pintar();
    });
    pintar();

    const tabla = h('div', { class: 'tabla-env' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Borough'), METRICAS.map(k => h('th', { scope: 'col', class: 'num' }, CORTOS[k])))),
      h('tbody', {}, filas.map(f => h('tr', {}, h('th', { scope: 'row' }, f.nombre_borough),
        METRICAS.map(k => h('td', { class: 'num' }, cifraCampo('boroughs', k, f, `${NOMBRES[k]} · ${f.nombre_borough}`))))))));

    return [
      cabeza('Boroughs', 'P1. ¿En qué se diferencian los cinco boroughs en población, área, parques, metro y patrimonio protegido?'),
      h('div', { class: 'controles', role: 'group', 'aria-label': 'Qué mostrar en el mapa' }, chips),
      avisoCaja,
      h('div', { class: 'rejilla dos' }, h('div', {}, contMapa, leyenda, creditoCaja), ficha),
      seccion('', 'Ordenados de mayor a menor', ranking),
      seccion('', 'La respuesta', h('div', { class: 'prosa' }, respuestaP1())),
      seccion('', 'Los cinco, lado a lado', tabla,
        h('p', { class: 'credito' }, 'Toque cualquier cifra para ver su fuente. Población: F07 · área: F01 · estaciones: F02 · landmarks: F03 · parques: F06.')),
    ];
  }

  function respuestaP1() {
    const f = L.boroughs.filas;
    const mayor = k => f.reduce((a, b) => (b[k] > a[k] ? b : a)), menor = k => f.reduce((a, b) => (b[k] < a[k] ? b : a));
    const c = (fila, k) => cifraCampo('boroughs', k, fila, `${NOMBRES[k]} · ${fila.nombre_borough}`);
    const pob = mayor('poblacion_estimada'), area = mayor('area_tierra_km2'), lm = mayor('landmarks_individuales');
    const totalLm = f.reduce((a, b) => a + b.landmarks_individuales, 0);
    const hpeMin = menor('habitantes_por_estacion'), hpeMax = mayor('habitantes_por_estacion'), par = mayor('pct_area_parques');
    const vigPob = L.boroughs.campos.poblacion_estimada.vigencia;
    return [
      h('p', {}, `${pob.nombre_borough} es el borough con más habitantes (`, c(pob, 'poblacion_estimada'), ` personas en la estimación al ${fecha(vigPob)}) y ${area.nombre_borough} el más extenso (`, c(area, 'area_tierra_km2'), ' de tierra).'),
      h('p', {}, `El patrimonio está muy concentrado: ${lm.nombre_borough} tiene `, c(lm, 'landmarks_individuales'), ` de los ${num(totalLm)} landmarks individuales que la LPC ubica en algún borough. `,
        hpeMin.codigo_borough === lm.codigo_borough ? 'También es donde cada estación de metro reparte menos gente: ' : `${hpeMin.nombre_borough} es donde cada estación de metro reparte menos gente: `,
        c(hpeMin, 'habitantes_por_estacion'), ` habitantes por estación, contra `, c(hpeMax, 'habitantes_por_estacion'), ` en ${hpeMax.nombre_borough}.`),
      h('p', {}, `${par.nombre_borough} es el que tiene más de su área en parques (`, c(par, 'pct_area_parques'), ').'),
      h('div', { class: 'aviso' }, h('p', { class: 'rotulo' }, 'Ojo con habitantes por estación'), L.boroughs.campos.habitantes_por_estacion.aviso)
    ];
  }

  /* ─── 03 Lugares ─────────────────────────────────────────── */
  function vistaLugares() {
    const contMapa = h('div', { class: 'mapa', role: 'region', 'aria-label': 'Mapa de los siete lugares' });
    const tarjetas = {};
    const filas = L.lugares.filas;

    function activar(id) {
      Object.entries(tarjetas).forEach(([k, t]) => t.classList.toggle('activo', k === id));
      document.querySelectorAll('.marcador').forEach(m => m.classList.toggle('activo', m.dataset.id === id));
    }
    crearMapa(contMapa).then(map => {
      if (!map) return;
      map.addSource('boroughs', { type: 'geojson', data: L.territorio });
      map.addLayer({ id: 'borough-relleno', type: 'fill', source: 'boroughs', paint: { 'fill-color': C.apagado } });
      map.addLayer({ id: 'borough-borde', type: 'line', source: 'boroughs', paint: { 'line-color': C.metal, 'line-width': 1 } });
      filas.forEach(f => {
        const el = h('button', { class: 'marcador', type: 'button', 'data-id': f.id_lugar,
          'aria-label': `${f.id_lugar}, ${nombreLugar(f)}` }, f.id_lugar.slice(-2));
        el.addEventListener('click', () => { activar(f.id_lugar); tarjetas[f.id_lugar].scrollIntoView({ behavior: 'smooth', block: 'start' }); });
        conTip(el, nombreLugar(f), f.id_lugar);
        new maplibregl.Marker({ element: el }).setLngLat([f.longitud, f.latitud]).addTo(map);
      });
      map.fitBounds([[Math.min(...filas.map(f => f.longitud)), Math.min(...filas.map(f => f.latitud))],
        [Math.max(...filas.map(f => f.longitud)), Math.max(...filas.map(f => f.latitud))]], { padding: 60, duration: 0 });
    });

    const cards = filas.map(f => {
      const t = h('article', { class: 'hud lugar', id: f.id_lugar.toLowerCase() },
        h('p', { class: 'rotulo' }, `${f.id_lugar} · ${nombreBorough(f.codigo_borough)}`),
        h('h3', {}, nombreLugar(f)),
        h('p', { class: 'antes' }, `En la app anterior: ${f.nombre_en_app}`),
        h('dl', { class: 'datos' },
          h('dt', {}, 'Patrimonio'),
          h('dd', {}, f.fecha_designacion
            ? [`${f.tipo_designacion === 'Escénico' ? 'Landmark escénico' : 'Landmark individual'} desde el `,
              cifra(fecha(f.fecha_designacion), metaCampo('lugares', 'fecha_designacion', f, `Designación · ${nombreLugar(f)}`)),
              ' · ', cifraCampo('lugares', 'codigo_lpc', f, `Número LPC · ${nombreLugar(f)}`)]
            : 'No está designado por la LPC'),
          h('dt', {}, 'Wikidata'),
          h('dd', {}, f.anio_apertura ? ['Abrió en ', cifraCampo('lugares', 'anio_apertura', f, `Apertura · ${nombreLugar(f)}`)]
            : f.anio_inicio ? ['Inicio en ', cifraCampo('lugares', 'anio_inicio', f, `Inicio · ${nombreLugar(f)}`)]
              : h('span', { class: 'tenue' }, 'Sin año de inicio ni de apertura'),
            ' · ', h('a', { href: `https://www.wikidata.org/wiki/${f.wikidata}`, rel: 'noopener', target: '_blank' }, f.wikidata)),
          h('dt', {}, 'Metro'),
          h('dd', {}, f.estacion_cercana ? [f.estacion_cercana, ' (', f.lineas_estacion, ') a ',
            cifraCampo('lugares', 'distancia_estacion_m', f, `Distancia al metro · ${nombreLugar(f)}`),
            h('span', { class: 'etiqueta proxy' }, 'Proxy')] : 'Sin estación en el radio buscado'),
          h('dt', {}, 'Interés'),
          h('dd', {}, cifraCampo('lugares', 'vistas_wikipedia_12m', f, `Vistas en Wikipedia · ${nombreLugar(f)}`), ' vistas en 12 meses',
            chispa(L.interes.series[f.id_lugar], nombreLugar(f)))),
        f.nota ? h('p', { class: 'nota' }, f.nota) : null);
      tarjetas[f.id_lugar] = t;
      return t;
    });

    return [
      cabeza('Lugares', 'Los siete lugares del archivo, amarrados a su registro en la Landmarks Preservation Commission (LPC), a Wikidata y a la estación de metro más cercana.'),
      contMapa,
      h('p', { class: 'credito' }, 'Puntos: F03 y F05 (LPC); Central Park y Hudson Yards, F13 (Wikidata), porque la LPC no les da un punto. Límites: F01.'),
      h('div', { class: 'lugares' }, cards)
    ];
  }

  function chispa(serie, nombre) {
    const pts = serie.puntos, W = 240, H = 34, max = Math.max(...pts.map(p => p[1])), min = Math.min(...pts.map(p => p[1]));
    const x = i => 4 + i * (W - 8) / (pts.length - 1), y = v => H - 5 - (max === min ? 0 : (v - min) / (max - min)) * (H - 10);
    const svg = s('svg', { class: 'chispa', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', role: 'img',
      'aria-label': `Vistas mensuales de ${nombre}, ${serie.vigencia}` },
      s('polyline', { class: 'linea', points: pts.map((p, i) => `${x(i)},${y(p[1])}`).join(' '), 'vector-effect': 'non-scaling-stroke' }));
    const ult = pts.length - 1;
    svg.append(s('circle', { class: 'ultimo', cx: x(ult), cy: y(pts[ult][1]), r: 4, 'vector-effect': 'non-scaling-stroke' }));
    pts.forEach((p, i) => {
      const r = s('rect', { x: x(i) - (W / pts.length) / 2, y: 0, width: W / pts.length, height: H, fill: 'transparent' });
      r.addEventListener('pointermove', e => mostrarTip(e.clientX, e.clientY, num(p[1]) + ' vistas', `${p[0]} · F12`));
      r.addEventListener('pointerleave', ocultarTip);
      svg.append(r);
    });
    return svg;
  }

  /* ─── 04 Preguntas ───────────────────────────────────────── */
  function vistaPreguntas() {
    const f = L.lugares.filas;
    const designados = f.filter(x => x.fecha_designacion).sort((a, b) => a.fecha_designacion.localeCompare(b.fecha_designacion));
    const sinDesignar = f.filter(x => !x.fecha_designacion);
    const primeros = designados.filter(x => x.fecha_designacion === designados[0].fecha_designacion);
    const ultimo = designados[designados.length - 1];
    const brechas = designados.map(x => ({ x, inicio: x.anio_apertura || x.anio_inicio })).filter(o => o.inicio)
      .map(o => Number(o.x.fecha_designacion.slice(0, 4)) - o.inicio);
    const cf = (x, campo, t) => cifra(campo === 'fecha_designacion' ? fecha(x[campo]) : conUnidad(x[campo], L.lugares.campos[campo].unidad),
      metaCampo('lugares', campo, x, `${t} · ${nombreLugar(x)}`));

    const cercanos = [...f].filter(x => x.distancia_estacion_m != null).sort((a, b) => a.distancia_estacion_m - b.distancia_estacion_m);
    const lejano = cercanos[cercanos.length - 1];
    const vistos = [...f].sort((a, b) => b.vistas_wikipedia_12m - a.vistas_wikipedia_12m);
    const periodo = L.lugares.campos.vistas_wikipedia_12m.vigencia;
    const pesas = h('div', { class: 'grafico' });
    requestAnimationFrame(() => graficoPesas(pesas));
    if (window.ResizeObserver) {
      let ancho = 0;
      new ResizeObserver(e => { const w = Math.round(e[0].contentRect.width); if (w && w !== ancho) { ancho = w; graficoPesas(pesas); } }).observe(pesas);
    }

    return [
      cabeza('Preguntas', 'Lo que el sistema responde, lo que responde en parte y lo que queda pendiente.'),
      seccion('P1', '¿En qué se diferencian los cinco boroughs?', h('span', { class: 'etiqueta ok' }, 'Respondida'),
        h('div', { class: 'prosa' }, respuestaP1()), h('p', {}, h('a', { href: '#/boroughs' }, 'Ver el mapa y la tabla de los boroughs →'))),

      seccion('P2', '¿Cuáles de los lugares del archivo son patrimonio protegido y desde cuándo?', h('span', { class: 'etiqueta ok' }, 'Respondida'),
        h('div', { class: 'prosa' },
          h('p', {}, `${designados.length} de los ${f.length} lugares están protegidos por la LPC. Los primeros fueron `,
            primeros.map((x, i) => [i ? ' y ' : '', nombreLugar(x)]), ', el ', cf(primeros[0], 'fecha_designacion', 'Designación'),
            `. El más reciente es ${nombreLugar(ultimo)}, el `, cf(ultimo, 'fecha_designacion', 'Designación'), '. ',
            sinDesignar.map(x => `${nombreLugar(x)} no tiene designación.`).join(' ')),
          brechas.length ? h('p', {}, `Entre la apertura o el inicio de cada lugar (según Wikidata) y su designación pasaron entre ${Math.min(...brechas)} y ${Math.max(...brechas)} años.`) : null),
        h('div', { class: 'hud' }, pesas,
          h('div', { class: 'leyenda' },
            h('span', {}, h('span', { class: 'muestra redonda', 'data-c': 'r2' }), 'Inicio o apertura (Wikidata, F13)'),
            h('span', {}, h('span', { class: 'muestra redonda', 'data-c': 'r5' }), 'Designación (LPC: F03, F04, F05)'))),
        tablaGemela([{ t: 'Lugar' }, { t: 'Inicio o apertura', num: true }, { t: 'Designación' }, { t: 'Número LPC' }, { t: 'Tipo' }],
          f.map(x => [nombreLugar(x), x.anio_apertura || x.anio_inicio || '—', x.fecha_designacion || 'No designado', x.codigo_lpc || '—', x.tipo_designacion || '—']))),

      seccion('P3', '¿Qué tan fácil es llegar en metro a cada lugar?', h('span', { class: 'etiqueta parcial' }, 'En parte'), h('span', { class: 'etiqueta proxy' }, 'Proxy'),
        h('div', { class: 'aviso' }, h('p', { class: 'rotulo' }, 'Dato aproximado'), L.lugares.campos.distancia_estacion_m.aviso),
        h('div', { class: 'prosa' }, h('p', {},
          `En línea recta, ${cercanos.filter(x => x.distancia_estacion_m < 500).length} de los ${cercanos.length} lugares quedan a menos de 500 m de una estación. `,
          `El más lejano es ${nombreLugar(lejano)}, a `, cf(lejano, 'distancia_estacion_m', 'Distancia al metro'), ` de ${lejano.estacion_cercana}. `, lejano.nota || '')),
        h('div', { class: 'hud' }, barras(cercanos, { valor: x => x.distancia_estacion_m, etiqueta: nombreLugar, clase: 'proxy',
          meta: x => metaCampo('lugares', 'distancia_estacion_m', x, `Distancia al metro · ${nombreLugar(x)}`) }),
          credito(metaCampo('lugares', 'distancia_estacion_m', f[0]))),
        tablaGemela([{ t: 'Lugar' }, { t: 'Estación' }, { t: 'Líneas' }, { t: 'Metros en línea recta', num: true }],
          cercanos.map(x => [nombreLugar(x), x.estacion_cercana, x.lineas_estacion, num(x.distancia_estacion_m)]))),

      seccion('P4', '¿Cuáles de los lugares consulta más la gente en Wikipedia?', h('span', { class: 'etiqueta ok' }, 'Respondida'),
        h('div', { class: 'prosa' }, h('p', {},
          `El artículo más consultado es el de ${nombreLugar(vistos[0])}, con `, cf(vistos[0], 'vistas_wikipedia_12m', 'Vistas en Wikipedia'),
          ` vistas de personas entre ${periodo}; el menos consultado, el de ${nombreLugar(vistos[vistos.length - 1])}, con `,
          cf(vistos[vistos.length - 1], 'vistas_wikipedia_12m', 'Vistas en Wikipedia'), '. Se cuentan las visitas al artículo en inglés, sin bots.')),
        h('div', { class: 'hud' }, barras(vistos, { valor: x => x.vistas_wikipedia_12m, etiqueta: nombreLugar,
          meta: x => metaCampo('lugares', 'vistas_wikipedia_12m', x, `Vistas en Wikipedia · ${nombreLugar(x)}`) }),
          credito(metaCampo('lugares', 'vistas_wikipedia_12m', f[0]))),
        tablaGemela([{ t: 'Lugar' }, { t: 'Artículo' }].concat(L.interes.series['LOC-001'].puntos.map(p => ({ t: p[0], num: true }))),
          vistos.map(x => [nombreLugar(x), x.articulo_wikipedia.replace(/_/g, ' ')].concat(L.interes.series[x.id_lugar].puntos.map(p => num(p[1])))))),

      seccion('', 'Lo que queda pendiente', h('div', { class: 'prosa' }, h('ul', {},
        h('li', {}, 'La distancia a pie o en transporte hasta cada lugar. Hoy medimos en línea recta; para la distancia real habría que calcular rutas sobre la red de calles o con los horarios del metro, y no lo hicimos.'),
        h('li', {}, 'La seguridad por borough, que es de lo primero que pregunta quien busca dónde vivir. La fuente de la Policía (F16) trae datos de las personas en cada denuncia; habría que agregarla por distrito antes de usarla.'),
        h('li', {}, 'El clima. Las normales de NOAA (F11) responden, pero no encontramos sus términos de uso.'),
        h('li', {}, 'Bajar del borough al barrio. El mapa llega hasta los cinco boroughs; con las áreas de barrio de Planeación (NTA 2020) se podría ir más abajo, pero no las integramos.'),
        h('li', {}, 'La historia de cada lugar con una fuente por evento. De Wikidata solo usamos el año de inicio o de apertura.'))))
    ];
  }

  function graficoPesas(cont) {
    const filas = L.lugares.filas, ancho = cont.clientWidth || 600;
    if (!ancho) return;
    const izq = Math.min(170, Math.round(ancho * .38)), der = 16, alto = 30, arriba = 24;
    const anioHoy = Number(L.lugares.probado.slice(0, 4));
    const anios = filas.flatMap(f => [f.anio_apertura || f.anio_inicio, f.fecha_designacion && Number(f.fecha_designacion.slice(0, 4))]).filter(Boolean);
    const x0 = Math.floor(Math.min(...anios) / 25) * 25, x1 = Math.ceil(anioHoy / 25) * 25;
    const x = a => izq + (a - x0) * (ancho - izq - der) / (x1 - x0);
    const H = arriba + filas.length * alto + 6;
    const svg = s('svg', { viewBox: `0 0 ${ancho} ${H}`, width: ancho, height: H, role: 'img',
      'aria-label': 'Año de inicio o apertura y año de designación de cada lugar. La tabla de abajo tiene los mismos datos.' });
    for (let a = x0; a <= x1; a += 25) {
      svg.append(s('line', { class: 'rejilla-linea', x1: x(a), x2: x(a), y1: arriba - 6, y2: H }));
      if ((a - x0) % (ancho < 480 ? 50 : 25) === 0) svg.append(s('text', { x: x(a), y: 12, 'text-anchor': 'middle' }, a));
    }
    filas.forEach((f, i) => {
      const y = arriba + i * alto + alto / 2, nombre = nombreLugar(f);
      const corto = nombre.length > izq / 7.2 ? nombre.slice(0, Math.floor(izq / 7.2) - 1) + '…' : nombre;
      svg.append(s('text', { class: 'nombre-fila', x: 0, y: y + 4 }, corto));
      const ini = f.anio_apertura || f.anio_inicio, des = f.fecha_designacion && Number(f.fecha_designacion.slice(0, 4));
      if (ini && des) svg.append(s('line', { class: 'union', x1: x(ini), x2: x(des), y1: y, y2: y }));
      const punto = (anio, color, campo, titulo) => {
        svg.append(s('circle', { cx: x(anio), cy: y, r: 5, fill: color, stroke: C.superficie, 'stroke-width': 2 }));
        const golpe = s('circle', { class: 'golpe', cx: x(anio), cy: y, r: 12, tabindex: 0, role: 'button', 'aria-label': `${titulo} de ${nombre}: ${anio}` });
        const m = metaCampo('lugares', campo, f, `${titulo} · ${nombre}`);
        golpe.addEventListener('click', () => abrirProcedencia(m));
        golpe.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirProcedencia(m); } });
        golpe.addEventListener('pointermove', e => mostrarTip(e.clientX, e.clientY, String(anio), `${titulo} · ${nombre}`));
        golpe.addEventListener('pointerleave', ocultarTip);
        svg.append(golpe);
      };
      if (ini) punto(ini, RAMPA[1], f.anio_apertura ? 'anio_apertura' : 'anio_inicio', f.anio_apertura ? 'Apertura' : 'Inicio');
      if (des) punto(des, RAMPA[4], 'fecha_designacion', 'Designación');
      if (!des) svg.append(s('text', { x: ancho - der, y: y + 4, 'text-anchor': 'end' }, 'sin designación'));
    });
    cont.replaceChildren(svg);
    document.querySelectorAll('.muestra[data-c]').forEach(m => { m.style.background = m.dataset.c === 'r2' ? RAMPA[1] : RAMPA[4]; });
  }

  /* ─── 05 Fuentes ─────────────────────────────────────────── */
  function vistaFuentes() {
    const orden = ['Integrada', 'Candidata', 'Descartada', 'No existe'];
    const clase = { Integrada: 'ok', Candidata: 'pendiente', Descartada: 'parcial', 'No existe': 'malo' };
    const filas = [...L.catalogo.fuentes].sort((a, b) => orden.indexOf(a.estado) - orden.indexOf(b.estado) || a.id.localeCompare(b.id));
    const cuenta = e => L.catalogo.fuentes.filter(f => f.estado === e).length;
    return [
      cabeza('Fuentes', 'Cada cifra del sistema remite a uno de estos IDs. También están las fuentes que no entraron, y por qué.'),
      h('p', { class: 'prosa' }, orden.map(e => `${cuenta(e)} ${e.toLowerCase()}${cuenta(e) === 1 ? '' : (e === 'No existe' ? '' : 's')}`).join(' · '),
        `. Catálogo probado el ${L.catalogo.probado}. La licencia se copia tal como aparece en la fuente; si no dice nada, «no declara».`),
      h('div', { class: 'tabla-env' }, h('table', {},
        h('thead', {}, h('tr', {}, ['ID', 'Fuente', 'Estado', 'Licencia (tal como aparece)', 'Probada', 'Nota'].map(t => h('th', { scope: 'col' }, t)))),
        h('tbody', {}, filas.map(f => h('tr', { id: f.id.toLowerCase() },
          h('th', { scope: 'row', class: 'mono' }, f.id),
          h('td', {}, h('a', { href: f.url, rel: 'noopener', target: '_blank' }, f.nombre), h('br'), h('span', { class: 'tenue' }, f.entidad)),
          h('td', {}, h('span', { class: 'etiqueta ' + clase[f.estado] }, f.estado), h('br'), h('span', { class: 'tenue mono' }, f.acceso)),
          h('td', { class: 'licencia' }, f.licencia, f.donde_licencia ? [h('br'), h('a', { href: f.donde_licencia, rel: 'noopener', target: '_blank' }, 'dónde lo dice')] : null),
          h('td', { class: 'mono num' }, f.probado),
          h('td', { class: 'licencia' }, f.nota))))))
    ];
  }

  /* ─── 06 Acerca ──────────────────────────────────────────── */
  function vistaAcerca() {
    return [
      cabeza('Acerca', 'Quiénes lo hicimos, qué decidimos mostrar y qué no, y cómo se protege.'),
      h('div', { class: 'prosa' },
        seccion('', 'Grupo', h('p', {}, 'Erick Santiago Ochoa Barrueto, Mariana Garcia Zapata y Santiago Vélez Blandón. Tópicos de Sistemas de Información, taller de datos, profesor Santiago Jiménez Londoño.')),
        seccion('', 'Qué decidimos no mostrar',
          h('p', {}, 'Las direcciones y los números de lote (BBL) de los landmarks. La fuente de la LPC (F03) los trae, y cruzados con los permisos de la misma comisión dan el nombre del dueño de cada casa protegida. Por eso del patrimonio solo se publica el conteo por borough, y los únicos puntos exactos son los siete lugares públicos del archivo.'),
          h('p', {}, 'Las denuncias de la Policía (F16), porque cada fila describe a las personas involucradas.')),
        seccion('', 'Cómo se protege',
          h('p', {}, 'El sistema es abierto por decisión del grupo. Todas las fuentes integradas son públicas, sus licencias permiten reutilizarlas y ningún dato del lago apunta a una persona. Una clave aquí sería de adorno. Lo que sí cuidamos es que no haya secretos en el repositorio y que la verificación falle si alguien mete una dirección, un BBL, un correo o un teléfono en el lago.')),
        seccion('', 'Con qué está hecho',
          h('p', {}, 'HTML, CSS y JavaScript sin framework, con MapLibre GL para los mapas, publicado en Vercel. El lago se arma con scripts de Python que solo usan la biblioteca estándar y se revisa con verificacion/verificar.py antes de cada despliegue. El mapa no usa mapa base de terceros: solo los polígonos de F01.'),
          h('p', {}, 'La estética viene de la primera versión del archivo, hecha con Lovable. De esa app no quedó ninguna cifra: sus datos estaban escritos en el código y varios eran inventados.')),
        seccion('', 'Cómo se rehace',
          h('pre', { class: 'tabla-env mono' }, h('code', {}, 'cd ingesta\npython armar_lago.py\ncd ..\npython verificacion/verificar.py'))),
        h('p', {}, h('a', { href: 'https://github.com/Zacks081/Taller_Datos_NYC' }, 'Repositorio con los scripts, el lago y el README de decisiones →')))
    ];
  }

  /* ─── Navegación ─────────────────────────────────────────── */
  const VISTAS = { resumen: vistaResumen, boroughs: vistaBoroughs, lugares: vistaLugares, preguntas: vistaPreguntas, fuentes: vistaFuentes, acerca: vistaAcerca };
  function ir() {
    const modulo = (location.hash.match(/^#\/(\w+)/) || [])[1] || 'resumen';
    const vista = VISTAS[modulo] || vistaResumen;
    if (mapaActivo && modulo !== 'boroughs' && modulo !== 'lugares') { mapaActivo.remove(); mapaActivo = null; }
    REG.length = 0;
    ocultarTip();
    const main = document.getElementById('contenido');
    main.replaceChildren(...vista().flat(Infinity).filter(Boolean));
    document.querySelectorAll('#indice-lista a').forEach(a => {
      if (a.dataset.modulo === modulo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = `${{ resumen: 'Resumen', boroughs: 'Boroughs', lugares: 'Lugares', preguntas: 'Preguntas', fuentes: 'Fuentes', acerca: 'Acerca' }[modulo] || 'Resumen'} · Nueva York, archivo urbano`;
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('.cifra');
    if (b) abrirProcedencia(REG[Number(b.dataset.reg)]);
  });
  const dlg = document.getElementById('procedencia');
  dlg.querySelector('.cerrar').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

  /* ─── Arranque: lee el lago y muestra qué respondió ──────── */
  async function arrancar() {
    const listaEl = document.getElementById('arranque-lista'), capa = document.getElementById('arranque');
    const quitar = () => { capa.classList.add('fuera'); setTimeout(() => capa.remove(), 400); };
    document.getElementById('arranque-saltar').addEventListener('click', quitar);
    const filas = Object.entries(ARCHIVOS).map(([k, archivo]) => {
      const estado = h('span', {}, '…');
      listaEl.append(h('li', {}, h('span', {}, 'lago/' + archivo), estado));
      return fetch('lago/' + archivo, { cache: 'no-cache' })
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(d => { L[k] = d; estado.textContent = 'en línea'; estado.className = 'ok'; })
        .catch(err => { estado.textContent = 'no responde'; estado.className = 'error'; throw new Error(`lago/${archivo}: ${err.message}`); });
    });
    try {
      await Promise.all(filas);
    } catch (err) {
      document.getElementById('estado-lago').textContent = 'Lago incompleto';
      document.getElementById('contenido').replaceChildren(h('div', { class: 'error-carga' },
        h('p', { class: 'rotulo' }, 'No se pudo leer el lago'), String(err.message),
        h('p', {}, 'Sin el lago el sistema no muestra nada: preferimos eso a mostrar cifras sin fuente.')));
      setTimeout(quitar, 1200);
      return;
    }
    const probado = Object.values(L).map(d => d.probado).sort().pop();
    document.getElementById('estado-lago').replaceChildren(h('span', { class: 'solo-ancho' }, 'Lago probado '), probado);
    const p = L.ciudad.cifras.elevacion_referencia_m.punto;
    document.getElementById('coordenadas').textContent = dms(p[0], p[1]);
    ir();
    window.addEventListener('hashchange', ir);
    setTimeout(quitar, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650);
  }
  arrancar();
})();
