import { ReactElement } from "react";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { DashboardHomePage } from "../pages/dashboard/DashboardHomePage";
import { ProfilePage } from "../pages/dashboard/ProfilePage";
import { SettingsPage } from "../pages/dashboard/SettingsPage";
import { NotificationsPage } from "../pages/dashboard/NotificationsPage";
import { HelpPage } from "../pages/dashboard/HelpPage";
import { MembershipOverviewPage } from "../pages/membership/MembershipOverviewPage";
import { MembershipCancellationsPage } from "../pages/membership/MembershipCancellationsPage";
import { MembershipRosterPage } from "../pages/membership/MembershipRosterPage";
import { EcTermsPage } from "../pages/governance/EcTermsPage";
import { EcPostsPage } from "../pages/governance/EcPostsPage";
import { EcAppointmentsPage } from "../pages/governance/EcAppointmentsPage";
import { GovernanceNoticesPage } from "../pages/governance/GovernanceNoticesPage";
import { ModeratorConstitutionEditorPage } from "../pages/governance/ModeratorConstitutionEditorPage";
import { MeetingsPage } from "../pages/meetings/MeetingsPage";
import { MeetingCreatePage } from "../pages/meetings/MeetingCreatePage";
import { MeetingDetailsPage } from "../pages/meetings/MeetingDetailsPage";
import { MeetingLivePage } from "../pages/meetings/MeetingLivePage";
import { MeetingAttendancePage } from "../pages/meetings/MeetingAttendancePage";
import { AbsenceAlertsPage } from "../pages/meetings/AbsenceAlertsPage";
import { ElectionsPage } from "../pages/elections/ElectionsPage";
import { ElectionCreatePage } from "../pages/elections/ElectionCreatePage";
import { ElectionCandidatesPage } from "../pages/elections/ElectionCandidatesPage";
import { ElectionVotePage } from "../pages/elections/ElectionVotePage";
import { ElectionResultsPage } from "../pages/elections/ElectionResultsPage";
import { EventsPage } from "../pages/events/EventsPage";
import { EventCreatePage } from "../pages/events/EventCreatePage";
import { EventEditPage } from "../pages/events/EventEditPage";
import { EventVolunteersPage } from "../pages/events/EventVolunteersPage";
import { FinanceOverviewPage } from "../pages/finance/FinanceOverviewPage";
import { TransactionEntryPage } from "../pages/finance/TransactionEntryPage";
import { LedgerPage } from "../pages/finance/LedgerPage";
import { ReportsPage } from "../pages/finance/ReportsPage";
import { CertificatesPage } from "../pages/certificates/CertificatesPage";
import { ReportsCenterPage } from "../pages/reports/ReportsCenterPage";
import { UnauthorizedPage } from "../pages/dashboard/UnauthorizedPage";
import { ModeratorDetailsPage } from "../pages/dashboard/ModeratorDetailsPage";
import { ChiefPatronDetailsPage } from "../pages/dashboard/ChiefPatronDetailsPage";
import { ElectionCommissionPage } from "../pages/dashboard/ElectionCommissionPage";
import { AlumniPortalPage } from "../pages/dashboard/AlumniPortalPage";
import { AdminRoleManagementPage } from "../pages/dashboard/AdminRoleManagementPage";

type RouteDef = {
  path: string;
  element: ReactElement;
  requiredRoles?: string[];
};

