import {create} from 'zustand';
import * as complaintService from '@/services/complaint.service';
import {getErrorMessage} from '@/services/api';
import type {
  Complaint,
  TimelineEvent,
  Comment,
  CreateComplaintData,
} from '@/types';

interface ComplaintState {
  complaints: Complaint[];
  nearby: Complaint[];
  selected: Complaint | null;
  timeline: TimelineEvent[];
  comments: Comment[];
  isLoading: boolean;
  error: string | null;
  fetchMine: () => Promise<void>;
  fetchAll: (filters?: Record<string, unknown>) => Promise<void>;
  fetchNearby: (lat: number, lng: number, radius?: number) => Promise<void>;
  fetchOne: (id: string) => Promise<void>;
  fetchTimeline: (id: string) => Promise<void>;
  fetchComments: (id: string) => Promise<void>;
  create: (data: CreateComplaintData, photos?: {uri: string; name: string; type: string}[]) => Promise<Complaint>;
  assign: (id: string, workerId: string, notes?: string) => Promise<void>;
  resolve: (id: string, notes: string) => Promise<void>;
  confirm: (id: string, fixed: boolean, feedback?: string) => Promise<void>;
  addComment: (id: string, text: string) => Promise<void>;
  clearSelected: () => void;
  clearError: () => void;
}

export const useComplaintStore = create<ComplaintState>((set, get) => ({
  complaints: [],
  nearby: [],
  selected: null,
  timeline: [],
  comments: [],
  isLoading: false,
  error: null,

  fetchMine: async () => {
    set({isLoading: true, error: null});
    try {
      const complaints = await complaintService.getMyComplaints();
      set({complaints, isLoading: false});
    } catch (err) {
      set({error: getErrorMessage(err), isLoading: false});
    }
  },

  fetchAll: async filters => {
    set({isLoading: true, error: null});
    try {
      const complaints = await complaintService.listComplaints(filters);
      set({complaints, isLoading: false});
    } catch (err) {
      set({error: getErrorMessage(err), isLoading: false});
    }
  },

  fetchNearby: async (lat, lng, radius = 5000) => {
    set({isLoading: true, error: null});
    try {
      const nearby = await complaintService.getNearby(lat, lng, radius);
      set({nearby, isLoading: false});
    } catch (err) {
      set({error: getErrorMessage(err), isLoading: false});
    }
  },

  fetchOne: async id => {
    set({isLoading: true, error: null});
    try {
      const selected = await complaintService.getComplaint(id);
      set({selected, isLoading: false});
    } catch (err) {
      set({error: getErrorMessage(err), isLoading: false});
    }
  },

  fetchTimeline: async id => {
    try {
      const timeline = await complaintService.getTimeline(id);
      set({timeline});
    } catch {
      set({timeline: []});
    }
  },

  fetchComments: async id => {
    try {
      const comments = await complaintService.getComments(id);
      set({comments});
    } catch {
      set({comments: []});
    }
  },

  create: async (data, photos) => {
    set({isLoading: true, error: null});
    try {
      const complaint = photos?.length
        ? await complaintService.createComplaintWithMedia(data, photos)
        : await complaintService.createComplaint(data);
      set(state => ({
        complaints: [complaint, ...state.complaints],
        isLoading: false,
      }));
      return complaint;
    } catch (err) {
      set({error: getErrorMessage(err), isLoading: false});
      throw err;
    }
  },

  assign: async (id, workerId, notes) => {
    set({isLoading: true});
    try {
      const updated = await complaintService.assignComplaint(id, workerId, notes);
      set(state => ({
        selected: state.selected?._id === id ? updated : state.selected,
        complaints: state.complaints.map(c => (c._id === id ? updated : c)),
        isLoading: false,
      }));
    } catch (err) {
      set({error: getErrorMessage(err), isLoading: false});
      throw err;
    }
  },

  resolve: async (id, notes) => {
    set({isLoading: true});
    try {
      const updated = await complaintService.resolveComplaint(id, notes);
      set(state => ({
        selected: state.selected?._id === id ? updated : state.selected,
        complaints: state.complaints.map(c => (c._id === id ? updated : c)),
        isLoading: false,
      }));
    } catch (err) {
      set({error: getErrorMessage(err), isLoading: false});
      throw err;
    }
  },

  confirm: async (id, fixed, feedback) => {
    set({isLoading: true});
    try {
      const updated = await complaintService.confirmResolution(id, fixed, feedback);
      set(state => ({
        selected: state.selected?._id === id ? updated : state.selected,
        complaints: state.complaints.map(c => (c._id === id ? updated : c)),
        isLoading: false,
      }));
    } catch (err) {
      set({error: getErrorMessage(err), isLoading: false});
      throw err;
    }
  },

  addComment: async (id, text) => {
    const comment = await complaintService.addComment(id, text);
    set(state => ({comments: [...state.comments, comment]}));
  },

  clearSelected: () => set({selected: null, timeline: [], comments: []}),
  clearError: () => set({error: null}),
}));
