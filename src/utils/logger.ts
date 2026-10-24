/**
 * Diagnostic logger for non-critical warnings and handled catch blocks.
 * Replaces empty catch {} blocks across the application with traceable context.
 */
export function reportWarning(context: string, error?: unknown): void {
  if (process.env.NODE_ENV !== "production") {
    const message = error instanceof Error ? error.message : String(error || "Handled error");
    console.warn(`[Vorrat Warning] ${context}:`, message);
  }
}
