#!/usr/bin/env python3
"""Verificación antes de publicar: con un solo FAIL no se despliega.

Se corre desde la raíz del repositorio:

    python verificacion/verificar.py                 revisa lago/
    python verificacion/verificar.py copia/del/lago  revisa otra carpeta (para romperla a propósito)

La primera parte es la verificación base del taller: el contrato y los datos personales.
La segunda son las comprobaciones de dominio de Nueva York.
Si una comprobación falla, se corrige el dato o el script de ingesta, no la comprobación.
"""
import datetime
import glob
import json
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
LAGO = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / "lago"
WEB = RAIZ / "web"

fallos = 0
# Correos, teléfonos de EE. UU. con separadores (212-555-0100, (212) 555 0100) y celulares colombianos
PII = re.compile(r"[\w.+-]+@[\w-]+\.[a-z]{2,}"
                 r"|(?<!\d)(?:\+1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?!\d)"
                 r"|(?<!\d)3\d{9}(?!\d)", re.I)
# Además de los del taller: dirección, propietario y BBL, que es lo que decidimos no publicar (pregunta 5)
CAMPOS_PERSONALES = re.compile(r"cedula|documento_identidad|telefono|phone|celular|correo|email|ssn"
                               r"|propietario|owner|direccion|address|(^|_)bbl($|_)", re.I)
DIA = re.compile(r"\d{4}-\d{2}-\d{2}")


def check(nombre, ok, detalle=""):
    global fallos
    print(("PASS " if ok else "FAIL ") + nombre + ("" if ok else f"  <- {detalle}"))
    fallos += 0 if ok else 1


def recorre(x, clave=""):
    if isinstance(x, dict):
        for k, v in x.items():
            yield k, None
            yield from recorre(v, k)
    elif isinstance(x, list):
        for v in x:
            yield from recorre(v, clave)
    else:
        yield clave, x


def lista(fuente):
    return fuente if isinstance(fuente, list) else [fuente]


# ─── 1. Verificación base: el contrato y los datos personales ─────────────────
lago = {}
for ruta in sorted(glob.glob(str(LAGO / "*.json")) + glob.glob(str(LAGO / "*.geojson"))):
    nombre = pathlib.Path(ruta).name
    try:
        doc = json.load(open(ruta, encoding="utf-8"))
    except ValueError as e:
        check(f"{nombre}: es JSON válido", False, e)
        continue
    lago[nombre] = doc
    fuentes = doc.get("fuentes", [])
    ids = {f.get("id") for f in fuentes}
    check(f"{nombre}: probado es un día", bool(DIA.fullmatch(str(doc.get("probado")))), doc.get("probado"))
    check(f"{nombre}: toda fuente con url y licencia",
          bool(fuentes) and all(f.get("url") and f.get("licencia") for f in fuentes),
          [f.get("id") for f in fuentes if not (f.get("url") and f.get("licencia"))])
    check(f"{nombre}: toda fuente con su día de prueba",
          all(DIA.fullmatch(str(f.get("probado"))) for f in fuentes),
          [f.get("id") for f in fuentes if not DIA.fullmatch(str(f.get("probado")))])
    for clave, c in doc.get("cifras", {}).items():
        completa = (c.get("valor") is not None and c.get("unidad") and c.get("vigencia")
                    and all(i in ids for i in lista(c.get("fuente"))))
        check(f"{nombre}: {clave} con valor, unidad, vigencia y fuente conocida", completa, c)
    campos = doc.get("campos", {})
    for clave, c in campos.items():
        grupo = c.get("fuente") == "grupo"
        completo = c.get("unidad") and (grupo or (c.get("vigencia") and all(i in ids for i in lista(c.get("fuente")))))
        check(f"{nombre}: campo {clave} con unidad, vigencia y fuente conocida", bool(completo), c)
    if "filas" in doc:
        columnas = {k for fila in doc["filas"] for k in fila}
        check(f"{nombre}: toda columna descrita en campos", columnas <= set(campos), sorted(columnas - set(campos)))
    for clave, s in doc.get("series", {}).items():
        bien = (s.get("unidad") and s.get("vigencia") and s.get("fuente") in ids and s.get("puntos")
                and all(re.fullmatch(r"\d{4}-\d{2}", str(p[0])) and isinstance(p[1], int) and p[1] >= 0
                        for p in s["puntos"]))
        check(f"{nombre}: serie {clave} con unidad, vigencia, fuente y puntos válidos", bool(bien), clave)
    pares = list(recorre(doc))
    sospechosos = sorted({k for k, _ in pares if CAMPOS_PERSONALES.search(k)})
    check(f"{nombre}: ningún campo con nombre de dato personal", not sospechosos, sospechosos)
    hallado = next((v for _, v in pares if isinstance(v, str) and PII.search(v)), None)
    check(f"{nombre}: ningún texto con correo o teléfono", hallado is None, hallado)


