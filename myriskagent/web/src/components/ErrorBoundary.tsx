import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: {}) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('UI error:', error, info)
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ color: '#F1A501', background: '#000', padding: 16, border: '1px solid #B30700', borderRadius: 4 }}>
          <h2 style={{ color: '#B30700', fontFamily: 'Special Elite, serif', marginTop: 0 }}>Something went wrong</h2>
          <p>Try refreshing the page or navigating to a different tab.</p>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
