import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

/**
 * Shows the actual error instead of a blank white page.
 *
 * When a React render throws, React unmounts the whole tree and you get an
 * empty document — which looks identical whether the cause is a typo, a missing
 * export, or a bad hook. That makes remote debugging almost impossible: "it's
 * white" carries no information. This renders the message and component stack on
 * screen, with a copy button, so the failure is reportable in one step.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ error, info });
    console.error("GILI crashed:", error, info.componentStack);
  }

  private report() {
    const { error, info } = this.state;
    return [
      `${error?.name}: ${error?.message}`,
      "",
      "Stack:",
      error?.stack ?? "(none)",
      "",
      "Component stack:",
      info?.componentStack ?? "(none)",
    ].join("\n");
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={{ minHeight: "100vh", background: "#fff", color: "#18191B", padding: 24, fontFamily: "ui-monospace, monospace" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>GILI hit an error</h1>
        <p style={{ fontSize: 13, color: "#71747D", marginBottom: 16 }}>
          The page didn't crash silently this time. Copy the details below and send them over.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => navigator.clipboard?.writeText(this.report())}
            style={{ background: "#007CFF", color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px", fontWeight: 700, cursor: "pointer" }}
          >
            Copy error details
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{ background: "#fff", color: "#18191B", border: "1px solid #D8DCE8", borderRadius: 8, padding: "8px 14px", fontWeight: 700, cursor: "pointer" }}
          >
            Reload
          </button>
        </div>

        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, lineHeight: 1.5, background: "#F8F9FD", border: "1px solid #D8DCE8", borderRadius: 8, padding: 16, maxHeight: "60vh", overflow: "auto" }}>
          {this.report()}
        </pre>
      </div>
    );
  }
}
