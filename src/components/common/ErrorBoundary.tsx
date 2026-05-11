import React, { Component, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { sizes } from '../../constants/theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.error }]}>Something went wrong</Text>
      <Text style={[styles.message, { color: colors.onSurfaceVariant }]}>
        {error?.message || 'An unexpected error occurred'}
      </Text>
      {__DEV__ && error?.stack && (
        <Text
          style={[styles.stack, { color: colors.onSurfaceVariant }]}
          numberOfLines={8}
        >
          {error.stack}
        </Text>
      )}
      <Button
        mode="contained"
        onPress={onReset}
        style={[styles.button, { backgroundColor: colors.primary }]}
      >
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: sizes.paddingLarge,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: sizes.padding,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: sizes.paddingLarge,
  },
  button: {
    marginTop: sizes.padding,
  },
  stack: {
    fontSize: 11,
    marginVertical: sizes.padding,
    textAlign: 'left',
    width: '100%',
  },
});
