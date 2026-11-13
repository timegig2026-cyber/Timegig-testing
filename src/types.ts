export interface GeoLocationData {
  lat: number;
  lng: number;
  accuracy?: number;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: number;
  address?: string;
  source: 'gps' | 'ip' | 'manual' | 'preset';
}

export interface SavedPin {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  category: 'Home' | 'Work' | 'Favorite' | 'Travel' | 'Emergency' | 'Other';
  createdAt: number;
  address?: string;
}

export interface WeatherData {
  temperature: number;
  condition: string;
  windSpeed: number;
  humidity: number;
  cityName?: string;
  loading: boolean;
  error?: string;
}

export type MapTileStyle = 'osm' | 'cartoDark' | 'cartoPositron' | 'topo' | 'watercolor' | 'satellite';

export interface TileLayerConfig {
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  maxNativeZoom?: number;
  subdomains?: string;
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  location: [number, number];
}

export interface NavigationRoute {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  steps: RouteStep[];
}

export type SubscriptionPlan = 'tenant' | 'user';
export type AccountStatus = 'unactive' | 'pending_review' | 'active' | 'rejected';
export type UserSubReferralStatus = 'pending_review' | 'approved' | 'rejected';
export type VerificationFileCategory = 'selfie' | 'id_document' | 'proof_of_payment';

export interface VerificationArtifactFile {
  uid: string;
  fileId: string;
  category: VerificationFileCategory;
  name: string;
  mimeType: string;
  dataUrl: string;
  size: number;
}

export interface UserSubReferralItem {
  uid: string;
  applicantName: string;
  applicantEmail: string;
  contactInfo: string;
  locationName: string;
  invitedBy: string;
  plan: SubscriptionPlan;
  status: UserSubReferralStatus;
  docCount: number;
  docNames: string[];
  paymentDocCount?: number;
  paymentDocNames?: string[];
  hasSelfie: boolean;
  submittedAt: number;
  reviewedBy?: string;
  rejectionReason?: string;
  resubmittedCount?: number;
  previousRejectionReason?: string;
  resubmittedAt?: number;
}

export interface TenantReferralProfitItem {
  referralUid: string;
  referrerUid: string;
  invitedBy: string;
  referralName: string;
  plan: SubscriptionPlan;
  subscriptionAmount: number;
  profitAmount: number;
  paymentDocCount: number;
  hasProofOfPayment: boolean;
  status: UserSubReferralStatus;
  submittedAt: number;
  creditedAt?: number;
}

export interface UploadedIdDoc {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
  category?: 'id_document' | 'proof_of_payment';
}

export interface VerificationSubmission {
  plan: SubscriptionPlan;
  selfieDataUrl: string;
  idDocuments: UploadedIdDoc[];
  proofOfPaymentDocuments?: UploadedIdDoc[];
  submittedAt: number;
  status: AccountStatus;
  rejectionReason?: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  contactInfo: string;
  locationName: string;
  autoLocation: boolean;
  socialLinks: SocialLink[];
  isLocked?: boolean;
  logoDataUrl?: string;
  logoUpdatedAt?: number;
  inviteCode?: string;
  invitedBy?: string;
}

export type GigCategory =
  | 'Handyman'
  | 'Delivery'
  | 'Cleaning'
  | 'Tech & IT'
  | 'Tutoring'
  | 'Events'
  | 'Other';

export interface GigPost {
  gigId: string;
  creatorUid: string;
  creatorName: string;
  creatorSelfieUrl?: string;
  title: string;
  category: GigCategory;
  budget: string;
  description: string;
  contactInfo: string;
  locationName: string;
  lat: number;
  lng: number;
  status: 'active' | 'completed' | 'cancelled';
  submittedAt: number;
  applicantUid?: string;
  applicantName?: string;
  applicantSelfieUrl?: string;
  applicationStatus?: 'none' | 'pending' | 'accepted' | 'rejected' | 'timeout';
  applicationTries?: number;
  completedUserUid?: string;
  completedUserName?: string;
  rating?: number;
  cancellationReason?: string;
  cancelledByUid?: string;
  cancelledByName?: string;
}

export interface SeekerProfile {
  uid: string;
  name: string;
  title: string;
  category: GigCategory;
  selfieUrl: string;
  hourlyRate: string;
  rating: number;
  completedGigsCount: number;
  locationName: string;
  lat: number;
  lng: number;
  isAvailable: boolean;
  bio: string;
  skills: string[];
  contactInfo: string;
}

export interface SeekerHireRequest {
  hireId: string;
  seekerUid: string;
  seekerName: string;
  seekerSelfieUrl?: string;
  hirerUid: string;
  hirerName: string;
  hirerContact: string;
  gigTitle: string;
  gigBudget: string;
  destinationLat: number;
  destinationLng: number;
  destinationAddress: string;
  status: 'waiting' | 'accepted' | 'declined' | 'timeout';
  createdAt: number;
}

