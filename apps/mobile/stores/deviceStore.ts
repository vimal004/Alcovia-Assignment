import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClientId } from '../../../packages/shared/types';
import { getPartitionedStorageName, getUrlClientId } from '../utils/helpers';

interface DeviceState {
  clientId: ClientId;
  isOnline: Record<ClientId, boolean>;
  latencyMs: number;
  packetLoss: boolean;
  // Extension 6: Track last successful sync time per client for delta sync
  lastSyncedAt: Record<ClientId, string | null>;
  setClientId: (id: ClientId) => void;
  setOnline: (id: ClientId, online: boolean) => void;
  toggleOnline: (id: ClientId) => void;
  setLatencyMs: (latency: number) => void;
  setPacketLoss: (loss: boolean) => void;
  setLastSyncedAt: (id: ClientId, timestamp: string) => void;
}

export const useDeviceStore = create<DeviceState>()(
  persist(
    (set) => ({
      clientId: getUrlClientId(),
      isOnline: {
        'client-A': true,
        'client-B': true,
        'client-C': true, // Extension 4: 3+ device support
      },
      latencyMs: 0,
      packetLoss: false,
      // Extension 6: Delta sync timestamps (null = full sync needed)
      lastSyncedAt: {
        'client-A': null,
        'client-B': null,
        'client-C': null,
      },
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
      setLastSyncedAt: (id, timestamp) =>
        set((state) => ({
          lastSyncedAt: { ...state.lastSyncedAt, [id]: timestamp },
        })),
    }),
    {
      name: getPartitionedStorageName('alcovia-device-store'),
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);


