import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClientId } from '../../packages/shared/types';

interface DeviceState {
  clientId: ClientId;
  isOnline: boolean;
  setClientId: (id: ClientId) => void;
  setOnline: (online: boolean) => void;
  toggleOnline: () => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  clientId: 'client-A',
  isOnline: true,
  setClientId: (id) => set({ clientId: id }),
  setOnline: (online) => set({ isOnline: online }),
  toggleOnline: () => set((state) => ({ isOnline: !state.isOnline })),
}));
