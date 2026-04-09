require("dotenv").config();
const { connectDB } = require("../config/db");
const { Role } = require("../models/Role");
const { Permission } = require("../models/Permission");
const { RolePermission } = require("../models/RolePermission");
const { EcPost } = require("../models/EcPost");

async function upsertRole(name, scope = "system") {
  return Role.findOneAndUpdate({ name }, { name, scope }, { upsert: true, new: true });
}

async function upsertPermission(key, resource, action) {
  return Permission.findOneAndUpdate({ key }, { key, resource, action }, { upsert: true, new: true });
}

async function grant(roleName, permissionKey) {
  const role = await Role.findOne({ name: roleName });
  const permission = await Permission.findOne({ key: permissionKey });
  if (!role || !permission) return;
  await RolePermission.findOneAndUpdate(
    { roleId: role._id, permissionId: permission._id },
    { roleId: role._id, permissionId: permission._id },
    { upsert: true, new: true }
  );
}

async function seedRolesAndPermissions() {
  const roles = [
    "System Admin",
    "General Member",
    "Moderator",
    "Chief Patron",
    "Election Commissioner",
    "Alumni",
    "President",
    "Vice President",
    "General Secretary",
    "AGS (Organization)",
    "AGS (Public Relations)",
    "Treasurer",
    "Secretary (Publication)",
    "Secretary (Sports)",
    "Secretary (Seminars)",
    "Secretary (Cultural)",
    "Secretary (Graphics)",
    "Executive Member",
  ];

  for (const roleName of roles) {
    await upsertRole(roleName, "system");
  }

  const permissions = [
    ["admin.role.read", "admin", "role:read"],
    ["admin.role.assign", "admin", "role:assign"],
    ["admin.role.revoke", "admin", "role:revoke"],
    ["event.read", "event", "read"],
    ["event.create", "event", "create"],
    ["event.manage.online", "event", "online:manage"],
    ["event.volunteer.manage", "event", "volunteer:manage"],
    ["event.volunteer.register", "event", "volunteer:register"],
    ["membership.form.sign", "membership", "form:sign"],
    ["membership.issue", "membership", "issue"],
    ["membership.cancel", "membership", "cancel"],
    ["finance.transaction.create", "finance", "transaction:create"],
    ["finance.ledger.read", "finance", "ledger:read"],
    ["finance.report.quarterly", "finance", "report:quarterly"],
    ["finance.cheque.sign", "finance", "cheque:sign"],
    ["governance.ecPost.create", "governance", "ecPost:create"],
    ["governance.ecTerm.create", "governance", "ecTerm:create"],
    ["governance.ecAppointment.create", "governance", "ecAppointment:create"],
    ["governance.constitution.change.convene", "governance", "constitution:change:convene"],
    ["governance.constitution.change.approve", "governance", "constitution:change:approve"],
    ["governance.proposal.approve", "governance", "proposal:approve"],
    ["governance.override", "governance", "override"],
    ["committee.adhoc.manage", "committee", "adhoc:manage"],
    ["communications.public-relations.manage", "communications", "public-relations:manage"],
    ["website.manage", "platform", "website:manage"],
    ["membership.cancellation.request", "membership", "cancellation:request"],
    ["membership.cancellation.review", "membership", "cancellation:review"],
    ["membership.cancellation.execute", "membership", "cancellation:execute"],
    ["membership.read", "membership", "read"],
    ["meeting.preside", "meeting", "preside"],
    ["meeting.call", "meeting", "call"],
    ["meeting.create", "meeting", "create"],
    ["meeting.read", "meeting", "read"],
    ["meeting.attendance.record", "meeting", "attendance:record"],
    ["meeting.attendance.read", "meeting", "attendance:read"],
    ["election.create", "election", "create"],
    ["election.read", "election", "read"],
    ["election.commission.manage", "election", "commission:manage"],
    ["election.candidate.validate", "election", "candidate:validate"],
    ["election.candidate.cancel", "election", "candidate:cancel"],
    ["election.candidate.add", "election", "candidate:add"],
    ["election.vote.cast", "election", "vote:cast"],
    ["election.results.read", "election", "results:read"],
    ["election.results.publish", "election", "results:publish"],
    ["publication.manage", "publication", "manage"],
    ["sports.manage", "sports", "manage"],
    ["seminars.manage", "seminars", "manage"],
    ["cultural.manage", "cultural", "manage"],
    ["graphics.manage", "graphics", "manage"],
    ["volunteer.group.lead", "volunteer", "group:lead"],
  ];

  for (const [key, resource, action] of permissions) {
    await upsertPermission(key, resource, action);
  }

  const grants = {
    "System Admin": ["admin.role.read", "admin.role.assign", "admin.role.revoke"],
    "General Member": [
      "event.read",
      "event.volunteer.register",
      "membership.form.sign",
      "election.vote.cast",
      "election.read",
    ],
    Alumni: ["event.read", "election.read"],
    President: [
      "meeting.preside",
      "meeting.call",
      "event.create",
      "event.volunteer.manage",
      "governance.constitution.change.convene",
      "governance.ecAppointment.create",
      "membership.read",
      "membership.cancellation.review",
      "meeting.create",
      "meeting.read",
      "meeting.attendance.read",
      "election.read",
      "election.results.read",
    ],
    "Vice President": [
      "meeting.preside",
      "event.create",
      "event.volunteer.manage",
      "meeting.read",
      "election.read",
    ],
    "General Secretary": [
      "meeting.call",
      "event.create",
      "event.volunteer.manage",
      "committee.adhoc.manage",
      "governance.ecAppointment.create",
      "membership.read",
      "meeting.create",
      "meeting.read",
      "meeting.attendance.record",
      "meeting.attendance.read",
    ],
    "AGS (Organization)": ["event.create", "event.volunteer.manage", "meeting.read"],
    "AGS (Public Relations)": [
      "communications.public-relations.manage",
      "website.manage",
      "event.manage.online",
      "event.read",
    ],
    Treasurer: ["finance.transaction.create", "finance.ledger.read", "finance.report.quarterly"],
    "Secretary (Publication)": ["publication.manage", "event.read"],
    "Secretary (Sports)": ["sports.manage", "event.read"],
    "Secretary (Seminars)": ["seminars.manage", "event.read"],
    "Secretary (Cultural)": ["cultural.manage", "event.read"],
    "Secretary (Graphics)": ["graphics.manage", "event.read"],
    "Executive Member": ["volunteer.group.lead", "event.volunteer.register", "event.read"],
    Moderator: [
      "finance.ledger.read",
      "governance.proposal.approve",
      "governance.ecPost.create",
      "governance.ecTerm.create",
      "membership.read",
      "membership.cancellation.request",
      "membership.cancellation.review",
      "meeting.read",
      "meeting.attendance.read",
      "election.create",
      "election.commission.manage",
      "election.candidate.validate",
      "election.candidate.cancel",
      "election.read",
      "election.candidate.add",
      "election.results.read",
    ],
    "Election Commissioner": [
      "election.create",
      "election.commission.manage",
      "election.candidate.validate",
      "election.candidate.add",
      "election.results.publish",
      "election.results.read",
      "election.read",
    ],
    "Chief Patron": [
      "finance.ledger.read",
      "finance.cheque.sign",
      "governance.ecPost.create",
      "governance.ecTerm.create",
      "governance.ecAppointment.create",
      "governance.constitution.change.approve",
      "governance.override",
      "membership.read",
      "membership.issue",
      "membership.cancel",
      "membership.cancellation.review",
      "membership.cancellation.execute",
      "meeting.read",
      "election.read",
      "election.results.read",
    ],
  };

  for (const [roleName, permissionKeys] of Object.entries(grants)) {
    for (const key of permissionKeys) {
      await grant(roleName, key);
    }
  }
}