# ─── 2. Comprobaciones de dominio: Nueva York ─────────────────────────────────
def dentro(lon, lat, multipoligono):
    """Punto en polígono (rayo hacia el este), con huecos."""
    def en_anillo(anillo):
        adentro = False
        for (x1, y1), (x2, y2) in zip(anillo, anillo[1:]):
            if (y1 > lat) != (y2 > lat) and lon < x1 + (lat - y1) * (x2 - x1) / (y2 - y1):
                adentro = not adentro
        return adentro
    return any(en_anillo(p[0]) and not any(en_anillo(h) for h in p[1:]) for p in multipoligono)


faltan = {"ciudad.json", "boroughs.json", "boroughs.geojson", "lugares.json", "interes.json", "catalogo.json"} - set(lago)
check("están los seis archivos del lago", not faltan, sorted(faltan))
if faltan:
    print(f"\n{fallos + 1} fallos")
    sys.exit(1)

ciudad, boroughs, territorio = lago["ciudad.json"], lago["boroughs.json"], lago["boroughs.geojson"]
lugares, interes, cat = lago["lugares.json"], lago["interes.json"], lago["catalogo.json"]
CERRADA = {1: "Manhattan", 2: "Bronx", 3: "Brooklyn", 4: "Queens", 5: "Staten Island"}

# El catálogo y el lago dicen lo mismo
por_id = {f["id"]: f for f in cat["fuentes"]}
check("catálogo: IDs sin repetir", len(por_id) == len(cat["fuentes"]))
usadas = {f["id"] for n, d in lago.items() if n != "catalogo.json" for f in d["fuentes"]}
check("catálogo: toda fuente usada en el lago está en el catálogo como integrada",
      all(por_id.get(i, {}).get("estado") == "Integrada" for i in usadas),
      sorted(i for i in usadas if por_id.get(i, {}).get("estado") != "Integrada"))
check("catálogo: ninguna fuente integrada con licencia sin declarar",
      all(f["licencia"].strip().lower() not in ("", "no declara") for f in cat["fuentes"] if f["estado"] == "Integrada"))
check("catálogo: la fuente inventada (F17) no alimenta ninguna cifra", "F17" not in usadas)

# Boroughs: los cinco, con la lista cerrada
filas = boroughs["filas"]
check("boroughs: son cinco, con códigos 1 a 5 y sus nombres",
      {f["codigo_borough"]: f["nombre_borough"] for f in filas} == CERRADA and len(filas) == 5,
      [(f["codigo_borough"], f["nombre_borough"]) for f in filas])
pob = ciudad["cifras"]["poblacion_estimada"]["valor"]
suma = sum(f["poblacion_estimada"] for f in filas)
check("boroughs: la suma de su población da la de la ciudad", suma == pob, f"{suma} contra {pob}")
check("ciudad: población en un rango sensato (7 a 10 millones)", 7_000_000 < pob < 10_000_000, pob)
check("boroughs: áreas positivas", all(f["area_tierra_km2"] > 0 for f in filas))
area = ciudad["cifras"]["area_tierra_km2"]["valor"]
suma_area = sum(f["area_tierra_km2"] for f in filas)
check("boroughs: la suma de sus áreas da la de la ciudad", abs(suma_area - area) <= 0.1, f"{suma_area} contra {area}")
check("boroughs: los parques caben en el borough",
      all(0 <= f["area_parques_km2"] <= f["area_tierra_km2"] for f in filas))
check("boroughs: el porcentaje de parques cuadra con las áreas",
      all(abs(100 * f["area_parques_km2"] / f["area_tierra_km2"] - f["pct_area_parques"]) <= 0.1 for f in filas))
