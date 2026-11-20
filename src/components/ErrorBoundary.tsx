import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Ha ocurrido un error inesperado en la interfaz.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('LeerEsPensar ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F5] text-[#1A1917] flex items-center justify-center p-6">
          <div className="max-w-lg w-full border border-[#E6DFD3] bg-[#F3EFE8] rounded-xl p-8">
            <h2 className="font-serif text-2xl font-medium text-[#1A1917] mb-3">
              Algo se interrumpió en la lectura
            </h2>
            <p className="text-sm text-[#6B665E] leading-relaxed mb-6">
              Detectamos un problema técnico al procesar la vista actual. Tu progreso guardado en el
              navegador permanece intacto.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="px-4 py-2 text-sm font-medium bg-[#1A1917] text-[#FAF8F5] rounded-lg hover:bg-[#32302C] transition-colors"
            >
              Reintentar vista
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