export const routeDefinitions: RouteDef[] = [
  { path: "/dashboard/home", element: <DashboardHomePage /> },
  { path: "/dashboard/profile", element: <ProfilePage /> },
  { path: "/dashboard/settings", element: <SettingsPage /> },
  { path: "/dashboard/notifications", element: <NotificationsPage /> },
  { path: "/dashboard/help", element: <HelpPage /> },
  {
    path: "/dashboard/moderator",
    element: <ModeratorDetailsPage />,
    requiredRoles: ["Moderator"],
  },
  {
    path: "/dashboard/chief-patron",
    element: <ChiefPatronDetailsPage />,
    requiredRoles: ["Chief Patron"],
  },
  {
    path: "/dashboard/election-commission",
    element: <ElectionCommissionPage />,
    requiredRoles: ["Election Commissioner", "Moderator"],
  },
  {
    path: "/dashboard/alumni",
    element: <AlumniPortalPage />,
    requiredRoles: ["Alumni"],
  },
  {
    path: "/dashboard/admin",
    element: <AdminRoleManagementPage />,
    requiredRoles: ["System Admin"],
  },
  { path: "/dashboard/membership", element: <MembershipOverviewPage /> },
  {
    path: "/dashboard/membership/cancellations",
    element: <MembershipCancellationsPage />,
    requiredRoles: ["President", "Moderator", "Chief Patron"],
  },
  {
    path: "/dashboard/membership/roster",
    element: <MembershipRosterPage />,
    requiredRoles: ["President", "General Secretary", "Moderator", "Chief Patron"],
  },
  {
    path: "/dashboard/governance/ec-terms",
    element: <EcTermsPage />,
    requiredRoles: ["Moderator", "Chief Patron"],
  },
  {
    path: "/dashboard/governance/ec-posts",
    element: <EcPostsPage />,
    requiredRoles: ["Moderator", "Chief Patron"],
  },
  {
    path: "/dashboard/governance/ec-appointments",
    element: <EcAppointmentsPage />,
    requiredRoles: ["President", "General Secretary", "Moderator", "Chief Patron"],
  },
  {
    path: "/dashboard/governance/constitution-editor",
    element: <ModeratorConstitutionEditorPage />,
    requiredRoles: ["Moderator"],
  },
  {
    path: "/dashboard/governance/notices",
    element: <GovernanceNoticesPage />,
    requiredRoles: ["President", "General Secretary", "Moderator"],
  },
  { path: "/dashboard/meetings", element: <MeetingsPage /> },
  {
    path: "/dashboard/meetings/create",
    element: <MeetingCreatePage />,
    requiredRoles: ["President", "General Secretary"],
  },
  { path: "/dashboard/meetings/:id", element: <MeetingDetailsPage /> },
  { path: "/dashboard/meetings/:id/room", element: <MeetingLivePage /> },
  {
    path: "/dashboard/meetings/:id/attendance",
    element: <MeetingAttendancePage />,
    requiredRoles: ["President", "General Secretary"],
  },
  {
    path: "/dashboard/meetings/absence-alerts",
    element: <AbsenceAlertsPage />,
    requiredRoles: ["President", "General Secretary", "Moderator"],
  },
  {
    path: "/dashboard/elections",
    element: <ElectionsPage />,
    requiredRoles: [
      "General Member",
      "Alumni",
      "President",
      "Vice President",
      "General Secretary",
      "Moderator",
      "Election Commissioner",
      "Chief Patron",
    ],
  },
  {
    path: "/dashboard/elections/create",
    element: <ElectionCreatePage />,
    requiredRoles: ["Election Commissioner", "Moderator"],
  },
  {
    path: "/dashboard/elections/:id/candidates",
    element: <ElectionCandidatesPage />,
    requiredRoles: ["Election Commissioner", "Moderator"],
  },
  {
    path: "/dashboard/elections/:id/vote",
    element: <ElectionVotePage />,
    requiredRoles: ["General Member", "Moderator", "Chief Patron"],
  },
  { path: "/dashboard/elections/:id/results", element: <ElectionResultsPage /> },
  { path: "/dashboard/events", element: <EventsPage /> },
  {
    path: "/dashboard/events/create",
    element: <EventCreatePage />,
    requiredRoles: ["President", "Vice President", "General Secretary", "AGS (Organization)"],
  },
  {
    path: "/dashboard/events/:id/edit",
    element: <EventEditPage />,
    requiredRoles: ["President", "Vice President", "General Secretary", "AGS (Organization)"],
  },
  {
    path: "/dashboard/events/:id/volunteers",
    element: <EventVolunteersPage />,
    requiredRoles: ["President", "Vice President", "General Secretary", "AGS (Organization)"],
  },
  { path: "/dashboard/finance", element: <FinanceOverviewPage /> },
  { path: "/dashboard/finance/transactions/new", element: <TransactionEntryPage />, requiredRoles: ["Treasurer"] },
  { path: "/dashboard/finance/ledger", element: <LedgerPage />, requiredRoles: ["Treasurer", "Moderator", "Chief Patron"] },
  { path: "/dashboard/finance/reports", element: <ReportsPage />, requiredRoles: ["Treasurer", "Moderator", "Chief Patron"] },
  { path: "/dashboard/certificates", element: <CertificatesPage /> },
  { path: "/dashboard/reports", element: <ReportsCenterPage />, requiredRoles: ["Moderator", "Chief Patron", "President"] },
  { path: "/dashboard/unauthorized", element: <UnauthorizedPage /> },
];

export function wrapProtectedRoutes(route: RouteDef) {
  return <ProtectedRoute requiredRoles={route.requiredRoles} />;
}