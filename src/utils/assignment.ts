import type {Assignment, Complaint, Coordinates, LocationPoint, User} from '@/types';

type RawAssignment = Assignment & {
  complaintId?: Complaint | string;
  workerId?: User | string;
  officerId?: User | string;
};

/** Normalize API assignment fields (complaintId/workerId) to app shape. */
export function normalizeAssignment(raw: RawAssignment): Assignment {
  const complaint = raw.complaint ?? raw.complaintId;
  const worker = raw.worker ?? raw.workerId;
  const assignedBy = raw.assignedBy ?? raw.officerId;

  return {
    ...raw,
    complaint: complaint as Complaint | string,
    worker: worker as User | string,
    assignedBy: assignedBy as User | string | undefined,
  };
}

export function getAssignmentComplaint(a: Assignment): Complaint | null {
  return typeof a.complaint === 'object' && a.complaint ? a.complaint : null;
}

export function getComplaintId(a: Assignment): string | null {
  const c = a.complaint;
  if (!c) return null;
  if (typeof c === 'string') return c;
  return c._id;
}

/** Reject missing, zero, or out-of-range coordinates. Swap pairs that were stored backwards. */
export function interpretCoordinates(latitude: number, longitude: number): Coordinates | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  let lat = latitude;
  let lng = longitude;
  // Jammu & Kashmir latitudes sit near 32–36 and longitudes near 73–80.
  // A reversed pair lands the pin in the Arctic instead of the city.
  if (lat >= 60 && lat <= 90 && lng >= 8 && lng <= 45) {
    const swapped = lat;
    lat = lng;
    lng = swapped;
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null;
  return {latitude: lat, longitude: lng};
}

export function haversineKm(from: Coordinates, to: Coordinates): number {
  const earth = 6371;
  const lat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const lng = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a =
    Math.sin(lat / 2) ** 2 +
    Math.cos((from.latitude * Math.PI) / 180) *
      Math.cos((to.latitude * Math.PI) / 180) *
      Math.sin(lng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Build map coords from GeoJSON location or top-level lat/lng. */
export function getComplaintCoords(
  complaint: Partial<Complaint> & {
    latitude?: number;
    longitude?: number;
    location?: LocationPoint | {type?: string; coordinates?: number[]} | Coordinates;
  },
): Coordinates | null {
  const loc = complaint.location as
    | (Coordinates & {coordinates?: number[]; type?: string})
    | undefined;

  if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
    return interpretCoordinates(loc.latitude, loc.longitude);
  }

  if (loc?.coordinates?.length === 2) {
    const [longitude, latitude] = loc.coordinates;
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      return interpretCoordinates(latitude, longitude);
    }
  }

  if (
    typeof complaint.latitude === 'number' &&
    typeof complaint.longitude === 'number'
  ) {
    return interpretCoordinates(complaint.latitude, complaint.longitude);
  }

  return null;
}
