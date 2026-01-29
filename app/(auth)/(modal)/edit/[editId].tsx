import { View } from 'react-native';
import ThreadComposer from '@/components/ThreadComposer';

export default function EditThreadScreen() {
  // File này chỉ cần gọi ThreadComposer
  // ThreadComposer sẽ tự lấy editId từ URL để tải dữ liệu cũ
  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <ThreadComposer />
    </View>
  );
}