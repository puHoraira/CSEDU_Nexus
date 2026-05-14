# Election System - Complete Specification

## Overview
A comprehensive election management system for student club executive committee elections following a two-phase process as per club constitution.

## Election Lifecycle States

### 1. **Draft** (Initial State)
- Election is being configured
- Commissioners can:
  - Set election dates
  - Configure eligibility criteria
  - Add/remove candidates
  - Set phase information
- **Transitions to:** Setup

### 2. **Setup** (Pre-Election)
- All configurations finalized
- Candidates are being validated
- Commission reviews eligibility
- **Transitions to:** Phase1_Active

### 3. **Phase1_Active** (Batch Representative Voting)
- Phase 1 voting is open
- Students vote for batch representatives (5 votes per voter)
- Only candidates from same batch visible
- **Auto-transitions to:** Phase1_Completed (when voting period ends)

### 4. **Phase1_Completed** (Phase 1 Results)
- Phase 1 voting closed
- Results are being tallied
- Winners become eligible for Phase 2
- **Transitions to:** Phase2_Active

### 5. **Phase2_Active** (Office Bearer Voting)
- Phase 2 voting is open
- Phase 1 winners contest for office bearer posts (Posts 1-11)
- One vote per post per voter
- **Auto-transitions to:** Phase2_Completed (when voting period ends)

### 6. **Phase2_Completed** (Phase 2 Results)
- Phase 2 voting closed
- Final results being tallied
- **Transitions to:** Completed

### 7. **Completed** (Final State)
- All voting finished
- Final results published
- Election archived
- **No further transitions**

### 8. **Cancelled** (Terminal State)
- Election cancelled by administration
- No voting occurred or was interrupted
- **No further transitions**

## Phase Information

### Phase 1: Batch Representatives
- **Purpose:** Elect executive members (Posts 12+)
- **Eligibility:** All active members
- **Voting Rules:**
  - Maximum 5 votes per voter
  - Can only vote for candidates from own batch
  - No post assignment needed
- **Candidates:** Self-nomination or nominated by others

### Phase 2: Office Bearers
- **Purpose:** Elect office bearers (Posts 1-11)
- **Eligibility:** Phase 1 winners only
- **Voting Rules:**
  - One vote per post
  - Can vote for any eligible candidate
  - Must specify post
- **Posts:** President, VP, General Secretary, etc.

## Candidate States

### 1. **Draft**
- Candidate application started but not submitted
- Can edit information

### 2. **Submitted**
- Application submitted for review
- Awaiting commission validation

### 3. **Under_Review**
- Commission is reviewing eligibility
- Checking CGPA, attendance, disciplinary records

### 4. **Approved**
- Candidate approved by commission
- Can receive votes
- Appears on ballot

### 5. **Rejected**
- Candidate rejected by commission
- Reason provided
- Cannot participate

### 6. **Withdrawn**
- Candidate withdrew voluntarily
- Cannot receive votes

## API Endpoints

### Elections
- `GET /elections` - List all elections
- `POST /elections` - Create new election (Moderator)
- `GET /elections/:id` - Get election details
- `PATCH /elections/:id/status` - Update election status (Commission)
- `GET /elections/:id/results` - Get election results

### Candidates
- `POST /elections/candidates` - Add candidate (Commission)
- `GET /elections/:id/candidates` - List candidates
- `PATCH /elections/candidates/:id/validate` - Approve/Reject (Commission)
- `PATCH /elections/candidates/:id/withdraw` - Withdraw candidacy

### Voting
- `POST /elections/votes` - Cast vote
- `GET /elections/:id/my-votes` - Get user's votes
- `GET /elections/:id/turnout` - Get voter turnout stats

## Database Schema Updates Needed

### Election Model
```javascript
{
  status: {
    type: String,
    enum: ["Draft", "Setup", "Phase1_Active", "Phase1_Completed", 
           "Phase2_Active", "Phase2_Completed", "Completed", "Cancelled"],
    default: "Draft"
  },
  currentPhase: { type: Number, enum: [0, 1, 2], default: 0 },
  
  // Phase 1 Configuration
  phase1: {
    votingStart: Date,
    votingEnd: Date,
    status: String,
    maxVotesPerVoter: { type: Number, default: 5 }
  },
  
  // Phase 2 Configuration
  phase2: {
    votingStart: Date,
    votingEnd: Date,
    status: String
  }
}
```

### ElectionCandidate Model
```javascript
{
  phase: { type: Number, enum: [1, 2], required: true },
  status: {
    type: String,
    enum: ["Draft", "Submitted", "Under_Review", "Approved", "Rejected", "Withdrawn"],
    default: "Submitted"
  },
  batch: String, // For phase 1
  postId: ObjectId, // For phase 2
}
```

## Frontend Components Needed

1. **ElectionsList** - Show all elections with status badges
2. **ElectionDetail** - Show election info, candidates, results
3. **CandidateManagement** - Add/approve/reject candidates
4. **VotingInterface** - Cast votes (different UI for Phase 1 vs Phase 2)
5. **ResultsDisplay** - Show results with charts
6. **ElectionTimeline** - Visual timeline of election progress

## Permissions Required

- `election.create` - Create elections (Moderator)
- `election.read` - View elections (All members)
- `election.candidate.add` - Add candidates (Commission)
- `election.candidate.validate` - Approve/reject (Commission)
- `election.status.update` - Change election status (Commission)
- `election.vote.cast` - Cast votes (Active members)
- `election.results.publish` - Publish results (Commission)

## Validation Rules

### Candidate Eligibility
- CGPA ≥ 3.0 (configurable)
- Attendance ≥ 75% (configurable)
- No active disciplinary actions
- Not graduating in current year (Phase 2 only)
- Active membership status

### Voting Eligibility
- Active membership
- Attendance ≥ 60%
- Not suspended

## Auto-Transitions

The system should automatically transition states based on dates:
- When `phase1.votingEnd` passes → `Phase1_Active` to `Phase1_Completed`
- When `phase2.votingEnd` passes → `Phase2_Active` to `Phase2_Completed`

This requires a cron job or scheduled task.

## Implementation Priority

1. ✅ Fix basic election CRUD
2. ✅ Fix candidate addition with proper validation
3. ✅ Fix status transitions
4. 🔄 Implement proper voting interface
5. 🔄 Implement results calculation
6. 🔄 Add auto-transition scheduler
7. 🔄 Add comprehensive testing

## Current Issues to Fix

1. Election model uses complex status but frontend expects simple
2. Candidate creation fails due to missing phase/batch
3. Date fields not properly set
4. Status transitions not validated
5. No proper state machine implementation
