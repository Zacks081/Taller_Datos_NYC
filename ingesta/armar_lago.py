"""Arma el lago completo. Se corre desde la carpeta ingesta/:

    python armar_lago.py

Borra y vuelve a escribir lo que hay en lago/:
  ciudad.json       cifras de la ciudad (módulo Resumen)
  boroughs.json     una fila por borough (pregunta 1)
  boroughs.geojson  polígonos de los boroughs para el mapa
  lugares.json      los siete lugares del archivo (preguntas 2, 3 y 4)
  interes.json      vistas mensuales en Wikipedia de cada lugar (pregunta 4)
  catalogo.json     todas las fuentes del rastreo, entren o no al lago

Forma del contrato: cada archivo trae tema, probado (día de la corrida) y fuentes, y
cada cifra o columna trae unidad, vigencia y fuente (un ID del catálogo o una lista de IDs).
"""
import datetime
import json
import pathlib

import catalogo
import declarados
import lugares_app
import pull_elevacion
import pull_metro
import pull_parques
import pull_patrimonio
import pull_territorio
import pull_vistas
import pull_wikidata
from comun import BOROUGHS, metadatos

LAGO = pathlib.Path(__file__).resolve().parent.parent / "lago"
HOY = datetime.date.today().isoformat()

# Día de prueba de las fuentes que no se consultan en cada corrida
PROBADO_FIJO = {"F07": declarados.CONSULTADO, "F09": lugares_app.CONSULTADO}


def fuente(i):
    f = catalogo.POR_ID[i]
    acceso = "vivo" if f["acceso"] == "vivo" else "declarado"
    probado = HOY if acceso == "vivo" and f["estado"] == "Integrada" else PROBADO_FIJO.get(i, f["probado"])
    return {"id": i, "nombre": f["nombre"], "entidad": f["entidad"], "url": f["url"],
            "licencia": f["licencia"], "estado": acceso, "probado": probado}


def fuentes(*ids):
    return [fuente(i) for i in ids]


def escribir(nombre, contenido):
    ruta = LAGO / nombre
    # La capa del mapa va compacta: con sangría cada coordenada ocupa una línea y pesa el triple
    texto = (json.dumps(contenido, ensure_ascii=False, separators=(",", ":")) if nombre.endswith(".geojson")
             else json.dumps(contenido, ensure_ascii=False, indent=1))
    # newline="\n": en Windows write_text escribiría CRLF y git vería todo el archivo cambiado
    ruta.write_text(texto + "\n", encoding="utf-8", newline="\n")
    print("escrito", ruta.relative_to(LAGO.parent))


def armar_ciudad(areas, meta):
    return {
        "tema": "ciudad",
        "probado": HOY,
        "fuentes": fuentes("F01", "F07", "F08"),
        "cifras": {
            "poblacion_estimada": {"valor": declarados.CIUDAD["poblacion_estimada"],
                                   "unidad": "personas", "vigencia": "2025-07-01", "fuente": "F07"},
            "poblacion_censo_2020": {"valor": declarados.CIUDAD["poblacion_censo_2020"],
                                     "unidad": "personas", "vigencia": "2020-04-01", "fuente": "F07"},
            "area_tierra_km2": {"valor": round(sum(areas.values()), 1), "unidad": "km²",
                                "vigencia": f"versión {meta['F01']['version']}", "fuente": "F01",
                                "calculo": "Suma del área de tierra de los cinco boroughs, sin el agua"},
            "renta_mediana_bruta": {"valor": declarados.CIUDAD["renta_mediana_bruta"],
                                    "unidad": "dólares al mes", "vigencia": "2020-2024", "fuente": "F07"},
            "elevacion_referencia_m": {"valor": pull_elevacion.elevacion(),
                                       "unidad": "metros sobre el nivel del mar", "vigencia": HOY,
                                       "fuente": "F08", "punto": [pull_elevacion.PUNTO["lat"], pull_elevacion.PUNTO["lon"]],
                                       "nota": "Un punto cerca de City Hall, en el modelo 3DEP vigente el día de la consulta"},
        },
    }


