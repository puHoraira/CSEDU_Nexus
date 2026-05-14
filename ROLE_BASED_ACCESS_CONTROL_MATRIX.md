# CSEDU Nexus - Role-Based Access Control & Data Visibility Matrix

## Document Purpose
This document defines what each user role can see and do in the CSEDU Nexus system, aligned with the Constitution, SRS, and SDD.

---

## Role Hierarchy

### System Roles (Layer 1)
1. **Guest/Public** - Non-authenticated visitors
2. **General Member** - Any current CSEDU student
3. **EC Member** - Executive Committee member (any post)
4. **Moderator** - Student Advisor(s) of the department
5. **Chief Patron** - Department Chairman
6. **Alumni** - Graduated former members
7. **Election Commissioner** - Temporary role during elections

### EC Posts (Layer 2 - Subset of EC Member)
1. President
2. Vice President
3. General Secretary
4. Assistant General Secretary (Organization)
5. Assistant General Secretary (Public Relations)
6. Treasurer
7. Secretary (Publication)
8. Secretary (Sports)
9. Secretary (Seminars and Workshops)
10. Secretary (Cultural)
11. Secretary (Graphics and Media)
12. Executive Members (12+)

---

## 1. GUEST/PUBLIC USER

### Can View:
✅ **Public Pages**
- Home page with club information
- About CSEDUSC page
- Club motto and logo
- Public event listings (approved events only)
- Event details (title, date, venue, description)
- Public notices board
- Constitution document (read-only)
- Contact information

### Cannot View:
❌ Member profiles
❌ Internal club discussions
❌ Financial information
❌ Meeting details
❌ Election results (until published)
❌ Member directory
❌ Any dashboard pages

### Can Do:
✅ Browse public content
✅ View event information
✅ Read constitution

### Cannot Do:
❌ Register for events
❌ Apply for membership
❌ Vote
❌ Access any authenticated features

---

## 2. GENERAL MEMBER

**Constitutional Basis**: Article VI - Any current student of CSEDU is a general member

### Can View:
✅ **All Public Content** (same as Guest)
✅ **Member Dashboard**
- Personal profile
- Membership status
- Membership ID and batch information
- Own notification center

✅ **Events**
- All approved events (past, present, future)
- Event details with volunteer opportunities
- Own event registrations
- Own volunteer applications status

✅ **Notices**
- All published notices
- Notice categories and dates

✅ **Elections** (when active)
- Election announcements
- Candidate lists (for eligible elections)
- Voting interface (if eligible to vote)
- Published election results

✅ **Certificates**
- Own certificate requests
- Certificate request status
- Download approved certificates

### Cannot View:
❌ Other members' personal information
❌ Financial details (income/expenditure)
❌ EC meeting minutes
❌ Pending approvals
❌ Admin panels
❌ Audit logs
❌ Budget proposals
❌ Treasurer reports

### Can Do:
✅ **Profile Management**
- Update own profile information
- Upload profile picture
- Update contact details

✅ **Event Participation**
- Register for events
- Apply as volunteer
- View own participation history

✅ **Voting** (when eligible)
- Vote in Phase 1 elections (for own batch representatives)
- Vote in Phase 2 elections (for EC posts 1-11)
- View own voting history

✅ **Certificates**
- Request membership certificates (if eligible)
- Track certificate approval status
- Download approved certificates

✅ **Notifications**
- Receive notifications
- Mark notifications as read
- View notification history

### Cannot Do:
❌ Create events
❌ Approve anything
❌ Access financial records
❌ View EC meeting details
❌ Manage other members
❌ Issue certificates
❌ Modify constitution
❌ Access admin features

---

## 3. EC MEMBER (Any Post)

**Constitutional Basis**: Article V - Executive Committee members

### Can View (In Addition to General Member):
✅ **EC Dashboard**
- EC-specific announcements
- Committee overview
- Current term information
- EC member directory

