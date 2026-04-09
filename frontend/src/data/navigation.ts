export type NavigationItem = {
  label: string;
  to: string;
  roles?: string[];
  public?: boolean;
};

export type NavigationGroup = {
  title: string;
  items: NavigationItem[];
};

export const navigationGroups: NavigationGroup[] = [
  {
    title: "Public",
    items: [
      { label: "Home", to: "/" },
      { label: "Events", to: "/events" },
      { label: "Notices", to: "/notices" },
      { label: "Constitution", to: "/constitution" },
    ],
  },
  {
    title: "Dashboard",
    items: [
      { label: "Overview", to: "/dashboard/home" },
      { label: "Profile", to: "/dashboard/profile" },
      { label: "Moderator Panel", to: "/dashboard/moderator", roles: ["Moderator"] },
      { label: "Chief Patron Panel", to: "/dashboard/chief-patron", roles: ["Chief Patron"] },
      { label: "Election Commission", to: "/dashboard/election-commission", roles: ["Election Commissioner", "Moderator"] },
      { label: "Alumni Portal", to: "/dashboard/alumni", roles: ["Alumni"] },
      { label: "System Admin", to: "/dashboard/admin", roles: ["System Admin"] },
      { label: "Notifications", to: "/dashboard/notifications" },
      { label: "Settings", to: "/dashboard/settings" },
      { label: "Help", to: "/dashboard/help" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Membership", to: "/dashboard/membership" },
      { label: "Roster", to: "/dashboard/membership/roster", roles: ["President", "General Secretary", "Moderator", "Chief Patron"] },
      { label: "Cancellations", to: "/dashboard/membership/cancellations", roles: ["President", "Moderator", "Chief Patron"] },
      { label: "EC Posts", to: "/dashboard/governance/ec-posts", roles: ["Moderator", "Chief Patron"] },
      { label: "EC Terms", to: "/dashboard/governance/ec-terms", roles: ["Moderator", "Chief Patron"] },
      { label: "Constitution Editor", to: "/dashboard/governance/constitution-editor", roles: ["Moderator"] },
      { label: "Appointments", to: "/dashboard/governance/ec-appointments", roles: ["President", "General Secretary", "Moderator", "Chief Patron"] },
      { label: "Meetings", to: "/dashboard/meetings" },
      { label: "Elections", to: "/dashboard/elections" },
      { label: "Events", to: "/dashboard/events" },
      { label: "Finance", to: "/dashboard/finance" },
      { label: "Certificates", to: "/dashboard/certificates" },
      { label: "Reports", to: "/dashboard/reports", roles: ["Moderator", "Chief Patron", "President"] },
    ],
  },
];