def armar_boroughs(areas, meta):
    estaciones = pull_metro.estaciones_por_borough()
    landmarks = pull_patrimonio.landmarks_por_borough()
    parques = pull_parques.area_por_borough()
    filas = []
    for cod, nombre in BOROUGHS.items():
        pob = declarados.POBLACION_BOROUGH[cod]
        filas.append({
            "codigo_borough": cod,
            "nombre_borough": nombre,
            "poblacion_estimada": pob,
            "area_tierra_km2": areas[cod],
            "estaciones_metro": estaciones[cod],
            "habitantes_por_estacion": round(pob / estaciones[cod]),
            "landmarks_individuales": landmarks[cod],
            "area_parques_km2": parques[cod],
            "pct_area_parques": round(100 * parques[cod] / areas[cod], 1),
        })
    version = f"versión {meta['F01']['version']}"
    metro, lpc, parks = meta["F02"]["actualizado"], meta["F03"]["actualizado"], meta["F06"]["actualizado"]
    return {
        "tema": "boroughs",
        "probado": HOY,
        "fuentes": fuentes("F01", "F02", "F03", "F06", "F07"),
        "campos": {
            "codigo_borough": {"unidad": "código", "vigencia": version, "fuente": "F01",
                               "nota": "1 Manhattan, 2 Bronx, 3 Brooklyn, 4 Queens, 5 Staten Island"},
            "nombre_borough": {"unidad": "texto", "vigencia": version, "fuente": "F01"},
            "poblacion_estimada": {"unidad": "personas", "vigencia": "2025-07-01", "fuente": "F07"},
            "area_tierra_km2": {"unidad": "km²", "vigencia": version, "fuente": "F01"},
            "estaciones_metro": {"unidad": "estaciones", "vigencia": metro, "fuente": "F02",
                                 "nota": "En Staten Island son estaciones del Staten Island Railway"},
            "habitantes_por_estacion": {
                "unidad": "personas por estación", "vigencia": f"población 2025-07-01; estaciones {metro}",
                "fuente": ["F07", "F02"], "calculo": "Población estimada dividida entre estaciones de metro",
                "aviso": ("Mezcla la población estimada a julio de 2025 con las estaciones vigentes en 2026. "
                          "Sirve para comparar boroughs entre sí, no es una cifra oficial.")},
            "landmarks_individuales": {"unidad": "sitios designados", "vigencia": lpc, "fuente": "F03",
                                       "nota": "Los registros sin borough quedan fuera. No se guardan direcciones ni BBL"},
            "area_parques_km2": {"unidad": "km²", "vigencia": parks, "fuente": "F06",
                                 "nota": "Propiedades de NYC Parks no retiradas, incluidas canchas y plazoletas"},
            "pct_area_parques": {"unidad": "%", "vigencia": f"parques {parks}; territorio {version}",
                                 "fuente": ["F06", "F01"], "calculo": "Área de parques dividida entre área de tierra"},
        },
        "filas": filas,
    }


def armar_lugares(meta, wiki, vistas):
    filas = []
    for l in lugares_app.LUGARES:
        w = wiki[l["articulo"]]
        if l["lp"]:
            r = pull_patrimonio.registro(l["fuente"], l["lp"])
            if r["borough"] != l["codigo_borough"]:
                raise SystemExit(f"{l['id_lugar']}: la LPC dice borough {r['borough']} y lugares_app {l['codigo_borough']}")
        else:  # sin designación
            r = {"nombre_oficial": None, "fecha": None, "tipo": None, "lat": None, "lon": None}
        if r["lat"] is not None:
            lat, lon, origen = r["lat"], r["lon"], l["fuente"]
        else:
            lat, lon, origen = w["lat"], w["lon"], "F13"
        cerca = pull_metro.estacion_cercana(lat, lon, l["radio_m"])
        filas.append({
            "id_lugar": l["id_lugar"],
            "nombre_en_app": l["nombre_en_app"],
            "nombre_oficial": r["nombre_oficial"],
            "codigo_borough": l["codigo_borough"],
            "latitud": lat,
            "longitud": lon,
            "origen_punto": origen,
            "codigo_lpc": l["lp"],
            "fecha_designacion": r["fecha"],
            "tipo_designacion": r["tipo"],
            "fuente_registro": l["fuente"],
            "wikidata": w["wikidata"],
            "articulo_wikipedia": l["articulo"],
            "anio_inicio": w["anio_inicio"],
            "anio_apertura": w["anio_apertura"],
            "estacion_cercana": cerca["estacion"] if cerca else None,
            "lineas_estacion": cerca["lineas"] if cerca else None,
            "distancia_estacion_m": cerca["distancia_m"] if cerca else None,
            "vistas_wikipedia_12m": sum(v for _, v in vistas[l["id_lugar"]]["puntos"]),
            "nota": l["nota"],
        })
    lpc = "; ".join(f"{i} {meta[i]['actualizado']}" for i in ("F03", "F04", "F05"))
    metro = meta["F02"]["actualizado"]
    periodo = vistas["periodo"]
    return {
        "tema": "lugares",
        "probado": HOY,
        "fuentes": fuentes("F02", "F03", "F04", "F05", "F09", "F12", "F13"),
        "campos": {
            "id_lugar": {"unidad": "código", "vigencia": lugares_app.CONSULTADO, "fuente": "F09"},
            "nombre_en_app": {"unidad": "texto", "vigencia": lugares_app.CONSULTADO, "fuente": "F09"},
            "nombre_oficial": {"unidad": "texto", "vigencia": lpc, "fuente": ["F03", "F04", "F05"],
                               "fuente_por_fila": "fuente_registro"},
            "codigo_borough": {"unidad": "código", "vigencia": lpc, "fuente": ["F03", "F04", "F05"],
                               "fuente_por_fila": "fuente_registro",
                               "nota": "Hudson Yards no está en la LPC: su punto cae dentro de Manhattan en F01"},
            "latitud": {"unidad": "grados (WGS84)", "vigencia": lpc, "fuente": ["F03", "F05", "F13"],
                        "fuente_por_fila": "origen_punto"},
            "longitud": {"unidad": "grados (WGS84)", "vigencia": lpc, "fuente": ["F03", "F05", "F13"],
                         "fuente_por_fila": "origen_punto"},
            "origen_punto": {"unidad": "ID de fuente", "fuente": "grupo",
                             "nota": "Si la LPC no trae punto, se usa la coordenada de Wikidata (F13)"},
            "codigo_lpc": {"unidad": "código", "vigencia": lpc, "fuente": ["F03", "F04", "F05"],
                           "fuente_por_fila": "fuente_registro"},
            "fecha_designacion": {"unidad": "fecha", "vigencia": lpc, "fuente": ["F03", "F04", "F05"],
                                  "fuente_por_fila": "fuente_registro"},
            "tipo_designacion": {"unidad": "texto", "vigencia": lpc, "fuente": ["F03", "F04", "F05"],
                                 "fuente_por_fila": "fuente_registro"},
            "fuente_registro": {"unidad": "ID de fuente", "fuente": "grupo",
                                "nota": "Amarre decidido por el grupo en lugares_app.py"},
            "wikidata": {"unidad": "código", "vigencia": HOY, "fuente": "F13"},
            "articulo_wikipedia": {"unidad": "texto", "fuente": "grupo",
                                   "nota": "Artículo de en.wikipedia escogido por el grupo para cada lugar"},
            "anio_inicio": {"unidad": "año", "vigencia": HOY, "fuente": "F13", "nota": "Propiedad P571 (inception)"},
            "anio_apertura": {"unidad": "año", "vigencia": HOY, "fuente": "F13",
                              "nota": "Propiedad P1619 (fecha de apertura oficial)"},
            "estacion_cercana": {"unidad": "texto", "vigencia": metro, "fuente": "F02"},
            "lineas_estacion": {"unidad": "texto", "vigencia": metro, "fuente": "F02"},
            "distancia_estacion_m": {"unidad": "metros en línea recta", "vigencia": metro, "fuente": "F02",
                                     "calculo": "Haversine entre el punto del lugar y la estación más cercana",
                                     "proxy": True,
                                     "aviso": "Es distancia en línea recta, no a pie: aproxima qué tan cerca queda el metro"},
            "vistas_wikipedia_12m": {"unidad": "vistas de personas", "vigencia": periodo, "fuente": "F12",
                                     "calculo": "Suma de los doce meses de interes.json"},
            "nota": {"unidad": "texto", "fuente": "grupo"},
        },
        "filas": filas,
    }


