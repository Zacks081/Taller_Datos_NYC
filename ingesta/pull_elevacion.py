"""F08 · USGS Elevation Point Query Service (3DEP).

Elevación del punto de referencia que usa la app para la ciudad (cerca de City Hall).
"""
from comun import get_json

URL = "https://epqs.nationalmap.gov/v1/json"
PUNTO = {"lat": 40.7128, "lon": -74.0060}


def elevacion():
    r = get_json(URL, {"x": PUNTO["lon"], "y": PUNTO["lat"], "units": "Meters",
                       "wkid": 4326, "includeDate": "false"})
    return round(float(r["value"]), 1)


if __name__ == "__main__":
    print(elevacion(), "m")
