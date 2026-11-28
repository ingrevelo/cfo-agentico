// Backend de mentira ("mock"): implementa CfoApi con estado en memoria, latencia,
// idempotencia y MCP Log. Es el ÚNICO archivo que importa los JSON de datos.
// Nada de esto llama a Belo: cuando exista la API real, este archivo se borra.
import { PERFILADO } from '../../data/perfilado';
import { PERFILES } from '../../data/perfiles';
import pymeDemo from '../../data/pyme-demo.json';
import sofiaDemo from '../../data/sofia-demo.json';
import { formatearArs, formatearFx, formatearUsd } from '../../formato';
import type { CfoApi } from '../CfoApi';
import type {
  ConfigDemo,
  DatosDemo,
  EnlaceBelo,
  EntradaLog,
  Estado,
  Movimiento,
  PerfilId,
  Plan,
  PropuestaPerfilado,
  Reglas,
  ResultadoAprobacion,
  ResultadoEdicion,
  ResultadoJuez,
  Saldos,
  Sesion,
} from '../tipos';
import * as dom from './dominio';
import { Registro } from './registro';

const DATOS: Record<PerfilId, DatosDemo> = {
  sofia: sofiaDemo as DatosDemo,
  pyme: pymeDemo as DatosDemo,
};

/** Código de la demo. En la versión real lo manda Belo por correo (D13). */
export const CODIGO_DEMO = '123456';
/** Cotización del escenario "empeora": (1150 - 1185) / 1185 = -2,95%, fuera de la banda. */
const FX_EMPEORA = 1150;

