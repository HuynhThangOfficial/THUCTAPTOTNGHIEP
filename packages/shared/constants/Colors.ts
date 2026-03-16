import { Platform } from 'react-native';

export const Colors = {
  primary: '#1ED760',          // MÀU XANH LÁ CHỦ ĐẠO
  background: '#FFFFFF',
  secondaryBackground: '#F5F5F5',
  itemBackground: '#f5f5f5',
  border: '#E0E0E0',
  itemHover: '#F0F0F0',
  text: '#1A1A1A',
  textMuted: '#666666',
  submit: '#1ED760',
  
  ...Platform.select({
    ios: {
      tabIconSelected: '#1ED760',
    },
    android: {
      tabIconSelected: '#1ED760',
    },
    default: {
      tabIconSelected: '#1ED760',
    },
  }),
};