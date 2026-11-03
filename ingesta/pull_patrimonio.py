"""Landmarks de la Landmarks Preservation Commission (LPC), NYC Open Data.

F03 · Individual Landmark Sites (buis-pvji): conteo por borough y registros puntuales.
F04 · Scenic Landmarks (qexa-qpj6): parques designados, como Central Park.
F05 · Designated and Calendared Buildings and Sites (ncre-qhxs): aquí sí está el
      Puente de Brooklyn, que no aparece en F03.

Del conteo por borough solo se guarda el número: las direcciones y los BBL de los
landmarks no entran al lago (ver la pregunta 5 del documento).
"""
from comun import NYC_OPEN_DATA, codigo_borough, get_json

URL_SITIOS = NYC_OPEN_DATA + "buis-pvji.json"
URL_ESCENICOS = NYC_OPEN_DATA + "qexa-qpj6.json"
URL_DESIGNADOS = NYC_OPEN_DATA + "ncre-qhxs.json"


def fecha_iso(texto):
    """'8/2/1967' o '1974-04-16T00:00:00.000' -> '1967-08-02' / '1974-04-16'."""
    if "T" in texto:
        return texto[:10]
    m, d, a = texto.split("/")
    return f"{a}-{int(m):02d}-{int(d):02d}"


def landmarks_por_borough():
    filas = get_json(URL_SITIOS, {"$select": "borough,count(*)", "$group": "borough"})
    conteo = {}
    for f in filas:
        cod = codigo_borough(f.get("borough"))
        if cod is not None:  # hay registros sin borough; no se pueden ubicar
            conteo[cod] = int(f["count"])
    return conteo


def registro(fuente, lp):
    """Busca un landmark por su número LP en la fuente indicada (F03, F04 o F05).

    «borough» sale como código 1-5 (comun.BOROUGHS).
    """
    if fuente == "F03":
        f = get_json(URL_SITIOS, {"lpc_lpnumb": lp})[0]
        return {"nombre_oficial": f["lpc_name"], "borough": codigo_borough(f["borough"]),
                "fecha": fecha_iso(f["desdate"]), "tipo": "Individual",
                "lat": float(f["latitude"]), "lon": float(f["longitude"])}
    if fuente == "F04":
        f = get_json(URL_ESCENICOS, {"lp_number": lp})[0]
        return {"nombre_oficial": f["scen_lm_na"], "borough": codigo_borough(f["borough"]),
                "fecha": fecha_iso(f["desdate"]), "tipo": "Escénico",
                "lat": None, "lon": None}  # este conjunto no trae punto, solo polígono
    if fuente == "F05":
        filas = get_json(URL_DESIGNADOS, {"lp_number": lp})
        # Un registro por lote; para el puente se toma el punto más al norte
        # del lado de Manhattan, que queda en la entrada por City Hall. Por eso el
        # código es el de Manhattan aunque el puente también esté en Brooklyn.
        con_punto = [f for f in filas if f.get("latitude") and f.get("boroughid") == "MN"]
        f = max(con_punto, key=lambda x: float(x["latitude"]))
        return {"nombre_oficial": f["lm_name"], "borough": codigo_borough(f["boroughid"]),
                "fecha": fecha_iso(f["desdate"]), "tipo": "Individual",
                "lat": float(f["latitude"]), "lon": float(f["longitude"])}
    raise ValueError(fuente)


if __name__ == "__main__":
    print(landmarks_por_borough())
