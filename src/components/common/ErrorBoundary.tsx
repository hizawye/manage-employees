import React, { Component, ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../ui/text';
import { Button } from '../ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  return (
    <View className="flex-1 justify-center items-center p-6 bg-background">
      <Text className="text-2xl font-bold text-destructive mb-4 text-center">
        Something went wrong
      </Text>
      <Text className="text-base text-muted-foreground text-center mb-6">
        {error?.message || 'An unexpected error occurred'}
      </Text>
      {__DEV__ && error?.stack && (
        <Text
          className="text-xs text-muted-foreground text-left w-full my-4"
          numberOfLines={8}
        >
          {error.stack}
        </Text>
      )}
      <Button onPress={onReset}>
        Try Again
      </Button>
    </View>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
