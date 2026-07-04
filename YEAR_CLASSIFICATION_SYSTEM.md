# Year-Based Student Classification System

## Overview

This system implements a comprehensive year-based classification for students with bulk promotion capabilities and year-filtered content visibility. Students are classified by academic year level, and admins/moderators can promote entire year groups with a single click while handling failed students separately.

## Features

### 1. **Academic Year Classification**
Students are classified into the following year levels:
- `First_Year` - 1st Year students
- `Second_Year` - 2nd Year students
- `Third_Year` - 3rd Year students
- `Fourth_Year` - 4th Year students
- `Masters` - Masters students
- `Graduated` - Graduated students

### 2. **Bulk Year Promotion**
- Promote all students in a year level with one click
- Preview students before promotion
- Automatically exclude failed/retained students
- Track promotion history for audit
- Rollback capability for mistakes

### 3. **Student Retention (Failed Students)**
- Mark students as retained (failed)
- Exclude retained students from bulk promotions
- Clear retention status when ready to promote
- Track retention reasons and dates

### 4. **Year-Based Content Filtering**
- Elections can target specific year levels
- Events can be restricted to specific years
- Notices visible only to target years
- Automatic filtering based on user's year level

## Backend API Endpoints

### Year Promotion Management

All endpoints require authentication and Moderator/Admin role.

#### GET `/api/v1/year-promotion/stats`
Get year-wise student statistics.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "yearLevel": "First_Year",
      "totalStudents": 120,
      "retainedStudents": 5,
      "eligibleForPromotion": 115,
      "averageCgpa": "3.45",
      "averageAttendance": "85.3"
    }
  ]
}
```

#### GET `/api/v1/year-promotion/preview/:yearLevel`
Preview promotion for a specific year level.

**Parameters:**
- `yearLevel` - One of: First_Year, Second_Year, Third_Year, Fourth_Year, Masters

**Response:**
```json
{
  "success": true,
  "data": {
    "fromYearLevel": "First_Year",
    "toYearLevel": "Second_Year",
    "totalStudents": 120,
    "eligibleForPromotion": 115,
    "retainedStudents": 5,
    "students": [
      {
        "memberId": "...",
        "studentId": "2021-123456",
        "fullName": "John Doe",
        "email": "john@example.com",
        "currentYearLevel": "First_Year",
        "batch": 2021,
        "cgpa": 3.45,
        "isRetained": false,
        "willBePromoted": true
      }
    ],
    "academicYear": "2026-2027"
  }
}
```

#### POST `/api/v1/year-promotion/bulk-promote`
Promote all students in a year level.

**Body:**
```json
{
  "yearLevel": "First_Year",
  "excludeRetained": true,
  "notes": "Academic year 2025-2026 promotion"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "successCount": 115,
    "failedCount": 0,
    "totalProcessed": 115,
    "success": [...],
    "failed": [],
    "academicYear": "2026-2027"
  }
}
```

#### POST `/api/v1/year-promotion/promote/:memberId`
Promote individual student.

**Body:**
```json
{
  "notes": "Individual promotion - exceptional case"
}
```

#### POST `/api/v1/year-promotion/retain/:memberId`
Mark student as retained (failed).

**Body:**
```json
{
  "reason": "Failed to meet CGPA requirements"
}
```

#### POST `/api/v1/year-promotion/clear-retention/:memberId`
Clear retention status.

**Body:**
```json
{
  "reason": "Re-evaluated and cleared"
}
```

#### POST `/api/v1/year-promotion/rollback/:memberId`
Rollback last promotion for a student.

**Body:**
```json
{
  "reason": "Promotion error"
}
```

## Database Schema Changes

### Member Model

**New Fields:**
```javascript
{
  // Year Classification
  academicYearLevel: {
    type: String,
    enum: ["First_Year", "Second_Year", "Third_Year", "Fourth_Year", "Masters", "Graduated"],
    required: true,
    default: "First_Year"
  },
  
  // Promotion History
  promotionHistory: [{
    fromYear: String,
    toYear: String,
    promotedAt: Date,
    promotedBy: ObjectId,
    promotionType: String, // "Bulk_Promotion", "Individual_Promotion", "Manual_Correction"
    academicYear: String,
    notes: String
  }],
  
  // Retention Status (for failed students)
  retentionStatus: {
    isRetained: Boolean,
    retentionReason: String,
    retainedAt: Date,
    retainedBy: ObjectId,
    originalPromotionYear: String
  }
}
```

**New Methods:**
- `promoteToNextYear(promotedBy, notes, promotionType)` - Promote student to next year
- `retainInCurrentYear(retainedBy, reason)` - Mark student as retained
- `Member.getNextYearLevel(currentLevel)` - Get next year level

### Election Model

**New Field:**
```javascript
{
  // Target Academic Years (for filtering)
  targetYears: {
    type: [String],
    enum: ["First_Year", "Second_Year", "Third_Year", "Fourth_Year", "Masters", "All_Years"],
    default: ["All_Years"]
  }
}
```

### Event Model

**New Field:**
```javascript
{
  // Target Academic Years (for filtering)
  targetYears: {
    type: [String],
    enum: ["First_Year", "Second_Year", "Third_Year", "Fourth_Year", "Masters", "All_Years"],
    default: ["All_Years"]
  }
}
```

## Frontend Components

### 1. YearPromotionPage (Admin)

Location: `frontend/src/pages/admin/YearPromotionPage.tsx`

**Features:**
- View year-wise statistics
- Select year to promote
- Preview students before promotion
- Bulk promote with one click
- Individual promote/retain actions
- Add notes to promotions

**Usage:**
```tsx
import YearPromotionPage from './pages/admin/YearPromotionPage';

