import type { AppDispatch } from '../../store/store';
import type { ParsedCommand } from './CommandParser';

export type CommandHandler = (
  args: string[],
  dispatch: AppDispatch,
) => { ok: boolean; message: string };

interface RegisteredCommand {
  name: string;
  description: string;
  usage: string;
  handler: CommandHandler;
}

class Registry {
  private commands = new Map<string, RegisteredCommand>();

  register(name: string, description: string, usage: string, handler: CommandHandler) {
    this.commands.set(name, { name, description, usage, handler });
  }

  execute(cmd: ParsedCommand, dispatch: AppDispatch): { ok: boolean; message: string } {
    const registered = this.commands.get(cmd.type);
    if (!registered) {
      return {
        ok: false,
        message: `Unknown command: "${cmd.type}". Type "help" for available commands.`,
      };
    }
    return registered.handler(cmd.args, dispatch);
  }

  getHelp(): string[] {
    return Array.from(this.commands.values()).map((c) => `${c.usage.padEnd(35)} ${c.description}`);
  }

  getAll(): RegisteredCommand[] {
    return Array.from(this.commands.values());
  }
}

export const commandRegistry = new Registry();
