import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';
import ProfileSearchResult from '@/components/ProfileSearchResult';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function SearchScreen() {
  const [search, setSearch] = useState('');
  const router = useRouter();
  const userList = useQuery(api.users.searchUsers, search === '' ? 'skip' : { search });

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            /* Wrapper này sẽ kiểm soát độ dài của thanh Search */
            <View style={styles.searchBarWrapper}>
              <View style={styles.searchBarContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm kiếm"
                  value={search}
                  onChangeText={setSearch}
                  autoFocus={true}
                  placeholderTextColor="gray"
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')} style={styles.clearButton}>
                    <Ionicons name="close-circle" size={18} color="gray" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ),
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
          ),
          headerShadowVisible: false,
          headerStyle: { backgroundColor: 'white' },
          // Xóa bỏ headerTitleContainerStyle vì nó gây lỗi TS
        }}
      />
      
      <FlatList
        data={userList}
        ItemSeparatorComponent={() => (
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: Colors.border }} />
        )}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>
            {search === '' ? 'Hãy tìm kiếm người dùng' : 'Không tìm thấy kết quả'}
          </Text>
        )}
        renderItem={({ item }) => <ProfileSearchResult key={item._id} user={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    // Tăng marginRight để thanh search bar ngắn lại
    marginRight: 40, 
    flex: 1,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    width: '100%', // Nó sẽ chiếm hết phần còn lại của wrapper
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: 'black',
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 5,
  },
  backButton: {
    paddingLeft: 10,
    paddingRight: 5,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 30,
    color: 'gray',
  },
});