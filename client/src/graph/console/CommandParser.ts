/**
 * Parses raw text input into a structured command.
 */

export interface ParsedCommand {
  type: string;
  args: string[];
  raw: string;
}

const COMMAND_ALIASES: Record<string, string> = {
  s: 'show',
  h: 'hide',
  f: 'filter',
  m: 'mode',
  z: 'zoom',
  sim: 'simulate',
  sel: 'select',
  hl: 'highlight',
  b: 'back',
  r: 'reset',
  nav: 'focus',
  go: 'focus',
};

/**
 * Tokenize and parse a command string.
 * Grammar:
 *   filter <nodeType> [where <field> = <value>]
 *   show <nodeType> | hide <nodeType>
 *   focus <entityId | entityName>
 *   highlight <condition>
 *   mode <modeName>
 *   zoom fit | in | out
 *   simulate enter | exit
 *   select all <nodeType>
 *   back | reset
 */
export function parseCommand(input: string): ParsedCommand | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const tokens = trimmed.split(/\s+/);
  const rawCmd = tokens[0].toLowerCase();
  const type = COMMAND_ALIASES[rawCmd] ?? rawCmd;
  const args = tokens.slice(1);

  // Single-word commands
  if (['back', 'reset', 'help'].includes(type) && args.length === 0) {
    return { type, args: [], raw: trimmed };
  }

  return { type, args, raw: trimmed };
}