async function seedEcPosts() {
  const posts = [
    { code: "PRESIDENT", title: "President", minYear: 3, minEcYears: 2, displayOrder: 1 },
    { code: "VICE_PRESIDENT", title: "Vice President", minYear: 3, minEcYears: 2, displayOrder: 2 },
    { code: "GENERAL_SECRETARY", title: "General Secretary", minYear: 3, minEcYears: 2, displayOrder: 3 },
    { code: "AGS_ORGANIZATION", title: "AGS (Organization)", minYear: 3, minEcYears: 1, displayOrder: 4 },
    {
      code: "AGS_PUBLIC_RELATIONS",
      title: "AGS (Public Relations)",
      minYear: 3,
      minEcYears: 1,
      displayOrder: 5,
    },
    { code: "TREASURER", title: "Treasurer", minYear: 3, minEcYears: 1, displayOrder: 6 },
    { code: "SECRETARY_PUBLICATION", title: "Secretary (Publication)", minYear: 2, minEcYears: 0, displayOrder: 7 },
    { code: "SECRETARY_SPORTS", title: "Secretary (Sports)", minYear: 2, minEcYears: 0, displayOrder: 8 },
    { code: "SECRETARY_SEMINARS", title: "Secretary (Seminars)", minYear: 2, minEcYears: 0, displayOrder: 9 },
    { code: "SECRETARY_CULTURAL", title: "Secretary (Cultural)", minYear: 2, minEcYears: 0, displayOrder: 10 },
    { code: "SECRETARY_GRAPHICS", title: "Secretary (Graphics)", minYear: 2, minEcYears: 0, displayOrder: 11 },
    { code: "EXECUTIVE_MEMBER", title: "Executive Member", minYear: 2, minEcYears: 0, displayOrder: 12 },
    { code: "EXECUTIVE_MEMBER_2", title: "Executive Member (2)", minYear: 2, minEcYears: 0, displayOrder: 13 },
    { code: "EXECUTIVE_MEMBER_3", title: "Executive Member (3)", minYear: 2, minEcYears: 0, displayOrder: 14 },
    { code: "EXECUTIVE_MEMBER_4", title: "Executive Member (4)", minYear: 2, minEcYears: 0, displayOrder: 15 },
    { code: "EXECUTIVE_MEMBER_5", title: "Executive Member (5)", minYear: 2, minEcYears: 0, displayOrder: 16 },
  ];

  for (const post of posts) {
    await EcPost.findOneAndUpdate({ code: post.code }, post, { upsert: true, new: true });
  }
}

async function run() {
  await connectDB();
  await seedRolesAndPermissions();
  await seedEcPosts();
  console.log("Base data seeded");
  process.exit(0);
}

run().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
