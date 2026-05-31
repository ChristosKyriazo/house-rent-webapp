'use client'

import { Component, type ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    Sentry.captureException(error)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex items-center justify-center p-8 text-[var(--text-muted)] text-sm">
            Something went wrong.{' '}
            <button
              className="underline ml-1"
              onClick={() => this.setState({ hasError: false })}
            >
              Try again
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
