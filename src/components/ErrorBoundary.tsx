import React from 'react';
import {ScrollView, Text, View, Pressable, StyleSheet} from 'react-native';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{children: React.ReactNode}, State> {
  state: State = {error: null};

  static getDerivedStateFromError(error: Error): State {
    return {error};
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Screen crashed', error, info.componentStack);
  }

  render() {
    const {error} = this.state;
    if (!error) return this.props.children;
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>This screen hit a problem</Text>
        <Text style={styles.body}>
          The app is still running. Tap Try again, or take a screenshot of the details below and send it to the developer.
        </Text>
        <ScrollView style={styles.details}>
          <Text style={styles.code}>{`${error.name}: ${error.message}\n\n${(error.stack || '').slice(0, 1500)}`}</Text>
        </ScrollView>
        <Pressable style={styles.button} onPress={() => this.setState({error: null})}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {flex: 1, padding: 24, paddingTop: 64, backgroundColor: '#F6F7F5'},
  title: {fontSize: 20, fontWeight: '800', color: '#0F3D3E'},
  body: {fontSize: 14, color: '#3D4A47', marginTop: 8, lineHeight: 20},
  details: {flex: 1, marginTop: 16, padding: 12, backgroundColor: '#FFFFFF', borderRadius: 12},
  code: {fontSize: 12, color: '#12201F', fontFamily: 'monospace'},
  button: {marginTop: 16, backgroundColor: '#0F3D3E', borderRadius: 14, paddingVertical: 14, alignItems: 'center'},
  buttonText: {color: '#FFFFFF', fontSize: 16, fontWeight: '700'},
});

export default ErrorBoundary;