const clonar = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export class MockCfoApi implements CfoApi {
  private perfil_id: PerfilId = 'sofia';
  private datos: DatosDemo = clonar(DATOS.sofia);
  private reglas: Reglas = this.reglasDesdeDatos();
  private propuestas: PropuestaPerfilado[] = [];
  private plan: Plan | null = null;
  private registro = new Registro();
  private config: ConfigDemo = { escenario_fx: 'estable', inyectar_timeout: false };
  private fx_actual = this.datos.fx_demo.USD_ARS;
  /** Idempotencia: decisiones del juez por clave+monto, planes aprobados y pasos ejecutados. */
  private evaluaciones = new Map<string, ResultadoJuez>();
  private aprobados = new Set<string>();
  private ejecutados = new Set<string>();
  private timeout_usado = false;

  // ---------------------------------------------------------------- sesión

  async iniciarSesionDemo(perfil_id: PerfilId): Promise<Sesion> {
    this.perfil_id = perfil_id;
    this.datos = clonar(DATOS[perfil_id]);
    this.reglas = this.reglasDesdeDatos();
    this.propuestas = clonar(PERFILADO[perfil_id].propuestas);
    this.plan = null;
    this.fx_actual = this.datos.fx_demo.USD_ARS;
    this.config = { escenario_fx: 'estable', inyectar_timeout: false };
    this.evaluaciones.clear();
    this.aprobados.clear();
    this.ejecutados.clear();
    this.timeout_usado = false;
    this.registro.limpiar();
    await this.pausa();
    this.registro.agregar({
      paso: 'sesión',
      tool: 'auth.sign_in',
      regla: 'Entrar a la demo',
      estado: 'Completado',
      monto: '—',
    });
    return {
      perfil_id,
      user_id: this.datos.user_id,
      perfil: clonar(this.datos.profile),
      saldos: clonar(this.datos.balances),
      fx: this.fx_actual,
    };
  }

  // ---------------------------------------------------------------- reglas

  async obtenerReglas(): Promise<Reglas> {
    await this.pausa();
    return clonar(this.reglas);
  }

  async guardarReglas(reglas: Reglas): Promise<Reglas> {
    await this.pausa();
    this.reglas = clonar(reglas);
    return clonar(this.reglas);
  }

  // -------------------------------------------------------------- perfilado

  async correrPerfilado(): Promise<PropuestaPerfilado[]> {
    await this.pausa();
    this.registro.agregar({
      paso: 'perfilado',
      tool: 'account.activity',
      regla: 'Modo sombra: leer el historial',
      estado: 'Completado',
      monto: '—',
    });
    // Ojo (T12): correr el perfilado NO cambia las reglas. Solo propone.
    return clonar(this.propuestas);
  }

  async resolverPropuesta(id: string, accion: 'confirmar' | 'descartar'): Promise<Reglas> {
    await this.pausa();
    const propuesta = this.propuestas.find((p) => p.id === id);
    if (!propuesta) throw new Error('Esa propuesta no existe.');
    propuesta.estado = accion === 'confirmar' ? 'confirmada' : 'descartada';
    if (propuesta.vencimiento_id) {
      if (accion === 'confirmar') {
        const due = this.reglas.dues.find((d) => d.id === propuesta.vencimiento_id);
        if (due) due.origen = 'perfilado';
      } else {
        this.reglas.dues = this.reglas.dues.filter((d) => d.id !== propuesta.vencimiento_id);
      }
    }
    return clonar(this.reglas);
  }

  // ------------------------------------------------------------------ plan

  async simularIngreso(): Promise<Plan | null> {
    await this.pausa();
    for (const tool of ['account.balances', 'account.yields', 'account.activity'] as const) {
      this.registro.agregar({
        paso: 'lecturas',
        tool,
        regla: 'Leer la cuenta antes de proponer',
        estado: 'Completado',
        monto: '—',
      });
    }
    this.registro.agregar({
      paso: 'lecturas',
      tool: 'exchange.fx',
      regla: 'Cotización del plan',
      estado: 'Completado',
      monto: 'USD→ARS ' + formatearFx(this.datos.fx_demo.USD_ARS),
    });

    const plan = dom.calcularPlan(this.datosVigentes(), this.datos.balances.USD, {
      textos: PERFILES[this.perfil_id].copy.textos_plan,
    });
    if (!plan) return null;
    this.plan = plan;
    this.fx_actual = plan.fx;
    for (const m of plan.movimientos) this.juzgar(m);
    return this.planParaAfuera();
  }

  async obtenerPlan(plan_id: string): Promise<Plan> {
    await this.pausa();
    return this.planParaAfuera(plan_id);
  }

  async editarMovimiento(
    plan_id: string,
    paso: string,
    monto_usd: number,
  ): Promise<ResultadoEdicion> {
    const plan = this.exigirPlan(plan_id);
    const original = plan.movimientos.find((m) => m.paso === paso);
    if (!original) throw new Error('Ese movimiento no está en el plan.');

    const candidato: Movimiento = {
      ...original,
      monto_usd,
      monto_ars: monto_usd * this.fx_actual,
      fx: this.fx_actual,
    };
    const juez = this.juzgar(candidato);

    if (juez.decision === 'BLOQUEAR') {
      // El plan NO se toca y no se llama a ninguna tool de escritura (T07).
      this.registro.agregar({
        paso,
        tool: null,
        regla: 'Colchón mínimo: intento bloqueado',
        estado: 'Bloqueado',
        monto: formatearUsd(monto_usd),
      });
      await this.pausa();
      return { plan: this.planParaAfuera(), juez };
    }

    this.plan = this.recalcular(plan, candidato);
    this.registro.agregar({
      paso,
      tool: null,
      regla: 'Editar el plan (revisado por el juez)',
      estado: 'Propuesto',
      monto: formatearUsd(monto_usd),
    });
    await this.pausa();
    return { plan: this.planParaAfuera(), juez };
  }

  // -------------------------------------------------------- aprobación (1)

  async aprobarPlan(plan_id: string): Promise<ResultadoAprobacion> {
    const plan = this.exigirPlan(plan_id);
    // Esto corre ANTES de cualquier await: dos clics o dos llamadas en paralelo
    // producen una sola aprobación (T06). El botón deshabilitado es solo ayuda visual.
    //
    // Lo que manda es si quedan movimientos en Propuesto, no si el plan se aprobó alguna
    // vez: si una conversión se retuvo y se volvió a proponer, esa propuesta nueva
    // necesita su propio OK (docs/caso-de-prueba.md §4.1).
    const repetido = !plan.movimientos.some((m) => m.estado === 'Propuesto');
    if (!repetido) {
      this.aprobados.add(plan_id);
      this.plan = {
        ...plan,
        movimientos: plan.movimientos.map((m) =>
          m.estado === 'Propuesto' ? dom.transicionar(m, 'Aprobado') : m,
        ),
      };
      this.registro.agregar({
        paso: plan_id,
        tool: null,
        regla: 'Aprobación en CFO Agéntico',
        estado: 'Aprobado',
        monto: 'plan completo',
      });
      this.completarAlcancia();
    }
    await this.pausa();
    return { plan: this.planParaAfuera(), repetido };
  }

  // -------------------------------------------------------- aprobación (2)

  async obtenerEnlaceBelo(plan_id: string, paso: string): Promise<EnlaceBelo> {
    await this.pausa();
    const mov = this.exigirMovimiento(plan_id, paso);
    return {
      paso: mov.paso,
      destino:
        mov.tipo === 'conversion_a_pesos'
          ? 'Tus pesos en Belo'
          : 'Tu saldo en ' + mov.moneda_destino + ', dentro de Belo',
      monto:
        mov.tipo === 'conversion_a_pesos' && mov.monto_ars
          ? formatearUsd(mov.monto_usd) + ' → ' + formatearArs(mov.monto_ars)
          : formatearUsd(mov.monto_usd),
      comision: 'USD 0,50 (simulada)',
      vence_en_minutos: 15,
      simulado: true,
    };
  }

  async confirmarEnlaceBelo(plan_id: string, paso: string, codigo: string): Promise<Plan> {
    const mov = this.exigirMovimiento(plan_id, paso);
    if (codigo.trim() !== CODIGO_DEMO) {
      await this.pausa();
      throw new Error('El código no coincide. Para la demo es 123456. No se ejecutó nada.');
    }
    if (this.ejecutados.has(mov.clave)) {
      await this.pausa();
      return this.planParaAfuera();
    }
    this.ejecutados.add(mov.clave);
    const monto = formatearUsd(mov.monto_usd);

    this.registro.agregar({
      paso: mov.paso,
      tool: 'transaction.approve',
      regla: 'Aprobación en Belo con código',
      estado: 'Aprobado',
      monto,
    });
    if (mov.estado === 'Aprobado') this.mover(mov.paso, 'Ejecutando');

    const conTimeout = this.config.inyectar_timeout && !this.timeout_usado;
    this.registro.agregar({
      paso: mov.paso,
      tool: 'ramp.fiat_crypto',
      regla: 'Ejecutar con la referencia ' + mov.clave,
      estado: conTimeout ? 'Desconocido' : 'Completado',
      monto,
    });
    if (conTimeout) {
      // Un timeout no se reintenta a ciegas: se reconcilia (T05). ramp se llamó UNA vez.
      this.timeout_usado = true;
      this.mover(mov.paso, 'Desconocido');
      this.registro.agregar({
        paso: mov.paso,
        tool: 'account.activity',
        regla: 'Reconciliar la referencia ' + mov.clave,
        estado: 'Completado',
        monto,
      });
    }
    this.mover(mov.paso, 'Completado');
    await this.pausa();
    return this.planParaAfuera();
  }

  // ------------------------------------------------------------------ demo

  async avanzarDemo(_destino: 'jueves'): Promise<Plan> {
    const plan = this.exigirPlan(this.plan?.plan_id ?? '');
    const fx_hoy = this.config.escenario_fx === 'empeora' ? FX_EMPEORA : plan.fx;
    this.fx_actual = fx_hoy;
    const fuera = dom.fxFueraDeBanda(plan.fx, fx_hoy, this.reglas.hard_rules.fx_tolerance_pct);
    const m3 = plan.movimientos.find((m) => m.tipo === 'conversion_a_pesos');

    this.registro.agregar({
      paso: m3?.paso ?? 'demo',
      tool: 'exchange.fx',
      regla: fuera
        ? 'El dólar empeoró más de la tolerancia: retener'
        : 'El dólar sigue dentro de la banda',
      estado: fuera ? 'Retenido' : 'Ejecutando',
      monto: 'USD→ARS ' + formatearFx(fx_hoy),
    });
    if (m3 && m3.estado === 'Aprobado') this.mover(m3.paso, fuera ? 'Retenido' : 'Ejecutando');
    // Con la cotización de hoy hacen falta otros dólares para el mismo vencimiento.
    const sugerido = dom.montoAConvertir(this.reglas.dues, fx_hoy);
    const actual = this.exigirPlan(plan.plan_id);
    this.plan = {
      ...actual,
      fx_hoy,
      movimientos: actual.movimientos.map((m) => {
        if (m.tipo !== 'conversion_a_pesos') return m;
        // Ya es el día del vencimiento: deja de estar "programado para el jueves".
        const sinProgramar = { ...m, programado_para: undefined };
        return m.estado === 'Retenido'
          ? { ...sinProgramar, monto_sugerido_usd: sugerido }
          : sinProgramar;
      }),
    };
    await this.pausa();
    return this.planParaAfuera();
  }

  async configurarDemo(c: ConfigDemo): Promise<void> {
    await this.pausa();
    this.config = { ...c };
  }

  async obtenerLog(): Promise<EntradaLog[]> {
    await this.pausa();
    return this.registro.listar();
  }

  async reiniciarDemo(): Promise<void> {
    await this.pausa();
    this.datos = clonar(DATOS[this.perfil_id]);
    this.reglas = this.reglasDesdeDatos();
    this.propuestas = clonar(PERFILADO[this.perfil_id].propuestas);
    this.plan = null;
    this.fx_actual = this.datos.fx_demo.USD_ARS;
    this.config = { escenario_fx: 'estable', inyectar_timeout: false };
    this.evaluaciones.clear();
    this.aprobados.clear();
    this.ejecutados.clear();
    this.timeout_usado = false;
    this.registro.limpiar();
  }

  // ------------------------------------------------------------- privados

  private async pausa(): Promise<void> {
    const ms = import.meta.env.MODE === 'test' ? 0 : 300 + Math.floor(Math.random() * 300);
    if (ms > 0) await new Promise((listo) => setTimeout(listo, ms));
  }

  private reglasDesdeDatos(): Reglas {
    return {
      user_id: this.datos.user_id,
      hard_rules: clonar(this.datos.hard_rules),
      dues: clonar(this.datos.dues),
      preferencias: clonar(this.datos.soft_preferences),
    };
  }

  /** Los datos del JSON, pero con las reglas que la persona editó. */
  private datosVigentes(): DatosDemo {
    return { ...this.datos, hard_rules: this.reglas.hard_rules, dues: this.reglas.dues };
  }

  private saldosActuales(): Saldos {
    return this.plan ? dom.saldosSegunPlan(this.plan) : clonar(this.datos.balances);
  }

  /** Corre el juez una sola vez por clave+monto y recuerda la decisión (idempotencia). */
  private juzgar(mov: Movimiento): ResultadoJuez {
    const clave = mov.clave + ':' + mov.monto_usd;
    const decision = dom.evaluarJuez(
      mov,
      this.reglas.hard_rules,
      this.saldosActuales(),
      this.evaluaciones.get(clave),
    );
    this.evaluaciones.set(clave, decision);
    return decision;
  }

  private exigirPlan(plan_id: string): Plan {
    if (!this.plan) throw new Error('Todavía no hay un plan: simulá un ingreso primero.');
    if (plan_id && this.plan.plan_id !== plan_id) throw new Error('Ese plan no existe.');
    return this.plan;
  }

  /**
   * La copia del plan que sale hacia la interfaz, con los saldos recalculados a partir
   * de los movimientos que ya se completaron. Todo lo que devuelve esta clase pasa por acá,
   * así la UI nunca ve el objeto interno ni saldos viejos.
   */
  private planParaAfuera(plan_id = ''): Plan {
    const plan = this.exigirPlan(plan_id);
    return clonar({ ...plan, saldos: dom.saldosSegunPlan(plan) });
  }

  private exigirMovimiento(plan_id: string, paso: string): Movimiento {
    const mov = this.exigirPlan(plan_id).movimientos.find((m) => m.paso === paso);
    if (!mov) throw new Error('Ese movimiento no está en el plan.');
    return mov;
  }

  private mover(paso: string, hacia: Estado): void {
    const plan = this.exigirPlan('');
    this.plan = {
      ...plan,
      movimientos: plan.movimientos.map((m) => (m.paso === paso ? dom.transicionar(m, hacia) : m)),
    };
  }

  /** La alcancía no necesita Belo: se ejecuta sola y queda SIMULATED siempre (D15). */
  private completarAlcancia(): void {
    const m2 = this.plan?.movimientos.find((m) => m.tipo === 'alcancia');
    if (!m2 || m2.estado !== 'Aprobado') return;
    this.mover(m2.paso, 'Ejecutando');
    this.mover(m2.paso, 'Completado');
    this.registro.agregar({
      paso: m2.paso,
      tool: '(alcancía)',
      regla: 'Apartar ' + this.reglas.hard_rules.tax_pct_of_income + '% para impuestos',
      estado: 'Completado',
      monto: formatearUsd(m2.monto_usd),
      por_alcancia: true,
    });
  }

  /**
   * Rearma el plan con el movimiento editado. Si el rendimiento todavía está Propuesto,
   * absorbe la diferencia; si ya se ejecutó, la absorbe el dinero libre.
   */
  private recalcular(plan: Plan, editado: Movimiento): Plan {
    const r = this.reglas.hard_rules;
    const impuestos = plan.movimientos.find((m) => m.tipo === 'alcancia')?.monto_usd ?? 0;
    const m1 = plan.movimientos.find((m) => m.tipo === 'rendimiento');
    const m1Libre = m1?.estado === 'Propuesto';
    const rendimiento = m1Libre
      ? Math.max(0, plan.ingreso_usd - impuestos - plan.libre_usd - editado.monto_usd)
      : (m1?.monto_usd ?? 0);
    const libre_usd = m1Libre
      ? plan.libre_usd
      : Math.max(0, plan.ingreso_usd - impuestos - rendimiento - editado.monto_usd);

    const movimientos = plan.movimientos.map((m) => {
      if (m.paso === editado.paso) {
        if (m.estado !== 'Retenido') return { ...m, ...editado, estado: m.estado };
        // Una propuesta nueva lleva su propia clave de idempotencia, como en el backend.
        const base = dom.transicionar(m, 'Propuesto');
        return { ...base, ...editado, estado: base.estado, clave: base.clave + '.v2' };
      }
      if (m.tipo === 'rendimiento' && m1Libre) return { ...m, monto_usd: rendimiento };
      return m;
    });

    return {
      ...plan,
      movimientos,
      libre_usd,
      quedan_en_dolares: plan.ingreso_usd - editado.monto_usd,
      colchon_cubierto: plan.ingreso_usd - editado.monto_usd >= r.min_cushion_usd,
    };
  }
}
