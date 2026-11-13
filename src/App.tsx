import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapView } from './components/MapView';
import { BookmarksView } from './components/BookmarksView';
import { ShopModal, SubscriptionPlan } from './components/ShopModal';
import { VerificationModal } from './components/VerificationModal';
import { SelfieLogoModal } from './components/SelfieLogoModal';
import { AuthModal, AuthCompletionPayload } from './components/AuthModal';
import { AdminPinModal } from './components/AdminPinModal';
import { FloatingToolsWallpaper } from './components/FloatingToolsWallpaper';
import { GeoLocationData, SavedPin, MapTileStyle, NavigationRoute, AccountStatus, VerificationSubmission, UserProfile, UserSubReferralItem, UserSubReferralStatus, VerificationArtifactFile, TenantReferralProfitItem, GigPost, GigCategory, SeekerProfile, SeekerHireRequest } from './types';
import { reverseGeocode, searchLocations, fetchRouteWithSteps, formatSpokenDistance, formatDuration, formatDistance, calculateDistance } from './utils/geo';
import { soundEngine } from './utils/audio';
import { ladyVoiceNavigator } from './utils/voiceNav';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, deleteField, onSnapshot, serverTimestamp, collection, query, orderBy, where } from 'firebase/firestore';
import { Home, Users, Search, UserCircle, Globe, LocateFixed, Layers, Zap, MoreHorizontal, Settings, MessageSquare, Heart, MapPin, Calendar, Camera, Briefcase, Share2, DollarSign, Wallet, TrendingUp, Copy, Check, Star, ShieldCheck, Mail, Phone, Info, Bell, Shield, ChevronRight, Upload, FileText, Clock, UserCheck, RefreshCw, AlertCircle, X, ChevronLeft, ShoppingBag, Volume2, VolumeX, Navigation, LayoutGrid, Plus, Trash2, Link2, Lock, Pencil, LogIn, LogOut, UserPlus, Sparkles, CheckCircle2, Eye, XCircle, Receipt, Maximize2, ZoomIn, ZoomOut, RotateCcw, Wrench } from 'lucide-react';
import L from 'leaflet';
import seekerHandymanImg from './assets/images/seeker_handyman_selfie_1794592359439.jpg';
import seekerFemaleTechImg from './assets/images/seeker_female_tech_selfie_1794592370810.jpg';

const INITIAL_SEEKERS: SeekerProfile[] = [
  {
    uid: 'seeker_sipho_m',
    name: 'Sipho Khumalo',
    title: 'Master Electrician & Home Appliance Pro',
    category: 'Tech & IT',
    selfieUrl: seekerHandymanImg,
    hourlyRate: 'R180 / hr',
    rating: 4.9,
    completedGigsCount: 34,
    locationName: 'Rosebank, Johannesburg • 2.1 km away',
    lat: -26.1465,
    lng: 28.0416,
    isAvailable: true,
    bio: 'Certified wireman & electrical artisan. DB boards, wiring, appliance repair, fault finding, and power tools equipped.',
    skills: ['Wiring & DB Boards', 'Fault Finding', 'Generator Setup', 'Power Tools', 'Rapid Response'],
    contactInfo: '+27 82 455 1092',
  },
  {
    uid: 'seeker_naledi_k',
    name: 'Naledi Molefe',
    title: 'Plumber, Leak Detection & Geyser Specialist',
    category: 'Handyman',
    selfieUrl: seekerFemaleTechImg,
    hourlyRate: 'From R250',
    rating: 5.0,
    completedGigsCount: 29,
    locationName: 'Sandton, Johannesburg • 3.2 km away',
    lat: -26.1076,
    lng: 28.0567,
    isAvailable: true,
    bio: 'Registered plumbing artisan with mobile inspection cameras, pressure gauges, pipe wrenches, and valve replacements.',
    skills: ['Leak Detection', 'Pipe Fitting', 'Geyser Valves', 'Drain Unblocking', 'Sanitary Ware'],
    contactInfo: '+27 71 890 3412',
  },
  {
    uid: 'seeker_david_v',
    name: 'David Van Der Merwe',
    title: 'General Handyman, Carpentry & Painting Master',
    category: 'Handyman',
    selfieUrl: seekerHandymanImg,
    hourlyRate: 'R160 / hr',
    rating: 4.8,
    completedGigsCount: 42,
    locationName: 'Braamfontein, Johannesburg • 1.6 km away',
    lat: -26.1929,
    lng: 28.0305,
    isAvailable: true,
    bio: 'Multi-skilled home repair expert for door fitting, drywall, custom woodwork, TV wall mounting, and lock fixing.',
    skills: ['Drilling & Mounting', 'Woodwork', 'Door & Lock Repairs', 'Drywall', 'Interior Painting'],
    contactInfo: '+27 83 234 8871',
  },
  {
    uid: 'seeker_lerato_d',
    name: 'Lerato Dlamini',
    title: 'Express Delivery, Bakkie & Heavy Cargo',
    category: 'Delivery',
    selfieUrl: seekerFemaleTechImg,
    hourlyRate: 'From R120',
    rating: 4.9,
    completedGigsCount: 68,
    locationName: 'Auckland Park, Johannesburg • 2.7 km away',
    lat: -26.1834,
    lng: 27.9994,
    isAvailable: true,
    bio: 'Licensed courier with heavy utility bakkie and motorbikes for urgent hardware pickups, deliveries, and cargo transport.',
    skills: ['Urgent Dispatch', 'Furniture Hauling', 'Heavy Bakkie', 'Hardware Transport', 'GPS Route Pro'],
    contactInfo: '+27 79 312 9904',
  },
  {
    uid: 'seeker_thabo_n',
    name: 'Thabo Ndlovu',
    title: 'Deep House Cleaning & Industrial Sanitizing',
    category: 'Cleaning',
    selfieUrl: seekerHandymanImg,
    hourlyRate: 'From R200',
    rating: 4.9,
    completedGigsCount: 22,
    locationName: 'Melville, Johannesburg • 2.4 km away',
    lat: -26.1758,
    lng: 28.0063,
    isAvailable: true,
    bio: 'Professional residential and commercial cleaner equipped with steam extractors, floor polishers, and eco-friendly supplies.',
    skills: ['Steam Extraction', 'Carpet Detailing', 'Window Washing', 'Post-Renovation', 'Sanitizing'],
    contactInfo: '+27 84 901 2345',
  },
];

const getProfileStorageKey = (uid?: string | null) =>
  uid ? `timegig_profile_${uid}` : 'timegig_profile_guest';
const getVerificationStorageKey = (uid?: string | null) =>
  uid ? `timegig_verification_${uid}` : 'timegig_verification_guest';
const INVITE_STORAGE_KEY = 'timegig_invited_by_v1';
const MAP_TILE_STORAGE_KEY = 'timegig_map_tile_v1';
const MAIN_ADMIN_EMAIL = 'timegig2026@gmail.com';
const LOGO_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // Once a month (30 days)
const EMPTY_PINS: SavedPin[] = [];
const EMPTY_TRAIL: Array<[number, number]> = [];
const noopMapAction = () => {};
const getSubscriptionAmount = (plan: SubscriptionPlan): number => (plan === 'tenant' ? 299.99 : 29.99);
const getReferralProfitAmount = (plan: SubscriptionPlan): number => (plan === 'tenant' ? 299.99 : 29.99);

// Clean up legacy unscoped keys to prevent cross-account profile leakage
try {
  localStorage.removeItem('timegig_profile_v1');
  localStorage.removeItem('timegig_verification_v1');
} catch {
  // Ignore
}

