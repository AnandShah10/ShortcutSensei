import * as vscode from 'vscode';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Thin wrapper over a VS Code OutputChannel. This is the ONLY place log
 * output is written; it never transmits data anywhere off-machine. Keeping
 * a single logger implementation makes that guarantee easy to audit.
 */
export class Logger {
  private readonly channel: vscode.OutputChannel;

  public constructor(channelName: string) {
    this.channel = vscode.window.createOutputChannel(channelName);
  }

  public debug(message: string): void {
    this.write('debug', message);
  }

  public info(message: string): void {
    this.write('info', message);
  }

  public warn(message: string): void {
    this.write('warn', message);
  }

  public error(message: string, error?: unknown): void {
    const suffix = error instanceof Error ? ` — ${error.message}` : '';
    this.write('error', `${message}${suffix}`);
  }

  public dispose(): void {
    this.channel.dispose();
  }

  private write(level: LogLevel, message: string): void {
    const timestamp = new Date().toISOString();
    this.channel.appendLine(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  }
}
