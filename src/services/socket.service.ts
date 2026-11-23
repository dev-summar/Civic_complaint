import {io, Socket} from 'socket.io-client';
import {SOCKET_URL} from '@/config/env';
import {getAccessToken} from './api';
import {useComplaintStore} from '@/store/complaintStore';
import {useAppStore} from '@/store/appStore';
import {useToastStore} from '@/store/toastStore';

let socket: Socket | null = null;

export function connectSocket(): void {
  if (socket?.connected) return;
  
  const token = getAccessToken();
  if (!token) return;

  socket = io(SOCKET_URL, {
    auth: {token},
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  // Real-time complaint updates
  socket.on('complaint:updated', (complaint) => {
    const store = useComplaintStore.getState();
    // Update in complaints list
    const updatedComplaints = store.complaints.map(c =>
      c._id === complaint._id ? {...c, ...complaint} : c
    );
    useComplaintStore.setState({complaints: updatedComplaints});
    // Update selected if viewing this complaint
    if (store.selected?._id === complaint._id) {
      useComplaintStore.setState({selected: {...store.selected, ...complaint}});
    }
  });

  socket.on('complaint:created', (complaint) => {
    useToastStore.getState().show('New complaint reported nearby', 'info');
  });

  socket.on('complaint:assigned', (data) => {
    useToastStore.getState().show('A complaint has been assigned', 'info');
  });

  socket.on('complaint:resolved', (data) => {
    useToastStore.getState().show('A complaint has been resolved', 'success');
    // Refresh complaints list
    const store = useComplaintStore.getState();
    if (store.complaints.length > 0) {
      store.fetchMine();
    }
  });

  socket.on('notification:new', (notification) => {
    const appStore = useAppStore.getState();
    appStore.setUnreadNotifications(appStore.unreadNotifications + 1);
    useToastStore.getState().show(notification.title || 'New notification', 'info');
  });

  socket.on('assignment:new', (assignment) => {
    useToastStore.getState().show('New assignment received', 'info');
  });

  socket.on('assignment:updated', (assignment) => {
    useToastStore.getState().show('Assignment updated', 'info');
  });
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function subscribeToComplaint(complaintId: string): void {
  socket?.emit('complaint:subscribe', complaintId);
}

export function unsubscribeFromComplaint(complaintId: string): void {
  socket?.emit('complaint:unsubscribe', complaintId);
}

export function getSocket(): Socket | null {
  return socket;
}
