"""F02 · MTA Subway Stations, data.ny.gov, conjunto 39hk-dx4f.

Trae dos cosas: cuántas estaciones hay por borough y cuál es la más cercana a un punto.
Ojo: en Staten Island las estaciones son del Staten Island Railway, no del metro.
"""
from comun import NY_STATE_DATA, codigo_borough, distancia_m, get_json

URL = NY_STATE_DATA + "39hk-dx4f.json"


def estaciones_por_borough():
    filas = get_json(URL, {"$select": "borough,count(*)", "$group": "borough"})
    return {codigo_borough(f["borough"]): int(f["count"]) for f in filas}


def estacion_cercana(lat, lon, radio_m):
    """La estación más cercana dentro de radio_m. Devuelve None si no hay ninguna."""
    filas = get_json(URL, {
        "$select": "stop_name,daytime_routes,gtfs_latitude,gtfs_longitude,borough",
        "$where": f"within_circle(georeference,{lat},{lon},{radio_m})",
    })
    mejor = None
    for f in filas:
        d = distancia_m(lat, lon, float(f["gtfs_latitude"]), float(f["gtfs_longitude"]))
        if mejor is None or d < mejor["distancia_m"]:
            mejor = {"estacion": f["stop_name"], "lineas": f["daytime_routes"],
                     "distancia_m": round(d)}
    return mejor


if __name__ == "__main__":
    print(estaciones_por_borough())
