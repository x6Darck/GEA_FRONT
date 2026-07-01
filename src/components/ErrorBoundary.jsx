/**
 * Barrera de error global de GEA (React Error Boundary).
 *
 * Captura excepciones no controladas en cualquier componente hijo y muestra
 * una pantalla de fallback en lugar de romper toda la app. Es necesario como
 * clase porque `getDerivedStateFromError` y `componentDidCatch` no tienen
 * equivalente en hooks de React (a julio 2026).
 *
 * Props:
 * - `fallback` JSX: reemplaza el fallback por defecto.
 * - `onError(error, errorInfo)`: callback para enviar el error a un servicio externo.
 * - `resetOnPropsChange`: al cambiar esta prop, limpia el estado de error
 *   (útil para modales que se cierran y reabren con un nuevo item).
 * - `isModal` boolean: ajusta el estilo del fallback para el interior de modales.
 *
 * En producción, el detalle técnico del error queda oculto al usuario final.
 * En desarrollo (`import.meta.env.DEV`) se muestra el stack para depuración rápida.
 */
import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    // Actualizar el estado para que el siguiente render muestre la UI de fallback
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env?.DEV) {
      console.error('[ErrorBoundary] Error capturado:', error, errorInfo);
    }
    this.setState({ errorInfo });

    // Callback externo opcional (para logging o monitoreo)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps) {
    // Resetear el error si cambian props clave (útil para modales que se abren/cierran)
    const { resetOnPropsChange } = this.props;
    if (this.state.hasError && resetOnPropsChange !== undefined && prevProps.resetOnPropsChange !== resetOnPropsChange) {
      this.handleReset();
    }
  }

  handleReset() {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  render() {
    if (this.state.hasError) {
      // Si hay un fallback personalizado, usarlo
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback por defecto — elegante y profesional
      return (
        <DefaultErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
          isModal={this.props.isModal}
        />
      );
    }

    return this.props.children;
  }
}

// ─── Componente de Fallback por Defecto ──────────────────────────────────────
const DefaultErrorFallback = ({ error, onReset, isModal }) => {
  const containerStyle = isModal
    ? {
        padding: '32px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        minHeight: '220px',
        justifyContent: 'center',
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '16px',
        padding: '40px',
        textAlign: 'center',
      };

  return (
    <div style={containerStyle}>
      {/* Icono de error */}
      <div style={{
        width: '72px', height: '72px', borderRadius: '50%',
        backgroundColor: '#fef2f2', color: '#dc2626',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <AlertTriangle size={36} />
      </div>

      {/* Mensaje principal */}
      <div>
        <h3 style={{ margin: '0 0 8px', color: 'var(--text-main)', fontSize: '18px', fontWeight: '700' }}>
          Algo salió mal
        </h3>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '380px', lineHeight: 1.5 }}>
          Ocurrió un error inesperado en este componente. Puedes intentar recargarlo o volver al inicio.
        </p>

        {/* Detalle técnico (solo dev) */}
        {import.meta.env?.DEV && error && (
          <p style={{
            margin: '12px auto 0', padding: '8px 12px',
            backgroundColor: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: '8px', fontSize: '11px', color: '#dc2626',
            maxWidth: '400px', wordBreak: 'break-word', textAlign: 'left'
          }}>
            {error.toString()}
          </p>
        )}
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={onReset}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 20px', borderRadius: '30px', border: 'none',
            backgroundColor: '#ce1126', color: 'white',
            fontWeight: '700', fontSize: '13px', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(206,17,38,0.2)',
          }}
        >
          <RefreshCw size={14} /> Reintentar
        </button>

        {!isModal && (
          <button
            onClick={() => window.location.href = '/calendario'}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 20px', borderRadius: '30px', border: '1px solid #e2e8f0',
              backgroundColor: '#fff', color: 'var(--text-secondary)',
              fontWeight: '700', fontSize: '13px', cursor: 'pointer',
            }}
          >
            <Home size={14} /> Ir al Inicio
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorBoundary;
