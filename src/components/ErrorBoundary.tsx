import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "#f8fafc",
            fontFamily: "Inter, sans-serif",
            color: "#0f172a",
          }}
        >
          <div
            style={{
              maxWidth: "400px",
              width: "100%",
              background: "#ffffff",
              borderRadius: "20px",
              padding: "28px 24px",
              boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)",
              border: "1px solid #e2e8f0",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "#fef2f2",
                color: "#ef4444",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
                fontSize: "24px",
              }}
            >
              ⚠️
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
              {this.props.fallbackTitle || "Etwas ist schiefgelaufen"}
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
              Die Vorrats-App konnte diesen Bereich nicht laden. Bitte lade die Seite neu.
            </p>
            {this.state.error?.message && (
              <pre
                style={{
                  background: "#f1f5f9",
                  padding: "10px",
                  borderRadius: "8px",
                  fontSize: "11px",
                  color: "#e11d48",
                  textAlign: "left",
                  overflowX: "auto",
                  margin: "0 0 20px",
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                background: "#059669",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              App neu laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
