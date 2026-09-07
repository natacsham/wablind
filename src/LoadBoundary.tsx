import { Component, createRef, type ReactNode } from 'react';

type Props = { area: string; children: ReactNode; saveCopy?: () => void };

/** Keep navigation and saved work available when a lazy screen cannot be opened. */
export class LoadBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  private heading = createRef<HTMLHeadingElement>();

  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.heading.current?.focus(); }

  render() {
    if (!this.state.failed) return this.props.children;
    return <section className="error" role="alert" aria-label="Falha ao abrir esta área">
      <h2 ref={this.heading} tabIndex={-1}>Não foi possível abrir {this.props.area}</h2>
      <p>Recarregue a página para tentar novamente. Os rascunhos já gravados neste navegador permanecem disponíveis.</p>
      <div className="actions">
        {this.props.saveCopy && <button onClick={this.props.saveCopy}>Guardar cópia do rascunho</button>}
        <button onClick={() => window.location.reload()}>Recarregar página</button>
        <a className="button" href="#/">Voltar à busca</a>
      </div>
    </section>;
  }
}
