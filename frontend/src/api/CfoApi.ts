// Contrato único entre la interfaz y el backend.
//
// La UI NUNCA importa un JSON ni calcula dinero: solo llama a estos métodos.
// Hoy los implementa MockCfoApi (src/api/mock). Cuando Cesar termine front/cliente-api,
// se escribe una CfoApiHttp con fetch y se cambia una sola línea en src/api/index.ts.
//
// El comentario de cada método es el endpoint real de backend/app/api/README.md.
import type {
  ConfigDemo,
  EnlaceBelo,
  EntradaLog,
  PerfilId,
  Plan,
  PropuestaPerfilado,
  Reglas,
  ResultadoAprobacion,
  ResultadoEdicion,
  Sesion,
} from './tipos';

export interface CfoApi {
  iniciarSesionDemo(perfil_id: PerfilId): Promise<Sesion>; // solo front. Real: auth.sign_in (OAuth de Belo), D16
  obtenerReglas(): Promise<Reglas>; // GET /api/reglas
  guardarReglas(reglas: Reglas): Promise<Reglas>; // PUT /api/reglas
  correrPerfilado(): Promise<PropuestaPerfilado[]>; // POST /api/perfilado
  resolverPropuesta(id: string, accion: 'confirmar' | 'descartar'): Promise<Reglas>; // POST /api/perfilado/{id}/confirmar
  simularIngreso(): Promise<Plan | null>; // POST /api/ingresos/simular
  obtenerPlan(plan_id: string): Promise<Plan>; // GET /api/planes/{plan_id}
  editarMovimiento(plan_id: string, paso: string, monto_usd: number): Promise<ResultadoEdicion>; // PATCH /api/planes/{plan_id}/movimientos/{paso} (pasa por el juez)
  aprobarPlan(plan_id: string): Promise<ResultadoAprobacion>; // POST /api/planes/{plan_id}/aprobar (idempotente)
  obtenerEnlaceBelo(plan_id: string, paso: string): Promise<EnlaceBelo>; // simula el link de Belo (D13); real: lo genera el MCP
  confirmarEnlaceBelo(plan_id: string, paso: string, codigo: string): Promise<Plan>; // simula el código por correo; real: Belo, y el agente se entera solo
  avanzarDemo(destino: 'jueves'): Promise<Plan>; // POST /api/demo/avanzar
  configurarDemo(c: ConfigDemo): Promise<void>; // solo demo: escenario de FX y timeout inyectado. Proponerlo a Cesar/Juan Carlos
  obtenerLog(): Promise<EntradaLog[]>; // GET /api/log
  reiniciarDemo(): Promise<void>; // POST /api/demo/reiniciar

  // PENDIENTE de acordar con Juan Carlos y Cesar antes de implementarlo:
  // cambiar el monto del ingreso de la demo desde la hoja de ajustes.
  // cambiarIngresoDemo(monto_usd: number): Promise<void>;   // POST /api/demo/ingreso
}
