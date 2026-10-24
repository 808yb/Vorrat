/**
 * Diagnostic logger for non-critical warnings and user-facing error reporting.
 * Replaces empty catch {} blocks across the application with traceable context.
 */
export function reportWarning(context: string, error?: unknown): void {
  const message = error instanceof Error ? error.message : String(error || "Handled warning");
  console.warn(`[Vorrat Warning] ${context}:`, message);
}

export function reportUserError(context: string, userMessage: string, error?: unknown): void {
  const errDetail = error instanceof Error ? error.message : String(error || "");
  console.warn(`[Vorrat UserError] ${context}: ${userMessage}`, errDetail);

  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    try {
      window.dispatchEvent(
        new CustomEvent("vorrat:toast", {
          detail: {
            message: userMessage,
            type: "error",
          },
        })
      );
    } catch {
      // Ignore if dispatch fails in non-DOM test environments
    }
  }
}
