import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Evita pantalla en blanco si falla un componente; permite reintentar. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error en la interfaz de BoxMaper:", error, info.componentStack);
  }

  private retry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center text-slate-200">
        <h1 className="text-lg font-semibold text-white">Algo salió mal</h1>
        <p className="max-w-md text-sm text-slate-400">
          BoxMaper encontró un error inesperado. Tus proyectos siguen guardados en este equipo.
          Podés reintentar o cerrar y volver a abrir la aplicación.
        </p>
        <p className="max-w-lg truncate text-xs text-slate-600" title={this.state.error.message}>
          {this.state.error.message}
        </p>
        <button
          type="button"
          onClick={this.retry}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Reintentar
        </button>
      </div>
    );
  }
}
