/** Primary paths. PNG is preferred; JPG, JPEG, and WebP are tried automatically. */
export const screenshots = {
  voiceAssistant: '/assets/screenshots/voice-assistant.png',
  complaintDraft: '/assets/screenshots/complaint-draft.png',
  locationPin: '/assets/screenshots/location-pin.png',
  photoUpload: '/assets/screenshots/photo-upload.png',
  citizenDashboard: '/assets/screenshots/citizen-dashboard.png',
  complaintTracking: '/assets/screenshots/complaint-tracking.png',
  adminDashboard: '/assets/screenshots/admin-dashboard.png',
  complaintMaps: '/assets/screenshots/complaint-maps.png',
  workerAssignment: '/assets/screenshots/worker-assignment.png',
  complaintDetail: '/assets/screenshots/complaint-detail.png',
  resolution: '/assets/screenshots/resolution.png',
};

export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

export const SCREENSHOTS = {
  voiceAssistant: {
    id: 'voice-assistant',
    src: screenshots.voiceAssistant,
    label: '[ VOICE ASSISTANT SCREENSHOT ]',
    layout: 'mobile',
  },
  complaintDraft: {
    id: 'complaint-draft',
    src: screenshots.complaintDraft,
    label: '[ COMPLAINT REPORT SCREENSHOT ]',
    layout: 'mobile',
  },
  locationPin: {
    id: 'location-pin',
    src: screenshots.locationPin,
    label: '[ LOCATION SELECTION SCREENSHOT ]',
    layout: 'mobile',
  },
  photoUpload: {
    id: 'photo-upload',
    src: screenshots.photoUpload,
    label: '[ PHOTO UPLOAD SCREENSHOT ]',
    layout: 'mobile',
  },
  citizenDashboard: {
    id: 'citizen-dashboard',
    src: screenshots.citizenDashboard,
    label: '[ CITIZEN DASHBOARD SCREENSHOT ]',
    layout: 'mobile',
  },
  complaintTracking: {
    id: 'complaint-tracking',
    src: screenshots.complaintTracking,
    label: '[ COMPLAINT TRACKING SCREENSHOT ]',
    layout: 'mobile',
  },
  adminDashboard: {
    id: 'admin-dashboard',
    src: screenshots.adminDashboard,
    label: '[ ADMIN DASHBOARD SCREENSHOT ]',
    layout: 'desktop',
  },
  complaintMaps: {
    id: 'complaint-maps',
    src: screenshots.complaintMaps,
    label: '[ COMPLAINT MAPS SCREENSHOT ]',
    layout: 'desktop',
  },
  workerAssignment: {
    id: 'worker-assignment',
    src: screenshots.workerAssignment,
    label: '[ WORKER ASSIGNMENT SCREENSHOT ]',
    layout: 'desktop',
  },
  complaintDetail: {
    id: 'complaint-detail',
    src: screenshots.complaintDetail,
    label: '[ COMPLAINT DETAIL SCREENSHOT ]',
    layout: 'desktop',
  },
  resolution: {
    id: 'resolution',
    src: screenshots.resolution,
    label: '[ COMPLAINT RESOLUTION SCREENSHOT ]',
    layout: 'mobile',
  },
};
