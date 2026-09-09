import React from 'react';
import { ErrorPage } from './ErrorPage';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Filet de sécurité contre les plantages de rendu. Sans lui, une exception dans
 * un composant vide entièrement le DOM et l'utilisateur se retrouve devant une
 * page blanche, sans explication ni moyen de repartir.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Le détail reste dans la console pour le diagnostic ; l'utilisateur, lui,
    // ne voit qu'un message compréhensible.
    console.error('Erreur non rattrapée dans l’interface Nyokah', error, info.componentStack);
  }

  private readonly handleReload = (): void => {
    window.location.reload();
  };

  private readonly handleReset = (): void => {
    this.setState({ error: null });
  };

  override render(): React.ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <ErrorPage
        kind="crash"
        detail={this.state.error.message}
        primaryAction={{ label: 'Recharger l’application', onClick: this.handleReload }}
        secondaryAction={{ label: 'Revenir à l’écran précédent', onClick: this.handleReset }}
      />
    );
  }
}