// In your admin routes
<Route path="/admin/year-promotion" element={<YearPromotionPage />} />
```

### 2. YearBadge Component

Location: `frontend/src/components/common/YearBadge.tsx`

Display a user's year level with color coding.

**Usage:**
```tsx
import YearBadge from './components/common/YearBadge';

<YearBadge yearLevel="First_Year" size="md" showIcon={true} />
```

**Props:**
- `yearLevel: string` - The year level to display
- `size?: 'sm' | 'md' | 'lg'` - Badge size (default: 'md')
- `showIcon?: boolean` - Show graduation cap icon (default: true)

### 3. YearFilterSelector Component

Location: `frontend/src/components/common/YearFilterSelector.tsx`

Select target years for events/elections.

**Usage:**
```tsx
import YearFilterSelector from './components/common/YearFilterSelector';

<YearFilterSelector
  selectedYears={targetYears}
  onChange={setTargetYears}
  label="Target Years"
  showAllYearsOption={true}
/>
```

**Props:**
- `selectedYears: string[]` - Currently selected years
- `onChange: (years: string[]) => void` - Callback when selection changes
- `label?: string` - Label text (default: "Target Years")
- `showAllYearsOption?: boolean` - Show "All Years" option (default: true)

## Migration Script

### Running the Migration

To set `academicYearLevel` for existing members:

```bash
cd backend
node src/scripts/migrateAcademicYearLevels.js
```

**What it does:**
1. Connects to MongoDB
2. Finds all members without `academicYearLevel`
3. Maps `currentYear` (1-5) to `academicYearLevel`
4. Initializes empty `promotionHistory` and `retentionStatus`
5. Handles graduated students
6. Shows distribution after migration

**Mapping:**
- currentYear: 1 → academicYearLevel: "First_Year"
- currentYear: 2 → academicYearLevel: "Second_Year"
- currentYear: 3 → academicYearLevel: "Third_Year"
- currentYear: 4 → academicYearLevel: "Fourth_Year"
- currentYear: 5 → academicYearLevel: "Masters"
- Graduated status → academicYearLevel: "Graduated"

## Usage Examples

### 1. Admin Promotes All 1st Year Students

1. Navigate to `/admin/year-promotion`
2. View current statistics
3. Select "1st Year" from dropdown
4. Review promotion preview (115 eligible, 5 retained)
5. Add optional notes
6. Click "Promote 115 Students"
7. Confirm action
8. System promotes all eligible students to 2nd Year
9. Retained students stay in 1st Year

### 2. Mark a Student as Failed/Retained

1. In promotion preview, find the student
2. Click "Retain" button
3. Enter reason: "Failed to meet CGPA requirements"
4. Student is marked as retained
5. Student will not be promoted in bulk promotions
6. Student appears with red "Retained" badge

### 3. Create Year-Specific Event

```tsx
// When creating an event
const [targetYears, setTargetYears] = useState(['Third_Year', 'Fourth_Year']);

