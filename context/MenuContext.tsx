import React, { createContext, useContext } from 'react';
import { useSharedValue, withSpring, SharedValue, withTiming } from 'react-native-reanimated';

interface MenuContextType {
  translateX: SharedValue<number>;
  toggleMenu: () => void;
  openMenu: () => void;
  closeMenu: () => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const MenuProvider = ({ children }: { children: React.ReactNode }) => {
  const translateX = useSharedValue(0);
  const MENU_WIDTH = 300; // Độ rộng của menu khi mở ra

  const openMenu = () => {
    'worklet';
    translateX.value = withSpring(MENU_WIDTH, { damping: 15, stiffness: 90 });
  };

  const closeMenu = () => {
    'worklet';
    translateX.value = withTiming(0, { duration: 300 });
  };

  const toggleMenu = () => {
    if (translateX.value > MENU_WIDTH / 2) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  return (
    <MenuContext.Provider value={{ translateX, toggleMenu, openMenu, closeMenu }}>
      {children}
    </MenuContext.Provider>
  );
};

export const useMenu = () => {
  const context = useContext(MenuContext);
  if (!context) throw new Error('useMenu must be used within a MenuProvider');
  return context;
};