✅ **Meetings**
- All EC meeting schedules
- Meeting agendas
- Meeting venues and times
- Own attendance records
- Meeting minutes (after approval)

✅ **Events (Enhanced)**
- Event proposals (pending approval)
- Event budgets
- Volunteer assignments
- Event performance metrics

✅ **Elections**
- Election commission details
- Candidate eligibility information
- Voting progress (aggregate, not individual votes)

✅ **Governance**
- Constitution change proposals
- Impeachment proceedings (if any)
- EC term details
- Post assignments

### Can Do (In Addition to General Member):
✅ **Meeting Participation**
- Attend EC meetings
- Sign attendance sheets
- View meeting minutes
- Participate in discussions

✅ **Event Support**
- Help organize events
- Coordinate volunteers
- Support event execution

✅ **Voting Rights**
- Vote on constitution changes (requires 2/3 majority)
- Vote on impeachment (requires 2/3 majority)
- Vote for vacant EC posts 1-11 (Article XI)

✅ **Proposals**
- Propose constitution changes (through proper channels)
- Suggest new activities

### Cannot Do:
❌ Approve budgets (unless Treasurer/authorized)
❌ Create financial transactions (unless Treasurer)
❌ Approve events (unless authorized)
❌ Issue certificates
❌ Manage elections (unless Election Commissioner)
❌ Override moderator/chairman decisions

---

## 4. PRESIDENT

**Constitutional Basis**: Article V-A - Presides over every meeting

### Can View (In Addition to EC Member):
✅ **Enhanced Governance**
- All pending approvals across modules
- Committee performance metrics
- Term progress tracking
- Resignation letters

✅ **Financial Overview**
- Budget summaries (not detailed transactions)
- Expenditure reports
- Fund allocation status

### Can Do (In Addition to EC Member):
✅ **Meeting Management**
- Call executive meetings (Article XVI)
- Set meeting agendas
- Preside over meetings
- Approve meeting minutes

✅ **Event Management**
- Approve event proposals
- Assign event responsibilities
- Monitor event execution

✅ **Governance**
- Receive resignation letters from EC members
- Forward resignations to Moderator
- Convene Constitution Changing Committee (Article XVII)
- Sign membership cancellation notices (Article VII)

✅ **Reporting**
- Submit annual reports at AGM (Article XVIII)
- Prepare term summaries

✅ **Election Commission**
- Suggest election commission members (Article XVIII)
- Participate in commission formation

### Cannot Do:
❌ Directly remove EC members (requires impeachment process)
❌ Approve financial transactions alone
❌ Issue certificates
❌ Modify constitution without proper process
❌ Override Moderator/Chief Patron decisions

---

## 5. VICE PRESIDENT

**Constitutional Basis**: Article V-A - Supports president and acts as President in absence

### Can View:
✅ Same as President

### Can Do (In Addition to EC Member):
✅ **Presidential Duties** (when President is absent)
- Preside over meetings
- Call meetings
- Perform all presidential functions

✅ **Support Functions**
- Assist President in planning
- Coordinate with other EC members
- Monitor activity progress

### Cannot Do:
❌ Override President when President is present
❌ Same restrictions as President

---

## 6. GENERAL SECRETARY

**Constitutional Basis**: Article V-A - Calls meetings, organizes committees, manages volunteers

### Can View (In Addition to EC Member):
✅ **Volunteer Management**
- All volunteer applications
- Volunteer assignments
- Volunteer performance tracking

✅ **Committee Management**
- Ad-hoc committee compositions
- Sub-committee details
- Committee progress

### Can Do (In Addition to EC Member):
✅ **Meeting Management**
- Call executive meetings (Article XVI)
- Prepare meeting notices
- Coordinate meeting logistics

✅ **Volunteer Coordination**
- Organize volunteers during events
- Assign volunteer roles
- Track volunteer participation

✅ **Committee Management**
- Create ad-hoc committees
- Create sub-committees
- Monitor committee activities

