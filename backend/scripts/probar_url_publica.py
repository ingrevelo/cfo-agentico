"""Pruebas E2E automatizadas contra la URL pública (5 corridas seguidas).

Uso:
    uv run python scripts/probar_url_publica.py
    uv run python scripts/probar_url_publica.py --url https://cfo.pruebassite.com --corridas 5
"""

from __future__ import annotations

import argparse
import sys
import time

import httpx


def correr_flujo_completo(client: httpx.Client, base_url: str, numero: int) -> float:
    inicio = time.perf_counter()

    r = client.get(f"{base_url}/api/salud")
    assert r.status_code == 200 and r.json().get("estado") == "ok", f"/api/salud: {r.text}"

    r = client.get(f"{base_url}/api/reglas")
    assert r.status_code == 200, f"/api/reglas: {r.status_code} {r.text}"

    r = client.post(f"{base_url}/api/ingresos/simular", json={"monto_usd": "1500.00"})
    assert r.status_code in (200, 201), f"/api/ingresos/simular: {r.status_code} {r.text}"
    plan = r.json()
    plan_id = plan["plan_id"]

    r = client.patch(
        f"{base_url}/api/planes/{plan_id}/movimientos/M3",
        json={"monto_usd": "1100.00"},
    )
    assert r.status_code == 200, f"Caso Rojo: {r.status_code} {r.text}"
    rojo = r.json()
    assert any(
        m.get("estado") == "BLOQUEADO" or m.get("decision") == "BLOQUEAR"
        for m in rojo.get("movimientos", [])
    ), f"Caso Rojo no bloqueó: {rojo}"

    r = client.post(f"{base_url}/api/planes/{plan_id}/aprobar")
    assert r.status_code == 200, f"/aprobar: {r.status_code} {r.text}"

    r = client.get(f"{base_url}/api/log")
    assert r.status_code == 200 and isinstance(r.json(), list), f"/api/log: {r.status_code}"

    r = client.post(f"{base_url}/api/demo/reiniciar")
    assert r.status_code == 200, f"/api/demo/reiniciar: {r.status_code} {r.text}"

    duracion = time.perf_counter() - inicio
    print(f"[OK] Corrida {numero}: flujo completo en {duracion:.2f}s (plan_id={plan_id})")
    return duracion


def main() -> int:
    parser = argparse.ArgumentParser(description="Prueba E2E de la demo en la URL pública.")
    parser.add_argument("--url", default="https://cfo.pruebassite.com", help="URL base")
    parser.add_argument("--corridas", type=int, default=5, help="Cantidad de corridas seguidas")
    args = parser.parse_args()

    base_url = args.url.rstrip("/")
    tiempos: list[float] = []
    with httpx.Client(timeout=20.0, follow_redirects=True) as client:
        for idx in range(1, args.corridas + 1):
            try:
                tiempos.append(correr_flujo_completo(client, base_url, idx))
            except Exception as exc:
                print(f"[FALLO] Corrida {idx} contra {base_url}: {exc}", file=sys.stderr)
                return 1

    promedio = sum(tiempos) / len(tiempos)
    print(f"\nResumen: {len(tiempos)}/{args.corridas} corridas OK (promedio {promedio:.2f}s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
