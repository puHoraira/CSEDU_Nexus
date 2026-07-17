/**
 * Centralized query key factory to ensure consistency across the application
 * This prevents cache invalidation issues when navigating between pages
 */

export const queryKeys = {
  // Auth
  auth: {
    me: (token: string) => ['auth', 'me', token] as const,
  },

  // Events
  events: {
    all: (token: string) => ['events', token] as const,
    detail: (id: string, token?: string) => token ? ['event', id, token] as const : ['event', id] as const,
    feed: (id: string, token?: string) => token ? ['event-feed', id, token] as const : ['event-feed', id] as const,
    public: () => ['public-events'] as const,
    publicDetail: (id: string) => ['event-detail-public', id] as const,
    volunteers: (id: string, token: string) => ['event-volunteers', id, token] as const,
    eligibility: (id: string, token: string) => ['vol-eligibility', id, token] as const,
  },

  // Workshops
  workshops: {
    all: (token: string) => ['workshops', token] as const,
    detail: (id: string, token?: string) => token ? ['workshop', id, token] as const : ['workshop', id] as const,
    registrations: (id: string, token: string) => ['workshop-registrations', id, token] as const,
    myRegistration: (id: string, token: string) => ['my-workshop-reg', id, token] as const,
  },

  // Elections
  elections: {
    all: (token: string) => ['elections', token] as const,
    detail: (id: string, token: string) => ['election', id, token] as const,
    candidates: (id: string, token: string) => ['election-candidates', id, token] as const,
    results: (id: string, token: string) => ['election-results', id, token] as const,
  },

  // Meetings
  meetings: {
    all: (token: string) => ['meetings', token] as const,
    live: (token: string) => ['meetings-live', token] as const,
    detail: (id: string, token: string) => ['meeting', id, token] as const,
    zegoToken: (id: string, token: string) => ['zego-token', id, token] as const,
  },

  // Membership
  membership: {
    members: (token: string) => ['members', token] as const,
    cancellations: (token: string) => ['cancellations', token] as const,
    membersForCancellation: (token: string) => ['members-for-cancellation', token] as const,
  },

  // Governance
  governance: {
    constitution: () => ['constitution-active'] as const,
    constitutionVersions: (token: string) => ['moderator-constitution-editor-versions', token] as const,
    constitutionEditor: (token: string) => ['moderator-constitution-editor-active', token] as const,
    ecTerms: (token: string) => ['ec-terms', token] as const,
    ecTermsForElection: (token: string) => ['ec-terms-for-election', token] as const,
    proposals: (token: string) => ['governance-proposals', token] as const,
  },

  // Finance
  finance: {
    ledger: (token: string, filters?: Record<string, string>) =>
      ['finance', 'ledger', token, filters ?? {}] as const,
    summary: (token: string, startDate?: string, endDate?: string) =>
      ['finance', 'summary', token, startDate, endDate] as const,
    categories: (token: string) => ['finance', 'categories', token] as const,
    pendingCheques: (token: string) => ['finance', 'pending-cheques', token] as const,
    overview: (token: string) => ['finance', 'overview', token] as const,
  },

  // Certificates
  certificates: {
    requests: (token: string) => ['certificate-requests', token] as const,
    myRequests: (token: string) => ['my-certificate-requests', token] as const,
  },

  // Notifications
  notifications: {
    all: (token: string) => ['notifications', token] as const,
    unreadCount: (token: string) => ['notifications-unread-count', token] as const,
  },

  // Admin
  admin: {
    users: (token: string) => ['admin-users', token] as const,
    roles: (token: string) => ['admin-roles', token] as const,
    permissions: (token: string) => ['admin-permissions', token] as const,
  },
} as const;

/**
 * Helper function to invalidate related queries
 * Use this in mutations to ensure proper cache updates
 */
export const invalidateQueries = {
  events: {
    all: (queryClient: any, token: string) => [
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.events.public() }),
    ],
    detail: (queryClient: any, id: string, token?: string) => [
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(id, token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.events.publicDetail(id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.events.feed(id, token) }),
    ],
  },
  workshops: {
    all: (queryClient: any, token: string) => [
      queryClient.invalidateQueries({ queryKey: queryKeys.workshops.all(token) }),
    ],
    detail: (queryClient: any, id: string, token: string) => [
      queryClient.invalidateQueries({ queryKey: queryKeys.workshops.detail(id, token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.workshops.detail(id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.workshops.registrations(id, token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.workshops.myRegistration(id, token) }),
    ],
  },
  elections: {
    all: (queryClient: any, token: string) => [
      queryClient.invalidateQueries({ queryKey: queryKeys.elections.all(token) }),
    ],
  },
  meetings: {
    all: (queryClient: any, token: string) => [
      queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.meetings.live(token) }),
    ],
  },
  finance: {
    all: (queryClient: any) => [
      queryClient.invalidateQueries({ queryKey: ['finance'] }),
    ],
  },
};