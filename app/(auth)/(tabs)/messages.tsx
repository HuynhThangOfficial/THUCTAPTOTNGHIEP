// app/(auth)/(tabs)/messages.tsx
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MessagesScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>Hộp thư đến</Text>
      <Text>Chức năng nhắn tin đang phát triển...</Text>
    </SafeAreaView>
  );
};

export default MessagesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  text: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 }
});