✅ **Event Coordination**
- Coordinate event execution
- Manage event volunteers
- Track event progress

### Cannot Do:
❌ Approve budgets
❌ Create financial transactions
❌ Issue certificates
❌ Preside over meetings (unless designated)

---

## 7. ASSISTANT GENERAL SECRETARY (Organization)

**Constitutional Basis**: Article V-A - Organizes volunteers during programs

### Can View (In Addition to EC Member):
✅ **Volunteer Details**
- Volunteer applications
- Volunteer assignments
- Volunteer schedules

### Can Do (In Addition to EC Member):
✅ **Volunteer Organization**
- Organize volunteers during programs
- Assign volunteer tasks
- Coordinate volunteer teams
- Track volunteer attendance

✅ **Support GS**
- Help General Secretary in all duties
- Assist in meeting coordination

---

## 8. ASSISTANT GENERAL SECRETARY (Public Relations)

**Constitutional Basis**: Article V-A - Contacts alumni, media, maintains online presence

### Can View (In Addition to EC Member):
✅ **Communication Channels**
- Website analytics
- Social media metrics
- Media contact list
- Alumni database

### Can Do (In Addition to EC Member):
✅ **External Relations**
- Contact alumni
- Contact media
- Contact other clubs
- Send guest invitations

✅ **Online Presence**
- Maintain club website
- Manage Facebook pages
- Organize online events
- Handle promotional activities

✅ **Support GS**
- Help General Secretary in all duties

---

## 9. TREASURER

**Constitutional Basis**: Article V-A - Maintains fund, collection, expenditure with proper documents

### Can View (In Addition to EC Member):
✅ **Full Financial Access**
- All financial transactions
- Complete ledger
- Bank account details
- Income records
- Expenditure records
- Budget proposals
- Quarterly reports
- Supporting documents
- Cheque records

✅ **Financial Reports**
- Real-time balance
- Income vs expenditure analysis
- Category-wise breakdown
- Donor information
- Sponsor details

### Can Do (In Addition to EC Member):
✅ **Financial Management**
- Create income entries
- Create expenditure entries
- Upload supporting documents
- Prepare budget proposals (Article XIII)
- Submit budget within 1 month of EC formation

✅ **Reporting**
- Generate quarterly expenditure reports (Article XII)
- Sign expenditure reports
- Submit reports to department office
- Prepare financial ledger for AGM (Article XVIII)

✅ **Transaction Management**
- Record all transactions
- Maintain proper documentation
- Track fund sources (Article XII.6)

### Cannot Do:
❌ Approve own transactions (requires Moderator)
❌ Sign cheques alone (requires Chief Patron + Moderator per Article XII.3)
❌ Extend allocated funds without Academic Committee approval (Article XII.9)

---

## 10. SECRETARY (Publication)

**Constitutional Basis**: Article V-A - Prints banners, posters, notices, reports, magazines

### Can View (In Addition to EC Member):
✅ **Publication Materials**
- Design templates
- Print orders
- Publication schedules
- Budget for publications

### Can Do (In Addition to EC Member):
✅ **Publication Management**
- Design and print banners
- Design and print posters
- Print coupons
- Print notices
- Prepare annual reports
- Prepare annual magazines
- Manage publication budget

---

## 11. SECRETARY (Sports)

**Constitutional Basis**: Article V-A - Maintains indoor games, coordinates teams

### Can View (In Addition to EC Member):
✅ **Sports Information**
- Equipment inventory
- Team rosters
- Practice schedules
- Tournament details

### Can Do (In Addition to EC Member):
✅ **Sports Management**
- Maintain indoor games equipment
- Organize practice tournaments
- Coordinate with football team
- Coordinate with cricket team
- Coordinate with basketball team
- Arrange practice sessions
- Manage sports budget

---

## 12. SECRETARY (Seminars and Workshops)

**Constitutional Basis**: Article V-A - Arranges seminars, workshops, training

