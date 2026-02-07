import React from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('🔴 ErrorBoundary capturou erro:', error);
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔴 ErrorBoundary - Detalhes do erro:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-red-500" size={32} />
              <h1 className="text-2xl font-bold text-red-900">Erro na Aplicação</h1>
            </div>
            
            <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-4">
              <p className="font-bold text-red-800 mb-2">Erro:</p>
              <p className="text-red-700 font-mono text-sm">
                {this.state.error?.toString()}
              </p>
            </div>

            {this.state.errorInfo && (
              <details className="mb-4">
                <summary className="cursor-pointer font-bold text-gray-700 mb-2">
                  Stack Trace (clique para expandir)
                </summary>
                <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition"
              >
                Recarregar Página
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                Ir para Início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
