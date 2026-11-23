import {create} from 'zustand';

export type ToastKind = 'success' | 'info' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  kind: ToastKind;
  duration: number;
}

interface ToastState {
  current: ToastItem | null;
  show: (message: string, kind?: ToastKind, duration?: number) => void;
  dismiss: () => void;
}

export const useToastStore = create<ToastState>(set => ({
  current: null,
  show: (message, kind = 'success', duration = 3000) => {
    set({
      current: {
        id: `${Date.now()}`,
        message,
        kind,
        duration,
      },
    });
  },
  dismiss: () => set({current: null}),
}));

export function showToast(
  message: string,
  kind: ToastKind = 'success',
  duration = 3000,
) {
  useToastStore.getState().show(message, kind, duration);
}