### Can View (In Addition to EC Member):
✅ **Academic Events**
- Seminar proposals
- Workshop schedules
- Speaker information
- Participant lists

### Can Do (In Addition to EC Member):
✅ **Academic Event Management**
- Arrange higher study seminar (MANDATORY per Article XIII)
- Organize seminars
- Organize workshops
- Arrange training sessions
- Invite speakers on new technologies
- Coordinate career counseling sessions

---

## 13. SECRETARY (Cultural)

**Constitutional Basis**: Article V-A - Arranges cultural sessions

### Can View (In Addition to EC Member):
✅ **Cultural Events**
- Cultural program schedules
- Performer information
- Venue bookings

### Can Do (In Addition to EC Member):
✅ **Cultural Management**
- Arrange formal cultural sessions
- Arrange informal cultural sessions
- Organize cultural festivals
- Coordinate Pohela Boishakh (MANDATORY per Article XIII)
- Manage cultural program budget

---

## 14. SECRETARY (Graphics and Media)

**Constitutional Basis**: Article V-A - Designs and curates content

### Can View (In Addition to EC Member):
✅ **Design Assets**
- Design templates
- Media library
- Social media analytics
- Content calendar

### Can Do (In Addition to EC Member):
✅ **Design and Media Management**
- Design graphics for publications
- Design social media content
- Curate content for social media
- Maintain brand consistency
- Create promotional materials

---

## 15. EXECUTIVE MEMBERS (12+)

**Constitutional Basis**: Article V-A - Help members 1-11, can head volunteer groups

### Can View:
✅ Same as EC Member base level

### Can Do (In Addition to EC Member):
✅ **Support Functions**
- Help members 1-11 in different roles
- Head volunteer groups during events (if 2nd year or above)
- Participate in all EC activities

---

## 16. MODERATOR

**Constitutional Basis**: Article IV - Current Student Advisor(s)

### Can View:
✅ **Everything EC Members Can View**
✅ **Enhanced Oversight**
- All financial transactions (detailed)
- All meeting minutes (including drafts)
- All member profiles
- All event details
- All election data
- All governance proposals
- All audit logs
- All pending approvals
- Impeachment proceedings
- Membership cancellation requests

✅ **Administrative Data**
- System configuration
- Role assignments
- Permission matrix
- Attendance records
- Absence tracking

### Can Do:
✅ **Governance Oversight**
- Overrule any EC decision (with Chief Patron per Article IV.3)
- Supervise elections (Article XIV)
- Decide election mode and method (Article XIV.3)
- Cancel member candidacy (Article XV)
- Supervise EC member recruitment (Article XI)

✅ **Financial Oversight**
- Verify expenditure reports (Article XII.5)
- Sign expenditure reports
- Co-sign cheques (with Chief Patron per Article XII.3)
- Review budget proposals
- Approve extraordinary fund extensions (with Academic Committee)

✅ **Meeting Oversight**
- Receive attendance sheets quarterly (Article XVI.5)
- Monitor meeting frequency
- Review meeting minutes

✅ **Approval Authority**
- Approve/reject events
- Approve/reject budget proposals
- Review constitution change proposals
- Approve membership cancellations (sign notices per Article VII.5)
- Review certificate requests (first approval stage)

✅ **Election Management**
- Announce EC abolishment (Article XIV.1)
- Form election commission (Article XIV.2)
- Act as Chief Election Commissioner
- Supervise both election phases

✅ **Administrative**
- Manage user roles
- Assign permissions
- View audit logs
- Generate reports

### Cannot Do:
❌ Directly modify constitution (requires Academic Committee)
❌ Override Chief Patron's final decisions
❌ Issue certificates alone (requires Chairman signature)

---

## 17. CHIEF PATRON (Department Chairman)

**Constitutional Basis**: Article IV - Honorable Chairman of CSE Department

