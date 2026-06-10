import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClientId } from '../../../packages/shared/types';

interface DeviceState {
  clientId: ClientId;
  isOnline: Record<ClientId, boolean>;
  latencyMs: number;
  packetLoss: boolean;
  setClientId: (id: ClientId) => void;
  setOnline: (id: ClientId, online: boolean) => void;
  toggleOnline: (id: ClientId) => void;
  setLatencyMs: (latency: number) => void;
  setPacketLoss: (loss: boolean) => void;
}

export const useDeviceStore = create<DeviceState>()(
  persist(
    (set) => ({
      clientId: 'client-A',
      isOnline: {
        'client-A': true,
        'client-B': true,
      },
      latencyMs: 0,
      packetLoss: false,
      setClientId: (id) => set({ clientId: id }),
      setOnline: (id, online) =>
        set((state) => ({
          isOnline: { ...state.isOnline, [id]: online },
        })),
      toggleOnline: (id) =>
        set((state) => ({
          isOnline: { ...state.isOnline, [id]: !state.isOnline[id] },
        })),
      setLatencyMs: (latency) => set({ latencyMs: latency }),
      setPacketLoss: (loss) => set({ packetLoss: loss }),
    }),
    {
      name: 'alcovia-device-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