const createBlankProfile = (email?: string, derivedCode?: string): UserProfile => ({
  firstName: '',
  lastName: '',
  email: email || '',
  contactInfo: '',
  locationName: '',
  autoLocation: true,
  socialLinks: [],
  isLocked: false,
  inviteCode: derivedCode || `TG${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
});

type AppViewMode = 'map' | 'tenant' | 'referrals' | 'gigs' | 'seekers' | 'profile';

export default function App() {
  const [viewMode, setViewMode] = useState<AppViewMode>('map');
  const [verificationSubmission, setVerificationSubmission] = useState<VerificationSubmission | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [pendingPlanForVerification, setPendingPlanForVerification] = useState<SubscriptionPlan | null>(null);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showPhoneMenu, setShowPhoneMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [showSignupCongratsModal, setShowSignupCongratsModal] = useState(false);
  const [requiresSubscriptionFirst, setRequiresSubscriptionFirst] = useState(false);
  const [welcomeBackName, setWelcomeBackName] = useState<string | null>(null);
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminPinVerified, setAdminPinVerified] = useState(false);
  const [userSubReferrals, setUserSubReferrals] = useState<UserSubReferralItem[]>([]);
  const [tenantReferralProfits, setTenantReferralProfits] = useState<TenantReferralProfitItem[]>([]);
  const [referralFilterStatus, setReferralFilterStatus] = useState<'all' | UserSubReferralStatus | 'resubmitted'>('all');
  const [referralNetworkOnly, setReferralNetworkOnly] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<UserSubReferralItem | null>(null);
  const [selectedReferralFiles, setSelectedReferralFiles] = useState<VerificationArtifactFile[]>([]);
  const [referralSelfies, setReferralSelfies] = useState<Record<string, string>>({});
  const fetchedSelfieSignaturesRef = useRef<Record<string, string>>({});
  const [loadingReferralFiles, setLoadingReferralFiles] = useState(false);
  const [referralFilesError, setReferralFilesError] = useState<string | null>(null);
  const [fullScreenPreview, setFullScreenPreview] = useState<{
    title: string;
    categoryLabel: string;
    mimeType: string;
    dataUrl: string;
  } | null>(null);
  const [fullScreenZoom, setFullScreenZoom] = useState(1);
  const [isMainTenantLinkTenant, setIsMainTenantLinkTenant] = useState(false);
  const [referralActionLoadingUid, setReferralActionLoadingUid] = useState<string | null>(null);
  const [referralAdminError, setReferralAdminError] = useState<string | null>(null);
  const [rejectTargetItem, setRejectTargetItem] = useState<UserSubReferralItem | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [rejectionReasonError, setRejectionReasonError] = useState<string | null>(null);
  const [newSubmissionToast, setNewSubmissionToast] = useState<{
    name: string;
    type: 'Seeker' | 'Referral';
    invitedBy?: string;
    isResubmitted?: boolean;
    submittedAt: number;
  } | null>(null);
  const [gigPosts, setGigPosts] = useState<GigPost[]>([]);
  const [isPickingGigLocation, setIsPickingGigLocation] = useState(false);
  const [showCreateGigModal, setShowCreateGigModal] = useState(false);
  const [gigDraftLocation, setGigDraftLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const [gigFormTitle, setGigFormTitle] = useState('');
  const [gigFormCategory, setGigFormCategory] = useState<GigCategory>('Handyman');
  const [gigFormBudget, setGigFormBudget] = useState('');
  const [gigFormDescription, setGigFormDescription] = useState('');
  const [gigFormContact, setGigFormContact] = useState('');
  const [gigSubmitting, setGigSubmitting] = useState(false);
  const [gigFormError, setGigFormError] = useState<string | null>(null);
  const [selectedGigPost, setSelectedGigPost] = useState<GigPost | null>(null);
  const [deletingGigId, setDeletingGigId] = useState<string | null>(null);
  const [showCompleteGigModal, setShowCompleteGigModal] = useState(false);
  const [completingGigTarget, setCompletingGigTarget] = useState<GigPost | null>(null);
  const [completeWorkerName, setCompleteWorkerName] = useState('');
  const [completeRating, setCompleteRating] = useState<number>(5);
  const [completeGigError, setCompleteGigError] = useState<string | null>(null);

  const [showEditGigModal, setShowEditGigModal] = useState(false);
  const [editingGigTarget, setEditingGigTarget] = useState<GigPost | null>(null);
  const [editGigTitle, setEditGigTitle] = useState('');
  const [editGigCategory, setEditGigCategory] = useState<GigCategory>('Handyman');
  const [editGigBudget, setEditGigBudget] = useState('');
  const [editGigDescription, setEditGigDescription] = useState('');
  const [editGigContact, setEditGigContact] = useState('');
  const [editGigError, setEditGigError] = useState<string | null>(null);

  const [showCancelGigModal, setShowCancelGigModal] = useState(false);
  const [cancellingGigTarget, setCancellingGigTarget] = useState<GigPost | null>(null);
  const [cancellationReasonInput, setCancellationReasonInput] = useState('');
  const [cancelGigError, setCancelGigError] = useState<string | null>(null);

  const myCompletedGigsAsWorker = useMemo(
    () => gigPosts.filter((g) => g.status === 'completed' && g.completedUserUid === authUser?.uid && typeof g.rating === 'number'),
    [gigPosts, authUser?.uid]
  );
  const myAverageStarRating = myCompletedGigsAsWorker.length > 0
    ? (myCompletedGigsAsWorker.reduce((sum, g) => sum + (g.rating || 0), 0) / myCompletedGigsAsWorker.length).toFixed(1)
    : null;

  // Gig Application Flow states (5-try circle loader waiting for owner)
  const [showGigApplicationModal, setShowGigApplicationModal] = useState(false);
  const [applyingGigTarget, setApplyingGigTarget] = useState<GigPost | null>(null);
  const [applicationTriesCount, setApplicationTriesCount] = useState<number>(1);
  const [applicationStatusState, setApplicationStatusState] = useState<'waiting' | 'accepted' | 'rejected' | 'timeout' | null>(null);
  const [applicationTimeoutMessage, setApplicationTimeoutMessage] = useState<string | null>(null);
  const [isUpdatingApplication, setIsUpdatingApplication] = useState(false);
  const applicationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Seekers Marketplace and Hire Flow states
  const [seekersList] = useState<SeekerProfile[]>(INITIAL_SEEKERS);
  const [seekersCategoryFilter, setSeekersCategoryFilter] = useState<string>('All');
  const [hireTargetSeeker, setHireTargetSeeker] = useState<SeekerProfile | null>(null);
  const [showHireSeekerModal, setShowHireSeekerModal] = useState(false);
  const [hireGigTitle, setHireGigTitle] = useState('');
  const [hireGigBudget, setHireGigBudget] = useState('');
  const [hireDestinationAddress, setHireDestinationAddress] = useState('');
  const [hireContactPhone, setHireContactPhone] = useState('');
  const [hireModalError, setHireModalError] = useState<string | null>(null);

  // Circle loading waiting modal for Seeker to accept hire request
  const [showSeekerWaitingModal, setShowSeekerWaitingModal] = useState(false);
  const [seekerWaitingStatus, setSeekerWaitingStatus] = useState<'waiting' | 'accepted' | 'declined'>('waiting');
  const [seekerWaitingTryCount, setSeekerWaitingTryCount] = useState<number>(1);

  // Active Hired Gig state for map navigation & completion
  const [activeHiredGig, setActiveHiredGig] = useState<{
    hireId: string;
    seekerUid: string;
    seekerName: string;
    seekerSelfieUrl: string;
    seekerPhone: string;
    gigTitle: string;
    gigBudget: string;
    destinationAddress: string;
    lat: number;
    lng: number;
    hiredAt: number;
    status: 'in_progress' | 'completed';
  } | null>(null);

  const [showCompleteHiredGigModal, setShowCompleteHiredGigModal] = useState(false);
  const [hiredGigRating, setHiredGigRating] = useState<number>(5);
  const [hiredGigReview, setHiredGigReview] = useState('');

  const [gigLocationSearchQuery, setGigLocationSearchQuery] = useState('');
  const [gigLocationSuggestions, setGigLocationSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string; place_id: number }>>([]);
  const [isSearchingGigLocationInput, setIsSearchingGigLocationInput] = useState(false);
  const isFirstReferralSnapshotRef = useRef(true);
  const hasPlayedInitialPendingAlertRef = useRef(false);
  const isFirstProfitSnapshotRef = useRef(true);
  const knownReferralIdsRef = useRef<Set<string>>(new Set());
  const knownReferralStatusesRef = useRef<Map<string, UserSubReferralStatus>>(new Map());
  const knownProfitIdsRef = useRef<Set<string>>(new Set());
  const knownProfitStatusesRef = useRef<Map<string, UserSubReferralStatus>>(new Map());
  const phoneMenuRef = useRef<HTMLDivElement | null>(null);

  // Auto-dismiss new seeker / referral sound alert notification toast after 7s
  useEffect(() => {
    if (!newSubmissionToast) return;
    const timer = setTimeout(() => {
      setNewSubmissionToast(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [newSubmissionToast]);

  // Close full-screen document/selfie viewer on Escape key
  useEffect(() => {
    if (!fullScreenPreview) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFullScreenPreview(null);
        setFullScreenZoom(1);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [fullScreenPreview]);

  const isMainAdminAccount = Boolean(
    authUser?.email && authUser.email.trim().toLowerCase() === MAIN_ADMIN_EMAIL
  );
  const accountStatus: AccountStatus = verificationSubmission?.status || 'unactive';
  const hasSubmittedSubscription = Boolean(
    verificationSubmission &&
      (verificationSubmission.status === 'pending_review' ||
        verificationSubmission.status === 'active')
  );
  const isApprovedTenant = Boolean(
    authUser &&
      (verificationSubmission?.plan === 'tenant' || selectedPlan === 'tenant') &&
      accountStatus === 'active' &&
      (!isMainAdminAccount || !showAdminPinModal || adminPinVerified)
  );
  const canReviewReferrals = Boolean(
    isApprovedTenant && (isMainAdminAccount || isMainTenantLinkTenant)
  );
  const isApprovedUser = Boolean(
    authUser &&
      !isMainAdminAccount &&
      (verificationSubmission?.plan === 'user' || selectedPlan === 'user') &&
      accountStatus === 'active'
  );

  const [userLocation, setUserLocation] = useState<GeoLocationData>({
    lat: 40.7128,
    lng: -74.0060,
    timestamp: Date.now(),
    source: 'preset',
  });

  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom?: number; bounds?: Array<[number, number]>; timestamp: number } | null>(null);
  const [selectedTile, setSelectedTile] = useState<MapTileStyle>(() => {
    try {
      const saved = localStorage.getItem(MAP_TILE_STORAGE_KEY);
      if (saved === 'satellite' || saved === 'osm') return saved;
    } catch {
      // Ignore storage error
    }
    return 'osm';
  });
  const [is3D, setIs3D] = useState(false);
  const [routePath, setRoutePath] = useState<[number, number][] | null>(null);
  const [navigationRoute, setNavigationRoute] = useState<NavigationRoute | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);
  const arrivedAnnouncedRef = useRef(false);
  const userPannedDuringNavRef = useRef(false);
  const userZoomedDuringNavRef = useRef(false);
  const mapRef = useRef<L.Map | null>(null);
  const bgMapRef = useRef<L.Map | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const [referralSearch, setReferralSearch] = useState('');
  const [seekersSearch, setSeekersSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [invitedByCode] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get('invite')?.trim();
      if (fromUrl && /^[a-zA-Z0-9_-]{4,32}$/.test(fromUrl)) {
        localStorage.setItem(INVITE_STORAGE_KEY, fromUrl);
        return fromUrl;
      }
      return localStorage.getItem(INVITE_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => createBlankProfile());
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);
  const [privacyClearedMsg, setPrivacyClearedMsg] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(true);
  const [showSelfieLogoModal, setShowSelfieLogoModal] = useState(false);
  const lastGeocodedCoordsRef = useRef<string>('');

  const activeInviteCode =
    userProfile.inviteCode ||
    (authUser ? `TG${authUser.uid.slice(0, 8).toUpperCase()}` : 'TIMEGIG1');
  const userSubInviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?invite=${activeInviteCode}`
      : `https://timegig.app/?invite=${activeInviteCode}`;

  const myReferrerEntries = useMemo(() => {
    const map = new Map<string, TenantReferralProfitItem>();
    for (const p of tenantReferralProfits) {
      map.set(p.referralUid, {
        ...p,
        subscriptionAmount: getSubscriptionAmount(p.plan),
        profitAmount: getReferralProfitAmount(p.plan),
      });
    }
    if (canReviewReferrals) {
      for (const r of userSubReferrals) {
        if (Boolean(r.invitedBy) && r.invitedBy === activeInviteCode) {
          const existing = map.get(r.uid);
          const docCount = r.paymentDocCount ?? (r.status === 'approved' ? 1 : 0);
          map.set(r.uid, {
            referralUid: r.uid,
            referrerUid: authUser?.uid || '',
            invitedBy: r.invitedBy,
            referralName: r.applicantName,
            plan: r.plan,
            subscriptionAmount: getSubscriptionAmount(r.plan),
            profitAmount: getReferralProfitAmount(r.plan),
            paymentDocCount: existing ? (r.paymentDocCount ?? existing.paymentDocCount) : docCount,
            hasProofOfPayment: existing ? existing.hasProofOfPayment : docCount > 0,
            status: r.status,
            submittedAt: r.submittedAt,
            creditedAt: existing?.creditedAt,
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.submittedAt - a.submittedAt);
  }, [tenantReferralProfits, canReviewReferrals, userSubReferrals, activeInviteCode, authUser?.uid]);

  const approvedMyReferrals = useMemo(
    () => myReferrerEntries.filter((p) => p.status === 'approved'),
    [myReferrerEntries]
  );
  const approvedMyUserSubs = useMemo(
    () => approvedMyReferrals.filter((p) => p.plan === 'user'),
    [approvedMyReferrals]
  );
  const approvedMyTenantSubs = useMemo(
    () => approvedMyReferrals.filter((p) => p.plan === 'tenant'),
    [approvedMyReferrals]
  );
  const approvedMyUserSubTotal = useMemo(
    () => approvedMyUserSubs.reduce((sum, p) => sum + p.profitAmount, 0),
    [approvedMyUserSubs]
  );
  const approvedMyTenantSubTotal = useMemo(
    () => approvedMyTenantSubs.reduce((sum, p) => sum + p.profitAmount, 0),
    [approvedMyTenantSubs]
  );
  const approvedMyMonthlyProfit = approvedMyUserSubTotal + approvedMyTenantSubTotal;

  const pendingSubmissionsCount = canReviewReferrals
    ? userSubReferrals.filter((item) => item.status === 'pending_review').length
    : isApprovedTenant
    ? myReferrerEntries.filter((item) => item.status === 'pending_review').length
    : 0;

  const profileLogoSrc = userProfile.logoDataUrl || verificationSubmission?.selfieDataUrl || '';
  const logoLastUpdated =
    userProfile.logoUpdatedAt ||
    (verificationSubmission?.selfieDataUrl ? verificationSubmission.submittedAt : undefined);
  const msSinceLogoUpdate = logoLastUpdated ? Date.now() - logoLastUpdated : Infinity;
  const canUpdateLogo = !logoLastUpdated || msSinceLogoUpdate >= LOGO_COOLDOWN_MS;
  const daysUntilLogoUpdate =
    logoLastUpdated && !canUpdateLogo
      ? Math.max(1, Math.ceil((LOGO_COOLDOWN_MS - msSinceLogoUpdate) / (24 * 60 * 60 * 1000)))
      : 0;

  // Listen to Firebase Auth state & sync private profile / live subscription / invite code
  useEffect(() => {
    let unsubscribeSub: (() => void) | null = null;
    let unsubscribeLinkTenant: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeSub) {
        unsubscribeSub();
        unsubscribeSub = null;
      }
      if (unsubscribeLinkTenant) {
        unsubscribeLinkTenant();
        unsubscribeLinkTenant = null;
      }

      setAuthUser(user);
      if (!user) {
        setUserProfile(createBlankProfile());
        setVerificationSubmission(null);
        setSelectedPlan(null);
        setPendingPlanForVerification(null);
        setIsMainTenantLinkTenant(false);
        setSelectedReferralFiles([]);
        setFullScreenPreview(null);
        setFullScreenZoom(1);
        setDestination(null);
        setRoutePath(null);
        setNavigationRoute(null);
        setIsNavigating(false);
        ladyVoiceNavigator.stop();
        setSearchQuery('');
        setSearchResults([]);
        setReferralSearch('');
        setSeekersSearch('');
        setRequiresSubscriptionFirst(false);
        setShowSignupCongratsModal(false);
        setShowAdminPinModal(false);
        setAdminPinVerified(false);
        setUserSubReferrals([]);
        setTenantReferralProfits([]);
        setReferralFilterStatus('all');
        setReferralNetworkOnly(false);
        setSelectedReferral(null);
        setRejectTargetItem(null);
        setRejectionReasonInput('');
        setRejectionReasonError(null);
        setNewSubmissionToast(null);
        isFirstReferralSnapshotRef.current = true;
        hasPlayedInitialPendingAlertRef.current = false;
        isFirstProfitSnapshotRef.current = true;
        knownReferralIdsRef.current.clear();
        knownReferralStatusesRef.current.clear();
        knownProfitIdsRef.current.clear();
        knownProfitStatusesRef.current.clear();
        setWelcomeBackName(null);
        setViewMode((prev) => (prev === 'tenant' || prev === 'profile' ? 'map' : prev));
        return;
      }

      const derivedInviteCode = `TG${user.uid.slice(0, 8).toUpperCase()}`;
      const userProfileKey = getProfileStorageKey(user.uid);
      const userSubKey = getVerificationStorageKey(user.uid);

      // Restore this user's isolated local cache immediately before remote sync
      try {
        const cachedSub = localStorage.getItem(userSubKey);
        if (cachedSub) {
          const parsedSub = JSON.parse(cachedSub) as VerificationSubmission;
          setVerificationSubmission(parsedSub);
          setSelectedPlan(parsedSub.plan);
        } else {
          setVerificationSubmission(null);
          setSelectedPlan(null);
        }
      } catch {
        setVerificationSubmission(null);
        setSelectedPlan(null);
      }

      try {
        const cachedProf = localStorage.getItem(userProfileKey);
        if (cachedProf) {
          const parsedProf = JSON.parse(cachedProf) as UserProfile;
          setUserProfile(parsedProf);
          setIsEditingProfile(!parsedProf.isLocked);
        } else {
          setUserProfile(createBlankProfile(user.email || '', derivedInviteCode));
          setIsEditingProfile(true);
        }
      } catch {
        setUserProfile(createBlankProfile(user.email || '', derivedInviteCode));
        setIsEditingProfile(true);
      }

      const isAdminEmail = (user.email || '').trim().toLowerCase() === MAIN_ADMIN_EMAIL;
      if (!isAdminEmail) {
        try {
          if (localStorage.getItem(`timegig_needs_sub_${user.uid}`) === '1') {
            setRequiresSubscriptionFirst(true);
          }
        } catch {
          // Ignore storage read error
        }
      } else {
        setRequiresSubscriptionFirst(false);
        setShowSignupCongratsModal(false);
      }

      const profileRef = doc(db, 'users', user.uid, 'private', 'profile');

      try {
        const snap = await getDoc(profileRef);
        if (snap.exists()) {
          const data = snap.data() as Partial<UserProfile>;
          const merged: UserProfile = {
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || user.email || '',
            contactInfo: data.contactInfo || '',
            locationName: data.locationName || '',
            autoLocation: data.autoLocation ?? true,
            socialLinks: Array.isArray(data.socialLinks) ? data.socialLinks : [],
            isLocked: Boolean(data.isLocked),
            logoDataUrl: data.logoDataUrl || undefined,
            logoUpdatedAt: data.logoUpdatedAt || undefined,
            inviteCode: data.inviteCode || derivedInviteCode,
            invitedBy: data.invitedBy || invitedByCode || undefined,
          };
          setUserProfile(merged);
          setIsEditingProfile(!merged.isLocked);
          try {
            localStorage.setItem(userProfileKey, JSON.stringify(merged));
          } catch {
            // Ignore localStorage error
          }
        } else {
          const displayParts = (user.displayName || '').trim().split(/\s+/);
          const initialProfile: UserProfile = {
            firstName: displayParts[0] || '',
            lastName: displayParts.slice(1).join(' ') || '',
            email: user.email || '',
            contactInfo: '',
            locationName: '',
            autoLocation: true,
            socialLinks: [],
            isLocked: false,
            inviteCode: derivedInviteCode,
            ...(invitedByCode ? { invitedBy: invitedByCode } : {}),
          };
          setUserProfile(initialProfile);
          setIsEditingProfile(true);
          await setDoc(profileRef, {
            uid: user.uid,
            firstName: initialProfile.firstName.slice(0, 80),
            lastName: initialProfile.lastName.slice(0, 80),
            email: initialProfile.email.slice(0, 160),
            contactInfo: '',
            locationName: '',
            autoLocation: true,
            socialLinks: [],
            isLocked: false,
            inviteCode: derivedInviteCode,
            ...(invitedByCode ? { invitedBy: invitedByCode.slice(0, 32) } : {}),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        // Ensure non-PII invite lookup exists
        const inviteRef = doc(db, 'invites', derivedInviteCode);
        const inviteSnap = await getDoc(inviteRef);
        if (!inviteSnap.exists()) {
          await setDoc(inviteRef, {
            inviteCode: derivedInviteCode,
            ownerUid: user.uid,
            createdAt: serverTimestamp(),
          });
        }

        // Register Main Tenant invite code so Tenants who join via this link inherit Main Tenant permissions upon approval
        if (isAdminEmail) {
          const mainInviteRef = doc(db, 'mainTenantInvites', derivedInviteCode);
          const mainInviteSnap = await getDoc(mainInviteRef);
          if (!mainInviteSnap.exists()) {
            await setDoc(mainInviteRef, {
              inviteCode: derivedInviteCode,
              ownerUid: user.uid,
              createdAt: serverTimestamp(),
            });
          }
        }
      } catch (err) {
        console.warn('Profile sync warning:', err);
      }

      // Live listener for approved main-tenant-link tenant status & tenant invite-chain registration
      if (!isAdminEmail) {
        const linkTenantRef = doc(db, 'approvedLinkTenants', user.uid);
        unsubscribeLinkTenant = onSnapshot(
          linkTenantRef,
          (snap) => {
            const approved = snap.exists();
            setIsMainTenantLinkTenant(approved);
            if (approved) {
              const ownInviteRef = doc(db, 'invites', derivedInviteCode);
              const ownMainInviteRef = doc(db, 'mainTenantInvites', derivedInviteCode);
              getDoc(ownInviteRef)
                .then((invSnap) => {
                  if (!invSnap.exists()) {
                    return setDoc(ownInviteRef, {
                      inviteCode: derivedInviteCode,
                      ownerUid: user.uid,
                      createdAt: serverTimestamp(),
                    });
                  }
                })
                .then(() => getDoc(ownMainInviteRef))
                .then((mainInvSnap) => {
                  if (!mainInvSnap.exists()) {
                    return setDoc(ownMainInviteRef, {
                      inviteCode: derivedInviteCode,
                      ownerUid: user.uid,
                      createdAt: serverTimestamp(),
                    });
                  }
                })
                .catch(() => {
                  // Ignore background invite chain registration error
                });
            }
          },
          () => {
            setIsMainTenantLinkTenant(false);
          }
        );
      } else {
        setIsMainTenantLinkTenant(false);
      }

      // Live listener for one-time subscription & approval status updates
      const subPath = `users/${user.uid}/private/subscription`;
      const subRef = doc(db, 'users', user.uid, 'private', 'subscription');
      let resolvedProfileName = (user.displayName || '').trim();
      let resolvedProfileContact = '';
      let resolvedProfileLocation = '';
      let resolvedProfileInvitedBy = invitedByCode || '';
      try {
        const latestProfSnap = await getDoc(profileRef);
        if (latestProfSnap.exists()) {
          const pData = latestProfSnap.data() as Partial<UserProfile>;
          resolvedProfileName =
            [pData.firstName, pData.lastName].filter(Boolean).join(' ').trim() || resolvedProfileName;
          resolvedProfileContact = pData.contactInfo || '';
          resolvedProfileLocation = pData.locationName || '';
          resolvedProfileInvitedBy = pData.invitedBy || invitedByCode || '';
        }
      } catch {
        // Ignore profile lookup fallback failure
      }

      unsubscribeSub = onSnapshot(
        subRef,
        (subSnap) => {
          if (!subSnap.exists()) {
            if (isAdminEmail) {
              setShowAdminPinModal(true);
            }
            return;
          }
          const subData = subSnap.data() as {
            plan: SubscriptionPlan;
            status: AccountStatus;
            submittedAt: number;
            docNames?: string[];
            paymentDocNames?: string[];
            rejectionReason?: string;
          };
          const syncedSub: VerificationSubmission = {
            plan: subData.plan,
            selfieDataUrl: '',
            idDocuments: (subData.docNames || ['Verified ID']).map((name, idx) => ({
              id: `synced-${idx}`,
              name,
              size: 0,
              type: 'application/octet-stream',
            })),
            proofOfPaymentDocuments: (subData.paymentDocNames || []).map((name, idx) => ({
              id: `synced-pay-${idx}`,
              name,
              size: 0,
              type: 'application/octet-stream',
            })),
            submittedAt: subData.submittedAt || Date.now(),
            status: subData.status || 'pending_review',
            ...(subData.status === 'rejected' && subData.rejectionReason
              ? { rejectionReason: subData.rejectionReason }
              : {}),
          };
          setVerificationSubmission(syncedSub);
          setSelectedPlan(syncedSub.plan);
          setRequiresSubscriptionFirst(false);

          if (isAdminEmail && !(syncedSub.plan === 'tenant' && syncedSub.status === 'active')) {
            setShowAdminPinModal(true);
          }

          // Ensure existing pending applications appear in Referrals review queue & referrer profit ledger
          if (!isAdminEmail && (subData.plan === 'user' || subData.plan === 'tenant') && subData.status === 'pending_review') {
            const refDocRef = doc(db, 'userSubReferrals', user.uid);
            const fallbackName = (resolvedProfileName || user.email?.split('@')[0] || 'User Applicant').slice(0, 160);
            const fallbackPaymentCount = Math.min(20, Math.max(1, (subData.paymentDocNames || []).length || 1));
            const fallbackSubmittedAt = Math.floor(subData.submittedAt || Date.now());
            getDoc(refDocRef)
              .then((refSnap) => {
                if (!refSnap.exists()) {
                  return setDoc(refDocRef, {
                    uid: user.uid,
                    applicantName: fallbackName,
                    applicantEmail: (user.email || '').slice(0, 160),
                    contactInfo: (resolvedProfileContact || 'Not provided').slice(0, 80),
                    locationName: (resolvedProfileLocation || 'Location pending').slice(0, 200),
                    invitedBy: resolvedProfileInvitedBy.slice(0, 32),
                    plan: subData.plan,
                    status: 'pending_review',
                    docCount: Math.min(20, Math.max(1, (subData.docNames || []).length || 1)),
                    docNames: (subData.docNames && subData.docNames.length > 0 ? subData.docNames : ['Verified ID']).slice(0, 20),
                    ...(subData.paymentDocNames && subData.paymentDocNames.length > 0
                      ? {
                          paymentDocCount: Math.min(20, subData.paymentDocNames.length),
                          paymentDocNames: subData.paymentDocNames.slice(0, 20),
                        }
                      : {}),
                    hasSelfie: true,
                    submittedAt: fallbackSubmittedAt,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  });
                }
              })
              .then(() => {
                const cleanCode = resolvedProfileInvitedBy.trim().slice(0, 32);
                if (cleanCode.length < 4) return;
                return Promise.all([
                  getDoc(doc(db, 'invites', cleanCode)),
                  getDoc(doc(db, 'tenantReferralProfits', user.uid)),
                ]).then(([invSnap, profitSnap]) => {
                  if (!invSnap.exists() || profitSnap.exists()) return;
                  const referrerUid = (invSnap.data() as { ownerUid?: string }).ownerUid;
                  if (!referrerUid || referrerUid === user.uid) return;
                  return setDoc(doc(db, 'tenantReferralProfits', user.uid), {
                    referralUid: user.uid,
                    referrerUid,
                    invitedBy: cleanCode,
                    referralName: fallbackName,
                    plan: subData.plan,
                    subscriptionAmount: getSubscriptionAmount(subData.plan),
                    profitAmount: getReferralProfitAmount(subData.plan),
                    paymentDocCount: fallbackPaymentCount,
                    hasProofOfPayment: true,
                    status: 'pending_review',
                    submittedAt: fallbackSubmittedAt,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  });
                });
              })
              .catch(() => {
                // Ignore background backfill failure
              });
          }

          // Auto-grant link-tenant permissions for approved Tenants who joined via Main Tenant invite link
          if (!isAdminEmail && syncedSub.plan === 'tenant' && syncedSub.status === 'active' && resolvedProfileInvitedBy) {
            const mainInviteRef = doc(db, 'mainTenantInvites', resolvedProfileInvitedBy);
            const linkTenantRef = doc(db, 'approvedLinkTenants', user.uid);
            Promise.all([getDoc(mainInviteRef), getDoc(linkTenantRef)])
              .then(([mainInviteSnap, linkSnap]) => {
                if (mainInviteSnap.exists() && !linkSnap.exists()) {
                  return setDoc(linkTenantRef, {
                    uid: user.uid,
                    invitedBy: resolvedProfileInvitedBy.slice(0, 32),
                    approvedBy: user.uid,
                    plan: 'tenant',
                    createdAt: serverTimestamp(),
                  });
                }
              })
              .catch(() => {
                // Ignore background claim if not invited by main tenant
              });
          }

          if (syncedSub.plan === 'tenant' && syncedSub.status === 'active') {
            setViewMode((prev) => (prev === 'profile' ? 'tenant' : prev));
          } else if (syncedSub.plan === 'user' && syncedSub.status === 'active') {
            setViewMode((prev) => (prev === 'tenant' ? 'profile' : prev));
          } else if (syncedSub.status !== 'active') {
            setViewMode((prev) => (prev === 'tenant' || prev === 'profile' ? 'map' : prev));
          }
          try {
            localStorage.removeItem(`timegig_needs_sub_${user.uid}`);
            localStorage.setItem(getVerificationStorageKey(user.uid), JSON.stringify(syncedSub));
          } catch {
            // Ignore localStorage error
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, subPath);
        }
      );
    });

    return () => {
      if (unsubscribeSub) unsubscribeSub();
      if (unsubscribeLinkTenant) unsubscribeLinkTenant();
      unsubscribeAuth();
    };
  }, [invitedByCode]);

  // Listen to live Referrals & Verification queue for Main Tenant and Approved Main-Tenant-Link Tenants
  useEffect(() => {
    if (!authUser || !canReviewReferrals) {
      setUserSubReferrals([]);
      isFirstReferralSnapshotRef.current = true;
      hasPlayedInitialPendingAlertRef.current = false;
      knownReferralIdsRef.current.clear();
      knownReferralStatusesRef.current.clear();
      return;
    }

    const refCollectionPath = 'userSubReferrals';
    const q = query(collection(db, refCollectionPath), orderBy('submittedAt', 'desc'));
    const unsubscribeReferrals = onSnapshot(
      q,
      (snapshot) => {
        const items: UserSubReferralItem[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data() as Partial<UserSubReferralItem>;
          return {
            uid: d.uid || docSnap.id,
            applicantName: d.applicantName || 'User Applicant',
            applicantEmail: d.applicantEmail || '',
            contactInfo: d.contactInfo || '',
            locationName: d.locationName || '',
            invitedBy: d.invitedBy || '',
            plan: (d.plan as any) || 'user',
            status: d.status || 'pending_review',
            docCount: typeof d.docCount === 'number' ? d.docCount : 1,
            docNames: Array.isArray(d.docNames) ? d.docNames : [],
            paymentDocCount: typeof d.paymentDocCount === 'number' ? d.paymentDocCount : undefined,
            paymentDocNames: Array.isArray(d.paymentDocNames) ? d.paymentDocNames : undefined,
            hasSelfie: Boolean(d.hasSelfie),
            submittedAt: typeof d.submittedAt === 'number' ? d.submittedAt : Date.now(),
            reviewedBy: d.reviewedBy,
            rejectionReason: typeof d.rejectionReason === 'string' ? d.rejectionReason : undefined,
            resubmittedCount: typeof d.resubmittedCount === 'number' ? d.resubmittedCount : undefined,
            previousRejectionReason:
              typeof d.previousRejectionReason === 'string' ? d.previousRejectionReason : undefined,
            resubmittedAt: typeof d.resubmittedAt === 'number' ? d.resubmittedAt : undefined,
          };
        });

        // Sound alert triggered on initial pending submissions, new seekers/referrals, or rejected resubmissions
        if (isFirstReferralSnapshotRef.current) {
          isFirstReferralSnapshotRef.current = false;
          snapshot.docs.forEach((docSnap) => {
            knownReferralIdsRef.current.add(docSnap.id);
            const st = (docSnap.data() as Partial<UserSubReferralItem>).status || 'pending_review';
            knownReferralStatusesRef.current.set(docSnap.id, st);
          });
          if (
            !hasPlayedInitialPendingAlertRef.current &&
            items.some((item) => item.status === 'pending_review')
          ) {
            hasPlayedInitialPendingAlertRef.current = true;
            soundEngine.playNewSubmissionAlert();
          }
        } else {
          let hasNewSubmission = false;
          let latestNewItem: UserSubReferralItem | null = null;
          let latestIsResubmitted = false;

          for (const change of snapshot.docChanges()) {
            const d = change.doc.data() as Partial<UserSubReferralItem>;
            const nextStatus: UserSubReferralStatus = d.status || 'pending_review';
            const prevStatus = knownReferralStatusesRef.current.get(change.doc.id);

            const isNewlyAdded =
              change.type === 'added' && !knownReferralIdsRef.current.has(change.doc.id);
            const isResubmitted =
              change.type === 'modified' &&
              prevStatus === 'rejected' &&
              nextStatus === 'pending_review';

            knownReferralIdsRef.current.add(change.doc.id);
            knownReferralStatusesRef.current.set(change.doc.id, nextStatus);

            if (isNewlyAdded || isResubmitted) {
              hasNewSubmission = true;
              latestIsResubmitted = isResubmitted;
              latestNewItem = {
                uid: d.uid || change.doc.id,
                applicantName: d.applicantName || 'New User',
                applicantEmail: d.applicantEmail || '',
                contactInfo: d.contactInfo || '',
                locationName: d.locationName || '',
                invitedBy: d.invitedBy || '',
                plan: (d.plan as SubscriptionPlan) || 'user',
                status: nextStatus,
                docCount: typeof d.docCount === 'number' ? d.docCount : 1,
                docNames: Array.isArray(d.docNames) ? d.docNames : [],
                paymentDocCount: typeof d.paymentDocCount === 'number' ? d.paymentDocCount : undefined,
                paymentDocNames: Array.isArray(d.paymentDocNames) ? d.paymentDocNames : undefined,
                hasSelfie: Boolean(d.hasSelfie),
                submittedAt: typeof d.submittedAt === 'number' ? d.submittedAt : Date.now(),
                reviewedBy: d.reviewedBy,
                rejectionReason: typeof d.rejectionReason === 'string' ? d.rejectionReason : undefined,
                resubmittedCount:
                  typeof d.resubmittedCount === 'number' ? d.resubmittedCount : undefined,
                previousRejectionReason:
                  typeof d.previousRejectionReason === 'string'
                    ? d.previousRejectionReason
                    : undefined,
                resubmittedAt: typeof d.resubmittedAt === 'number' ? d.resubmittedAt : undefined,
              };
            }
          }

          if (hasNewSubmission && latestNewItem) {
            const newItem: UserSubReferralItem = latestNewItem;
            soundEngine.playNewSubmissionAlert();
            const isRef = Boolean(newItem.invitedBy);
            setNewSubmissionToast({
              name: newItem.applicantName,
              type: isRef ? 'Referral' : 'Seeker',
              invitedBy: newItem.invitedBy,
              isResubmitted: latestIsResubmitted,
              submittedAt: Date.now(),
            });
          }
        }

        setUserSubReferrals(items);
        setReferralAdminError(null);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, refCollectionPath);
      }
    );

    return () => unsubscribeReferrals();
  }, [authUser, canReviewReferrals]);

  // Listen to live referrer subscription proof-of-payment profits for ANY approved Tenant Wallet
  useEffect(() => {
    const isVerifiedSession = Boolean(
      authUser &&
        (authUser.emailVerified ||
          authUser.providerData.some((provider) => provider.providerId === 'password'))
    );
    if (!authUser || !isApprovedTenant || !isVerifiedSession) {
      setTenantReferralProfits([]);
      isFirstProfitSnapshotRef.current = true;
      knownProfitIdsRef.current.clear();
      knownProfitStatusesRef.current.clear();
      return;
    }

    const profitsPath = 'tenantReferralProfits';
    const profitsQuery = query(
      collection(db, profitsPath),
      where('referrerUid', '==', authUser.uid)
    );
    const unsubscribeProfits = onSnapshot(
      profitsQuery,
      (snapshot) => {
        const profitItems: TenantReferralProfitItem[] = snapshot.docs
          .map((docSnap) => {
            const d = docSnap.data() as Partial<TenantReferralProfitItem>;
            const plan: SubscriptionPlan = d.plan === 'tenant' ? 'tenant' : 'user';
            return {
              referralUid: d.referralUid || docSnap.id,
              referrerUid: d.referrerUid || authUser.uid,
              invitedBy: d.invitedBy || '',
              referralName: d.referralName || 'Referral Applicant',
              plan,
              subscriptionAmount:
                typeof d.subscriptionAmount === 'number'
                  ? d.subscriptionAmount
                  : getSubscriptionAmount(plan),
              profitAmount: getReferralProfitAmount(plan),
              paymentDocCount: typeof d.paymentDocCount === 'number' ? d.paymentDocCount : 1,
              hasProofOfPayment: Boolean(d.hasProofOfPayment ?? true),
              status: d.status || 'pending_review',
              submittedAt: typeof d.submittedAt === 'number' ? d.submittedAt : Date.now(),
              creditedAt: typeof d.creditedAt === 'number' ? d.creditedAt : undefined,
            };
          })
          .sort((a, b) => b.submittedAt - a.submittedAt);

        if (isFirstProfitSnapshotRef.current) {
          isFirstProfitSnapshotRef.current = false;
          snapshot.docs.forEach((docSnap) => {
            knownProfitIdsRef.current.add(docSnap.id);
            const st = (docSnap.data() as Partial<TenantReferralProfitItem>).status || 'pending_review';
            knownProfitStatusesRef.current.set(docSnap.id, st);
          });
        } else if (!canReviewReferrals) {
          let triggerProfitAlert = false;
          for (const change of snapshot.docChanges()) {
            const d = change.doc.data() as Partial<TenantReferralProfitItem>;
            const nextStatus: UserSubReferralStatus = d.status || 'pending_review';
            const prevStatus = knownProfitStatusesRef.current.get(change.doc.id);
            const isAdded = change.type === 'added' && !knownProfitIdsRef.current.has(change.doc.id);
            const isResubmittedOrApproved =
              change.type === 'modified' &&
              ((prevStatus === 'rejected' && nextStatus === 'pending_review') ||
                (prevStatus !== 'approved' && nextStatus === 'approved'));
            knownProfitIdsRef.current.add(change.doc.id);
            knownProfitStatusesRef.current.set(change.doc.id, nextStatus);
            if (isAdded || isResubmittedOrApproved) {
              triggerProfitAlert = true;
            }
          }
          if (triggerProfitAlert) {
            soundEngine.playNewSubmissionAlert();
          }
        } else {
          snapshot.docs.forEach((docSnap) => {
            knownProfitIdsRef.current.add(docSnap.id);
            const st = (docSnap.data() as Partial<TenantReferralProfitItem>).status || 'pending_review';
            knownProfitStatusesRef.current.set(docSnap.id, st);
          });
        }

        setTenantReferralProfits(profitItems);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, profitsPath);
      }
    );

    return () => unsubscribeProfits();
  }, [authUser, isApprovedTenant, canReviewReferrals]);

  // Preload Referral face selfies so every Referral card displays the applicant's face selfie
  useEffect(() => {
    const isVerifiedSession = Boolean(
      authUser &&
        (authUser.emailVerified ||
          authUser.providerData.some((provider) => provider.providerId === 'password'))
    );
    if (!authUser || !isApprovedTenant || !isVerifiedSession) {
      return;
    }

    const targets = new Map<string, string>();
    if (canReviewReferrals) {
      for (const item of userSubReferrals) {
        targets.set(item.uid, `${item.submittedAt}_${item.resubmittedAt || 0}`);
      }
    }
    for (const profitItem of tenantReferralProfits) {
      if (!targets.has(profitItem.referralUid)) {
        targets.set(profitItem.referralUid, `${profitItem.submittedAt}`);
      }
    }

    let cancelled = false;
    targets.forEach((sig, uid) => {
      if (fetchedSelfieSignaturesRef.current[uid] === sig) return;
      fetchedSelfieSignaturesRef.current[uid] = sig;

      const selfiePath = `userSubReferrals/${uid}/files/selfie`;
      getDoc(doc(db, 'userSubReferrals', uid, 'files', 'selfie'))
        .then((snap) => {
          if (cancelled || !snap.exists()) return;
          const data = snap.data() as Partial<VerificationArtifactFile>;
          if (typeof data.dataUrl === 'string' && data.dataUrl.length > 0) {
            setReferralSelfies((prev) =>
              prev[uid] === data.dataUrl ? prev : { ...prev, [uid]: data.dataUrl as string }
            );
          }
        })
        .catch((err) => {
          if (!cancelled) {
            handleFirestoreError(err, OperationType.GET, selfiePath);
          }
        });
    });

    return () => {
      cancelled = true;
    };
  }, [authUser, isApprovedTenant, canReviewReferrals, userSubReferrals, tenantReferralProfits]);

  // Listen to live active Gig Posts on the map
  useEffect(() => {
    const isVerifiedSession = Boolean(
      authUser &&
        (authUser.emailVerified ||
          authUser.providerData.some((provider) => provider.providerId === 'password'))
    );
    if (!authUser || !isVerifiedSession) {
      setGigPosts([]);
      return;
    }

    const gigsPath = 'gigPosts';
    const gigsQuery = query(collection(db, gigsPath), where('status', 'in', ['active', 'completed', 'cancelled']));
    const unsubscribeGigs = onSnapshot(
      gigsQuery,
      (snapshot) => {
        const loaded: GigPost[] = snapshot.docs
          .map((docSnap) => {
            const d = docSnap.data() as Partial<GigPost>;
            return {
              gigId: d.gigId || docSnap.id,
              creatorUid: d.creatorUid || '',
              creatorName: d.creatorName || 'TimeGiG User',
              creatorSelfieUrl: d.creatorSelfieUrl || '',
              title: d.title || 'Gig Opportunity',
              category: d.category || 'Other',
              budget: d.budget || 'Negotiable',
              description: d.description || '',
              contactInfo: d.contactInfo || '',
              locationName: d.locationName || 'Pinned Location',
              lat: typeof d.lat === 'number' ? d.lat : 0,
              lng: typeof d.lng === 'number' ? d.lng : 0,
              status: (d.status === 'completed' ? 'completed' : d.status === 'cancelled' ? 'cancelled' : 'active') as GigPost['status'],
              submittedAt: typeof d.submittedAt === 'number' ? d.submittedAt : Date.now(),
              applicantUid: d.applicantUid || '',
              applicantName: d.applicantName || '',
              applicantSelfieUrl: d.applicantSelfieUrl || '',
              applicationStatus: d.applicationStatus || 'none',
              applicationTries: typeof d.applicationTries === 'number' ? d.applicationTries : 0,
              completedUserUid: d.completedUserUid || '',
              completedUserName: d.completedUserName || '',
              rating: typeof d.rating === 'number' ? d.rating : undefined,
              cancellationReason: d.cancellationReason || '',
              cancelledByUid: d.cancelledByUid || '',
              cancelledByName: d.cancelledByName || '',
            };
          })
          .filter((g) => Number.isFinite(g.lat) && Number.isFinite(g.lng))
          .sort((a, b) => b.submittedAt - a.submittedAt);

        setGigPosts(loaded);

        // Keep selectedGigPost synced with real-time updates
        setSelectedGigPost((prev) => {
          if (!prev) return null;
          const fresh = loaded.find((g) => g.gigId === prev.gigId);
          return fresh || prev;
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, gigsPath);
      }
    );

    return () => unsubscribeGigs();
  }, [authUser]);

  // Debounced location suggestions search when typing location manually in Create Gig modal
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (gigLocationSearchQuery.trim().length >= 2) {
        setIsSearchingGigLocationInput(true);
        const results = await searchLocations(gigLocationSearchQuery);
        setGigLocationSuggestions(results || []);
        setIsSearchingGigLocationInput(false);
      } else {
        setGigLocationSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [gigLocationSearchQuery]);

  // Listen to Lady Voice speaking state
  useEffect(() => {
    const unsubscribe = ladyVoiceNavigator.onStatusChange(setIsVoiceSpeaking);
    return unsubscribe;
  }, []);

  // Close phone menu when clicking outside
  useEffect(() => {
    if (!showPhoneMenu) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (phoneMenuRef.current && !phoneMenuRef.current.contains(e.target as Node)) {
        setShowPhoneMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [showPhoneMenu]);

  // Start continuous position watching & auto-advance lady voice navigation
  useEffect(() => {
    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude: lat, longitude: lng } = position.coords;
          setUserLocation(prev => ({
            ...prev,
            lat,
            lng,
            timestamp: position.timestamp,
            source: 'gps',
          }));

          if (isNavigating && !userPannedDuringNavRef.current) {
            setFlyToTarget({ lat, lng, timestamp: Date.now() });
          }
        },
        (error) => console.warn('GPS error:', error),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [isNavigating]);

  // Auto-advance spoken turn-by-turn steps as GPS position moves
  useEffect(() => {
    if (!isNavigating || !navigationRoute || !destination) return;

    const distToDestMeters = calculateDistance(userLocation.lat, userLocation.lng, destination.lat, destination.lng) * 1000;
    if (distToDestMeters <= 50 && !arrivedAnnouncedRef.current) {
      arrivedAnnouncedRef.current = true;
      const lastIdx = Math.max(0, navigationRoute.steps.length - 1);
      setCurrentStepIndex(lastIdx);
      ladyVoiceNavigator.speak('You have arrived.');
      return;
    }

    const nextIdx = currentStepIndex + 1;
    if (nextIdx < navigationRoute.steps.length) {
      const nextStep = navigationRoute.steps[nextIdx];
      const distToNextMeters = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        nextStep.location[0],
        nextStep.location[1]
      ) * 1000;
      if (distToNextMeters <= 45) {
        setCurrentStepIndex(nextIdx);
        ladyVoiceNavigator.speak(nextStep.instruction);
      }
    }
  }, [userLocation.lat, userLocation.lng, isNavigating, navigationRoute, destination, currentStepIndex]);

  const startNavigationTo = async (lat: number, lng: number, displayName: string) => {
    const shortName = displayName.split(',')[0].trim() || 'Destination';
    arrivedAnnouncedRef.current = false;
    userPannedDuringNavRef.current = false;
    userZoomedDuringNavRef.current = false;
    setViewMode('map');
    setIs3D(true);
    setIsNavigating(true);
    setDestination({ lat, lng, name: shortName });
    setCurrentStepIndex(0);
    setFlyToTarget({ lat, lng, zoom: mapRef.current?.getZoom() ?? 15, timestamp: Date.now() });
    setSearchQuery('');
    setSearchResults(undefined);

    const nav = await fetchRouteWithSteps([userLocation.lat, userLocation.lng], [lat, lng]);
    if (nav) {
      setNavigationRoute(nav);
      setRoutePath(nav.coordinates);
      if (nav.coordinates.length > 1 && !userZoomedDuringNavRef.current) {
        setFlyToTarget({ lat, lng, bounds: nav.coordinates, timestamp: Date.now() });
      }
      const distText = formatSpokenDistance(nav.distanceMeters);
      const firstInstruction = nav.steps[0]?.instruction || `Head to ${shortName}.`;
      ladyVoiceNavigator.speak(
        `${distText} to ${shortName}. ${firstInstruction}`,
        { playChime: true }
      );
    }
  };

  const handleSelectSuggestion = async (latStr: string, lonStr: string, displayName: string) => {
    soundEngine.playFeatureClick();
    const lat = parseFloat(latStr);
    const lng = parseFloat(lonStr);
    await startNavigationTo(lat, lng, displayName);
  };

  const handleStopNavigation = () => {
    soundEngine.playFeatureClick();
    ladyVoiceNavigator.stop();
    setIs3D(false);
    setIsNavigating(false);
    setRoutePath(null);
    setNavigationRoute(null);
    setDestination(null);
    setCurrentStepIndex(0);
    arrivedAnnouncedRef.current = false;
  };

  const handleBackToLocation = () => {
    soundEngine.playFeatureClick();
    ladyVoiceNavigator.stop();
    setIs3D(false);
    setIsNavigating(false);
    setRoutePath(null);
    setNavigationRoute(null);
    setDestination(null);
    setCurrentStepIndex(0);
    arrivedAnnouncedRef.current = false;
    setFlyToTarget({ lat: userLocation.lat, lng: userLocation.lng, zoom: 16, timestamp: Date.now() });
  };

  const handleStartCreateGig = () => {
    soundEngine.playFeatureClick();
    setShowPhoneMenu(false);
    if (!authUser) {
      setShowAuthModal(true);
      return;
    }
    setSelectedGigPost(null);
    setShowCreateGigModal(false);
    setViewMode('map');
    setIsPickingGigLocation(true);
  };

  const handlePickGigLocationAt = async (lat: number, lng: number) => {
    soundEngine.playFeatureClick();
    setIsPickingGigLocation(false);
    const fallbackCoordsLabel = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    setGigDraftLocation({ lat, lng, address: fallbackCoordsLabel });
    setGigLocationSearchQuery(fallbackCoordsLabel);
    setGigLocationSuggestions([]);
    if (!gigFormContact.trim()) {
      setGigFormContact(userProfile.contactInfo.trim() || authUser?.email || '');
    }
    setGigFormError(null);
    setShowCreateGigModal(true);

    const resolvedAddress = await reverseGeocode(lat, lng);
    if (resolvedAddress) {
      setGigDraftLocation((prev) =>
        prev && Math.abs(prev.lat - lat) < 0.00001 && Math.abs(prev.lng - lng) < 0.00001
          ? { ...prev, address: resolvedAddress.slice(0, 200) }
          : prev
      );
      setGigLocationSearchQuery((prevQuery) =>
        prevQuery === fallbackCoordsLabel ? resolvedAddress.slice(0, 200) : prevQuery
      );
    }
  };

  const handleSelectGigLocationSuggestion = (latStr: string, lonStr: string, displayName: string) => {
    soundEngine.playFeatureClick();
    const lat = parseFloat(latStr);
    const lng = parseFloat(lonStr);
    setGigDraftLocation({ lat, lng, address: displayName.slice(0, 200) });
    setGigLocationSearchQuery(displayName);
    setGigLocationSuggestions([]);
  };

  const handlePublishGigPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !gigDraftLocation) return;

    const title = gigFormTitle.trim().slice(0, 100);
    const budget = gigFormBudget.trim().slice(0, 40);
    const description = gigFormDescription.trim().slice(0, 500);
    const contactInfo = gigFormContact.trim().slice(0, 80);
    const locationName = (
      gigDraftLocation.address.trim() ||
      `${gigDraftLocation.lat.toFixed(5)}, ${gigDraftLocation.lng.toFixed(5)}`
    ).slice(0, 200);

    if (title.length < 2) {
      setGigFormError('Please enter a gig title (at least 2 characters).');
      return;
    }
    if (!budget) {
      setGigFormError('Please enter a pay or budget amount (e.g. R250).');
      return;
    }
    if (description.length < 3) {
      setGigFormError('Please describe the gig (at least 3 characters).');
      return;
    }
    if (contactInfo.length < 3) {
      setGigFormError('Please provide contact details (phone, WhatsApp, or email).');
      return;
    }

    soundEngine.playFeatureClick();
    setGigSubmitting(true);
    setGigFormError(null);

    const gigRef = doc(collection(db, 'gigPosts'));
    const gigPath = `gigPosts/${gigRef.id}`;
    const creatorName = (
      [userProfile.firstName.trim(), userProfile.lastName.trim()].filter(Boolean).join(' ') ||
      authUser.displayName ||
      authUser.email?.split('@')[0] ||
      'TimeGiG User'
    ).slice(0, 120);
    const submittedAt = Date.now();
    const lat = Number(gigDraftLocation.lat.toFixed(6));
    const lng = Number(gigDraftLocation.lng.toFixed(6));

    try {
      await setDoc(gigRef, {
        gigId: gigRef.id,
        creatorUid: authUser.uid,
        creatorName,
        creatorSelfieUrl: profileLogoSrc || userProfile.logoDataUrl || '',
        title,
        category: gigFormCategory,
        budget,
        description,
        contactInfo,
        locationName,
        lat,
        lng,
        status: 'active',
        applicationStatus: 'none',
        applicationTries: 0,
        submittedAt,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      soundEngine.playSuccessChime();
      setShowCreateGigModal(false);
      setGigFormTitle('');
      setGigFormBudget('');
      setGigFormDescription('');
      setGigDraftLocation(null);
      setViewMode('map');
      setFlyToTarget({ lat, lng, zoom: 16, timestamp: Date.now() });
    } catch (err: any) {
      setGigFormError(err?.message || 'Unable to publish gig post.');
      handleFirestoreError(err, OperationType.CREATE, gigPath);
    } finally {
      setGigSubmitting(false);
    }
  };

  const handleDeleteGigPost = async (gig: GigPost) => {
    if (!authUser) return;
    if (gig.creatorUid !== authUser.uid && !isMainAdminAccount) return;

    soundEngine.playFeatureClick();
    setDeletingGigId(gig.gigId);
    const gigPath = `gigPosts/${gig.gigId}`;
    try {
      await deleteDoc(doc(db, 'gigPosts', gig.gigId));
      setSelectedGigPost(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, gigPath);
    } finally {
      setDeletingGigId(null);
    }
  };

  const handleCompleteGigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !completingGigTarget) return;
    const workerName = completeWorkerName.trim().slice(0, 120) || 'Gig Worker';
    if (completeRating < 1 || completeRating > 5) {
      setCompleteGigError('Please select a star rating from 1 to 5.');
      return;
    }
    soundEngine.playFeatureClick();
    const gigPath = `gigPosts/${completingGigTarget.gigId}`;
    try {
      const targetUserUid = completingGigTarget.applicantUid || authUser.uid;
      const targetWorkerName = (completingGigTarget.applicantName || workerName).slice(0, 120);
      await updateDoc(doc(db, 'gigPosts', completingGigTarget.gigId), {
        status: 'completed',
        completedUserName: targetWorkerName,
        completedUserUid: targetUserUid,
        rating: completeRating,
        updatedAt: serverTimestamp(),
      });
      soundEngine.playSuccessChime();
      setShowCompleteGigModal(false);
      setCompletingGigTarget(null);
      setSelectedGigPost(null);
    } catch (err: any) {
      setCompleteGigError(err?.message || 'Unable to complete gig.');
      handleFirestoreError(err, OperationType.UPDATE, gigPath);
    }
  };

  const handleEditGigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !editingGigTarget) return;
    const title = editGigTitle.trim().slice(0, 100);
    const budget = editGigBudget.trim().slice(0, 40);
    const description = editGigDescription.trim().slice(0, 500);
    const contactInfo = editGigContact.trim().slice(0, 80);
    if (title.length < 2 || !budget || description.length < 3) {
      setEditGigError('Please fill in valid title, budget, and description.');
      return;
    }
    soundEngine.playFeatureClick();
    const gigPath = `gigPosts/${editingGigTarget.gigId}`;
    try {
      await updateDoc(doc(db, 'gigPosts', editingGigTarget.gigId), {
        title,
        category: editGigCategory,
        budget,
        description,
        contactInfo,
        updatedAt: serverTimestamp(),
      });
      soundEngine.playSuccessChime();
      setShowEditGigModal(false);
      setEditingGigTarget(null);
      setSelectedGigPost(null);
    } catch (err: any) {
      setEditGigError(err?.message || 'Unable to update gig.');
      handleFirestoreError(err, OperationType.UPDATE, gigPath);
    }
  };

  const handleCancelGigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !cancellingGigTarget) return;
    const reason = cancellationReasonInput.trim().slice(0, 500);
    if (reason.length < 3) {
      setCancelGigError('Please provide a cancellation reason (at least 3 characters).');
      return;
    }
    soundEngine.playFeatureClick();
    const gigPath = `gigPosts/${cancellingGigTarget.gigId}`;
    const userName = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') || authUser.email || 'User';
    try {
      await updateDoc(doc(db, 'gigPosts', cancellingGigTarget.gigId), {
        status: 'cancelled',
        cancellationReason: reason,
        cancelledByUid: authUser.uid,
        cancelledByName: userName.slice(0, 120),
        updatedAt: serverTimestamp(),
      });
      soundEngine.playSuccessChime();
      setShowCancelGigModal(false);
      setCancellingGigTarget(null);
      setSelectedGigPost(null);
    } catch (err: any) {
      setCancelGigError(err?.message || 'Unable to cancel gig.');
      handleFirestoreError(err, OperationType.UPDATE, gigPath);
    }
  };

  // Gig Application Flow - Non-owner user applies to gig
  const handleStartApplyGig = async (gig: GigPost) => {
    if (!authUser) {
      soundEngine.playFeatureClick();
      setShowAuthModal(true);
      return;
    }
    // Strict block: Gig owner cannot apply to own gig
    if (gig.creatorUid === authUser.uid) {
      soundEngine.playAlert();
      return;
    }

    soundEngine.playFeatureClick();
    setApplyingGigTarget(gig);
    setShowGigApplicationModal(true);
    setApplicationTriesCount(1);
    setApplicationStatusState('waiting');
    setApplicationTimeoutMessage(null);

    const applicantName = (
      [userProfile.firstName.trim(), userProfile.lastName.trim()].filter(Boolean).join(' ') ||
      authUser.displayName ||
      authUser.email?.split('@')[0] ||
      'Applicant'
    ).slice(0, 120);

    const gigPath = `gigPosts/${gig.gigId}`;
    try {
      await updateDoc(doc(db, 'gigPosts', gig.gigId), {
        applicantUid: authUser.uid,
        applicantName,
        applicantSelfieUrl: profileLogoSrc || userProfile.logoDataUrl || '',
        applicationStatus: 'pending',
        applicationTries: 1,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, gigPath);
    }
  };

  // 5-Attempt Polling & Status Monitor for Gig Application
  useEffect(() => {
    if (!showGigApplicationModal || !applyingGigTarget || !authUser) {
      if (applicationIntervalRef.current) {
        clearInterval(applicationIntervalRef.current);
        applicationIntervalRef.current = null;
      }
      return;
    }

    if (
      applicationStatusState === 'accepted' ||
      applicationStatusState === 'rejected' ||
      applicationStatusState === 'timeout'
    ) {
      if (applicationIntervalRef.current) {
        clearInterval(applicationIntervalRef.current);
        applicationIntervalRef.current = null;
      }
      return;
    }

    let localTry = 1;
    const interval = setInterval(async () => {
      // Find fresh state of target gig in gigPosts
      const freshGig = gigPosts.find((g) => g.gigId === applyingGigTarget.gigId);
      if (freshGig) {
        if (freshGig.applicationStatus === 'accepted') {
          setApplicationStatusState('accepted');
          soundEngine.playSuccessChime();
          clearInterval(interval);
          applicationIntervalRef.current = null;
          return;
        } else if (freshGig.applicationStatus === 'rejected') {
          setApplicationStatusState('rejected');
          soundEngine.playFeatureClick();
          clearInterval(interval);
          applicationIntervalRef.current = null;
          return;
        }
      }

      localTry += 1;
      if (localTry <= 5) {
        setApplicationTriesCount(localTry);
        try {
          await updateDoc(doc(db, 'gigPosts', applyingGigTarget.gigId), {
            applicationTries: localTry,
            updatedAt: serverTimestamp(),
          });
        } catch {
          // Non-fatal
        }
      } else {
        // Exceeded 5 tries without gig owner response
        setApplicationStatusState('timeout');
        setApplicationTimeoutMessage(
          'Gig owner did not respond after 5 attempts. You can call directly or browse other gigs.'
        );
        soundEngine.playAlert();
        try {
          await updateDoc(doc(db, 'gigPosts', applyingGigTarget.gigId), {
            applicationStatus: 'timeout',
            updatedAt: serverTimestamp(),
          });
        } catch {
          // Non-fatal
        }
        clearInterval(interval);
        applicationIntervalRef.current = null;
      }
    }, 4200);

    applicationIntervalRef.current = interval;
    return () => {
      if (interval) clearInterval(interval);
      applicationIntervalRef.current = null;
    };
  }, [showGigApplicationModal, applyingGigTarget, authUser, gigPosts, applicationStatusState]);

  // Gig Owner accepts application
  const handleAcceptGigApplication = async (gig: GigPost) => {
    if (!authUser || gig.creatorUid !== authUser.uid) return;
    soundEngine.playSuccessChime();
    setIsUpdatingApplication(true);
    const gigPath = `gigPosts/${gig.gigId}`;
    try {
      await updateDoc(doc(db, 'gigPosts', gig.gigId), {
        applicationStatus: 'accepted',
        updatedAt: serverTimestamp(),
      });
      setSelectedGigPost((prev) => (prev ? { ...prev, applicationStatus: 'accepted' } : null));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, gigPath);
    } finally {
      setIsUpdatingApplication(false);
    }
  };

  // Gig Owner declines application
  const handleDeclineGigApplication = async (gig: GigPost) => {
    if (!authUser || gig.creatorUid !== authUser.uid) return;
    soundEngine.playFeatureClick();
    setIsUpdatingApplication(true);
    const gigPath = `gigPosts/${gig.gigId}`;
    try {
      await updateDoc(doc(db, 'gigPosts', gig.gigId), {
        applicationStatus: 'rejected',
        updatedAt: serverTimestamp(),
      });
      setSelectedGigPost((prev) => (prev ? { ...prev, applicationStatus: 'rejected' } : null));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, gigPath);
    } finally {
      setIsUpdatingApplication(false);
    }
  };

  // Seeker Hire Flow - User initiates hire
  const handleStartHireSeeker = (seeker: SeekerProfile) => {
    soundEngine.playFeatureClick();
    setHireTargetSeeker(seeker);
    setHireGigTitle(seeker.title);
    setHireGigBudget(seeker.hourlyRate);
    setHireDestinationAddress(userProfile.locationName || 'Work Destination');
    setHireContactPhone(userProfile.contactInfo || '');
    setHireModalError(null);
    setShowHireSeekerModal(true);
  };

  // User confirms hire: Circle loading spinner waiting for seeker to accept
  const handleConfirmHireSeeker = () => {
    if (!hireTargetSeeker) return;
    const title = hireGigTitle.trim();
    const budget = hireGigBudget.trim();
    if (title.length < 2 || !budget) {
      setHireModalError('Please enter a valid service title and rate.');
      return;
    }
    soundEngine.playFeatureClick();
    setShowHireSeekerModal(false);
    setShowSeekerWaitingModal(true);
    setSeekerWaitingStatus('waiting');
    setSeekerWaitingTryCount(1);

    const ringInterval = setInterval(() => {
      setSeekerWaitingTryCount((prev) => (prev < 5 ? prev + 1 : 1));
    }, 900);

    // Seeker accepts after circle loading countdown
    setTimeout(() => {
      clearInterval(ringInterval);
      setSeekerWaitingStatus('accepted');
      soundEngine.playSuccessChime();

      setTimeout(() => {
        setShowSeekerWaitingModal(false);
        const destinationLat = hireTargetSeeker.lat;
        const destinationLng = hireTargetSeeker.lng;
        const destAddress = hireDestinationAddress || hireTargetSeeker.locationName;

        setActiveHiredGig({
          hireId: `hire_${Date.now()}`,
          seekerUid: hireTargetSeeker.uid,
          seekerName: hireTargetSeeker.name,
          seekerSelfieUrl: hireTargetSeeker.selfieUrl,
          seekerPhone: hireTargetSeeker.contactInfo,
          gigTitle: title,
          gigBudget: budget,
          destinationAddress: destAddress,
          lat: destinationLat,
          lng: destinationLng,
          hiredAt: Date.now(),
          status: 'in_progress',
        });

        // Direct seeker & user to GiGs feature
        setViewMode('gigs');
        startNavigationTo(destinationLat, destinationLng, title);
        ladyVoiceNavigator.speak(
          `Hire request accepted by ${hireTargetSeeker.name}. Navigating to gig destination.`
        );
      }, 1500);
    }, 3800);
  };

  // Gig completion submission for hired seeker
  const handleCompleteHiredGigSubmit = () => {
    if (!activeHiredGig) return;
    soundEngine.playSuccessChime();
    setShowCompleteHiredGigModal(false);
    setActiveHiredGig(null);
  };

  const handleRepeatInstruction = () => {
    soundEngine.playFeatureClick();
    if (!navigationRoute) return;
    const step = navigationRoute.steps[currentStepIndex];
    if (step) {
      ladyVoiceNavigator.speak(step.instruction, { playChime: true, force: true });
    }
  };

  const handleNextStep = () => {
    soundEngine.playFeatureClick();
    if (!navigationRoute || !destination) return;
    const nextIdx = Math.min(currentStepIndex + 1, navigationRoute.steps.length - 1);
    setCurrentStepIndex(nextIdx);
    const step = navigationRoute.steps[nextIdx];
    if (step) {
      userPannedDuringNavRef.current = false;
      setFlyToTarget({ lat: step.location[0], lng: step.location[1], timestamp: Date.now() });
      const text =
        nextIdx === navigationRoute.steps.length - 1
          ? 'You have arrived.'
          : step.instruction;
      ladyVoiceNavigator.speak(text, { playChime: true, force: true });
    }
  };

  const handleToggleVoiceMute = () => {
    soundEngine.playFeatureClick();
    const nextMuted = !isVoiceMuted;
    setIsVoiceMuted(nextMuted);
    ladyVoiceNavigator.setMuted(nextMuted);
    if (!nextMuted && navigationRoute) {
      const step = navigationRoute.steps[currentStepIndex];
      if (step) ladyVoiceNavigator.speak(step.instruction, { playChime: true, force: true });
    }
  };

  // Map Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string; place_id: number }>>();
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        const results = await searchLocations(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults(undefined);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleToggleSatellite = () => {
    soundEngine.playFeatureClick();
    setSelectedTile((prev) => {
      const next: MapTileStyle = prev === 'satellite' ? 'osm' : 'satellite';
      try {
        localStorage.setItem(MAP_TILE_STORAGE_KEY, next);
      } catch {
        // Ignore storage error
      }
      return next;
    });
  };

  const playClickSound = () => {
    soundEngine.playFeatureClick();
  };

  const copyReferralLink = () => {
    soundEngine.playFeatureClick();
    navigator.clipboard.writeText(userSubInviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyUserSubInvite = () => {
    soundEngine.playFeatureClick();
    navigator.clipboard?.writeText(userSubInviteUrl);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const handleShareUserSubInvite = async () => {
    soundEngine.playFeatureClick();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join TimeGiG',
          text: 'Join me on TimeGiG using my User Sub invite link!',
          url: userSubInviteUrl,
        });
        return;
      } catch {
        // Fallback to clipboard copy if share sheet dismissed/unsupported
      }
    }
    handleCopyUserSubInvite();
  };

  const handleAuthCompleted = ({ user, isNewUser, firstName, lastName }: AuthCompletionPayload) => {
    const isAdminEmail = (user.email || '').trim().toLowerCase() === MAIN_ADMIN_EMAIL;
    const derivedInviteCode = `TG${user.uid.slice(0, 8).toUpperCase()}`;

    // Reset session activity state on account switch so no previous user's searches or routes carry over
    setDestination(null);
    setRoutePath(null);
    setNavigationRoute(null);
    setIsNavigating(false);
    ladyVoiceNavigator.stop();
    setSearchQuery('');
    setSearchResults([]);
    setReferralSearch('');
    setSeekersSearch('');

    if (isAdminEmail) {
      setUserProfile((prev) => {
        const base =
          prev.email && prev.email.toLowerCase() === MAIN_ADMIN_EMAIL
            ? prev
            : createBlankProfile(user.email || '', derivedInviteCode);
        return {
          ...base,
          firstName: firstName || base.firstName,
          lastName: lastName || base.lastName,
          email: user.email || base.email,
        };
      });
      setRequiresSubscriptionFirst(false);
      setShowSignupCongratsModal(false);
      setAdminPinVerified(false);
      setShowAdminPinModal(true);
      try {
        localStorage.removeItem(`timegig_needs_sub_${user.uid}`);
      } catch {
        // Ignore storage error
      }
      return;
    }

    if (isNewUser) {
      const freshProfile: UserProfile = {
        ...createBlankProfile(user.email || '', derivedInviteCode),
        firstName: firstName || '',
        lastName: lastName || '',
        ...(invitedByCode ? { invitedBy: invitedByCode } : {}),
      };
      setUserProfile(freshProfile);
      setIsEditingProfile(true);
      setVerificationSubmission(null);
      setSelectedPlan(null);
      setWelcomeBackName(null);
      setRequiresSubscriptionFirst(true);
      setShowSignupCongratsModal(true);
      try {
        localStorage.setItem(getProfileStorageKey(user.uid), JSON.stringify(freshProfile));
        localStorage.removeItem(getVerificationStorageKey(user.uid));
        localStorage.setItem(`timegig_needs_sub_${user.uid}`, '1');
      } catch {
        // Ignore storage write error
      }
    } else {
      const displayLabel =
        user.displayName?.trim() ||
        user.email ||
        'Registered User';
      setWelcomeBackName(displayLabel);
      setTimeout(() => {
        setWelcomeBackName((prev) => (prev === displayLabel ? null : prev));
      }, 4500);
    }
  };

  const handleAdminPinVerified = async () => {
    if (!authUser) return;

    const now = Date.now();
    const adminSubmission: VerificationSubmission = {
      plan: 'tenant',
      selfieDataUrl: userProfile.logoDataUrl || '',
      idDocuments: [
        {
          id: 'main-admin-pin-10191',
          name: 'Main Admin PIN Verified',
          size: 0,
          type: 'application/verified',
        },
      ],
      submittedAt: now,
      status: 'active',
    };

    setVerificationSubmission(adminSubmission);
    setSelectedPlan('tenant');
    setRequiresSubscriptionFirst(false);
    setShowSignupCongratsModal(false);
    setAdminPinVerified(true);
    setShowAdminPinModal(false);

    try {
      localStorage.removeItem(`timegig_needs_sub_${authUser.uid}`);
      localStorage.setItem(getVerificationStorageKey(authUser.uid), JSON.stringify(adminSubmission));
    } catch {
      // Ignore storage error
    }

    const isVerifiedSession =
      authUser.emailVerified ||
      authUser.providerData.some((provider) => provider.providerId === 'password');

    if (isVerifiedSession) {
      const adminPath = `admins/${authUser.uid}`;
      const adminRef = doc(db, 'admins', authUser.uid);
      try {
        const adminSnap = await getDoc(adminRef);
        if (!adminSnap.exists()) {
          await setDoc(adminRef, {
            uid: authUser.uid,
            email: MAIN_ADMIN_EMAIL,
            role: 'main_admin',
            createdAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, adminPath);
      }

      const mainInviteCode = `TG${authUser.uid.slice(0, 8).toUpperCase()}`;
      const mainInvitePath = `mainTenantInvites/${mainInviteCode}`;
      try {
        const baseInviteRef = doc(db, 'invites', mainInviteCode);
        const baseInviteSnap = await getDoc(baseInviteRef);
        if (!baseInviteSnap.exists()) {
          await setDoc(baseInviteRef, {
            inviteCode: mainInviteCode,
            ownerUid: authUser.uid,
            createdAt: serverTimestamp(),
          });
        }
        const mainInviteRef = doc(db, 'mainTenantInvites', mainInviteCode);
        const mainInviteSnap = await getDoc(mainInviteRef);
        if (!mainInviteSnap.exists()) {
          await setDoc(mainInviteRef, {
            inviteCode: mainInviteCode,
            ownerUid: authUser.uid,
            createdAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, mainInvitePath);
      }

      const subPath = `users/${authUser.uid}/private/subscription`;
      const subRef = doc(db, 'users', authUser.uid, 'private', 'subscription');
      try {
        const subSnap = await getDoc(subRef);
        if (!subSnap.exists()) {
          await setDoc(subRef, {
            uid: authUser.uid,
            plan: 'tenant',
            status: 'active',
            submittedAt: Math.floor(now),
            docCount: 1,
            docNames: ['Main Admin PIN Verified'],
            hasSelfie: true,
            createdAt: serverTimestamp(),
          });
        } else {
          const existingData = subSnap.data() as { plan?: string; status?: string };
          if (existingData.plan !== 'tenant' || existingData.status !== 'active') {
            await updateDoc(subRef, {
              plan: 'tenant',
              status: 'active',
            });
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, subPath);
      }
    }

    const adminLabel = 'Main Admin Tenant';
    setWelcomeBackName(adminLabel);
    setTimeout(() => {
      setWelcomeBackName((prev) => (prev === adminLabel ? null : prev));
    }, 4500);
  };

  const handleOpenReferralDetails = async (item: UserSubReferralItem) => {
    playClickSound();
    setSelectedReferral(item);
    setSelectedReferralFiles([]);
    setReferralFilesError(null);
    setLoadingReferralFiles(true);

    const filesPath = `userSubReferrals/${item.uid}/files`;
    try {
      const snap = await getDocs(collection(db, 'userSubReferrals', item.uid, 'files'));
      const files: VerificationArtifactFile[] = snap.docs.map((d) => {
        const data = d.data() as Partial<VerificationArtifactFile>;
        return {
          uid: data.uid || item.uid,
          fileId: data.fileId || d.id,
          category: data.category || 'id_document',
          name: data.name || d.id,
          mimeType: data.mimeType || 'image/jpeg',
          dataUrl: data.dataUrl || '',
          size: typeof data.size === 'number' ? data.size : 0,
        };
      });
      setSelectedReferralFiles(files);
      const loadedSelfie = files.find((f) => f.category === 'selfie' && f.dataUrl);
      if (loadedSelfie?.dataUrl) {
        setReferralSelfies((prev) =>
          prev[item.uid] === loadedSelfie.dataUrl ? prev : { ...prev, [item.uid]: loadedSelfie.dataUrl }
        );
      }
    } catch (err: any) {
      setReferralFilesError(err?.message || 'Unable to load uploaded verification media.');
      handleFirestoreError(err, OperationType.LIST, filesPath);
    } finally {
      setLoadingReferralFiles(false);
    }
  };

  const openRejectModal = (item: UserSubReferralItem) => {
    playClickSound();
    setRejectTargetItem(item);
    setRejectionReasonInput('');
    setRejectionReasonError(null);
  };

  const handleReviewUserSubReferral = async (
    item: UserSubReferralItem,
    decision: 'approved' | 'rejected',
    reason?: string
  ) => {
    if (!authUser || !canReviewReferrals) return;

    const trimmedReason = (reason || '').trim().slice(0, 500);
    if (decision === 'rejected' && trimmedReason.length < 3) {
      setRejectionReasonError('Please give a reason for rejection (at least 3 characters).');
      return;
    }

    soundEngine.playFeatureClick();
    setReferralActionLoadingUid(item.uid);
    setReferralAdminError(null);

    const referralPath = `userSubReferrals/${item.uid}`;
    const subscriptionPath = `users/${item.uid}/private/subscription`;

    try {
      await updateDoc(doc(db, 'userSubReferrals', item.uid), {
        status: decision,
        reviewedBy: authUser.uid,
        reviewedAt: serverTimestamp(),
        rejectionReason: decision === 'rejected' ? trimmedReason : deleteField(),
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      setReferralActionLoadingUid(null);
      setReferralAdminError(err?.message || 'Unable to update referral status.');
      handleFirestoreError(err, OperationType.UPDATE, referralPath);
      return;
    }

    try {
      await updateDoc(doc(db, 'users', item.uid, 'private', 'subscription'), {
        status: decision === 'approved' ? 'active' : 'rejected',
        rejectionReason: decision === 'rejected' ? trimmedReason : deleteField(),
      });
    } catch (err: any) {
      setReferralActionLoadingUid(null);
      setReferralAdminError(err?.message || 'Unable to update user subscription status.');
      handleFirestoreError(err, OperationType.UPDATE, subscriptionPath);
      return;
    }

    // Grant full main-tenant review & referral powers to approved Tenants who joined via Main Tenant link
    if (decision === 'approved' && item.plan === 'tenant' && item.invitedBy) {
      try {
        const mainInviteSnap = await getDoc(doc(db, 'mainTenantInvites', item.invitedBy));
        if (mainInviteSnap.exists()) {
          const linkRef = doc(db, 'approvedLinkTenants', item.uid);
          const linkSnap = await getDoc(linkRef);
          if (!linkSnap.exists()) {
            await setDoc(linkRef, {
              uid: item.uid,
              invitedBy: item.invitedBy,
              approvedBy: authUser.uid,
              plan: 'tenant',
              createdAt: serverTimestamp(),
            });
          }
        }
      } catch {
        // Non-fatal if invite code was not a main-tenant code
      }
    }

    // Sync referrer tenant proof-of-payment profit ledger on approval or rejection
    if (item.invitedBy) {
      const cleanInvitedCode = item.invitedBy.trim().slice(0, 32);
      const profitPath = `tenantReferralProfits/${item.uid}`;
      const profitRef = doc(db, 'tenantReferralProfits', item.uid);
      try {
        const profitSnap = await getDoc(profitRef);
        if (profitSnap.exists()) {
          await updateDoc(profitRef, {
            status: decision,
            creditedAt: decision === 'approved' ? Date.now() : deleteField(),
            updatedAt: serverTimestamp(),
          });
        } else if (cleanInvitedCode.length >= 4) {
          const invSnap = await getDoc(doc(db, 'invites', cleanInvitedCode));
          if (invSnap.exists()) {
            const referrerUid = (invSnap.data() as { ownerUid?: string }).ownerUid;
            if (referrerUid && referrerUid !== item.uid) {
              await setDoc(profitRef, {
                referralUid: item.uid,
                referrerUid,
                invitedBy: cleanInvitedCode,
                referralName: (item.applicantName || 'Referral Applicant').slice(0, 160),
                plan: item.plan,
                subscriptionAmount: getSubscriptionAmount(item.plan),
                profitAmount: getReferralProfitAmount(item.plan),
                paymentDocCount: Math.min(20, Math.max(1, item.paymentDocCount || 1)),
                hasProofOfPayment: true,
                status: decision,
                submittedAt: Math.floor(item.submittedAt || Date.now()),
                ...(decision === 'approved' ? { creditedAt: Date.now() } : {}),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, profitPath);
      }
    }

    if (decision === 'approved') {
      soundEngine.playSuccessChime();
    }
    setSelectedReferral((prev) =>
      prev && prev.uid === item.uid
        ? {
            ...prev,
            status: decision,
            reviewedBy: authUser.uid,
            rejectionReason: decision === 'rejected' ? trimmedReason : undefined,
          }
        : prev
    );
    setRejectTargetItem(null);
    setRejectionReasonInput('');
    setRejectionReasonError(null);
    setReferralActionLoadingUid(null);
  };

  const handleConfirmRejectWithReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTargetItem) return;
    const trimmed = rejectionReasonInput.trim();
    if (trimmed.length < 3) {
      setRejectionReasonError('Please enter a reason for rejection (at least 3 characters).');
      return;
    }
    await handleReviewUserSubReferral(rejectTargetItem, 'rejected', trimmed);
  };

  const handleSignOut = async () => {
    soundEngine.playFeatureClick();
    try {
      await signOut(auth);
      setUserProfile(createBlankProfile());
      setVerificationSubmission(null);
      setSelectedPlan(null);
      setPendingPlanForVerification(null);
      setDestination(null);
      setRoutePath(null);
      setNavigationRoute(null);
      setIsNavigating(false);
      ladyVoiceNavigator.stop();
      setSearchQuery('');
      setSearchResults([]);
      setReferralSearch('');
      setSeekersSearch('');
      setProfileError(null);
      setProfileSavedMsg(false);
      setPrivacyClearedMsg(false);
      setIsEditingProfile(true);
      setShowShopModal(false);
      setShowVerificationModal(false);
      setShowPhoneMenu(false);
      setRequiresSubscriptionFirst(false);
      setShowSignupCongratsModal(false);
      setShowAdminPinModal(false);
      setAdminPinVerified(false);
      setIsMainTenantLinkTenant(false);
      setUserSubReferrals([]);
      setTenantReferralProfits([]);
      setReferralFilterStatus('all');
      setReferralNetworkOnly(false);
      setSelectedReferral(null);
      setSelectedReferralFiles([]);
      setReferralSelfies({});
      fetchedSelfieSignaturesRef.current = {};
      setRejectTargetItem(null);
      setRejectionReasonInput('');
      setRejectionReasonError(null);
      setFullScreenPreview(null);
      setFullScreenZoom(1);
      setNewSubmissionToast(null);
      setGigPosts([]);
      setIsPickingGigLocation(false);
      setShowCreateGigModal(false);
      setGigDraftLocation(null);
      setGigLocationSearchQuery('');
      setGigLocationSuggestions([]);
      setSelectedGigPost(null);
      setGigFormError(null);
      isFirstReferralSnapshotRef.current = true;
      hasPlayedInitialPendingAlertRef.current = false;
      isFirstProfitSnapshotRef.current = true;
      knownReferralIdsRef.current.clear();
      knownReferralStatusesRef.current.clear();
      knownProfitIdsRef.current.clear();
      knownProfitStatusesRef.current.clear();
      lastGeocodedCoordsRef.current = '';
      setWelcomeBackName(null);
      setViewMode('map');
      try {
        localStorage.removeItem(getProfileStorageKey(null));
        localStorage.removeItem(getVerificationStorageKey(null));
      } catch {
        // Ignore storage error
      }
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  };

  const handleChooseSubscriptionPlan = (plan: SubscriptionPlan) => {
    if (hasSubmittedSubscription) return;
    setPendingPlanForVerification(plan);
    setShowShopModal(false);
    setShowVerificationModal(true);
  };

  const handleCompleteVerification = async (submission: VerificationSubmission) => {
    if (hasSubmittedSubscription) return;
    soundEngine.playNewSubmissionAlert();
    const cleanedSubmission: VerificationSubmission = {
      ...submission,
      status: 'pending_review',
      rejectionReason: undefined,
    };
    setVerificationSubmission(cleanedSubmission);
    setSelectedPlan(cleanedSubmission.plan);
    setRequiresSubscriptionFirst(false);
    if (authUser) {
      try {
        localStorage.removeItem(`timegig_needs_sub_${authUser.uid}`);
      } catch {
        // Ignore storage removal error
      }
    }
    const verificationKey = getVerificationStorageKey(authUser?.uid);
    try {
      localStorage.setItem(verificationKey, JSON.stringify(cleanedSubmission));
    } catch {
      try {
        const compact: VerificationSubmission = {
          ...cleanedSubmission,
          selfieDataUrl: '',
          idDocuments: cleanedSubmission.idDocuments.map(({ previewUrl, ...rest }) => rest),
          proofOfPaymentDocuments: (cleanedSubmission.proofOfPaymentDocuments || []).map(
            ({ previewUrl, ...rest }) => rest
          ),
        };
        localStorage.setItem(verificationKey, JSON.stringify(compact));
      } catch {
        // Ignore storage write failure
      }
    }

    // Persist subscription submission or resubmission in Firestore when signed in
    if (authUser) {
      const subPath = `users/${authUser.uid}/private/subscription`;
      const trimmedDocNames = cleanedSubmission.idDocuments
        .slice(0, 20)
        .map((d) => d.name.slice(0, 120));
      const safeDocCount = Math.min(20, Math.max(1, cleanedSubmission.idDocuments.length));
      const paymentDocs = cleanedSubmission.proofOfPaymentDocuments || [];
      const trimmedPaymentNames = paymentDocs
        .slice(0, 20)
        .map((d) => d.name.slice(0, 120));
      const safePaymentCount = paymentDocs.length > 0 ? Math.min(20, paymentDocs.length) : 0;

      const subDocRef = doc(db, 'users', authUser.uid, 'private', 'subscription');
      try {
        const existingSubSnap = await getDoc(subDocRef);
        if (!existingSubSnap.exists()) {
          await setDoc(subDocRef, {
            uid: authUser.uid,
            plan: cleanedSubmission.plan,
            status: 'pending_review',
            submittedAt: Math.floor(cleanedSubmission.submittedAt),
            docCount: safeDocCount,
            docNames: trimmedDocNames,
            ...(safePaymentCount > 0
              ? { paymentDocCount: safePaymentCount, paymentDocNames: trimmedPaymentNames }
              : {}),
            hasSelfie: true,
            createdAt: serverTimestamp(),
          });
        } else {
          await updateDoc(subDocRef, {
            plan: cleanedSubmission.plan,
            status: 'pending_review',
            submittedAt: Math.floor(cleanedSubmission.submittedAt),
            docCount: safeDocCount,
            docNames: trimmedDocNames,
            ...(safePaymentCount > 0
              ? { paymentDocCount: safePaymentCount, paymentDocNames: trimmedPaymentNames }
              : { paymentDocCount: deleteField(), paymentDocNames: deleteField() }),
            hasSelfie: true,
            rejectionReason: deleteField(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, subPath);
      }

      if (cleanedSubmission.plan === 'user' || cleanedSubmission.plan === 'tenant') {
        const referralPath = `userSubReferrals/${authUser.uid}`;
        const applicantName =
          [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ').trim() ||
          authUser.displayName?.trim() ||
          authUser.email?.split('@')[0] ||
          'New Applicant';
        const refDoc = doc(db, 'userSubReferrals', authUser.uid);

        const filesToSave: Array<{
          fileId: string;
          category: 'selfie' | 'id_document' | 'proof_of_payment';
          name: string;
          mimeType: string;
          dataUrl: string;
          size: number;
        }> = [];

        if (cleanedSubmission.selfieDataUrl && cleanedSubmission.selfieDataUrl.length <= 780000) {
          filesToSave.push({
            fileId: 'selfie',
            category: 'selfie',
            name: 'Live Face Selfie.jpg',
            mimeType: 'image/jpeg',
            dataUrl: cleanedSubmission.selfieDataUrl,
            size: cleanedSubmission.selfieDataUrl.length,
          });
        }

        cleanedSubmission.idDocuments.slice(0, 20).forEach((d, idx) => {
          if (d.previewUrl && d.previewUrl.length >= 10 && d.previewUrl.length <= 780000) {
            filesToSave.push({
              fileId: `id_${idx}`,
              category: 'id_document',
              name: d.name.slice(0, 160) || `ID_Document_${idx + 1}`,
              mimeType: (d.type || 'image/jpeg').slice(0, 100),
              dataUrl: d.previewUrl,
              size: Math.max(0, Math.min(10000000, Math.floor(d.size || d.previewUrl.length))),
            });
          }
        });

        paymentDocs.slice(0, 20).forEach((d, idx) => {
          if (d.previewUrl && d.previewUrl.length >= 10 && d.previewUrl.length <= 780000) {
            filesToSave.push({
              fileId: `payment_${idx}`,
              category: 'proof_of_payment',
              name: d.name.slice(0, 160) || `Proof_Of_Payment_${idx + 1}`,
              mimeType: (d.type || 'image/jpeg').slice(0, 100),
              dataUrl: d.previewUrl,
              size: Math.max(0, Math.min(10000000, Math.floor(d.size || d.previewUrl.length))),
            });
          }
        });

        let isRejectedResubmission = false;
        let prevResubmittedCount = 0;
        let prevRejectionReason: string | undefined;
        try {
          const refSnap = await getDoc(refDoc);
          if (!refSnap.exists()) {
            await setDoc(refDoc, {
              uid: authUser.uid,
              applicantName: applicantName.slice(0, 160),
              applicantEmail: (userProfile.email || authUser.email || '').slice(0, 160),
              contactInfo: (userProfile.contactInfo || 'Not provided').slice(0, 80),
              locationName: (userProfile.locationName || 'Location pending').slice(0, 200),
              invitedBy: (userProfile.invitedBy || invitedByCode || '').slice(0, 32),
              plan: cleanedSubmission.plan,
              status: 'pending_review',
              docCount: safeDocCount,
              docNames: trimmedDocNames,
              ...(safePaymentCount > 0
                ? { paymentDocCount: safePaymentCount, paymentDocNames: trimmedPaymentNames }
                : {}),
              hasSelfie: true,
              submittedAt: Math.floor(cleanedSubmission.submittedAt),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } else {
            const existingRefData = refSnap.data() as {
              status?: string;
              resubmittedCount?: number;
              rejectionReason?: string;
            };
            isRejectedResubmission = existingRefData.status === 'rejected';
            prevResubmittedCount =
              typeof existingRefData.resubmittedCount === 'number'
                ? existingRefData.resubmittedCount
                : 0;
            prevRejectionReason =
              typeof existingRefData.rejectionReason === 'string' &&
              existingRefData.rejectionReason.length >= 3
                ? existingRefData.rejectionReason
                : undefined;
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, referralPath);
        }

        // If resubmitting after rejection, replace old files BEFORE transitioning parent status back to pending_review
        if (isRejectedResubmission) {
          const filesCollectionPath = `userSubReferrals/${authUser.uid}/files`;
          try {
            const existingFilesSnap = await getDocs(collection(db, 'userSubReferrals', authUser.uid, 'files'));
            for (const oldDoc of existingFilesSnap.docs) {
              await deleteDoc(oldDoc.ref);
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, filesCollectionPath);
          }
        }

        for (const f of filesToSave) {
          const filePath = `userSubReferrals/${authUser.uid}/files/${f.fileId}`;
          try {
            const fileRef = doc(db, 'userSubReferrals', authUser.uid, 'files', f.fileId);
            const fileSnap = await getDoc(fileRef);
            if (!fileSnap.exists()) {
              await setDoc(fileRef, {
                uid: authUser.uid,
                fileId: f.fileId,
                category: f.category,
                name: f.name,
                mimeType: f.mimeType,
                dataUrl: f.dataUrl,
                size: f.size,
                createdAt: serverTimestamp(),
              });
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, filePath);
          }
        }

        if (isRejectedResubmission) {
          const nextResubmittedCount = Math.min(100, prevResubmittedCount + 1);
          const submittedTs = Math.floor(cleanedSubmission.submittedAt);
          try {
            await updateDoc(refDoc, {
              applicantName: applicantName.slice(0, 160),
              applicantEmail: (userProfile.email || authUser.email || '').slice(0, 160),
              contactInfo: (userProfile.contactInfo || 'Not provided').slice(0, 80),
              locationName: (userProfile.locationName || 'Location pending').slice(0, 200),
              plan: cleanedSubmission.plan,
              status: 'pending_review',
              docCount: safeDocCount,
              docNames: trimmedDocNames,
              ...(safePaymentCount > 0
                ? { paymentDocCount: safePaymentCount, paymentDocNames: trimmedPaymentNames }
                : { paymentDocCount: deleteField(), paymentDocNames: deleteField() }),
              hasSelfie: true,
              submittedAt: submittedTs,
              resubmittedCount: nextResubmittedCount,
              resubmittedAt: submittedTs,
              ...(prevRejectionReason ? { previousRejectionReason: prevRejectionReason } : {}),
              reviewedBy: deleteField(),
              reviewedAt: deleteField(),
              rejectionReason: deleteField(),
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, referralPath);
          }
        }

        // Record or update referrer tenant's proof-of-payment subscription profit entry
        const resolvedInvitedCode = (userProfile.invitedBy || invitedByCode || '').trim().slice(0, 32);
        if (resolvedInvitedCode.length >= 4 && safePaymentCount > 0) {
          const profitPath = `tenantReferralProfits/${authUser.uid}`;
          const profitRef = doc(db, 'tenantReferralProfits', authUser.uid);
          const submittedTs = Math.floor(cleanedSubmission.submittedAt);
          try {
            const [invSnap, profitSnap] = await Promise.all([
              getDoc(doc(db, 'invites', resolvedInvitedCode)),
              getDoc(profitRef),
            ]);
            if (invSnap.exists()) {
              const referrerUid = (invSnap.data() as { ownerUid?: string }).ownerUid;
              if (referrerUid && referrerUid !== authUser.uid) {
                if (!profitSnap.exists()) {
                  await setDoc(profitRef, {
                    referralUid: authUser.uid,
                    referrerUid,
                    invitedBy: resolvedInvitedCode,
                    referralName: applicantName.slice(0, 160) || 'Referral Applicant',
                    plan: cleanedSubmission.plan,
                    subscriptionAmount: getSubscriptionAmount(cleanedSubmission.plan),
                    profitAmount: getReferralProfitAmount(cleanedSubmission.plan),
                    paymentDocCount: safePaymentCount,
                    hasProofOfPayment: true,
                    status: 'pending_review',
                    submittedAt: submittedTs,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  });
                } else if (
                  isRejectedResubmission &&
                  (profitSnap.data() as { status?: string }).status === 'rejected'
                ) {
                  await updateDoc(profitRef, {
                    referralName: applicantName.slice(0, 160) || 'Referral Applicant',
                    plan: cleanedSubmission.plan,
                    subscriptionAmount: getSubscriptionAmount(cleanedSubmission.plan),
                    profitAmount: getReferralProfitAmount(cleanedSubmission.plan),
                    paymentDocCount: safePaymentCount,
                    hasProofOfPayment: true,
                    status: 'pending_review',
                    submittedAt: submittedTs,
                    creditedAt: deleteField(),
                    updatedAt: serverTimestamp(),
                  });
                }
              }
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, profitPath);
          }
        }
      }
    }

    // Use captured face selfie as profile logo (subject to monthly update cooldown)
    if (submission.selfieDataUrl && (canUpdateLogo || !userProfile.logoDataUrl)) {
      const updatedTimestamp = userProfile.logoUpdatedAt || submission.submittedAt;
      setUserProfile((prev) => {
        const updated: UserProfile = {
          ...prev,
          logoDataUrl: submission.selfieDataUrl,
          logoUpdatedAt: updatedTimestamp,
        };
        if (authUser) {
          try {
            localStorage.setItem(getProfileStorageKey(authUser.uid), JSON.stringify(updated));
          } catch {
            // Ignore storage error
          }
        }
        return updated;
      });

      if (authUser && submission.selfieDataUrl.length <= 380000) {
        const profilePath = `users/${authUser.uid}/private/profile`;
        try {
          await updateDoc(doc(db, 'users', authUser.uid, 'private', 'profile'), {
            logoDataUrl: submission.selfieDataUrl,
            logoUpdatedAt: Math.floor(updatedTimestamp),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, profilePath);
        }
      }
    }
  };

  const handleUpdateProfileLogo = async (dataUrl: string) => {
    if (!canUpdateLogo) return;
    const now = Date.now();
    setUserProfile((prev) => {
      const updated: UserProfile = {
        ...prev,
        logoDataUrl: dataUrl,
        logoUpdatedAt: now,
      };
      if (authUser) {
        try {
          localStorage.setItem(getProfileStorageKey(authUser.uid), JSON.stringify(updated));
        } catch {
          // Ignore storage error
        }
      }
      return updated;
    });

    if (authUser && dataUrl.length <= 380000) {
      const profilePath = `users/${authUser.uid}/private/profile`;
      try {
        await updateDoc(doc(db, 'users', authUser.uid, 'private', 'profile'), {
          logoDataUrl: dataUrl,
          logoUpdatedAt: Math.floor(now),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, profilePath);
      }
    }
  };

  // Automatically resolve location name when autoLocation is enabled
  const detectProfileLocationName = async (lat: number, lng: number, force = false) => {
    const activeUid = auth.currentUser?.uid || null;
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    if (!force && lastGeocodedCoordsRef.current === key && userProfile.locationName) return;
    lastGeocodedCoordsRef.current = key;
    setIsDetectingLocation(true);
    try {
      const fullAddress = await reverseGeocode(lat, lng);
      if ((auth.currentUser?.uid || null) !== activeUid) return;
      const parts = fullAddress.split(',').map((p) => p.trim()).filter(Boolean);
      const shortLocation =
        parts.length >= 3
          ? `${parts[0]}, ${parts[1]}, ${parts[parts.length - 1]}`
          : fullAddress;
      setUserProfile((prev) => {
        const updated = { ...prev, locationName: shortLocation, autoLocation: true };
        if (activeUid) {
          try {
            localStorage.setItem(getProfileStorageKey(activeUid), JSON.stringify(updated));
          } catch {
            // Ignore storage error
          }
        }
        return updated;
      });
    } finally {
      setIsDetectingLocation(false);
    }
  };

  useEffect(() => {
    if (userProfile.autoLocation) {
      detectProfileLocationName(userLocation.lat, userLocation.lng);
    }
  }, [userLocation.lat, userLocation.lng, userProfile.autoLocation]);

  const handleAddSocialLink = () => {
    playClickSound();
    setUserProfile((prev) => ({
      ...prev,
      socialLinks: [
        ...prev.socialLinks,
        { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, platform: 'Instagram', url: '' },
      ],
    }));
  };

  const handleUpdateSocialLink = (id: string, field: 'platform' | 'url', value: string) => {
    setUserProfile((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.map((link) =>
        link.id === id ? { ...link, [field]: value } : link
      ),
    }));
  };

  const handleRemoveSocialLink = (id: string) => {
    playClickSound();
    setUserProfile((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((link) => link.id !== id),
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    if (!userProfile.firstName.trim() || !userProfile.lastName.trim()) {
      setProfileError('Name and Surname are required.');
      return;
    }
    if (!userProfile.contactInfo.trim()) {
      setProfileError('Contact information is required.');
      return;
    }
    setProfileError(null);
    const cleaned: UserProfile = {
      ...userProfile,
      firstName: userProfile.firstName.trim().slice(0, 80),
      lastName: userProfile.lastName.trim().slice(0, 80),
      email: userProfile.email.trim().slice(0, 160),
      contactInfo: userProfile.contactInfo.trim().slice(0, 80),
      locationName: userProfile.locationName.trim().slice(0, 200),
      socialLinks: userProfile.socialLinks
        .filter((l) => l.url.trim() !== '')
        .slice(0, 10),
      isLocked: true,
      inviteCode: activeInviteCode,
    };
    setUserProfile(cleaned);
    setIsEditingProfile(false);
    if (authUser) {
      try {
        localStorage.setItem(getProfileStorageKey(authUser.uid), JSON.stringify(cleaned));
      } catch {
        // Ignore storage failure
      }
    }

    if (authUser) {
      const profilePath = `users/${authUser.uid}/private/profile`;
      try {
        await updateDoc(doc(db, 'users', authUser.uid, 'private', 'profile'), {
          firstName: cleaned.firstName,
          lastName: cleaned.lastName,
          email: cleaned.email,
          contactInfo: cleaned.contactInfo,
          locationName: cleaned.locationName,
          autoLocation: Boolean(cleaned.autoLocation),
          socialLinks: cleaned.socialLinks,
          isLocked: true,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, profilePath);
      }
    }

    soundEngine.playSuccessChime();
    setProfileSavedMsg(true);
    setTimeout(() => setProfileSavedMsg(false), 2500);
  };



  const featureViewWrapper = (children: React.ReactNode, showFloatingTools = false) => (
    <div className="flex-1 min-h-0 flex flex-col h-full z-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-slate-950 blur-xl pointer-events-none">
        <MapView
          userLocation={userLocation}
          savedPins={EMPTY_PINS}
          selectedTile={selectedTile}
          onMapClick={noopMapAction}
          onOpenAddPinAt={noopMapAction}
          trackingTrail={EMPTY_TRAIL}
          flyToTarget={flyToTarget}
          mapRef={bgMapRef}
          is3D={is3D}
          routePath={routePath}
        />
        <div className="absolute inset-0 bg-slate-100/90 backdrop-blur-sm" />
      </div>
      {showFloatingTools && <FloatingToolsWallpaper />}
      <div className="flex-1 min-h-0 relative z-10 overflow-y-auto overscroll-contain touch-pan-y pb-20 scrollbar-thin scrollbar-thumb-slate-300">
        {children}
      </div>
    </div>
  );

  // Tenant View (High Detail) - Approved Subscription Payment Profit & Referral Network
  const renderTenantView = () => {
    type WalletReferralEntry = TenantReferralProfitItem & {
      sourceLabel?: 'Your Referral' | 'Approved by You' | 'Invited & Approved';
    };

    const profitMap = new Map<string, WalletReferralEntry>();
    for (const p of tenantReferralProfits) {
      profitMap.set(p.referralUid, {
        ...p,
        sourceLabel: 'Your Referral',
      });
    }
    for (const r of userSubReferrals) {
      const isDirectReferral = Boolean(r.invitedBy) && r.invitedBy === activeInviteCode;
      const isApprovedByMe = Boolean(
        canReviewReferrals && authUser?.uid && r.reviewedBy === authUser.uid && r.status === 'approved'
      );
      if (isDirectReferral || isApprovedByMe) {
        const existingProfit = profitMap.get(r.uid);
        const computedSource: WalletReferralEntry['sourceLabel'] =
          isDirectReferral && isApprovedByMe
            ? 'Invited & Approved'
            : isDirectReferral
            ? 'Your Referral'
            : 'Approved by You';
        const docCount = r.paymentDocCount ?? (r.status === 'approved' ? 1 : 0);
        if (!existingProfit) {
          profitMap.set(r.uid, {
            referralUid: r.uid,
            referrerUid: authUser?.uid || '',
            invitedBy: r.invitedBy,
            referralName: r.applicantName,
            plan: r.plan,
            subscriptionAmount: getSubscriptionAmount(r.plan),
            profitAmount: getReferralProfitAmount(r.plan),
            paymentDocCount: docCount,
            hasProofOfPayment: docCount > 0,
            status: r.status,
            submittedAt: r.submittedAt,
            sourceLabel: computedSource,
          });
        } else {
          profitMap.set(r.uid, {
            ...existingProfit,
            subscriptionAmount: getSubscriptionAmount(r.plan),
            profitAmount: getReferralProfitAmount(r.plan),
            status: r.status,
            paymentDocCount: r.paymentDocCount ?? existingProfit.paymentDocCount,
            sourceLabel: computedSource,
          });
        }
      }
    }

    const myNetworkProfits = Array.from(profitMap.values()).sort(
      (a, b) => b.submittedAt - a.submittedAt
    );
    const approvedProfits = myNetworkProfits.filter((p) => p.status === 'approved');
    const pendingProofProfits = myNetworkProfits.filter((p) => p.status === 'pending_review');

    const activeNetworkTenants = approvedProfits.filter((p) => p.plan === 'tenant');
    const activeNetworkUsers = approvedProfits.filter((p) => p.plan === 'user');

    const tenantSubProfitTotal = activeNetworkTenants.reduce((sum, p) => sum + p.profitAmount, 0);
    const userSubProfitTotal = activeNetworkUsers.reduce((sum, p) => sum + p.profitAmount, 0);
    const approvedProfitTotal = tenantSubProfitTotal + userSubProfitTotal;

    const tenantSubVolumeTotal = activeNetworkTenants.reduce((sum, p) => sum + p.subscriptionAmount, 0);
    const userSubVolumeTotal = activeNetworkUsers.reduce((sum, p) => sum + p.subscriptionAmount, 0);
    const approvedSubscriptionVolume = tenantSubVolumeTotal + userSubVolumeTotal;

    return featureViewWrapper(
      <div className="flex flex-col items-center p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-full max-w-lg space-y-5">
          <div className="relative text-center space-y-1 pt-2 px-11">
            <h1 className="text-2xl font-black text-slate-950 tracking-tighter">Tenant Wallet</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">
              {isMainAdminAccount
                ? 'Main Tenant • Passive Income Hub'
                : isMainTenantLinkTenant
                ? 'Network Tenant • Full Access Hub'
                : 'Subscription Profit & Referral Wallet'}
            </p>
            {authUser && (
              <button
                type="button"
                onClick={handleSignOut}
                title="Log Out"
                aria-label="Log Out"
                className="absolute top-2 right-0 w-9 h-9 rounded-full bg-white border border-slate-200 shadow-sm text-rose-600 hover:bg-rose-50 hover:border-rose-200 flex items-center justify-center transition-all cursor-pointer active:scale-90"
              >
                <LogOut className="w-4 h-4 stroke-[2.25px]" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Main Approved Subscription Profit Balance Card */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 text-center shadow-lg transition-all duration-300 hover:shadow-xl">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 mb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 border-2 border-white shadow-md flex items-center justify-center text-slate-400 shrink-0">
                    {profileLogoSrc ? (
                      <img
                        src={profileLogoSrc}
                        alt="User face selfie"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserCircle className="w-7 h-7" />
                    )}
                  </div>
                  <div className="text-left min-w-0">
                    <div className="flex items-center gap-1 text-emerald-700 font-black uppercase tracking-[0.14em] text-[9px]">
                      <Receipt className="w-3 h-3 shrink-0" />
                      <span>Approved Subscription Profit</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-600 truncate">
                      {[userProfile.firstName.trim(), userProfile.lastName.trim()].filter(Boolean).join(' ') || 'Tenant Account'}
                    </div>
                    {myAverageStarRating && (
                      <div className="flex items-center gap-1 bg-amber-100/90 border border-amber-300 rounded-full px-2 py-0.5 mt-0.5 w-fit">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                        <span className="text-[9px] font-black text-amber-900">{myAverageStarRating} / 5.0 Rating</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-black text-slate-950 tabular-nums tracking-tighter">
                    R{approvedProfitTotal.toFixed(2)}
                  </div>
                  <div className="text-[9px] font-bold text-emerald-600">/month credited</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 mb-3 text-left">
                <div>
                  <span className="block text-[8px] font-black text-emerald-800 uppercase tracking-wider">
                    Chosen Subscriptions Approved
                  </span>
                  <div className="text-sm font-black text-slate-950 tabular-nums mt-0.5">
                    R{approvedSubscriptionVolume.toFixed(2)}
                  </div>
                  <span className="text-[9px] font-semibold text-slate-600">
                    {approvedProfits.length} approved referral{approvedProfits.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="border-l border-emerald-200 pl-3">
                  <span className="block text-[8px] font-black text-emerald-800 uppercase tracking-wider">
                    Full Tenant Profit (100%)
                  </span>
                  <div className="text-sm font-black text-emerald-700 tabular-nums mt-0.5">
                    R{approvedProfitTotal.toFixed(2)}
                  </div>
                  <span className="text-[9px] font-semibold text-emerald-700">
                    R299,99 Tenant • R29,99 User
                  </span>
                </div>
              </div>

              {pendingProofProfits.length > 0 && (
                <div className="mb-3 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800">
                  {pendingProofProfits.length} submitted referral{pendingProofProfits.length === 1 ? '' : 's'} awaiting approval — profit appears once approved.
                </div>
              )}

              <div className="mt-2 flex items-center justify-center gap-6">
                <div className="text-center">
                  <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Approved Referrals</span>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <span className="text-sm font-black text-emerald-600">
                      {approvedProfits.length} Approved
                    </span>
                    {pendingProofProfits.length > 0 && (
                      <span className="text-[10px] font-black text-amber-600">
                        • {pendingProofProfits.length} pending
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-px h-6 bg-slate-200" />
                <div className="text-center">
                  <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Status</span>
                  <span className={`text-sm font-black mt-1 block ${accountStatus === 'active' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {accountStatus === 'active' ? 'Active' : accountStatus === 'pending_review' ? 'Pending Review' : 'Unactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Sub Profit Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-md transition-all duration-300 hover:shadow-lg">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1 font-black uppercase tracking-widest text-[8px]">
                  <Wallet className="w-3 h-3 text-blue-600" /> Tenant Sub (R299,99)
                </div>
                <div className="text-lg font-black text-slate-950 tabular-nums">
                  R{tenantSubProfitTotal.toFixed(2)}
                </div>
                <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                  {activeNetworkTenants.length} approved • R299,99 each
                </div>
                <div className="text-[10px] font-bold text-blue-700 mt-1 tabular-nums">
                  Paid total: R{tenantSubVolumeTotal.toFixed(2)}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-md transition-all duration-300 hover:shadow-lg">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1 font-black uppercase tracking-widest text-[8px]">
                  <UserCircle className="w-3 h-3 text-amber-600" /> User Sub (R29,99)
                </div>
                <div className="text-lg font-black text-slate-950 tabular-nums">
                  R{userSubProfitTotal.toFixed(2)}
                </div>
                <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                  {activeNetworkUsers.length} approved • R29,99 each
                </div>
                <div className="text-[10px] font-bold text-amber-700 mt-1 tabular-nums">
                  Paid total: R{userSubVolumeTotal.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Your Tenant Invite Link & How Network Passive Income Works */}
            <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl text-white space-y-4">
              <div>
                <h3 className="text-base font-black flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-blue-400" /> Your Tenant Link &amp; Network
                </h3>
                <p className="text-slate-400 text-[11px] mt-1 font-medium leading-relaxed">
                  Share your personal tenant invite link. When referrals join through your link, submit their chosen subscription payment, and get approved, the full <strong className="text-emerald-400">R299,99</strong> (Tenant) or <strong className="text-emerald-400">R29,99</strong> (User) subscription amount is credited in your Tenant Wallet.
                </p>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 space-y-1.5 text-[11px] text-slate-200">
                <div className="font-black text-blue-300 uppercase tracking-wider text-[9px]">
                  How It Works
                </div>
                <p className="leading-relaxed">
                  1. Share your unique link below with new <strong>Tenants (R299,99/mo)</strong> or <strong>Users (R29,99/mo)</strong>.
                </p>
                <p className="leading-relaxed">
                  2. Once approved, receive the full <strong>R299,99/mo</strong> per Tenant &amp; <strong>R29,99/mo</strong> per User subscription in your Tenant Wallet.
                </p>
                <p className="leading-relaxed">
                  3. Every approved Tenant who joins through your link automatically gets their own tenant link to build their own network — and so on.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2 bg-slate-800 p-3 rounded-xl border border-slate-700">
                  <code className="flex-1 font-mono text-[10px] truncate select-all">{userSubInviteUrl}</code>
                  <button
                    type="button"
                    onClick={copyReferralLink}
                    title="Copy Tenant Link"
                    className="px-2.5 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all shadow-md cursor-pointer text-[10px] font-black flex items-center gap-1 shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleShareUserSubInvite}
                  className="w-full py-3 bg-blue-600 text-white font-black text-xs rounded-xl hover:bg-blue-500 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share Tenant Link &amp; Build Network
                </button>
              </div>
            </div>

            {/* Approved Subscription Payment Profits & Referral List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider">
                    Approved Referral Profits ({approvedProfits.length})
                  </h3>
                  <p className="text-[10px] font-medium text-slate-500">
                    Credited from chosen submitted subscriptions once approved
                  </p>
                </div>
                {canReviewReferrals && (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setReferralNetworkOnly(false);
                      setViewMode('referrals');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-[10px] font-black cursor-pointer transition-all active:scale-95 shrink-0"
                  >
                    Manage Queue
                  </button>
                )}
              </div>

              {myNetworkProfits.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-[11px] font-semibold text-slate-500">
                  No referral subscriptions yet. Share your Tenant Link or approve a referral in Referrals — once approved, the subscription profit appears here!
                </div>
              ) : (
                <div className="space-y-2">
                  {myNetworkProfits.map((member) => {
                    const isApproved = member.status === 'approved';
                    const badgeClass = isApproved
                      ? 'bg-emerald-100 text-emerald-800'
                      : member.status === 'rejected'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800';
                    return (
                      <div
                        key={member.referralUid}
                        className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-slate-950 truncate">
                              {member.referralName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[9px] font-black uppercase text-slate-700">
                              {member.plan === 'tenant' ? 'Tenant • R299,99' : 'User • R29,99'}
                            </span>
                            {member.sourceLabel && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-800 text-[9px] font-black">
                                {member.sourceLabel}
                              </span>
                            )}
                            {member.hasProofOfPayment && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-black flex items-center gap-1">
                                <Receipt className="w-2.5 h-2.5" />
                                <span>PoP ({member.paymentDocCount})</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                            {isApproved
                              ? `Approved • Chosen payment R${member.subscriptionAmount.toFixed(2)} credited`
                              : member.status === 'pending_review'
                              ? `Pending approval • R${member.profitAmount.toFixed(2)} credits once approved`
                              : 'Rejected • No profit credited'}
                          </div>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <div
                            className={`text-xs font-black tabular-nums ${
                              isApproved
                                ? 'text-emerald-700'
                                : 'text-slate-400'
                            }`}
                          >
                            {isApproved ? `+R${member.profitAmount.toFixed(2)}` : `R0.00`}
                          </div>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${badgeClass}`}>
                            {isApproved
                              ? 'Approved'
                              : member.status === 'rejected'
                              ? 'Rejected'
                              : 'Pending'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="text-center pt-2 pb-2">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">GeoAtlas Secured</p>
          </div>
        </div>
      </div>,
      true
    );
  };

  // Unified View (Polished look for Referrals, Seekers, Profile)
  const renderUnifiedView = (id: AppViewMode, title: string, Icon: React.ElementType, description: string) => featureViewWrapper(
    <div className="flex flex-col items-center p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-1 pt-2">
          <h1 className="text-2xl font-black text-slate-950 tracking-tighter">{title}</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">{description}</p>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} onClick={playClickSound} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center gap-4 cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-black text-slate-950">{title} Node #{1000 + i}</div>
                <div className="text-[10px] font-bold text-slate-500 mt-0.5">Immediate radius connection available.</div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-2 pb-2">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">GeoAtlas Secured</p>
        </div>
      </div>
    </div>
  );

  // Profile View (Scrollable, Save Locks Profile with Anytime Edit, Once-a-Month Face Selfie Logo)
  const renderProfileView = () => {
    const fullName = [userProfile.firstName.trim(), userProfile.lastName.trim()].filter(Boolean).join(' ') || 'New User';
    const isReadOnly = !isEditingProfile;

    return featureViewWrapper(
      <div className="flex flex-col items-center p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-full max-w-lg space-y-5">
          {/* Profile Header with Face Selfie Logo */}
          <div className="text-center pt-3">
            <div className="relative w-24 h-24 mx-auto mb-3">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 border-4 border-white shadow-xl flex items-center justify-center text-slate-400">
                {profileLogoSrc ? (
                  <img
                    src={profileLogoSrc}
                    alt="Profile face selfie logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserCircle className="w-14 h-14" />
                )}
              </div>
              <button
                type="button"
                disabled={!canUpdateLogo}
                onClick={() => {
                  playClickSound();
                  if (canUpdateLogo) setShowSelfieLogoModal(true);
                }}
                title={
                  canUpdateLogo
                    ? 'Capture face selfie as profile logo (once a month)'
                    : `Profile logo locked for ${daysUntilLogoUpdate} more day(s)`
                }
                className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center transition-all ${
                  canUpdateLogo
                    ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-90'
                    : 'bg-slate-700 text-slate-200 cursor-not-allowed'
                }`}
              >
                {canUpdateLogo ? <Camera className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              </button>
            </div>

            <h1 className="text-xl font-black text-slate-950 tracking-tighter">{fullName}</h1>
            {myAverageStarRating && (
              <div className="flex items-center justify-center gap-1.5 mt-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 mx-auto w-fit shadow-sm">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span className="text-xs font-black text-amber-900">{myAverageStarRating} / 5.0 Rating</span>
                <span className="text-[10px] font-bold text-slate-500">({myCompletedGigsAsWorker.length} gigs)</span>
              </div>
            )}
            {userProfile.locationName ? (
              <p className="text-blue-600 font-bold text-[10px] mt-0.5 flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-xs">{userProfile.locationName}</span>
              </p>
            ) : (
              <p className="text-blue-600 font-bold uppercase tracking-widest text-[9px] mt-1">
                Professional Navigator
              </p>
            )}
            <p className="text-[10px] font-bold text-slate-500 mt-1 flex items-center justify-center gap-1">
              {canUpdateLogo ? (
                <span>Tap camera icon to set face selfie logo (updates once a month)</span>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-amber-600" />
                  <span>Logo locked • Next selfie update in {daysUntilLogoUpdate} day{daysUntilLogoUpdate === 1 ? '' : 's'}</span>
                </>
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Account Status Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Account Status</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  accountStatus === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {accountStatus === 'active'
                    ? 'Active'
                    : accountStatus === 'pending_review'
                    ? 'Unactive • Under Review'
                    : 'Unactive'}
                </span>
              </div>
              {accountStatus === 'pending_review' ? (
                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                  Your live selfie &amp; ID documents are being reviewed (15 to 25 minutes). You can keep scrolling through the app until approved.
                </p>
              ) : accountStatus === 'unactive' ? (
                <div className="space-y-2.5">
                  <p className="text-xs font-medium text-slate-600 leading-relaxed">
                    Choose a subscription in the Shop, capture a live face selfie, and upload your ID documents to submit for approval.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setShowShopModal(true);
                    }}
                    className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition-all cursor-pointer active:scale-95"
                  >
                    Open Shop &amp; Verify Account
                  </button>
                </div>
              ) : null}
            </div>

            {/* User Sub Link to Share and Invite Users */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-md text-white space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black tracking-tight text-white">
                      User Sub Invite Link
                    </h3>
                    <p className="text-[10px] font-medium text-slate-400">
                      Share your User Sub link to invite new users
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-2.5">
                <code className="flex-1 font-mono text-[10px] text-slate-200 truncate select-all">
                  {userSubInviteUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopyUserSubInvite}
                  title="Copy User Sub Link"
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer active:scale-95 shrink-0"
                >
                  {inviteCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={handleShareUserSubInvite}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share &amp; Invite Users</span>
              </button>
            </div>

            {/* Profile Details Form (Locked on Save, Editable Anytime) */}
            <form onSubmit={handleSaveProfile} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                    Personal Details
                  </h3>
                  {isReadOnly && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-black flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  )}
                </div>

                {isReadOnly ? (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setIsEditingProfile(true);
                    }}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-white rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <span className="text-[9px] font-bold text-rose-500">* Required fields</span>
                )}
              </div>

              {/* Name & Surname (Required) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wide mb-1">
                    Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isReadOnly}
                    placeholder="First name"
                    value={userProfile.firstName}
                    onChange={(e) => setUserProfile((prev) => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wide mb-1">
                    Surname <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isReadOnly}
                    placeholder="Last name"
                    value={userProfile.lastName}
                    onChange={(e) => setUserProfile((prev) => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wide mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    disabled={isReadOnly}
                    placeholder="you@example.com"
                    value={userProfile.email}
                    onChange={(e) => setUserProfile((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Contact Information (Required) */}
              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wide mb-1">
                  Contact Information <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    disabled={isReadOnly}
                    placeholder="Phone / WhatsApp number"
                    value={userProfile.contactInfo}
                    onChange={(e) => setUserProfile((prev) => ({ ...prev, contactInfo: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Location (Manual or Auto-Detected) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wide">
                    Location
                  </label>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        detectProfileLocationName(userLocation.lat, userLocation.lng, true);
                      }}
                      className="text-[10px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isDetectingLocation ? 'animate-spin' : ''}`} />
                      <span>{isDetectingLocation ? 'Detecting...' : 'Auto Set Location'}</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    disabled={isReadOnly}
                    placeholder="City, Country (or auto-set from GPS)"
                    value={userProfile.locationName}
                    onChange={(e) =>
                      setUserProfile((prev) => ({
                        ...prev,
                        locationName: e.target.value,
                        autoLocation: false,
                      }))
                    }
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>
                {!isReadOnly && (
                  <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 cursor-pointer select-none pt-0.5">
                    <input
                      type="checkbox"
                      checked={userProfile.autoLocation}
                      onChange={(e) => {
                        playClickSound();
                        const checked = e.target.checked;
                        setUserProfile((prev) => ({ ...prev, autoLocation: checked }));
                        if (checked) {
                          detectProfileLocationName(userLocation.lat, userLocation.lng, true);
                        }
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Let the app set location name automatically</span>
                  </label>
                )}
              </div>

              {/* Social Media Links (Optional & Expandable) */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide">
                      Social Media Links
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 ml-1.5">(Optional)</span>
                  </div>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={handleAddSocialLink}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Link</span>
                    </button>
                  )}
                </div>

                {userProfile.socialLinks.length === 0 ? (
                  <p className="text-[11px] font-medium text-slate-400">
                    {isReadOnly
                      ? 'No social links added.'
                      : 'No social links added. Tap "Add Link" to include Instagram, LinkedIn, X, TikTok, or website links.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {userProfile.socialLinks.map((link) => (
                      <div key={link.id} className="flex items-center gap-2">
                        <select
                          disabled={isReadOnly}
                          value={link.platform}
                          onChange={(e) => handleUpdateSocialLink(link.id, 'platform', e.target.value)}
                          className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shrink-0 disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                          <option value="Instagram">Instagram</option>
                          <option value="Facebook">Facebook</option>
                          <option value="LinkedIn">LinkedIn</option>
                          <option value="X">X / Twitter</option>
                          <option value="TikTok">TikTok</option>
                          <option value="Website">Website</option>
                        </select>
                        <div className="relative flex-1 min-w-0">
                          <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="url"
                            disabled={isReadOnly}
                            placeholder="https://..."
                            value={link.url}
                            onChange={(e) => handleUpdateSocialLink(link.id, 'url', e.target.value)}
                            className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-75 disabled:cursor-not-allowed"
                          />
                        </div>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSocialLink(link.id)}
                            aria-label="Remove social link"
                            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {profileError && (
                <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              {profileSavedMsg && (
                <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>Profile saved &amp; locked! Tap Edit Profile anytime to update.</span>
                </div>
              )}

              {!isReadOnly && (
                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Save &amp; Lock Profile</span>
                </button>
              )}
            </form>

            {/* Account & Privacy Management Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                      Account &amp; Privacy
                    </h3>
                    <p className="text-[10px] font-semibold text-slate-500">
                      Isolated personal account &amp; activity protection
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-black uppercase tracking-wide">
                  Private
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5">
                  <span className="text-[11px] font-bold text-slate-600">Separate Account</span>
                  <span className="text-[11px] font-black text-slate-950 truncate max-w-[180px]">
                    {authUser?.email || 'Personal Account'}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5">
                  <span className="text-[11px] font-bold text-slate-600">Activity &amp; GPS Visibility</span>
                  <span className="text-[11px] font-black text-emerald-700">
                    Only You (Hidden from Others)
                  </span>
                </div>
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5">
                  <span className="text-[11px] font-bold text-slate-600">Profile &amp; Data Access</span>
                  <span className="text-[11px] font-black text-slate-900">
                    Owner-Only Encrypted Storage
                  </span>
                </div>
              </div>

              <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                Your searches, routes, location, and personal details belong strictly to your separate account. Other users cannot view your activities.
              </p>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setDestination(null);
                  setRoutePath(null);
                  setNavigationRoute(null);
                  setIsNavigating(false);
                  ladyVoiceNavigator.stop();
                  setSearchQuery('');
                  setSearchResults([]);
                  setReferralSearch('');
                  setSeekersSearch('');
                  setPrivacyClearedMsg(true);
                  setTimeout(() => setPrivacyClearedMsg(false), 3000);
                }}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Shield className="w-3.5 h-3.5 text-slate-700" />
                <span>Clear Session Search &amp; Route History</span>
              </button>

              {privacyClearedMsg && (
                <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Your search &amp; navigation history has been cleared.</span>
                </div>
              )}
            </div>

            {/* Stats Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md">
              <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-bold text-slate-500">GiGs Done</div>
                  <div className="text-xl font-black text-slate-950">0</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500">Network</div>
                  <div className="text-xl font-black text-slate-950">0</div>
                </div>
              </div>
            </div>
            {/* Sign Out Button */}
            {authUser && (
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-black rounded-2xl shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>

          <div className="text-center pt-2 pb-2">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">GeoAtlas Secured</p>
          </div>
        </div>
      </div>
    );
  };

  // Main Admin & Link-Tenant Referrals Queue
  const renderAdminReferralsView = () => {
    const queryLower = referralSearch.trim().toLowerCase();
    const myNetworkReferralsCount = userSubReferrals.filter(
      (r) => Boolean(r.invitedBy) && r.invitedBy === activeInviteCode
    ).length;
    const baseScopeReferrals = referralNetworkOnly
      ? userSubReferrals.filter((r) => Boolean(r.invitedBy) && r.invitedBy === activeInviteCode)
      : userSubReferrals;

    const filteredReferrals = baseScopeReferrals.filter((item) => {
      const isRejectedResubmission = Boolean(item.resubmittedCount && item.resubmittedCount > 0);
      if (referralFilterStatus === 'resubmitted') {
        if (!isRejectedResubmission) return false;
      } else if (referralFilterStatus === 'rejected') {
        if (item.status !== 'rejected' && !isRejectedResubmission) return false;
      } else if (referralFilterStatus !== 'all' && item.status !== referralFilterStatus) {
        return false;
      }
      if (!queryLower) return true;
      return (
        item.applicantName.toLowerCase().includes(queryLower) ||
        item.applicantEmail.toLowerCase().includes(queryLower) ||
        item.contactInfo.toLowerCase().includes(queryLower) ||
        item.locationName.toLowerCase().includes(queryLower) ||
        item.invitedBy.toLowerCase().includes(queryLower) ||
        item.status.toLowerCase().includes(queryLower) ||
        (item.previousRejectionReason || '').toLowerCase().includes(queryLower)
      );
    });

    const pendingCount = baseScopeReferrals.filter((r) => r.status === 'pending_review').length;
    const resubmittedCount = baseScopeReferrals.filter((r) =>
      Boolean(r.resubmittedCount && r.resubmittedCount > 0)
    ).length;
    const approvedCount = baseScopeReferrals.filter((r) => r.status === 'approved').length;
    const rejectedCount = baseScopeReferrals.filter(
      (r) => r.status === 'rejected' || Boolean(r.resubmittedCount && r.resubmittedCount > 0)
    ).length;

    return (
      <div className="flex-1 min-h-0 flex flex-col bg-slate-50 relative overflow-hidden">
        <FloatingToolsWallpaper />
        <div className="flex-1 min-h-0 relative z-10 overflow-y-auto overscroll-contain touch-pan-y pt-24 pb-16 px-4">
          <div className="w-full max-w-xl mx-auto space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black text-slate-950 tracking-tight">
                  Referrals &amp; Verification Queue
                </h2>
                <p className="text-[11px] font-medium text-slate-500">
                  View captured selfie, ID &amp; proof of payment, approve, or reject
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playNewSubmissionAlert();
                  }}
                  title="Test Sound Alert Chime"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-black transition-all cursor-pointer active:scale-95"
                >
                  <Bell className="w-3.5 h-3.5 text-emerald-600 fill-emerald-500 animate-pulse" />
                  <span>Sound Alert Active</span>
                </button>
                <span className="px-2.5 py-1 rounded-full bg-slate-950 text-white text-[10px] font-black">
                  {baseScopeReferrals.length} Total
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setReferralNetworkOnly(false);
                }}
                className={`flex-1 py-1.5 px-2.5 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                  !referralNetworkOnly
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Submissions ({userSubReferrals.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setReferralNetworkOnly(true);
                }}
                className={`flex-1 py-1.5 px-2.5 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                  referralNetworkOnly
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                My Network Only ({myNetworkReferralsCount})
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5">
              <div>
                <span className="block text-[8px] font-black text-emerald-800 uppercase tracking-wider">
                  Approved User Sub
                </span>
                <div className="text-sm font-black text-slate-950 tabular-nums mt-0.5">
                  {approvedMyUserSubs.length}
                </div>
                <span className="text-[9px] font-bold text-slate-600 tabular-nums">
                  R{approvedMyUserSubTotal.toFixed(2)}/mo
                </span>
              </div>
              <div className="border-l border-emerald-200 pl-2">
                <span className="block text-[8px] font-black text-emerald-800 uppercase tracking-wider">
                  Approved Tenant Subs
                </span>
                <div className="text-sm font-black text-slate-950 tabular-nums mt-0.5">
                  {approvedMyTenantSubs.length}
                </div>
                <span className="text-[9px] font-bold text-slate-600 tabular-nums">
                  R{approvedMyTenantSubTotal.toFixed(2)}/mo
                </span>
              </div>
              <div className="border-l border-emerald-200 pl-2">
                <span className="block text-[8px] font-black text-emerald-800 uppercase tracking-wider">
                  Monthly Profit
                </span>
                <div className="text-sm font-black text-emerald-700 tabular-nums mt-0.5">
                  R{approvedMyMonthlyProfit.toFixed(2)}
                </div>
                <span className="text-[9px] font-bold text-emerald-700">
                  /mo • {approvedMyReferrals.length} approved
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'all', label: `All (${baseScopeReferrals.length})` },
                  { id: 'pending_review', label: `Pending (${pendingCount})` },
                  { id: 'resubmitted', label: `Resubmitted (${resubmittedCount})` },
                  { id: 'approved', label: `Approved (${approvedCount})` },
                  { id: 'rejected', label: `Rejected (${rejectedCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setReferralFilterStatus(tab.id);
                  }}
                  className={`flex-1 min-w-[calc(33%-4px)] sm:min-w-0 py-1.5 px-2 rounded-xl text-[10px] font-black transition-all cursor-pointer whitespace-nowrap ${
                    referralFilterStatus === tab.id
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {!authUser?.emailVerified && !authUser?.providerData.some((p) => p.providerId === 'password') && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs font-semibold text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Verify your account email or sign in with Google to load live submissions from Firestore.
              </span>
            </div>
          )}

          {referralAdminError && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-start gap-2 text-xs font-bold text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{referralAdminError}</span>
            </div>
          )}

          {filteredReferrals.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-sm font-black text-slate-900">No Submissions Found</div>
              <p className="text-xs font-medium text-slate-500 max-w-xs mx-auto">
                {referralSearch.trim()
                  ? 'Try clearing your search or switching filter tabs.'
                  : referralNetworkOnly
                  ? 'Nobody has joined through your personal tenant invite link yet.'
                  : 'Subscription submissions and link referrals will appear here automatically.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReferrals.map((item) => {
                const isBusy = referralActionLoadingUid === item.uid;
                const isMyDirectReferral = Boolean(item.invitedBy) && item.invitedBy === activeInviteCode;
                const statusBadgeClass =
                  item.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : item.status === 'rejected'
                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200';
                const statusLabel =
                  item.status === 'approved'
                    ? 'Approved'
                    : item.status === 'rejected'
                    ? 'Rejected'
                    : 'Pending Review';

                const referralSelfieSrc = referralSelfies[item.uid] || '';

                return (
                  <div
                    key={item.uid}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {referralSelfieSrc ? (
                          <button
                            type="button"
                            onClick={() => {
                              playClickSound();
                              setFullScreenZoom(1);
                              setFullScreenPreview({
                                title: `${item.applicantName} • Face Selfie`,
                                categoryLabel: 'Referral Face Selfie',
                                mimeType: 'image/jpeg',
                                dataUrl: referralSelfieSrc,
                              });
                            }}
                            title="View Referral Face Selfie full screen"
                            className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all active:scale-95"
                          >
                            <img
                              src={referralSelfieSrc}
                              alt={`${item.applicantName} face selfie`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <UserCircle className="w-7 h-7" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-black text-slate-950 truncate">
                              {item.applicantName}
                            </h3>
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-[9px] font-black uppercase">
                              {item.plan === 'tenant' ? 'Tenant Sub' : 'User Sub'}
                            </span>
                            {isMyDirectReferral && (
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-black">
                                Your Network
                              </span>
                            )}
                            {item.invitedBy && !isMyDirectReferral && (
                              <span className="px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[9px] font-black">
                                Ref: {item.invitedBy}
                              </span>
                            )}
                            {Boolean(item.resubmittedCount && item.resubmittedCount > 0) && (
                              <span className="px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-[9px] font-black">
                                Rejected Resubmission
                                {item.resubmittedCount && item.resubmittedCount > 1
                                  ? ` #${item.resubmittedCount}`
                                  : ''}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-bold text-slate-500 truncate mt-0.5">
                            {item.applicantEmail || 'No email'}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase shrink-0 ${statusBadgeClass}`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.contactInfo || 'Not provided'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.locationName || 'Location pending'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">
                          {item.docCount} ID Doc{item.docCount === 1 ? '' : 's'}
                          {item.paymentDocCount ? ` • ${item.paymentDocCount} Payment` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {new Date(item.submittedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {item.status === 'rejected' && item.rejectionReason && (
                      <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-[11px] font-bold text-rose-800">
                        Rejection Reason: {item.rejectionReason}
                      </div>
                    )}

                    {Boolean(item.resubmittedCount && item.resubmittedCount > 0) && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-[11px] font-bold text-amber-900 space-y-0.5">
                        <div>
                          Resubmitted after rejection ({item.resubmittedCount}x)
                          {item.resubmittedAt
                            ? ` • ${new Date(item.resubmittedAt).toLocaleString()}`
                            : ''}
                        </div>
                        {item.previousRejectionReason && (
                          <div className="text-[10px] font-semibold text-amber-800">
                            Previous Rejection Reason: {item.previousRejectionReason}
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-[11px] font-bold ${
                        item.status === 'approved'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : item.status === 'rejected'
                          ? 'bg-slate-100 border-slate-200 text-slate-600'
                          : 'bg-amber-50/70 border-amber-200 text-amber-900'
                      }`}
                    >
                      <span>
                        {item.plan === 'tenant' ? 'Tenant Sub (R299,99/mo)' : 'User Sub (R29,99/mo)'}
                      </span>
                      <span className="font-black tabular-nums">
                        {item.status === 'approved'
                          ? `+R${getReferralProfitAmount(item.plan).toFixed(2)}/mo Profit`
                          : item.status === 'rejected'
                          ? 'R0.00/mo Profit'
                          : `+R${getReferralProfitAmount(item.plan).toFixed(2)}/mo on Approval`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenReferralDetails(item)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBusy || item.status === 'approved'}
                        onClick={() => handleReviewUserSubReferral(item, 'approved')}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 text-white rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5px]" />
                        <span>{item.status === 'approved' ? 'Approved' : 'Approve'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBusy || item.status === 'rejected'}
                        onClick={() => openRejectModal(item)}
                        className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-45 text-white rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed active:scale-95"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{item.status === 'rejected' ? 'Rejected' : 'Reject'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </div>
    );
  };

  // Referrer Tenant Referrals & Monthly Profit View (Attached to Referrals icon for non-reviewer approved Tenants)
  const renderReferrerReferralsView = () => {
    const queryLower = referralSearch.trim().toLowerCase();
    const pendingCount = myReferrerEntries.filter((r) => r.status === 'pending_review').length;
    const approvedCount = approvedMyReferrals.length;
    const rejectedCount = myReferrerEntries.filter((r) => r.status === 'rejected').length;

    const filteredMyReferrals = myReferrerEntries.filter((member) => {
      if (referralFilterStatus === 'resubmitted') {
        return false;
      }
      if (referralFilterStatus !== 'all' && member.status !== referralFilterStatus) {
        return false;
      }
      if (!queryLower) return true;
      return (
        member.referralName.toLowerCase().includes(queryLower) ||
        member.plan.toLowerCase().includes(queryLower) ||
        member.status.toLowerCase().includes(queryLower) ||
        member.invitedBy.toLowerCase().includes(queryLower)
      );
    });

    return (
      <div className="flex-1 min-h-0 flex flex-col bg-slate-50 relative overflow-hidden">
        <FloatingToolsWallpaper />
        <div className="flex-1 min-h-0 relative z-10 overflow-y-auto overscroll-contain touch-pan-y pt-24 pb-16 px-4">
          <div className="w-full max-w-xl mx-auto space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black text-slate-950 tracking-tight">
                  My Referrals &amp; Monthly Profit
                </h2>
                <p className="text-[11px] font-medium text-slate-500">
                  Approved User Subs, Tenant Subs &amp; monthly profit credited to your wallet
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-950 text-white text-[10px] font-black shrink-0">
                {myReferrerEntries.length} Total
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5">
              <div>
                <span className="block text-[8px] font-black text-emerald-800 uppercase tracking-wider">
                  Approved User Sub
                </span>
                <div className="text-sm font-black text-slate-950 tabular-nums mt-0.5">
                  {approvedMyUserSubs.length}
                </div>
                <span className="text-[9px] font-bold text-slate-600 tabular-nums">
                  R{approvedMyUserSubTotal.toFixed(2)}/mo
                </span>
              </div>
              <div className="border-l border-emerald-200 pl-2">
                <span className="block text-[8px] font-black text-emerald-800 uppercase tracking-wider">
                  Approved Tenant Subs
                </span>
                <div className="text-sm font-black text-slate-950 tabular-nums mt-0.5">
                  {approvedMyTenantSubs.length}
                </div>
                <span className="text-[9px] font-bold text-slate-600 tabular-nums">
                  R{approvedMyTenantSubTotal.toFixed(2)}/mo
                </span>
              </div>
              <div className="border-l border-emerald-200 pl-2">
                <span className="block text-[8px] font-black text-emerald-800 uppercase tracking-wider">
                  Monthly Profit
                </span>
                <div className="text-sm font-black text-emerald-700 tabular-nums mt-0.5">
                  R{approvedMyMonthlyProfit.toFixed(2)}
                </div>
                <span className="text-[9px] font-bold text-emerald-700">
                  /mo • {approvedCount} approved
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'all', label: `All (${myReferrerEntries.length})` },
                  { id: 'approved', label: `Approved (${approvedCount})` },
                  { id: 'pending_review', label: `Pending (${pendingCount})` },
                  { id: 'rejected', label: `Rejected (${rejectedCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setReferralFilterStatus(tab.id);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-black transition-all cursor-pointer whitespace-nowrap ${
                    referralFilterStatus === tab.id
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredMyReferrals.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-sm font-black text-slate-900">No Referrals Found</div>
              <p className="text-xs font-medium text-slate-500 max-w-xs mx-auto">
                {referralSearch.trim()
                  ? 'Try clearing your search or switching filter tabs.'
                  : 'Share your Tenant Link to earn R299,99/mo per approved Tenant Sub and R29,99/mo per approved User Sub.'}
              </p>
              <button
                type="button"
                onClick={handleShareUserSubInvite}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Tenant Link</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMyReferrals.map((member) => {
                const isApproved = member.status === 'approved';
                const statusBadgeClass = isApproved
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : member.status === 'rejected'
                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                  : 'bg-amber-100 text-amber-800 border-amber-200';
                const statusLabel = isApproved
                  ? 'Approved'
                  : member.status === 'rejected'
                  ? 'Rejected'
                  : 'Pending Review';

                const referralSelfieSrc = referralSelfies[member.referralUid] || '';

                return (
                  <div
                    key={member.referralUid}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {referralSelfieSrc ? (
                          <button
                            type="button"
                            onClick={() => {
                              playClickSound();
                              setFullScreenZoom(1);
                              setFullScreenPreview({
                                title: `${member.referralName} • Face Selfie`,
                                categoryLabel: 'Referral Face Selfie',
                                mimeType: 'image/jpeg',
                                dataUrl: referralSelfieSrc,
                              });
                            }}
                            title="View Referral Face Selfie full screen"
                            className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all active:scale-95"
                          >
                            <img
                              src={referralSelfieSrc}
                              alt={`${member.referralName} face selfie`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <UserCircle className="w-7 h-7" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-black text-slate-950 truncate">
                              {member.referralName}
                            </h3>
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-[9px] font-black uppercase">
                              {member.plan === 'tenant' ? 'Tenant Sub' : 'User Sub'}
                            </span>
                            {member.hasProofOfPayment && (
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-black flex items-center gap-1">
                                <Receipt className="w-3 h-3" />
                                <span>PoP ({member.paymentDocCount})</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{new Date(member.submittedAt).toLocaleString()}</span>
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase shrink-0 ${statusBadgeClass}`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-[11px] font-bold ${
                        isApproved
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : member.status === 'rejected'
                          ? 'bg-slate-100 border-slate-200 text-slate-600'
                          : 'bg-amber-50/70 border-amber-200 text-amber-900'
                      }`}
                    >
                      <span>
                        {member.plan === 'tenant' ? 'Tenant Sub (R299,99/mo)' : 'User Sub (R29,99/mo)'}
                      </span>
                      <span className="font-black tabular-nums">
                        {isApproved
                          ? `+R${member.profitAmount.toFixed(2)}/mo Profit`
                          : member.status === 'rejected'
                          ? 'R0.00/mo Profit'
                          : `+R${member.profitAmount.toFixed(2)}/mo on Approval`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </div>
    );
  };

  const renderSeekersView = () => {
    const categories = ['All', 'Handyman', 'Tech & IT', 'Delivery', 'Cleaning'];
    const filteredSeekers = seekersList.filter((s) => {
      const matchesCategory = seekersCategoryFilter === 'All' || s.category === seekersCategoryFilter;
      const q = seekersSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.skills.some((sk) => sk.toLowerCase().includes(q)) ||
        s.locationName.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });

    return (
      <div className="flex-1 min-h-0 bg-slate-900 text-white flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Seekers Header */}
        <div className="bg-slate-950/90 border-b border-slate-800 p-4 shrink-0 backdrop-blur-md">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  Seekers Marketplace
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-black border border-emerald-500/30">
                    Live Artisans
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Hire verified local tradesmen, specialists &amp; service providers
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setViewMode('map');
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Back to Map</span>
            </button>
          </div>

          {/* Search & Category Tabs */}
          <div className="max-w-4xl mx-auto mt-3 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by trade, skill (e.g. Electrician, Plumbing, Delivery)..."
                value={seekersSearch}
                onChange={(e) => setSeekersSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              {seekersSearch && (
                <button
                  type="button"
                  onClick={() => setSeekersSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setSeekersCategoryFilter(cat);
                  }}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    seekersCategoryFilter === cat
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Seekers List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 max-w-4xl mx-auto w-full">
          {filteredSeekers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-semibold">
              No seekers found matching "{seekersSearch}". Try another search query or category.
            </div>
          ) : (
            filteredSeekers.map((seeker) => (
              <div
                key={seeker.uid}
                className="bg-slate-950/70 border border-slate-800/80 hover:border-indigo-500/50 rounded-2xl p-4 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={seeker.selfieUrl}
                      alt={seeker.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-700 shadow-md"
                    />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black text-white">{seeker.name}</h3>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                        {seeker.category}
                      </span>
                      <div className="flex items-center gap-1 text-amber-400 text-[11px] font-black">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{seeker.rating.toFixed(1)}</span>
                        <span className="text-slate-500 text-[10px]">({seeker.completedGigsCount} completed)</span>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-slate-300 mt-0.5">{seeker.title}</div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {seeker.bio}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      {seeker.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[9px] font-semibold"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <div className="text-left sm:text-right">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Service Rate</span>
                    <div className="text-sm font-black text-emerald-400">{seeker.hourlyRate}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      <span>{seeker.locationName.split('•')[1]?.trim() || 'Nearby'}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartHireSeeker(seeker)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Hire Seeker</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const isMapVisible = viewMode === 'map' || viewMode === 'gigs';
  const isAdminReferralsView = viewMode === 'referrals' && canReviewReferrals;
  const isReferrerReferralsView = viewMode === 'referrals' && isApprovedTenant && !canReviewReferrals;
  const isTenantReferralsView = isAdminReferralsView || isReferrerReferralsView;
  const isSearchOnlyView = viewMode === 'referrals' && !isTenantReferralsView;

  return (
    <div className={`flex flex-col h-[100dvh] w-screen overflow-hidden font-sans relative ${viewMode === 'seekers' ? 'bg-slate-900' : isSearchOnlyView ? 'bg-white' : isTenantReferralsView ? 'bg-slate-50' : 'bg-slate-950'}`}>
      <div className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
        !isMapVisible ? 'opacity-0 pointer-events-none' : 'blur-0 opacity-100 scale-100'
      }`}>
        <MapView
          userLocation={userLocation}
          savedPins={EMPTY_PINS}
          selectedTile={selectedTile}
          onMapClick={isPickingGigLocation ? handlePickGigLocationAt : noopMapAction}
          onOpenAddPinAt={noopMapAction}
          trackingTrail={EMPTY_TRAIL}
          flyToTarget={flyToTarget}
          mapRef={mapRef}
          is3D={is3D}
          routePath={routePath}
          destination={destination}
          gigPosts={gigPosts}
          isPickingGigLocation={isPickingGigLocation}
          onSelectGigPost={(gig) => {
            soundEngine.playFeatureClick();
            setSelectedGigPost(gig);
          }}
          onUserInteract={() => {
            userPannedDuringNavRef.current = true;
            userZoomedDuringNavRef.current = true;
          }}
        />
      </div>

      {/* Global Search Bar (Positioned high - excluded from tenant, profile, seekers) */}
      {viewMode !== 'tenant' && viewMode !== 'profile' && viewMode !== 'seekers' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[150] w-11/12 max-w-xl animate-in slide-in-from-top-4 duration-500">
          <div className="relative group">
            {viewMode === 'referrals' ? (
              <Users className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600 transition-colors pointer-events-none" />
            ) : (
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors pointer-events-none text-slate-400 group-focus-within:text-blue-500" />
            )}
            <input
              type="text"
              placeholder={viewMode === 'referrals' ? 'Search Referrals...' : 'Search destination for Lady Voice Navigation...'}
              value={viewMode === 'referrals' ? referralSearch : searchQuery}
              onClick={playClickSound}
              onChange={(e) => {
                if (viewMode === 'referrals') setReferralSearch(e.target.value);
                else setSearchQuery(e.target.value);
              }}
              className="w-full pl-14 pr-12 py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all"
            />
            {viewMode === 'referrals' && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setReferralSearch('');
                  setViewMode('map');
                }}
                title="Close search mode"
                aria-label="Close search mode"
                className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {(searchQuery && searchResults && searchResults.length > 0 && viewMode === 'map') && (
              <div className="absolute left-0 right-0 mt-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden max-h-80 overflow-y-auto z-[151]">
                {searchResults.map((item) => (
                  <button
                    key={item.place_id}
                    onClick={() => handleSelectSuggestion(item.lat, item.lon, item.display_name)}
                    className="w-full text-left px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800/80 transition-colors flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer"
                  >
                    <Navigation className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="truncate">{item.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Lady Voice Navigation HUD */}
      {isNavigating && destination && isMapVisible && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-[140] w-11/12 max-w-lg animate-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-emerald-500/40 rounded-2xl p-3.5 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${isVoiceSpeaking ? 'bg-emerald-500 text-slate-950 border-emerald-300 animate-pulse' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                  <Volume2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                      Lady Voice Navigating
                    </span>
                    {navigationRoute && (
                      <span className="text-[10px] font-bold text-slate-400">
                        • {formatSpokenDistance(navigationRoute.distanceMeters)} ({formatDuration(navigationRoute.durationSeconds)})
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-black text-white truncate mt-0.5">
                    To: {destination.name}
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium mt-1 leading-snug">
                    {navigationRoute?.steps[currentStepIndex]?.instruction || `Calculating route to ${destination.name}...`}
                  </p>
                </div>
              </div>

              <button
                onClick={handleStopNavigation}
                title="Stop Navigation"
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRepeatInstruction}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                >
                  <Volume2 className="w-3 h-3 text-emerald-400" />
                  <span>Repeat</span>
                </button>
                {navigationRoute && currentStepIndex < navigationRoute.steps.length - 1 && (
                  <button
                    onClick={handleNextStep}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                  >
                    <span>Next Turn</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                onClick={handleToggleVoiceMute}
                title={isVoiceMuted ? 'Unmute Lady Voice' : 'Mute Lady Voice'}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 ${isVoiceMuted ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}
              >
                {isVoiceMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                <span>{isVoiceMuted ? 'Muted' : 'Voice On'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pick Location Banner for Creating a Gig Post on the Map */}
      {isPickingGigLocation && isMapVisible && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-[145] w-11/12 max-w-md animate-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-950/95 backdrop-blur-xl border-2 border-amber-400 rounded-2xl p-3.5 text-white shadow-2xl space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
                <MapPin className="w-4 h-4 stroke-[2.5px]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                  Place Gig on Map
                </div>
                <p className="text-xs font-bold text-white leading-snug">
                  Tap any exact spot on the map where you want your gig post to appear live.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePickGigLocationAt(userLocation.lat, userLocation.lng)}
                className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <LocateFixed className="w-3.5 h-3.5" />
                <span>Use My Location</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsPickingGigLocation(false);
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-black transition-all cursor-pointer active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right Map Controls */}
      <div className={`transition-opacity duration-500 ${isMapVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute bottom-14 right-4 z-[100] flex flex-col gap-3">
          {/* Phone Menu Icon on top of the World icon (contains Create Gig, Seekers, Shop) */}
          <div ref={phoneMenuRef} className="relative">
            <button
              onClick={() => {
                playClickSound();
                setShowPhoneMenu((prev) => !prev);
              }}
              title="App Menu (Create Gig, Seekers, Shop)"
              aria-label="Open Phone Menu"
              className={`w-10 h-10 rounded-full shadow-2xl flex items-center justify-center transition-all border-4 cursor-pointer active:scale-90 ${
                showPhoneMenu || isPickingGigLocation || showCreateGigModal || viewMode === 'seekers'
                  ? 'bg-slate-950 text-white border-slate-700'
                  : 'bg-white text-slate-900 border-white hover:bg-slate-50'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            {showPhoneMenu && (
              <div className="absolute top-0 right-12 z-[120] bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl p-2.5 w-56 animate-in fade-in zoom-in-95 duration-150">
                <div className="grid grid-cols-3 gap-2">
                  {/* Create Gig Post App Icon */}
                  <button
                    type="button"
                    onClick={handleStartCreateGig}
                    className="flex flex-col items-center gap-1 p-1.5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer active:scale-95"
                  >
                    <div
                      className={`relative w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm transition-all ${
                        isPickingGigLocation || showCreateGigModal
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-amber-50 text-amber-600 border border-amber-200'
                      }`}
                    >
                      <Briefcase className="w-5 h-5" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-950 text-white flex items-center justify-center border border-white shadow-sm">
                        <Plus className="w-2.5 h-2.5 stroke-[3px]" />
                      </span>
                    </div>
                    <span className="text-[9px] font-black text-slate-800 tracking-tight whitespace-nowrap">
                      Create Gig
                    </span>
                  </button>

                  {/* Seekers App Icon */}
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setViewMode((prev) => (prev === 'seekers' ? 'map' : 'seekers'));
                      setShowPhoneMenu(false);
                    }}
                    className="flex flex-col items-center gap-1 p-1.5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer active:scale-95"
                  >
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm transition-all ${
                        viewMode === 'seekers'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                      }`}
                    >
                      <Search className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-black text-slate-800 tracking-tight">
                      Seekers
                    </span>
                  </button>

                  {/* Shop App Icon */}
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setShowPhoneMenu(false);
                      setShowShopModal(true);
                    }}
                    className="flex flex-col items-center gap-1 p-1.5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer active:scale-95"
                  >
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm transition-all ${
                        showShopModal
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      }`}
                    >
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-black text-slate-800 tracking-tight">
                      Shop
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button onClick={handleToggleSatellite} title="Toggle Satellite Map" className={`w-10 h-10 rounded-full shadow-2xl flex items-center justify-center transition-all border-4 cursor-pointer active:scale-90 ${selectedTile === 'satellite' ? 'bg-blue-600 text-white border-blue-400' : 'bg-white text-slate-900 border-white'}`}><Globe className="w-4 h-4" /></button>
          <button onClick={handleBackToLocation} title="GPS Location" className="w-10 h-10 bg-white border-4 border-white rounded-full shadow-2xl flex items-center justify-center text-blue-600 transition-transform active:scale-90 cursor-pointer"><LocateFixed className="w-4 h-4" /></button>
          <button onClick={() => { playClickSound(); setIs3D(!is3D); }} title="Toggle 3D Perspective" className={`w-10 h-10 rounded-full shadow-2xl flex items-center justify-center border-4 cursor-pointer active:scale-90 ${is3D ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-white text-slate-900 border-white'}`}><span className="text-[10px] font-black">3D</span></button>
          <button
            onClick={() => {
              playClickSound();
              userZoomedDuringNavRef.current = true;
              const map = mapRef.current;
              if (map) {
                map.stop();
                map.zoomIn();
              }
            }}
            title="Zoom In"
            className="w-10 h-10 bg-white border-4 border-white rounded-full shadow-2xl flex items-center justify-center font-black text-lg text-slate-900 hover:bg-slate-50 transition-all active:scale-90 cursor-pointer"
          >+</button>
          <button
            onClick={() => {
              playClickSound();
              userZoomedDuringNavRef.current = true;
              const map = mapRef.current;
              if (map) {
                map.stop();
                map.zoomOut();
              }
            }}
            title="Zoom Out"
            className="w-10 h-10 bg-white border-4 border-white rounded-full shadow-2xl flex items-center justify-center font-black text-lg text-slate-900 hover:bg-slate-50 transition-all active:scale-90 cursor-pointer"
          >-</button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative z-20 flex flex-col overflow-hidden pointer-events-none">
        <div className={`flex-1 min-h-0 flex flex-col overflow-hidden ${isMapVisible || isSearchOnlyView ? 'pointer-events-none' : 'pointer-events-auto'}`}>
          {viewMode === 'tenant' && isApprovedTenant && renderTenantView()}
          {viewMode === 'profile' && isApprovedUser && renderProfileView()}
          {isAdminReferralsView && renderAdminReferralsView()}
          {isReferrerReferralsView && renderReferrerReferralsView()}
          {!isTenantReferralsView && viewMode === 'referrals' && <FloatingToolsWallpaper />}
          {viewMode === 'seekers' && renderSeekersView()}
          {viewMode === 'gigs' && null}
        </div>
      </div>

      {/* Compact Bottom Navigation Bar */}
      <div className="h-11 bg-white border-t border-slate-200 flex items-center justify-around px-2 shrink-0 z-[180]">
        {isApprovedTenant ? (
          <>
            {[
              { id: 'tenant', label: 'Tenant', icon: Home },
              { id: 'gigs', label: 'GiGs', icon: MapPin },
              { id: 'referrals', label: 'Referrals', icon: Users },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  playClickSound();
                  setViewMode((prev) => (prev === item.id ? 'map' : (item.id as AppViewMode)));
                }}
                className="flex flex-col items-center justify-center gap-0.5 transition-all duration-300 w-20 py-1 group cursor-pointer"
              >
                <div className={`relative transition-all duration-300 ${viewMode === item.id ? 'text-slate-950 scale-110' : 'text-slate-950'}`}>
                  <item.icon className={`w-4 h-4 ${viewMode === item.id ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                  {item.id === 'referrals' && pendingSubmissionsCount > 0 && (
                    <span
                      aria-label={`${pendingSubmissionsCount} pending submissions`}
                      className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-1 rounded-full bg-rose-600 text-white text-[8px] font-black leading-none flex items-center justify-center shadow-sm border border-white"
                    >
                      {pendingSubmissionsCount > 99 ? '99+' : pendingSubmissionsCount}
                    </span>
                  )}
                </div>
                <span className="text-[8px] leading-none font-black uppercase tracking-wider text-slate-950">
                  {item.label}
                </span>
              </button>
            ))}
          </>
        ) : isApprovedUser ? (
          <>
            {[
              { id: 'referrals', label: 'Referrals', icon: Users },
              { id: 'gigs', label: 'GiGs', icon: MapPin },
              { id: 'profile', label: 'Profile', icon: UserCircle },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  playClickSound();
                  setViewMode((prev) => (prev === item.id ? 'map' : (item.id as AppViewMode)));
                }}
                className="flex flex-col items-center justify-center gap-0.5 transition-all duration-300 w-20 py-1 group cursor-pointer"
              >
                <div className={`transition-all duration-300 ${viewMode === item.id ? 'text-slate-950 scale-110' : 'text-slate-950'}`}>
                  <item.icon className={`w-4 h-4 ${viewMode === item.id ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                </div>
                <span className="text-[8px] leading-none font-black uppercase tracking-wider text-slate-950">
                  {item.label}
                </span>
              </button>
            ))}
          </>
        ) : authUser ? (
          /* Signed in but account not approved yet: show ONLY Logout icon */
          <button
            onClick={handleSignOut}
            className="flex flex-col items-center justify-center gap-0.5 transition-all duration-300 w-24 mx-auto py-1 group cursor-pointer active:scale-95"
          >
            <div className="transition-all duration-300 text-rose-600 group-hover:scale-110">
              <LogOut className="w-4 h-4 stroke-[2.25px]" />
            </div>
            <span className="text-[8px] leading-none font-black uppercase tracking-wider text-rose-600 whitespace-nowrap">
              Log Out
            </span>
          </button>
        ) : (
          /* Signed out: Signup / Sign-in centered */
          <button
            onClick={() => {
              playClickSound();
              setShowAuthModal(true);
            }}
            className="flex flex-col items-center justify-center gap-0.5 transition-all duration-300 w-28 mx-auto py-1 group cursor-pointer"
          >
            <div className={`transition-all duration-300 ${showAuthModal ? 'text-blue-600 scale-110' : 'text-slate-950'}`}>
              <LogIn className={`w-4 h-4 ${showAuthModal ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
            </div>
            <span className="text-[8px] leading-none font-black uppercase tracking-wider text-slate-950 whitespace-nowrap">
              Sign Up / In
            </span>
          </button>
        )}
      </div>

      {/* Non-blocking Account Unactive / Pending Review / Rejected Pill */}
      {(accountStatus === 'pending_review' || accountStatus === 'rejected') && !isSearchOnlyView && !isTenantReferralsView && (
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setShowShopModal(true);
          }}
          className={`absolute bottom-14 left-3 z-[90] bg-white/95 backdrop-blur-md text-slate-950 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 text-[10px] font-black cursor-pointer transition-all active:scale-95 border ${
            accountStatus === 'rejected'
              ? 'border-rose-300 hover:bg-rose-50'
              : 'border-amber-300 hover:bg-amber-50'
          }`}
        >
          {accountStatus === 'rejected' ? (
            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          )}
          <span>
            {accountStatus === 'rejected'
              ? 'Subscription Rejected • Tap to Resubmit'
              : 'Account Unactive • Review 15–25m'}
          </span>
        </button>
      )}

      {/* TimeGiG Shop Modal (2 Subscription Boxes) */}
      <ShopModal
        isOpen={showShopModal}
        onClose={() => setShowShopModal(false)}
        selectedPlan={selectedPlan}
        accountStatus={accountStatus}
        hasSubmittedSubscription={hasSubmittedSubscription}
        rejectionReason={verificationSubmission?.rejectionReason}
        onChoosePlan={handleChooseSubscriptionPlan}
      />

      {/* Live Selfie + ID Document Verification Modal */}
      <VerificationModal
        isOpen={showVerificationModal}
        plan={pendingPlanForVerification}
        existingSubmission={verificationSubmission}
        onClose={() => setShowVerificationModal(false)}
        onBackToPlans={() => {
          setShowVerificationModal(false);
          setShowShopModal(true);
        }}
        onSubmitVerification={handleCompleteVerification}
      />

      {/* Face Selfie Profile Logo Modal (Once a month update) */}
      <SelfieLogoModal
        isOpen={showSelfieLogoModal}
        onClose={() => setShowSelfieLogoModal(false)}
        onCaptureSelfie={handleUpdateProfileLogo}
      />

      {/* Sign Up / Sign In Modal */}
      <AuthModal
        isOpen={showAuthModal}
        invitedBy={invitedByCode}
        onClose={() => setShowAuthModal(false)}
        onAuthCompleted={handleAuthCompleted}
      />

      {/* Main Admin 5-Digit PIN Modal for timegig2026@gmail.com */}
      <AdminPinModal
        isOpen={showAdminPinModal && isMainAdminAccount}
        email={authUser?.email || MAIN_ADMIN_EMAIL}
        isEmailVerified={Boolean(authUser?.emailVerified)}
        onVerified={handleAdminPinVerified}
        onSignOut={handleSignOut}
      />

      {/* Selected Referral & Verification Details Modal (Main Tenant & Link-Tenants) */}
      {selectedReferral && isAdminReferralsView && (
        <div
          className="fixed inset-0 z-[225] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedReferral(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-md max-h-[88dvh] flex flex-col shadow-2xl overflow-hidden text-slate-950 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-base font-black tracking-tight text-slate-950 truncate">
                  {selectedReferral.applicantName}
                </h3>
                <p className="text-[11px] font-bold text-slate-500 truncate">
                  {selectedReferral.plan === 'tenant' ? 'Tenant Subscription' : 'User Subscription'} Verification Details
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReferral(null)}
                aria-label="Close referral details"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                <div>
                  <span className="block text-[9px] font-black uppercase text-slate-400">Plan</span>
                  <span className="font-black text-slate-900">
                    {selectedReferral.plan === 'tenant' ? 'Tenant Subscription' : 'User Subscription'}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-black uppercase text-slate-400">Status</span>
                  <span className="font-black text-slate-900 capitalize">
                    {selectedReferral.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[9px] font-black uppercase text-slate-400">Email</span>
                  <span className="font-bold text-slate-900 break-all">
                    {selectedReferral.applicantEmail || 'Not provided'}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-black uppercase text-slate-400">Contact</span>
                  <span className="font-bold text-slate-900">
                    {selectedReferral.contactInfo || 'Not provided'}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-black uppercase text-slate-400">Invited By</span>
                  <span className="font-bold text-blue-700">
                    {selectedReferral.invitedBy || 'Direct Signup'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[9px] font-black uppercase text-slate-400">Location</span>
                  <span className="font-bold text-slate-900">
                    {selectedReferral.locationName || 'Location pending'}
                  </span>
                </div>
                {selectedReferral.status === 'rejected' && selectedReferral.rejectionReason && (
                  <div className="col-span-2 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                    <span className="block text-[9px] font-black uppercase text-rose-700">Rejection Reason</span>
                    <span className="font-bold text-rose-900">
                      {selectedReferral.rejectionReason}
                    </span>
                  </div>
                )}
                {Boolean(selectedReferral.resubmittedCount && selectedReferral.resubmittedCount > 0) && (
                  <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5 space-y-1">
                    <span className="block text-[9px] font-black uppercase text-amber-800">
                      Rejected Resubmission ({selectedReferral.resubmittedCount}x)
                      {selectedReferral.resubmittedAt
                        ? ` • ${new Date(selectedReferral.resubmittedAt).toLocaleString()}`
                        : ''}
                    </span>
                    {selectedReferral.previousRejectionReason && (
                      <span className="block font-bold text-amber-900">
                        Previous Rejection Reason: {selectedReferral.previousRejectionReason}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {loadingReferralFiles && (
                <div className="flex items-center justify-center gap-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 font-bold">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Loading captured selfie &amp; documents...</span>
                </div>
              )}

              {referralFilesError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-xs font-bold text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{referralFilesError}</span>
                </div>
              )}

              {/* Captured Face Selfie (Click for Full Screen) */}
              {(() => {
                const selfieFile = selectedReferralFiles.find((f) => f.category === 'selfie');
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Captured Face Selfie
                      </span>
                      {selfieFile?.dataUrl && (
                        <span className="text-[10px] font-bold text-blue-600">Tap to view full screen</span>
                      )}
                    </div>
                    {selfieFile?.dataUrl ? (
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setFullScreenZoom(1);
                          setFullScreenPreview({
                            title: `${selectedReferral.applicantName} — Live Face Selfie`,
                            categoryLabel: 'Captured Face Selfie',
                            mimeType: selfieFile.mimeType || 'image/jpeg',
                            dataUrl: selfieFile.dataUrl,
                          });
                        }}
                        className="group relative w-full h-44 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <img
                          src={selfieFile.dataUrl}
                          alt="Captured face selfie"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/25 transition-colors flex items-end justify-end p-2.5">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 text-white text-[10px] font-black flex items-center gap-1 shadow-md">
                            <Maximize2 className="w-3 h-3" />
                            <span>Full Screen</span>
                          </span>
                        </div>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-600">
                        <Camera className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          {loadingReferralFiles
                            ? 'Loading face selfie...'
                            : 'Live face selfie verified (image file not attached on legacy submission).'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ID Documents (Click each for Full Screen) */}
              {(() => {
                const idFiles = selectedReferralFiles.filter((f) => f.category === 'id_document');
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        ID Documents ({idFiles.length > 0 ? idFiles.length : selectedReferral.docCount})
                      </span>
                      {idFiles.length > 0 && (
                        <span className="text-[10px] font-bold text-blue-600">Tap to view full screen</span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {idFiles.length > 0 ? (
                        idFiles.map((file) => (
                          <button
                            key={file.fileId}
                            type="button"
                            onClick={() => {
                              playClickSound();
                              setFullScreenZoom(1);
                              setFullScreenPreview({
                                title: file.name,
                                categoryLabel: 'ID Document',
                                mimeType: file.mimeType,
                                dataUrl: file.dataUrl,
                              });
                            }}
                            className="w-full flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 text-left transition-all cursor-pointer active:scale-[0.99]"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {file.mimeType.startsWith('image/') && file.dataUrl ? (
                                <img
                                  src={file.dataUrl}
                                  alt={file.name}
                                  className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shrink-0">
                                  <FileText className="w-5 h-5" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">{file.name}</div>
                                <div className="text-[10px] font-semibold text-blue-600 flex items-center gap-1 mt-0.5">
                                  <Maximize2 className="w-3 h-3" />
                                  <span>Tap to open full screen</span>
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                          </button>
                        ))
                      ) : (
                        selectedReferral.docNames.map((name, idx) => (
                          <div
                            key={`${name}-${idx}`}
                            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                          >
                            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="truncate">{name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Proof of Payment Documents (Click each for Full Screen) */}
              {(() => {
                const paymentFiles = selectedReferralFiles.filter((f) => f.category === 'proof_of_payment');
                const paymentNames = selectedReferral.paymentDocNames || [];
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Proof of Payment ({paymentFiles.length > 0 ? paymentFiles.length : paymentNames.length})
                      </span>
                      {paymentFiles.length > 0 && (
                        <span className="text-[10px] font-bold text-emerald-700">Tap to view full screen</span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {paymentFiles.length > 0 ? (
                        paymentFiles.map((file) => (
                          <button
                            key={file.fileId}
                            type="button"
                            onClick={() => {
                              playClickSound();
                              setFullScreenZoom(1);
                              setFullScreenPreview({
                                title: file.name,
                                categoryLabel: 'Proof of Payment',
                                mimeType: file.mimeType,
                                dataUrl: file.dataUrl,
                              });
                            }}
                            className="w-full flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300 text-left transition-all cursor-pointer active:scale-[0.99]"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {file.mimeType.startsWith('image/') && file.dataUrl ? (
                                <img
                                  src={file.dataUrl}
                                  alt={file.name}
                                  className="w-11 h-11 rounded-lg object-cover border border-emerald-200 shrink-0"
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-lg bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                                  <Receipt className="w-5 h-5" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">{file.name}</div>
                                <div className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                                  <Maximize2 className="w-3 h-3" />
                                  <span>Tap to open full screen</span>
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-emerald-500 shrink-0" />
                          </button>
                        ))
                      ) : paymentNames.length > 0 ? (
                        paymentNames.map((name, idx) => (
                          <div
                            key={`${name}-${idx}`}
                            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                          >
                            <Receipt className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="truncate">{name}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-500">
                          {loadingReferralFiles
                            ? 'Loading proof of payment...'
                            : 'No proof of payment file attached to this submission.'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center gap-2.5 bg-white">
              <button
                type="button"
                disabled={
                  referralActionLoadingUid === selectedReferral.uid ||
                  selectedReferral.status === 'approved'
                }
                onClick={() => handleReviewUserSubReferral(selectedReferral, 'approved')}
                className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[2.5px]" />
                <span>{selectedReferral.status === 'approved' ? 'Approved' : 'Approve'}</span>
              </button>
              <button
                type="button"
                disabled={
                  referralActionLoadingUid === selectedReferral.uid ||
                  selectedReferral.status === 'rejected'
                }
                onClick={() => openRejectModal(selectedReferral)}
                className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-45 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed active:scale-95"
              >
                <XCircle className="w-4 h-4" />
                <span>{selectedReferral.status === 'rejected' ? 'Rejected' : 'Reject'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Rejection Reason Modal for Tenant Reviewers */}
      {rejectTargetItem && (
        <div
          className="fixed inset-0 z-[245] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => {
            setRejectTargetItem(null);
            setRejectionReasonError(null);
          }}
        >
          <form
            onSubmit={handleConfirmRejectWithReason}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-slate-950 animate-in zoom-in-95 duration-150"
          >
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-base font-black tracking-tight text-slate-950">
                  Reason for Rejection
                </h3>
                <p className="text-[11px] font-bold text-slate-500 truncate">
                  {rejectTargetItem.applicantName} • {rejectTargetItem.plan === 'tenant' ? 'Tenant Sub' : 'User Sub'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRejectTargetItem(null);
                  setRejectionReasonError(null);
                }}
                aria-label="Close rejection reason modal"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 text-xs">
              <p className="font-semibold text-slate-600 leading-relaxed">
                You must explain why this subscription is rejected so the user knows what to fix before resubmitting.
              </p>

              <div className="flex flex-wrap gap-1.5">
                {[
                  'Blurry or unreadable ID document',
                  'Face selfie does not match ID',
                  'Invalid or unclear proof of payment',
                  'Details do not match uploaded documents',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setRejectionReasonInput(preset);
                      setRejectionReasonError(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-800 border border-slate-200 text-[10px] font-bold text-slate-700 transition-colors cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Rejection Reason <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  required
                  value={rejectionReasonInput}
                  onChange={(e) => {
                    setRejectionReasonInput(e.target.value);
                    if (rejectionReasonError) setRejectionReasonError(null);
                  }}
                  placeholder="Enter specific reason (e.g., Please upload a clearer photo of your ID and EFT receipt)..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                />
                <div className="flex items-center justify-between mt-1 text-[10px] font-medium text-slate-400">
                  <span>Minimum 3 characters</span>
                  <span>{rejectionReasonInput.trim().length}/500</span>
                </div>
              </div>

              {rejectionReasonError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 flex items-center gap-2 text-xs font-bold text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{rejectionReasonError}</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center gap-2.5 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setRejectTargetItem(null);
                  setRejectionReasonError(null);
                }}
                className="flex-1 py-2.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl text-xs font-black cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  referralActionLoadingUid === rejectTargetItem.uid ||
                  rejectionReasonInput.trim().length < 3
                }
                className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-45 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:cursor-not-allowed"
              >
                <XCircle className="w-4 h-4" />
                <span>
                  {referralActionLoadingUid === rejectTargetItem.uid ? 'Rejecting...' : 'Confirm Rejection'}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Full-Screen Media Viewer for Captured Face Selfie, ID, and Proof of Payment */}
      {fullScreenPreview && (
        <div
          className="fixed inset-0 z-[260] bg-slate-950/95 backdrop-blur-md flex flex-col text-white animate-in fade-in duration-150"
          onClick={() => {
            setFullScreenPreview(null);
            setFullScreenZoom(1);
          }}
        >
          <div
            className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800 bg-slate-950/90 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                {fullScreenPreview.categoryLabel}
              </div>
              <div className="text-sm font-black truncate text-white">
                {fullScreenPreview.title}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {fullScreenPreview.mimeType.startsWith('image/') && (
                <>
                  <button
                    type="button"
                    onClick={() => setFullScreenZoom((z) => Math.max(1, Number((z - 0.5).toFixed(1))))}
                    title="Zoom Out"
                    aria-label="Zoom Out"
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFullScreenZoom(1)}
                    title="Reset Zoom"
                    className="px-2 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{fullScreenZoom}x</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFullScreenZoom((z) => Math.min(3, Number((z + 0.5).toFixed(1))))}
                    title="Zoom In"
                    aria-label="Zoom In"
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setFullScreenPreview(null);
                  setFullScreenZoom(1);
                }}
                aria-label="Close full screen viewer"
                className="w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center ml-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div
            className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-3 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {fullScreenPreview.mimeType.startsWith('image/') ? (
              <img
                src={fullScreenPreview.dataUrl}
                alt={fullScreenPreview.title}
                style={{ transform: `scale(${fullScreenZoom})` }}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-transform duration-150 origin-center"
              />
            ) : (
              <div className="w-full h-full max-w-4xl flex flex-col gap-3">
                <iframe
                  src={fullScreenPreview.dataUrl}
                  title={fullScreenPreview.title}
                  className="w-full flex-1 rounded-xl bg-white border border-slate-700"
                />
                <div className="flex justify-center shrink-0">
                  <a
                    href={fullScreenPreview.dataUrl}
                    download={fullScreenPreview.title}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black"
                  >
                    Download Document ({fullScreenPreview.title})
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Post-Signup Congratulations Modal (Directs user to choose a subscription first) */}
      {showSignupCongratsModal && !isMainAdminAccount && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 text-center shadow-2xl space-y-4 text-slate-950 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center text-emerald-600 shadow-sm">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-black tracking-tight text-slate-950">
                Congratulations!
              </h2>
              <p className="text-xs font-semibold text-slate-600 leading-relaxed max-w-sm mx-auto">
                Your TimeGiG account has been created successfully. Please choose and submit a subscription plan first before you can use the app.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowSignupCongratsModal(false);
                setShowShopModal(true);
              }}
              className="w-full py-3.5 px-4 bg-slate-950 hover:bg-slate-800 text-white font-black text-xs rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Choose a Subscription</span>
            </button>
          </div>
        </div>
      )}

      {/* Mandatory First Subscription Gate after Signup (if modal closed before selecting & submitting) */}
      {authUser &&
        !isMainAdminAccount &&
        requiresSubscriptionFirst &&
        !hasSubmittedSubscription &&
        accountStatus !== 'rejected' &&
        !showSignupCongratsModal &&
        !showShopModal &&
        !showVerificationModal && (
          <div className="fixed inset-0 z-[195] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl space-y-4 text-slate-950">
              <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-950">
                  Choose Your Subscription First
                </h3>
                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                  To continue into TimeGiG after signing up, please select a subscription plan and submit your verification first.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setShowShopModal(true);
                }}
                className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
              >
                Open Subscriptions
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-2 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

      {/* Welcome Back Banner for Returning Registered Users */}
      {welcomeBackName && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[235] w-11/12 max-w-sm animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-slate-950 text-white border border-emerald-500/40 rounded-2xl px-4 py-3 shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black tracking-tight">Welcome back!</div>
                <div className="text-[11px] font-semibold text-slate-300 truncate">
                  Good to see you again, {welcomeBackName}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setWelcomeBackName(null)}
              aria-label="Dismiss welcome message"
              className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Sound Alert Banner for New Seeker / Referral Submissions */}
      {newSubmissionToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[250] w-11/12 max-w-md animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-slate-950 text-white border-2 border-emerald-400 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40 animate-bounce">
                <Bell className="w-5 h-5 fill-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    New {newSubmissionToast.type} Alert
                  </span>
                  {newSubmissionToast.invitedBy && (
                    <span className="text-[9px] font-bold text-blue-300 bg-blue-900/60 px-1.5 py-0.5 rounded">
                      Ref: {newSubmissionToast.invitedBy}
                    </span>
                  )}
                </div>
                <div className="text-xs font-black truncate text-white">
                  {newSubmissionToast.name}{' '}
                  {newSubmissionToast.isResubmitted
                    ? 'resubmitted subscription for review!'
                    : 'joined & submitted subscription!'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {canReviewReferrals && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setViewMode('referrals');
                    setNewSubmissionToast(null);
                  }}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black transition-all cursor-pointer"
                >
                  Review
                </button>
              )}
              <button
                type="button"
                onClick={() => setNewSubmissionToast(null)}
                aria-label="Dismiss alert"
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Create Gig Post Modal (Anchored to Exact Map Coordinates) */}
      {showCreateGigModal && gigDraftLocation && (
        <div
          className="fixed inset-0 z-[240] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => {
            if (!gigSubmitting) {
              setShowCreateGigModal(false);
            }
          }}
        >
          <div
            className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-950 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                  <Briefcase className="w-4 h-4 stroke-[2.5px]" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight">Create Live Gig Post</h3>
                  <p className="text-[10px] font-medium text-slate-300">
                    Goes live immediately at this exact map location
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={gigSubmitting}
                onClick={() => setShowCreateGigModal(false)}
                aria-label="Close create gig modal"
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePublishGigPost} className="p-4 space-y-3 overflow-y-auto">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-wider text-amber-800">
                      Location &amp; Map Pin
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5 tabular-nums">
                      Coordinates: {gigDraftLocation.lat.toFixed(5)}, {gigDraftLocation.lng.toFixed(5)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setShowCreateGigModal(false);
                      setViewMode('map');
                      setIsPickingGigLocation(true);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 text-[10px] font-black shrink-0 cursor-pointer transition-all flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3 text-amber-600" />
                    <span>Change Spot on Map</span>
                  </button>
                </div>

                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={gigLocationSearchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGigLocationSearchQuery(val);
                        setGigDraftLocation((prev) => (prev ? { ...prev, address: val } : null));
                      }}
                      placeholder="Type location address or pick on map..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {gigLocationSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto z-30">
                      {gigLocationSuggestions.map((item) => (
                        <button
                          key={item.place_id}
                          type="button"
                          onClick={() => handleSelectGigLocationSuggestion(item.lat, item.lon, item.display_name)}
                          className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-amber-50 transition-colors flex items-center gap-2 border-b border-slate-100 last:border-0 cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate">{item.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {gigFormError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs font-bold text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{gigFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">
                  Gig Title
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={gigFormTitle}
                  onChange={(e) => setGigFormTitle(e.target.value)}
                  placeholder="e.g. Fix leaking kitchen sink, Delivery help"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={gigFormCategory}
                    onChange={(e) => setGigFormCategory(e.target.value as GigCategory)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Handyman">Handyman</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Tech & IT">Tech &amp; IT</option>
                    <option value="Tutoring">Tutoring</option>
                    <option value="Events">Events</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">
                    Pay / Budget
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    value={gigFormBudget}
                    onChange={(e) => setGigFormBudget(e.target.value)}
                    placeholder="e.g. R350"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">
                  Description &amp; Requirements
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={500}
                  value={gigFormDescription}
                  onChange={(e) => setGigFormDescription(e.target.value)}
                  placeholder="Describe what needs to be done, tools needed, and when..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">
                  Contact Info
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={gigFormContact}
                  onChange={(e) => setGigFormContact(e.target.value)}
                  placeholder="Phone, WhatsApp, or email"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={gigSubmitting}
                  onClick={() => setShowCreateGigModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={gigSubmitting}
                  className="flex-1 py-2.5 px-4 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{gigSubmitting ? 'Publishing Gig...' : 'Publish Gig Live on Map'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Map Gig Post Detail Modal */}
      {selectedGigPost && (
        <div
          className="fixed inset-0 z-[235] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedGigPost(null)}
        >
          <div
            className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 bg-slate-950 text-white flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {selectedGigPost.creatorSelfieUrl ? (
                  <img
                    src={selectedGigPost.creatorSelfieUrl}
                    alt={selectedGigPost.creatorName}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-400 shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-300 font-black text-sm shrink-0">
                    👤
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-black">
                      {selectedGigPost.budget}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 text-[10px] font-bold">
                      {selectedGigPost.category}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400">
                      • Live on Map
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white mt-1 leading-snug truncate">
                    {selectedGigPost.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-200">
                      Posted by {selectedGigPost.creatorName}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[9px] font-black border border-amber-400/30">
                      Gig Owner
                    </span>
                    <span className="text-[10px] text-slate-400">
                      • {formatDistance(calculateDistance(userLocation.lat, userLocation.lng, selectedGigPost.lat, selectedGigPost.lng))} away
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGigPost(null)}
                aria-label="Close gig details"
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Owner Block / Notice Banner */}
              {authUser?.uid === selectedGigPost.creatorUid && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 flex items-center gap-2 text-amber-950 text-xs font-bold shadow-sm">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>👑 You created this gig • Gig owners cannot apply to their own gigs.</span>
                </div>
              )}

              {/* Gig Owner: Pending Applicant Review Card */}
              {authUser?.uid === selectedGigPost.creatorUid && selectedGigPost.applicationStatus === 'pending' && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 flex items-center gap-1">
                      <Bell className="w-3.5 h-3.5 text-blue-600 animate-bounce" />
                      Referral Application Pending Approval
                    </span>
                    <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      Try {selectedGigPost.applicationTries || 1} / 5
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {selectedGigPost.applicantSelfieUrl ? (
                      <img
                        src={selectedGigPost.applicantSelfieUrl}
                        alt={selectedGigPost.applicantName || 'Applicant'}
                        className="w-11 h-11 rounded-2xl object-cover border-2 border-blue-300 shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-2xl bg-blue-200 flex items-center justify-center text-blue-700 font-bold shrink-0">
                        👤
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900">
                        {selectedGigPost.applicantName || 'Applicant'}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        Wants to do this gig. Accept to direct them with navigation.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isUpdatingApplication}
                      onClick={() => handleAcceptGigApplication(selectedGigPost)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3px]" />
                      <span>Accept Application</span>
                    </button>
                    <button
                      type="button"
                      disabled={isUpdatingApplication}
                      onClick={() => handleDeclineGigApplication(selectedGigPost)}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black cursor-pointer disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )}

              {/* Applicant: Accepted Status Banner */}
              {authUser?.uid !== selectedGigPost.creatorUid &&
                selectedGigPost.applicationStatus === 'accepted' &&
                selectedGigPost.applicantUid === authUser?.uid && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-2.5 flex items-center gap-2 text-emerald-950 text-xs font-bold shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>🎉 Your application was accepted! You are assigned to complete this gig.</span>
                  </div>
                )}

              {/* Applicant: Pending Status Banner */}
              {authUser?.uid !== selectedGigPost.creatorUid &&
                selectedGigPost.applicationStatus === 'pending' &&
                selectedGigPost.applicantUid === authUser?.uid && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 flex items-center justify-between gap-2 text-amber-950 text-xs font-bold shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-spin" />
                      <span>Waiting for owner approval (Attempt {selectedGigPost.applicationTries || 1}/5)...</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setApplyingGigTarget(selectedGigPost);
                        setShowGigApplicationModal(true);
                      }}
                      className="px-2 py-1 bg-amber-600 text-white rounded-lg text-[10px] font-black shrink-0"
                    >
                      View
                    </button>
                  </div>
                )}

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1">
                <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Gig Description
                </div>
                <p className="text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-line">
                  {selectedGigPost.description}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-[9px] font-black uppercase text-slate-500">Exact Location</div>
                    <div className="font-bold text-slate-900 break-words">{selectedGigPost.locationName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[9px] font-black uppercase text-slate-500">Contact</div>
                    <div className="font-bold text-slate-900 truncate">{selectedGigPost.contactInfo}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  {/* Non-owner: Apply for Gig button */}
                  {authUser?.uid !== selectedGigPost.creatorUid && (
                    <button
                      type="button"
                      disabled={selectedGigPost.applicationStatus === 'pending' && selectedGigPost.applicantUid === authUser?.uid}
                      onClick={() => handleStartApplyGig(selectedGigPost)}
                      className="flex-1 py-2.5 px-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>
                        {selectedGigPost.applicationStatus === 'pending' && selectedGigPost.applicantUid === authUser?.uid
                          ? 'Application Pending...'
                          : 'Apply for Gig'}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const gig = selectedGigPost;
                      setSelectedGigPost(null);
                      startNavigationTo(gig.lat, gig.lng, gig.title);
                    }}
                    className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Navigate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const gig = selectedGigPost;
                      setCancellingGigTarget(gig);
                      setCancellationReasonInput('');
                      setCancelGigError(null);
                      setShowCancelGigModal(true);
                    }}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black flex items-center justify-center gap-1 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                {/* Only gig owner can complete gig and give user a star rating, edit, or delete from map */}
                {(authUser?.uid === selectedGigPost.creatorUid || isMainAdminAccount) && (
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        const gig = selectedGigPost;
                        setCompletingGigTarget(gig);
                        setCompleteWorkerName(gig.applicantName || '');
                        setCompleteRating(5);
                        setCompleteGigError(null);
                        setShowCompleteGigModal(true);
                      }}
                      className="py-2.5 px-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3px]" />
                      <span>Complete &amp; Rate</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const gig = selectedGigPost;
                        setEditingGigTarget(gig);
                        setEditGigTitle(gig.title);
                        setEditGigCategory(gig.category);
                        setEditGigBudget(gig.budget);
                        setEditGigDescription(gig.description);
                        setEditGigContact(gig.contactInfo);
                        setEditGigError(null);
                        setShowEditGigModal(true);
                      }}
                      className="py-2.5 px-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      disabled={deletingGigId === selectedGigPost.gigId}
                      onClick={() => handleDeleteGigPost(selectedGigPost)}
                      className="py-2.5 px-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{deletingGigId === selectedGigPost.gigId ? 'Removing...' : 'Delete'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gig Application Circle Loading Modal (Waiting for Gig Owner to Accept - 5 Tries) */}
      {showGigApplicationModal && applyingGigTarget && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => {
            if (applicationStatusState === 'timeout' || applicationStatusState === 'rejected') {
              setShowGigApplicationModal(false);
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center text-slate-950 space-y-4 animate-in zoom-in-95 duration-150"
          >
            {applicationStatusState === 'waiting' && (
              <>
                <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90 animate-spin" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="stroke-slate-200"
                      strokeWidth="6"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="stroke-amber-500"
                      strokeWidth="6"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * applicationTriesCount) / 5}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center animate-pulse">
                      <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-950">
                    Waiting for Gig Owner to Accept...
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Application sent to <span className="font-bold text-slate-800">{applyingGigTarget.creatorName}</span>
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                    Attempt {applicationTriesCount} of 5
                  </div>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    {[1, 2, 3, 4, 5].map((dot) => (
                      <span
                        key={dot}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          dot === applicationTriesCount
                            ? 'bg-amber-600 scale-125'
                            : dot < applicationTriesCount
                            ? 'bg-amber-400'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-amber-700 font-semibold mt-2">
                    Gig owner must first accept your referral application before you navigate.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGigApplicationModal(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 py-1 cursor-pointer"
                >
                  Close Window (Runs in background)
                </button>
              </>
            )}

            {applicationStatusState === 'accepted' && (
              <div className="space-y-3 py-2">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-base font-black text-emerald-950">
                  Application Accepted by Owner!
                </h3>
                <p className="text-xs font-semibold text-slate-600">
                  {applyingGigTarget.creatorName} has approved your application. You are now directed to gig navigation!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowGigApplicationModal(false);
                    setSelectedGigPost(null);
                    startNavigationTo(applyingGigTarget.lat, applyingGigTarget.lng, applyingGigTarget.title);
                    ladyVoiceNavigator.speak(`Application accepted. Navigating to ${applyingGigTarget.title}.`);
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer active:scale-95"
                >
                  Start Lady Voice Navigation
                </button>
              </div>
            )}

            {applicationStatusState === 'rejected' && (
              <div className="space-y-3 py-2">
                <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                  <XCircle className="w-10 h-10" />
                </div>
                <h3 className="text-base font-black text-slate-950">
                  Application Declined
                </h3>
                <p className="text-xs text-slate-600">
                  The gig owner was unable to accept your application at this time.
                </p>
                <button
                  type="button"
                  onClick={() => setShowGigApplicationModal(false)}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}

            {applicationStatusState === 'timeout' && (
              <div className="space-y-3 py-2">
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="text-base font-black text-slate-950">
                  No Response After 5 Attempts
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Gig owner <span className="font-bold">{applyingGigTarget.creatorName}</span> did not accept after 5 tries. They may be away from their phone or busy.
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-left">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Owner Contact</span>
                  <span className="font-bold text-slate-900">{applyingGigTarget.contactInfo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartApplyGig(applyingGigTarget)}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black cursor-pointer"
                  >
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGigApplicationModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hire Seeker Modal (User specifies task details & location) */}
      {showHireSeekerModal && hireTargetSeeker && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setShowHireSeekerModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-5 text-slate-950 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={hireTargetSeeker.selfieUrl}
                  alt={hireTargetSeeker.name}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-500 shadow-md"
                />
                <div>
                  <h3 className="text-sm font-black text-slate-950">Hire {hireTargetSeeker.name}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {hireTargetSeeker.title} • {hireTargetSeeker.hourlyRate}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHireSeekerModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {hireModalError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
                {hireModalError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                  Gig Title / Service Required
                </label>
                <input
                  type="text"
                  value={hireGigTitle}
                  onChange={(e) => setHireGigTitle(e.target.value)}
                  placeholder="e.g. Electrical inspection, geyser repair, furniture delivery..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                    Offered Budget / Rate
                  </label>
                  <input
                    type="text"
                    value={hireGigBudget}
                    onChange={(e) => setHireGigBudget(e.target.value)}
                    placeholder="e.g. R250"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                    Your Contact Phone
                  </label>
                  <input
                    type="text"
                    value={hireContactPhone}
                    onChange={(e) => setHireContactPhone(e.target.value)}
                    placeholder="+27..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                  Destination / Work Address
                </label>
                <input
                  type="text"
                  value={hireDestinationAddress}
                  onChange={(e) => setHireDestinationAddress(e.target.value)}
                  placeholder="Street address or location name..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowHireSeekerModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmHireSeeker}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Send Hire Request</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seeker Waiting Modal with Animated Circle Loading */}
      {showSeekerWaitingModal && hireTargetSeeker && (
        <div className="fixed inset-0 z-[255] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center text-slate-950 space-y-4 animate-in zoom-in-95 duration-150"
          >
            {seekerWaitingStatus === 'waiting' ? (
              <>
                <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90 animate-spin" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="stroke-slate-200"
                      strokeWidth="6"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="stroke-indigo-600"
                      strokeWidth="6"
                      strokeDasharray="251.2"
                      strokeDashoffset="75"
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img
                      src={hireTargetSeeker.selfieUrl}
                      alt={hireTargetSeeker.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500 shadow-md animate-pulse"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-950">
                    Waiting for Seeker to Accept...
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Connecting with <span className="font-bold text-slate-800">{hireTargetSeeker.name}</span>
                  </p>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3">
                  <div className="text-[10px] font-black uppercase tracking-wider text-indigo-800">
                    Ringing Seeker Mobile Device
                  </div>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    {[1, 2, 3, 4, 5].map((dot) => (
                      <span
                        key={dot}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          dot === seekerWaitingTryCount
                            ? 'bg-indigo-600 scale-125'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-indigo-700 font-semibold mt-2">
                    Once accepted, seeker will be directed to GiGs feature where the map will navigate to destination!
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-3 py-2">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-base font-black text-emerald-950">
                  Hire Request Accepted!
                </h3>
                <p className="text-xs font-semibold text-slate-600">
                  {hireTargetSeeker.name} accepted your gig request. Directing you to GiGs map navigation...
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Hired GiG Floating HUD on GiGs Feature Map */}
      {activeHiredGig && (viewMode === 'gigs' || viewMode === 'map') && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-[140] w-11/12 max-w-md bg-slate-950/95 backdrop-blur-xl border border-indigo-500/40 rounded-2xl p-3 shadow-2xl text-white animate-in slide-in-from-bottom-3 duration-300">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={activeHiredGig.seekerSelfieUrl}
                alt={activeHiredGig.seekerName}
                className="w-10 h-10 rounded-full object-cover border-2 border-indigo-400 shadow-md shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-black border border-emerald-500/30">
                    Active GiG In Progress
                  </span>
                  <span className="text-[10px] text-amber-300 font-bold">{activeHiredGig.gigBudget}</span>
                </div>
                <div className="text-xs font-black text-white truncate mt-0.5">
                  {activeHiredGig.gigTitle}
                </div>
                <div className="text-[10px] text-slate-300 truncate">
                  Seeker: {activeHiredGig.seekerName} • {activeHiredGig.destinationAddress}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playFeatureClick();
                setShowCompleteHiredGigModal(true);
              }}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-black shrink-0 shadow-md cursor-pointer active:scale-95 flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5 stroke-[3px]" />
              <span>Gig Completed &amp; Rate</span>
            </button>
          </div>
        </div>
      )}

      {/* Complete Hired Gig & Give Star Rating Modal */}
      {showCompleteHiredGigModal && activeHiredGig && (
        <div
          className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setShowCompleteHiredGigModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-5 text-slate-950 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <img
                  src={activeHiredGig.seekerSelfieUrl}
                  alt={activeHiredGig.seekerName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shadow-md"
                />
                <div>
                  <h3 className="text-sm font-black text-slate-950">Gig Completed!</h3>
                  <p className="text-[11px] text-slate-500">Rate your experience with {activeHiredGig.seekerName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCompleteHiredGigModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center py-2 bg-amber-50/70 border border-amber-200 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                Give Star Rating to Seeker
              </span>
              <div className="flex items-center justify-center gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      soundEngine.playFeatureClick();
                      setHiredGigRating(star);
                    }}
                    className="p-1 transition-transform hover:scale-125 cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= hiredGigRating
                          ? 'text-amber-500 fill-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="block text-xs font-black text-amber-900 mt-1">
                {hiredGigRating === 5
                  ? '5.0 ★ Exceptional Work!'
                  : hiredGigRating === 4
                  ? '4.0 ★ Very Good'
                  : hiredGigRating === 3
                  ? '3.0 ★ Good'
                  : `${hiredGigRating}.0 ★ Rating`}
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                Feedback &amp; Compliment (Optional)
              </label>
              <textarea
                value={hiredGigReview}
                onChange={(e) => setHiredGigReview(e.target.value)}
                placeholder="Punctual, professional, and completed the job cleanly..."
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <button
              type="button"
              onClick={handleCompleteHiredGigSubmit}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Completion &amp; Submit Star Rating</span>
            </button>
          </div>
        </div>
      )}

      {/* Complete Gig & Star Rating Modal */}
      {showCompleteGigModal && completingGigTarget && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setShowCompleteGigModal(false)}
        >
          <form
            onSubmit={handleCompleteGigSubmit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-slate-950 p-5 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-950">Complete Gig &amp; Give Rating</h3>
                <p className="text-[11px] font-bold text-slate-500">{completingGigTarget.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCompleteGigModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Worker / User Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={completeWorkerName}
                  onChange={(e) => setCompleteWorkerName(e.target.value)}
                  placeholder="Enter worker name..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Star Rating (1 to 5 Stars)
                </label>
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl p-3 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setCompleteRating(star)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        completeRating >= star
                          ? 'bg-amber-500 text-slate-950 shadow-md scale-105'
                          : 'bg-white text-slate-300 border border-slate-200 hover:text-amber-500'
                      }`}
                    >
                      <Star className={`w-5 h-5 ${completeRating >= star ? 'fill-slate-950' : ''}`} />
                    </button>
                  ))}
                </div>
                <div className="text-center text-xs font-black text-amber-900 mt-1">
                  {completeRating} Star{completeRating === 1 ? '' : 's'} — Will appear on worker profile &amp; tenant wallet
                </div>
              </div>

              {completeGigError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs font-bold text-rose-700">
                  {completeGigError}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCompleteGigModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-md cursor-pointer active:scale-95"
              >
                Save &amp; Complete Gig
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Gig Modal */}
      {showEditGigModal && editingGigTarget && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setShowEditGigModal(false)}
        >
          <form
            onSubmit={handleEditGigSubmit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-slate-950 p-5 space-y-3.5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-950">Edit Gig Post</h3>
              <button
                type="button"
                onClick={() => setShowEditGigModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={editGigTitle}
                  onChange={(e) => setEditGigTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={editGigCategory}
                    onChange={(e) => setEditGigCategory(e.target.value as GigCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  >
                    <option value="Handyman">Handyman</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Tech & IT">Tech &amp; IT</option>
                    <option value="Tutoring">Tutoring</option>
                    <option value="Events">Events</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Budget
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    value={editGigBudget}
                    onChange={(e) => setEditGigBudget(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  required
                  maxLength={500}
                  value={editGigDescription}
                  onChange={(e) => setEditGigDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Contact Info
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={editGigContact}
                  onChange={(e) => setEditGigContact(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>

              {editGigError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs font-bold text-rose-700">
                  {editGigError}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditGigModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer active:scale-95"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cancel Gig Modal (With Mandatory Reason) */}
      {showCancelGigModal && cancellingGigTarget && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setShowCancelGigModal(false)}
        >
          <form
            onSubmit={handleCancelGigSubmit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-slate-950 p-5 space-y-3.5 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-950">Cancel Gig</h3>
                <p className="text-[11px] font-bold text-slate-500">{cancellingGigTarget.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelGigModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="font-semibold text-slate-600 leading-relaxed">
                Provide a reason for cancellation. This will be shared with the gig owner/participant.
              </p>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Cancellation Reason <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  maxLength={500}
                  value={cancellationReasonInput}
                  onChange={(e) => setCancellationReasonInput(e.target.value)}
                  placeholder="Enter reason (e.g. Schedule conflict, job already done)..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-rose-500 resize-none"
                />
              </div>

              {cancelGigError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs font-bold text-rose-700">
                  {cancelGigError}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelGigModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer active:scale-95"
              >
                Confirm Cancellation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