### Can View:
✅ **Everything** - Complete system access
- All data across all modules
- All financial records
- All governance documents
- All member information
- All audit logs
- All reports

### Can Do:
✅ **Ultimate Authority**
- Overrule any decision (with Moderator per Article IV.3)
- Abolish Executive Committee (with Academic Committee recommendation per Article IV.3)
- Final approval on all major decisions

✅ **Financial Authority**
- Co-sign all cheques (with Moderator per Article XII.3)
- Approve budget extensions
- Final approval on financial reports

✅ **Governance Authority**
- Approve constitution changes (with Academic Committee)
- Sign membership cancellation notices (Article VII.5)
- Approve election commission formation (Article XIV.2)
- Final approval on impeachment

✅ **Certificate Authority**
- Issue certificates (Article XIX.2)
- Final approval and signature on certificates
- Approve certificate templates

✅ **Administrative**
- Access all system features
- Override any restriction
- Generate any report
- Modify system configuration

### Cannot Do:
❌ Nothing - Chief Patron has ultimate authority within constitutional bounds

---

## 18. ALUMNI

**Constitutional Basis**: Graduated former members

### Can View:
✅ **Public Content** (same as Guest)
✅ **Alumni-Specific**
- Alumni directory
- Alumni events
- Reunion information
- Club history and achievements

✅ **Limited Member Content**
- Public events
- Public notices
- Constitution

### Can Do:
✅ **Alumni Engagement**
- Update alumni profile
- Register for alumni events
- Participate in reunion programs
- Mentor current members (if invited)

✅ **Election Participation**
- Serve on election commission (if selected per Article XIV.2)

### Cannot Do:
❌ Vote in elections
❌ Access current member features
❌ Register for member-only events
❌ Access financial information
❌ Participate in EC activities

---

## 19. ELECTION COMMISSIONER

**Constitutional Basis**: Article XIV.2 - Temporary role during elections

### Can View:
✅ **Election-Specific Data**
- All candidate information
- Eligibility verification data
- Voting progress (aggregate)
- Election commission member details
- Election schedules and phases

✅ **Voter Information**
- Eligible voter lists
- Voting status (who voted, not how they voted)
- Voter eligibility criteria

### Can Do:
✅ **Election Management**
- Verify candidate eligibility
- Approve/reject candidates
- Monitor voting process
- Ensure fair election conduct
- Publish election results
- Generate election reports

✅ **Commission Duties**
- Coordinate with other commissioners
- Report to Chief Patron
- Supervise both election phases

### Cannot Do:
❌ See individual vote choices (votes are secret)
❌ Modify votes
❌ Participate as candidate (Article XIV.2)
❌ Access non-election data
❌ Override Chief Patron decisions

---

## Data Visibility Summary Table

| Data Type | Guest | Member | EC | President | Treasurer | Moderator | Chairman |
|-----------|-------|--------|----|-----------|-----------|-----------| ---------|
| Public Pages | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Own Profile | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Other Profiles | ❌ | ❌ | Partial | Partial | Partial | ✅ | ✅ |
| Events (Public) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Events (Internal) | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Financial Data | ❌ | ❌ | ❌ | Summary | ✅ Full | ✅ Full | ✅ Full |
| Meeting Minutes | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Election Data | Partial | Partial | ✅ | ✅ | ✅ | ✅ | ✅ |
| Audit Logs | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Certificates | ❌ | Own | Own | Own | Own | ✅ All | ✅ All |
| Constitution | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Permission Keys (Technical Implementation)

### Authentication
- `auth:login`
- `auth:register`
- `auth:logout`

### Profile
- `profile:view_own`
- `profile:edit_own`
- `profile:view_others`
- `profile:edit_others`

### Membership
- `membership:register`
- `membership:view_own`
- `membership:view_all`
- `membership:cancel`
- `membership:approve_cancellation`

### Events
- `event:view_public`
- `event:view_all`
- `event:create`
- `event:edit`
- `event:delete`
- `event:approve`
- `event:register`
- `event:manage_volunteers`

