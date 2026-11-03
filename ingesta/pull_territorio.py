"""F01 · Borough Boundaries (DCP), NYC Open Data, conjunto gthc-hcne.

Límites de los boroughs sin las áreas de agua.
- cargar(): el área de cada borough. shape_area viene en pies cuadrados (unidades de la
  proyección EPSG:2263, pie de EE. UU.).
- geometria(): los polígonos en WGS84 para el mapa. El portal los simplifica en el servidor
  (simplify_preserve_topology, tolerancia de 0,0002 grados, unos 20 m) y aquí se redondean
  a cinco decimales (alrededor de un metro). Así la capa pesa unos 100 KB y no 3 MB.
"""
from comun import NYC_OPEN_DATA, codigo_borough, get_json

URL = NYC_OPEN_DATA + "gthc-hcne.json"
URL_GEOJSON = NYC_OPEN_DATA + "gthc-hcne.geojson"
PIE2_A_M2 = 0.09290341161  # pie cuadrado de EE. UU. a metro cuadrado
TOLERANCIA = 0.0002


def cargar():
    filas = get_json(URL, {"$select": "borocode,boroname,shape_area"})
    areas = {}
    for f in filas:
        cod = codigo_borough(f["borocode"])
        areas[cod] = round(float(f["shape_area"]) * PIE2_A_M2 / 1_000_000, 2)
    return areas


def _redondear(anillo):
    puntos = []
    for lon, lat in anillo:
        p = [round(lon, 5), round(lat, 5)]
        if not puntos or p != puntos[-1]:
            puntos.append(p)
    return puntos


def geometria():
    capa = get_json(URL_GEOJSON, {
        "$select": f"borocode,boroname,simplify_preserve_topology(the_geom,{TOLERANCIA}) as the_geom"})
    rasgos = []
    for f in capa["features"]:
        poligonos = []
        for poligono in f["geometry"]["coordinates"]:
            anillos = [_redondear(a) for a in poligono]
            anillos = [a for a in anillos if len(a) >= 4]  # un anillo cerrado necesita 4 puntos
            if anillos:
                poligonos.append(anillos)
        cod = codigo_borough(f["properties"]["borocode"])
        rasgos.append({"type": "Feature",
                       "properties": {"codigo_borough": cod, "nombre_borough": f["properties"]["boroname"]},
                       "geometry": {"type": "MultiPolygon", "coordinates": poligonos}})
    return sorted(rasgos, key=lambda r: r["properties"]["codigo_borough"])


if __name__ == "__main__":
    for cod, km2 in sorted(cargar().items()):
        print(cod, km2, "km²")
