"""Los siete lugares que mostraba el módulo Locations de la app anterior (F09).

De la app solo se toman los IDs y los nombres; lo demás sale de fuentes externas.
Cada lugar se amarra a un registro oficial de la LPC y a su artículo en Wikipedia.
Esto lo decidimos nosotros, no viene de ninguna fuente:
  - LOC-001 («Lower Financial Core») es una zona, no un sitio. Se amarra a la
    U.S. Custom House de Bowling Green, que está donde quedaba el fuerte que
    describe la app.
  - LOC-002 (Central Park) es landmark escénico; ese conjunto no trae un punto,
    así que se usa la coordenada de Wikidata (F13).
  - LOC-005 (Puente de Brooklyn) une Manhattan y Brooklyn. Se le pone el código 1
    porque el punto que usamos está en la entrada por City Hall, del lado de Manhattan.
  - LOC-007 (Hudson Yards) no tiene designación; también se usa el punto de Wikidata.
    La app lo llamaba «Upper Westside», pero queda en el Far West Side de Manhattan.
Hasta la Entrega 1, Central Park y Hudson Yards usaban las coordenadas de la app, que
las había generado la IA. Desde la Entrega 2 salen de Wikidata.
"""

CONSULTADO = "2026-11-02"  # día en que revisamos los IDs y nombres en la app

LUGARES = [
    {"id_lugar": "LOC-001", "nombre_en_app": "Lower Financial Core", "codigo_borough": 1,
     "fuente": "F03", "lp": "LP-00020", "radio_m": 600,
     "articulo": "Alexander_Hamilton_U.S._Custom_House", "nota": None},
    {"id_lugar": "LOC-002", "nombre_en_app": "Central Park Rectangle", "codigo_borough": 1,
     "fuente": "F04", "lp": "LP-00851", "radio_m": 900,
     "articulo": "Central_Park",
     "nota": "El parque mide unos 4 km de largo: la distancia se mide desde el punto central de Wikidata."},
    {"id_lugar": "LOC-003", "nombre_en_app": "Grand Central Terminus", "codigo_borough": 1,
     "fuente": "F03", "lp": "LP-00266", "radio_m": 400,
     "articulo": "Grand_Central_Terminal", "nota": None},
    {"id_lugar": "LOC-004", "nombre_en_app": "Harbor Liberty Outpost", "codigo_borough": 1,
     "fuente": "F03", "lp": "LP-00931", "radio_m": 3500,
     "articulo": "Statue_of_Liberty",
     "nota": "Está en una isla: desde la estación hay que tomar el ferry."},
    {"id_lugar": "LOC-005", "nombre_en_app": "Brooklyn Bridge Span", "codigo_borough": 1,
     "fuente": "F05", "lp": "LP-00098", "radio_m": 600,
     "articulo": "Brooklyn_Bridge",
     "nota": "Une Manhattan (1) y Brooklyn (3); se usa 1 porque el punto está en la entrada por City Hall."},
    {"id_lugar": "LOC-006", "nombre_en_app": "Navy Yard Industrial Belt", "codigo_borough": 3,
     "fuente": "F03", "lp": "LP-00003", "radio_m": 1500,
     "articulo": "Brooklyn_Naval_Hospital", "nota": None},
    {"id_lugar": "LOC-007", "nombre_en_app": "Upper Westside Rail Yards", "codigo_borough": 1,
     "fuente": "F13", "lp": None, "radio_m": 700,
     "articulo": "Hudson_Yards_(development)",
     "nota": "No está designado por la LPC. Queda en el Far West Side, no en el Upper West Side."},
]