### Volunteers
- `volunteer:apply`
- `volunteer:view_own`
- `volunteer:view_all`
- `volunteer:assign`
- `volunteer:manage`

### Meetings
- `meeting:view`
- `meeting:create`
- `meeting:edit`
- `meeting:attend`
- `meeting:mark_attendance`
- `meeting:view_minutes`
- `meeting:approve_minutes`

### Elections
- `election:view`
- `election:create`
- `election:manage`
- `election:vote`
- `election:view_results`
- `election:publish_results`
- `election:verify_eligibility`

### Finance
- `finance:view_summary`
- `finance:view_full`
- `finance:create_transaction`
- `finance:approve_transaction`
- `finance:create_budget`
- `finance:approve_budget`
- `finance:generate_report`
- `finance:sign_cheque`

### Certificates
- `certificate:request`
- `certificate:view_own`
- `certificate:view_all`
- `certificate:approve_moderator`
- `certificate:approve_chairman`
- `certificate:issue`
- `certificate:download`

### Governance
- `governance:view`
- `governance:propose_change`
- `governance:vote_change`
- `governance:approve_change`
- `governance:impeach`
- `governance:vote_impeach`

### Notifications
- `notification:view_own`
- `notification:send`
- `notification:send_all`

### Admin
- `admin:view_audit_logs`
- `admin:manage_roles`
- `admin:manage_permissions`
- `admin:system_config`
- `admin:override`

---

## Constitutional Compliance Checklist

### Article IV - Authority
✅ Chief Patron and Moderator can overrule decisions
✅ Chief Patron can abolish EC with Academic Committee
✅ Implemented in permission system

### Article VI - Membership
✅ Any CSEDU student can be general member
✅ Membership form and checklist required
✅ Political party restriction enforced

### Article VII - Cancellation
✅ Notice requires Chief Patron, Moderator, President signatures
✅ Automatic cancellation on graduation
✅ Cancellation for constitutional violations

### Article XI - Recruitment
✅ Batch voting for vacant posts 12+
✅ EC voting for vacant posts 1-11
✅ Moderator supervision

### Article XII - Finance
✅ Treasurer maintains records
✅ Cheque requires Chief Patron + Moderator signature
✅ Quarterly reports to Moderator
✅ Budget submission within 1 month

### Article XIV - Elections
✅ Two-phase election system
✅ Election commission with 3 members
✅ Moderator as Chief Election Commissioner
✅ Eligibility rules enforced

### Article XVI - Meetings
✅ Minimum once every 2 months
✅ Attendance tracking
✅ Three consecutive absences trigger cancellation

### Article XIX - Certificates
✅ EC members can request
✅ Shows posts in different years
✅ Shows voluntary contributions
✅ Issued by Chief Patron

---

## Implementation Notes

### Frontend Navigation
Each role sees different sidebar menu items based on permissions:

**Guest**: Home, Events, About, Contact, Login
**Member**: + Dashboard, Profile, My Events, Certificates, Notifications
**EC Member**: + EC Dashboard, Meetings, Governance
**President**: + Approvals, Reports, EC Management
**Treasurer**: + Finance, Budget, Ledger, Reports
**Moderator**: + All Approvals, Audit Logs, Admin
**Chairman**: + Everything

### API Authorization
Every API endpoint checks:
1. Authentication (valid JWT)
2. Role verification
3. Permission check
4. Resource ownership (for own data)

### Database Row-Level Security
Implement views and policies for:
- Members see only own data
- EC sees EC-level data
- Moderator/Chairman see everything

---

## Conclusion

This matrix ensures:
✅ Constitutional compliance
✅ Clear role boundaries
✅ Proper data access control
✅ Audit trail for sensitive operations
✅ Scalable permission system
✅ Easy to extend for new roles

All roles and permissions are aligned with the CSEDU Students' Club Constitution and support the club's governance structure.
