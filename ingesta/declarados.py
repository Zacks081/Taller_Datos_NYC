"""F07 · Census Bureau QuickFacts. Cifras transcritas a mano.

La API del Census (F10) pide llave, y QuickFacts solo muestra las cifras en la página.
La descarga en CSV de QuickFacts responde a los scripts con un desafío de Cloudflare
(probado el 2026-11-02), y eso no se esquiva. Por eso los valores se copian de la
página con la fecha de consulta.

Páginas consultadas el 2026-10-06:
  https://www.census.gov/quickfacts/fact/table/newyorkcitynewyork/PST045225
  https://www.census.gov/quickfacts/fact/table/bronxcountynewyork/PST045225
  https://www.census.gov/quickfacts/fact/table/kingscountynewyork/PST045225
  https://www.census.gov/quickfacts/fact/table/newyorkcountynewyork/PST045225
  https://www.census.gov/quickfacts/fact/table/queenscountynewyork/PST045225
  https://www.census.gov/quickfacts/fact/table/richmondcountynewyork/PST045225
"""

CONSULTADO = "2026-10-06"

CIUDAD = {
    "poblacion_estimada": 8584629,     # Population estimates, July 1, 2025, (V2025)
    "poblacion_censo_2020": 8804190,   # Population, Census, April 1, 2020
    "renta_mediana_bruta": 1821,       # Median gross rent, 2020-2024
}

# Código de borough (1-5) -> estimación al 1 de julio de 2025 (V2025)
POBLACION_BOROUGH = {
    1: 1664862,  # New York County (Manhattan)
    2: 1406332,  # Bronx County
    3: 2653963,  # Kings County (Brooklyn)
    4: 2358182,  # Queens County
    5: 501290,   # Richmond County (Staten Island)
}

# Revisión: la suma de los boroughs debe dar la cifra de la ciudad
assert sum(POBLACION_BOROUGH.values()) == CIUDAD["poblacion_estimada"]
