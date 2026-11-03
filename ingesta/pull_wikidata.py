"""F13 · Wikidata Query Service (SPARQL).

Para cada lugar, a partir de su artículo en en.wikipedia:
  - el elemento de Wikidata (Q…),
  - el año de inicio (P571, «inception») y el de apertura oficial (P1619), si los tiene,
  - su coordenada (P625), que se usa solo cuando la LPC no trae punto.
Wikidata guarda muchas fechas con precisión de año (1886-01-01 quiere decir «1886»),
por eso solo se guarda el año.
"""
from comun import get_json

URL = "https://query.wikidata.org/sparql"

CONSULTA = """
SELECT ?articulo ?item ?inicio ?apertura ?coord WHERE {
  VALUES ?articulo { %s }
  ?articulo schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> .
  OPTIONAL { ?item wdt:P571 ?inicio }
  OPTIONAL { ?item wdt:P1619 ?apertura }
  OPTIONAL { ?item wdt:P625 ?coord }
}"""


def _anio(valor):
    return int(valor[:4]) if valor else None


def datos(articulos):
    """articulos: títulos de en.wikipedia con guion bajo. Devuelve {título: datos}."""
    valores = " ".join(f"<https://en.wikipedia.org/wiki/{a}>" for a in articulos)
    r = get_json(URL, {"query": CONSULTA % valores}, {"Accept": "application/sparql-results+json"})
    salida = {}
    for b in r["results"]["bindings"]:
        titulo = b["articulo"]["value"].rsplit("/wiki/", 1)[1]
        anterior = salida.get(titulo, {})
        lon = lat = None
        if "coord" in b:  # «Point(lon lat)»
            lon, lat = (float(x) for x in b["coord"]["value"][6:-1].split())
        # Si un dato tiene varios valores, Wikidata devuelve una fila por combinación:
        # se queda el año más antiguo.
        inicios = [x for x in (anterior.get("anio_inicio"), _anio(b.get("inicio", {}).get("value"))) if x]
        aperturas = [x for x in (anterior.get("anio_apertura"), _anio(b.get("apertura", {}).get("value"))) if x]
        salida[titulo] = {
            "wikidata": b["item"]["value"].rsplit("/", 1)[1],
            "anio_inicio": min(inicios) if inicios else None,
            "anio_apertura": min(aperturas) if aperturas else None,
            "lat": anterior.get("lat") or (round(lat, 7) if lat is not None else None),
            "lon": anterior.get("lon") or (round(lon, 7) if lon is not None else None),
        }
    faltan = set(articulos) - set(salida)
    if faltan:
        raise SystemExit(f"Wikidata no encontró estos artículos: {sorted(faltan)}")
    return salida


if __name__ == "__main__":
    from lugares_app import LUGARES
    for t, d in datos([l["articulo"] for l in LUGARES]).items():
        print(t, d)