def leer_vistas(hoy):
    desde, hasta = pull_vistas.ventana(hoy)
    periodo = f"{desde[:4]}-{desde[4:6]} a {hasta[:4]}-{hasta[4:6]}"
    series = {}
    for l in lugares_app.LUGARES:
        series[l["id_lugar"]] = {"unidad": "vistas de personas", "vigencia": periodo, "fuente": "F12",
                                 "articulo": l["articulo"],
                                 "puntos": pull_vistas.mensuales(l["articulo"], desde, hasta)}
    return series, periodo


def armar_interes(series):
    return {"tema": "interes", "probado": HOY, "fuentes": fuentes("F12"), "series": series}


def armar_territorio(meta):
    return {
        "type": "FeatureCollection",
        "tema": "territorio",
        "probado": HOY,
        "fuentes": fuentes("F01"),
        "campos": {"geometry": {"unidad": "grados (WGS84)", "vigencia": f"versión {meta['F01']['version']}",
                                "fuente": "F01",
                                "calculo": f"Simplificada en el portal con tolerancia de {pull_territorio.TOLERANCIA} grados"}},
        "features": pull_territorio.geometria(),
    }


def armar_catalogo():
    filas = []
    for f in catalogo.FUENTES:
        fila = dict(f)
        fila["probado"] = fuente(f["id"])["probado"] if f["estado"] == "Integrada" else f["probado"]
        filas.append(fila)
    return {"tema": "catalogo", "probado": HOY, "fuentes": filas}


if __name__ == "__main__":
    LAGO.mkdir(exist_ok=True)
    meta = {"F01": metadatos(pull_territorio.URL), "F02": metadatos(pull_metro.URL),
            "F03": metadatos(pull_patrimonio.URL_SITIOS), "F04": metadatos(pull_patrimonio.URL_ESCENICOS),
            "F05": metadatos(pull_patrimonio.URL_DESIGNADOS), "F06": metadatos(pull_parques.URL)}
    areas = pull_territorio.cargar()
    wiki = pull_wikidata.datos([l["articulo"] for l in lugares_app.LUGARES])
    series, periodo = leer_vistas(datetime.date.today())
    # Todo se arma en memoria primero: si una fuente falla, el lago anterior queda intacto
    archivos = {
        "ciudad.json": armar_ciudad(areas, meta),
        "boroughs.json": armar_boroughs(areas, meta),
        "boroughs.geojson": armar_territorio(meta),
        "lugares.json": armar_lugares(meta, wiki, {**series, "periodo": periodo}),
        "interes.json": armar_interes(series),
        "catalogo.json": armar_catalogo(),
    }
    for nombre, contenido in archivos.items():
        escribir(nombre, contenido)
