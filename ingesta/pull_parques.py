"""F06 · Parks Properties (NYC Parks), NYC Open Data, conjunto enfh-gkve.

Suma las hectáreas de las propiedades de Parks por borough (solo las no retiradas).
La fuente da acres; se pasan a km².
"""
from comun import NYC_OPEN_DATA, codigo_borough, get_json

URL = NYC_OPEN_DATA + "enfh-gkve.json"
ACRE_A_KM2 = 0.00404685642


def area_por_borough():
    filas = get_json(URL, {"$select": "borough,sum(acres)", "$where": "retired=false",
                           "$group": "borough"})
    return {codigo_borough(f["borough"]): round(float(f["sum_acres"]) * ACRE_A_KM2, 2)
            for f in filas}


if __name__ == "__main__":
    print(area_por_borough())