<YearFilterSelector
  selectedYears={targetYears}
  onChange={setTargetYears}
  label="Who can see this event?"
/>

// Event will only be visible to 3rd and 4th year students
```

### 4. Create Year-Specific Election

```tsx
// When creating an election
const election = {
  name: "Batch Representative Election",
  targetYears: ['First_Year', 'Second_Year'],
  // ... other fields
};

// Only 1st and 2nd year students can see and vote
```

## Content Filtering Logic

### How Filtering Works

1. **User's Year Level**: Retrieved from Member profile based on userId
2. **Content's Target Years**: Array of year levels stored in content
3. **Filter Rule**:
   - If `targetYears` is empty or contains "All_Years" → Show to everyone
   - If `targetYears` contains user's `academicYearLevel` → Show to user
   - Otherwise → Hide from user

### Example:

**Event:**
```javascript
{
  title: "Internship Workshop",
  targetYears: ["Third_Year", "Fourth_Year"]
}
```

**User A (1st Year):** Cannot see this event
**User B (3rd Year):** Can see this event
**User C (4th Year):** Can see this event
**User D (Masters):** Cannot see this event

## Benefits

1. **Organized Promotion Process**: Promote entire year groups efficiently
2. **Failure Handling**: Properly track and handle failed students
3. **Targeted Communication**: Send year-specific notices and events
4. **Reduced Clutter**: Students only see relevant content
5. **Better Eligibility Management**: Elections and events for specific years
6. **Audit Trail**: Complete history of promotions and retentions
7. **Rollback Capability**: Fix mistakes easily
8. **Automated Filtering**: Backend automatically filters content

## Best Practices

1. **Run Migration First**: Before using the system, run the migration script
2. **Preview Before Promoting**: Always review the preview before bulk promotion
3. **Document Reasons**: Add notes when retaining or promoting individually
4. **Handle Graduates**: System automatically marks promoted 5th years as "Graduated"
5. **Regular Promotions**: Promote students at the end of each academic year
6. **Review Retained Students**: Periodically review and clear retention status
7. **Use Year Filters**: Set appropriate targetYears for events and elections
8. **Test Content Visibility**: Verify year filtering works as expected

## Troubleshooting

### Students not being promoted

**Issue**: Bulk promotion doesn't promote some students

**Solution:**
1. Check if students are marked as retained
2. Verify `excludeRetained` is set correctly
3. Check student's membership status is "Active"
4. Review promotion preview for details

### Content not filtering properly

**Issue**: Students see content they shouldn't

**Solution:**
1. Verify targetYears is set correctly on content
2. Check user's academicYearLevel is set
3. Ensure filtering logic is applied in service layer
4. Check if "All_Years" is accidentally included

### Migration errors

**Issue**: Migration script fails

**Solution:**
1. Check MongoDB connection string
2. Verify currentYear field exists on members
3. Ensure Member model is up to date
4. Check for validation errors in console

## Future Enhancements

1. **Scheduled Promotions**: Auto-promote at configured dates
2. **Batch Operations**: Promote multiple years at once
3. **Email Notifications**: Notify students of promotion
4. **Promotion Reports**: Generate PDF reports of promotions
5. **Year-Based Analytics**: Track performance by year level
6. **Semester System**: Support semester-based progression
7. **Conditional Promotion**: Auto-retain based on CGPA/attendance
8. **Parent Notifications**: Notify parents of retention

## Security Considerations

1. **Authorization**: Only Moderators/Admins can promote
2. **Audit Logging**: All promotions logged with user ID
3. **Rollback Protection**: Limit rollbacks to recent promotions
4. **Data Integrity**: Validate year progression
5. **Rate Limiting**: Prevent abuse of promotion endpoints

## Performance Considerations

1. **Indexed Fields**: `academicYearLevel` is indexed
2. **Bulk Operations**: Use MongoDB bulk operations
3. **Pagination**: Paginate large student lists
4. **Caching**: Cache year-wise statistics
5. **Query Optimization**: Filter at database level

---

**Version**: 1.0.0
**Last Updated**: June 29, 2026
**Author**: IPLAB Development Team
