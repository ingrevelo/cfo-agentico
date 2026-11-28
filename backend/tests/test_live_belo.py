"""LiveBeloMCPAdapter contra el MCP simulado, en el mismo proceso (sin red ni cuenta real)."""

from decimal import Decimal

import pytest

from app.adapters.live_belo import ErrorBelo, LiveBeloMCPAdapter
from app.adapters.live_belo import traduccion as tr
from mcp_simulado.servidor import estado, mcp

pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def belo():
    estado.reiniciar()
    async with LiveBeloMCPAdapter(mcp) as adaptador:
        yield adaptador


async def test_saldos_en_monedas_del_dominio(belo):
    saldos = {s.moneda: s for s in await belo.saldos()}
    assert saldos["USDC"].disponible == Decimal("1500.00")
    assert "ARS" in saldos and "ARGt" not in saldos, "ARGt se traduce a ARS"
    assert all(s.live is False for s in saldos.values()), "el simulado nunca es live"


async def test_movimientos_paginados_y_filtrados(belo):
    p = await belo.movimientos(limite=5)
    assert p.total == 43 and len(p.movimientos) == 5 and p.siguiente == 2
    ars = await belo.movimientos(moneda="ARS", limite=100)
    assert ars.movimientos and all(m.moneda == "ARS" for m in ars.movimientos)


async def test_plan_m1_usdc_a_usdt(belo):
    c = await belo.cotizar_conversion("USDT/USDC", Decimal("900"), "USDC", "BUY")
    assert c.debitos == {"USDC": Decimal("900.00")} and c.vence is not None
    r = await belo.confirmar_conversion(c.id)
    assert r.final and r.estado == "success"
    saldos = {s.moneda: s.disponible for s in await belo.saldos()}
    assert saldos["USDC"] == Decimal("600.00") and saldos["USDT"] == Decimal("900.00")


async def test_confirmar_dos_veces_no_duplica(belo):
    c = await belo.cotizar_conversion("USDT/USDC", Decimal("100"), "USDC", "BUY")
    await belo.confirmar_conversion(c.id)
    await belo.confirmar_conversion(c.id)
    saldos = {s.moneda: s.disponible for s in await belo.saldos()}
    assert saldos["USDC"] == Decimal("1400.00")


async def test_conversion_a_pesos_y_aprobacion_manual(belo):
    estado.aprobacion = "manual"
    c = await belo.cotizar_conversion("USDC/ARS", Decimal("450000"), "ARS", "SELL")
    assert c.par == "USDC/ARS" and c.debitos == {"USDC": Decimal("379.75")}
    r = await belo.confirmar_conversion(c.id)
    assert r.estado == "awaiting_approval" and not r.final
    estado.resolver(c.id, aprobar=False)
    t = await belo.transaccion(c.id)
    assert t.estado == "failed" and t.aprobacion == "rejected"


async def test_timeout_se_reconcilia_sin_reintentar(belo):
    estado.fallo = "timeout"
    c = await belo.cotizar_conversion("USDT/USDC", Decimal("10"), "USDC", "BUY")
    with pytest.raises(ErrorBelo) as e:
        await belo.confirmar_conversion(c.id)
    assert e.value.desconocido
    assert (await belo.transaccion(c.id)).estado == "success"


async def test_transferencia_a_alias_en_pesos(belo):
    c = await belo.cotizar_transferencia("sofia.alquiler.demo", "ALIAS", "ARS", Decimal("1000"))
    assert c.tipo == "transfer" and c.debitos == {"ARS": Decimal("1000.00")}


async def test_error_de_tool_con_mensaje(belo):
    with pytest.raises(ErrorBelo, match="pesos argentinos"):
        await belo.cotizar_transferencia("x", "CBU", "USDC", Decimal("10"))


async def test_bovedas_y_redes(belo):
    assert (await belo.bovedas())[0].nombre == "Impuestos"
    redes = {r.tipo_direccion for r in await belo.redes("USDT")}
    assert {"TRON", "POLYGON"} <= redes


async def test_dinero_real_bloqueado_sin_permiso(monkeypatch):
    monkeypatch.delenv("BELO_PERMITIR_MOVER", raising=False)
    adaptador = LiveBeloMCPAdapter("https://b2b.belo.app/mcp")
    assert adaptador.es_belo_real
    with pytest.raises(ErrorBelo, match="desactivado"):
        await adaptador.confirmar_conversion("cualquiera")


async def test_usd_no_existe_en_belo(belo):
    with pytest.raises(ErrorBelo, match="USDC o USDT"):
        await belo.cotizar_conversion("USD/ARS", Decimal("10"), "USD", "SELL")


def test_traduccion_de_monedas_y_pares():
    assert tr.moneda_a_belo("ARS") == "ARGt" and tr.moneda_desde_belo("ARGt") == "ARS"
    assert tr.par_a_belo("USDT/ARS") == "USDT/ARGt" and tr.par_desde_belo("USDC/ARGt") == "USDC/ARS"