check("boroughs: habitantes por estación cuadra con población y estaciones",
      all(f["estaciones_metro"] > 0 and f["habitantes_por_estacion"] == round(f["poblacion_estimada"] / f["estaciones_metro"])
          for f in filas))
check("boroughs: habitantes por estación avisa que mezcla años",
      bool(boroughs["campos"]["habitantes_por_estacion"].get("aviso")))
# Conteo mínimo por zona (reflexión «Público no es inocuo»): con menos de 10 sitios en una zona
# se podría señalar una casa concreta, así que no se publica.
MINIMO_POR_ZONA = 10
check(f"boroughs: cada zona tiene al menos {MINIMO_POR_ZONA} landmarks antes de publicar el conteo",
      all(f["landmarks_individuales"] >= MINIMO_POR_ZONA for f in filas),
      [(f["nombre_borough"], f["landmarks_individuales"]) for f in filas if f["landmarks_individuales"] < MINIMO_POR_ZONA])

# Territorio: cinco polígonos en WGS84 alrededor de Nueva York
poligonos = {r["properties"]["codigo_borough"]: r["geometry"]["coordinates"] for r in territorio["features"]}
check("territorio: cinco polígonos con códigos 1 a 5", set(poligonos) == set(CERRADA))
coords = [p for mp in poligonos.values() for pol in mp for anillo in pol for p in anillo]
check("territorio: coordenadas WGS84 alrededor de Nueva York",
      bool(coords) and all(-74.3 < lon < -73.6 and 40.4 < lat < 41.0 for lon, lat in coords))

# Lugares
filas_l = lugares["filas"]
check("lugares: son siete, de LOC-001 a LOC-007", [f["id_lugar"] for f in filas_l] == [f"LOC-00{i}" for i in range(1, 8)])
check("lugares: código de borough de 1 a 5", all(f["codigo_borough"] in CERRADA for f in filas_l),
      [f["codigo_borough"] for f in filas_l])
fuera = [f["id_lugar"] for f in filas_l
         if not dentro(f["longitud"], f["latitud"], poligonos.get(f["codigo_borough"], []))]
check("lugares: cada punto cae dentro de su borough (F01)", not fuera, fuera)
hoy = lugares["probado"]
malas = [f["id_lugar"] for f in filas_l if f["fecha_designacion"] is not None
         and not ("1965-04-19" <= f["fecha_designacion"] <= hoy)]
check("lugares: fechas de designación entre la creación de la LPC (1965) y hoy", not malas, malas)
check("lugares: los designados traen número LP-#####",
      all(re.fullmatch(r"LP-\d{5}", f["codigo_lpc"] or "") for f in filas_l if f["fecha_designacion"]))
check("lugares: distancias al metro positivas y marcadas como PROXY",
      all((f["distancia_estacion_m"] or 0) >= 0 for f in filas_l)
      and lugares["campos"]["distancia_estacion_m"].get("proxy") is True)
anio = datetime.date.fromisoformat(hoy).year
check("lugares: años de Wikidata entre 1600 y hoy",
      all(1600 <= a <= anio for f in filas_l for a in (f["anio_inicio"], f["anio_apertura"]) if a is not None))

# Interés: una serie por lugar, que cuadra con el total de lugares.json
series = interes["series"]
check("interés: una serie de doce meses por lugar",
      set(series) == {f["id_lugar"] for f in filas_l} and all(len(s["puntos"]) == 12 for s in series.values()))
check("interés: el total de doce meses cuadra con lugares.json",
      all(f["vistas_wikipedia_12m"] == sum(v for _, v in series[f["id_lugar"]]["puntos"]) for f in filas_l))

# La web no repite lo que inventó la app anterior
INVENTADO = ["8,336,000", "8.336.000", "8336000", "signal-system", "decay survey", "INDEX INTEGRITY", "783.8", "783,8"]
textos = {p.name: p.read_text(encoding="utf-8") for p in WEB.glob("*") if p.suffix in (".html", ".js", ".css")}
encontrados = sorted({(n, x) for n, t in textos.items() for x in INVENTADO if x in t})
check("web: no aparecen las cifras ni las entradas inventadas de la app anterior",
      bool(textos) and not encontrados, encontrados or "no hay archivos en web/")

print(f"\n{fallos} fallos")
sys.exit(1 if fallos else 0)
