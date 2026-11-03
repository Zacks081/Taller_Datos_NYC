"""F12 · Wikimedia Pageviews API.

Vistas mensuales del artículo de cada lugar en en.wikipedia, hechas por personas
(agente «user», sin bots), en los últimos doce meses completos antes de la corrida.
"""
import datetime
import urllib.parse

from comun import get_json

URL = "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/"


def ventana(hoy):
    """Los doce meses completos anteriores al mes de hoy, como (AAAAMMDD, AAAAMMDD)."""
    fin = hoy.replace(day=1) - datetime.timedelta(days=1)  # último día del mes pasado
    mes = fin.month - 11                                     # once meses antes, sin pasar por días
    inicio = datetime.date(fin.year + (mes - 1) // 12, (mes - 1) % 12 + 1, 1)
    return inicio.strftime("%Y%m%d"), fin.strftime("%Y%m%d")


def mensuales(articulo, desde, hasta):
    titulo = urllib.parse.quote(articulo, safe="")
    url = f"{URL}en.wikipedia/all-access/user/{titulo}/monthly/{desde}/{hasta}"
    items = get_json(url)["items"]
    return [[i["timestamp"][:4] + "-" + i["timestamp"][4:6], i["views"]] for i in items]


if __name__ == "__main__":
    d, h = ventana(datetime.date.today())
    print(d, h, mensuales("Brooklyn_Bridge", d, h))
