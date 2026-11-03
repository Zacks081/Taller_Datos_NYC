"""Funciones que usan todos los scripts de ingesta.

Solo biblioteca estándar de Python: no hay que instalar nada.
"""
import datetime
import json
import math
import re
import time
import urllib.error
import urllib.parse
import urllib.request

NYC_OPEN_DATA = "https://data.cityofnewyork.us/resource/"
NY_STATE_DATA = "https://data.ny.gov/resource/"
# Wikimedia pide un User-Agent que diga quién consulta
UA = "taller-datos-nyc/2.0 (curso Topicos de Sistemas de Informacion; https://github.com/Zacks081/Taller_Datos_NYC)"

# Lista cerrada de boroughs. Cada fuente los escribe distinto y aquí se unifican.
BOROUGHS = {
    1: "Manhattan",
    2: "Bronx",
    3: "Brooklyn",
    4: "Queens",
    5: "Staten Island",
}
CODIGOS_FUENTE = {
    # DCP usa 1-5, LPC usa MN/BX/BK/QN/SI, MTA usa M/Bx/Bk/Q/SI y Parks usa M/X/B/Q/R
    "1": 1, "2": 2, "3": 3, "4": 4, "5": 5,
    "MN": 1, "BX": 2, "BK": 3, "QN": 4, "SI": 5,
    "M": 1, "Bx": 2, "Bk": 3, "Q": 4,
    "X": 2, "B": 3, "R": 5,
}


def codigo_borough(valor):
    """Devuelve el código 1-5 de un borough, o None si la fuente no lo trae."""
    if valor is None:
        return None
    return CODIGOS_FUENTE.get(str(valor).strip())


def get_json(url, params=None, headers=None, intentos=3):
    """GET que devuelve JSON. Si el servidor falla (error 5xx o respuesta vacía, como a veces hace
    el servicio de USGS) reintenta, esperando un poco más cada vez."""
    if params:
        url = url + "?" + urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
    req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    for intento in range(1, intentos + 1):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.load(resp)
        except (urllib.error.HTTPError, ValueError) as e:
            if (isinstance(e, urllib.error.HTTPError) and e.code < 500) or intento == intentos:
                raise
            motivo = e.code if isinstance(e, urllib.error.HTTPError) else "respuesta que no es JSON"
            print(f"  {motivo} en {url[:70]}…, reintento {intento} de {intentos - 1}")
            time.sleep(5 * intento)


def metadatos(url_recurso):
    """Fecha de la última actualización de un conjunto de Socrata y, si la dice, su versión.

    url_recurso es la URL de la API (…/resource/xxxx-xxxx.json); los metadatos están en
    …/api/views/xxxx-xxxx.json.
    """
    m = get_json(url_recurso.replace("/resource/", "/api/views/"))
    fecha = datetime.datetime.fromtimestamp(m["rowsUpdatedAt"], datetime.timezone.utc).date().isoformat()
    version = re.search(r"Current version:\s*(\w+)", m.get("description") or "")
    return {"actualizado": fecha, "version": version.group(1) if version else None}


def distancia_m(lat1, lon1, lat2, lon2):
    """Distancia en línea recta (haversine), en metros."""
    r = 6371008.8
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))
