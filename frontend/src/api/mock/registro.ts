// El MCP Log en memoria. Una fila por paso, con la tool que se habría llamado.
// En esta demo `live` es SIEMPRE false: la URL pública no usa el MCP real (D16).
import { horaCorta } from '../../formato';
import type { EntradaLog, Estado, ToolLog } from '../tipos';
import { MOTIVO_ALCANCIA, MOTIVO_D16 } from './dominio';

export interface FilaNueva {
  paso: string;
  tool: ToolLog;
  regla: string;
  estado: Estado;
  monto: string;
  /** Las alcancías no se pueden mover ni con el MCP real; el resto es por D16. */
  por_alcancia?: boolean;
}

export class Registro {
  private filas: EntradaLog[] = [];
  private contador = 0;

  agregar(fila: FilaNueva): EntradaLog {
    this.contador += 1;
    const entrada: EntradaLog = {
      id: 'log-' + this.contador,
      hora: horaCorta(new Date()),
      paso: fila.paso,
      tool: fila.tool,
      regla: fila.regla,
      estado: fila.estado,
      monto: fila.monto,
      live: false,
      motivo_simulado: fila.por_alcancia ? MOTIVO_ALCANCIA : MOTIVO_D16,
    };
    this.filas.push(entrada);
    return entrada;
  }

  listar(): EntradaLog[] {
    return this.filas.map((f) => ({ ...f }));
  }

  /** Cuántas veces se llamó a una tool. Lo usan los tests de idempotencia. */
  contarTool(tool: ToolLog): number {
    return this.filas.filter((f) => f.tool === tool).length;
  }

  limpiar(): void {
    this.filas = [];
    this.contador = 0;
  }
}
