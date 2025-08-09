# Capacity Planning Feature - Technical Specification

## 🎯 Overview
Comprehensive capacity planning system for team resource allocation across projects with automatic workload distribution and overflow prevention.

## 📊 Data Models

### Team Member
```javascript
{
  id: string,                    // Unique identifier
  firstName: string,             // Member first name
  lastName: string,              // Member last name
  vendor: string,                // ID from suppliers/internal resources
  role: string,                  // G1, G2, PM, TA (informational only)
  monthlyCapacity: 22,           // Default working days per month
  vacationDays: {
    2024: ["2024-07-15", "2024-08-20", ...], // Array of vacation dates
    2025: ["2025-06-10", ...]
  },
  created: string,               // ISO date
  lastModified: string           // ISO date
}
```

### Project Assignment
```javascript
{
  id: string,                    // Unique identifier
  projectId: string,             // Reference to saved project
  teamMemberId: string,          // Reference to team member
  startDate: string,             // ISO date (YYYY-MM-DD)
  endDate: string,               // Auto-calculated from project MDs
  status: 'approved' | 'pending', // Project approval status
  allocations: {
    '2024-01': { planned: 20, actual: 18, locked: false },
    '2024-02': { planned: 22, actual: 22, locked: true }
    // Format: YYYY-MM for each month
  },
  totalMDs: number,              // Total MDs from project calculations
  lastCalculationUpdate: string, // ISO date when calculations were last synced
  created: string,
  lastModified: string
}
```

### Virtual Projects (Auto-generated)
```javascript
// Vacation Project
{
  id: 'FERIE-[TEAM_MEMBER_ID]',
  type: 'vacation',
  teamMemberId: string,
  allocations: {
    '2024-01': { planned: 5, actual: 5, locked: true }
  }
}

// Alignment Project (for adjustments)
{
  id: 'ALLINEAMENTO-[TEAM_MEMBER_ID]',
  type: 'alignment', 
  teamMemberId: string,
  allocations: {
    '2024-01': { planned: 2, actual: 0, locked: false }
  }
}
```

## 🧮 Core Algorithms

### 1. Working Days Calculation
```javascript
/**
 * Calculate working days in a month excluding weekends and national holidays
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @param {string} country - 'IT' or 'RO' for holiday calendar
 * @returns {number} Working days count
 */
calculateWorkingDays(month, year, country = 'IT')
```

### 2. Project End Date Estimation
```javascript
/**
 * Calculate project end date based on total MDs and working days
 * Uses algorithm from calculations-manager.js line 1249
 * @param {Date} startDate - Project start date
 * @param {number} totalMDs - Total man days from project calculations
 * @param {string} teamMemberId - For capacity considerations
 * @returns {Date} Estimated end date
 */
calculateProjectEndDate(startDate, totalMDs, teamMemberId)
```

### 3. Auto-Distribution Algorithm
```javascript
/**
 * Automatically distribute project MDs across months
 * Prevents overflow and considers existing allocations
 * @param {number} totalMDs - Total MDs to distribute
 * @param {Date} startDate - Distribution start date
 * @param {Date} endDate - Distribution end date
 * @param {string} teamMemberId - Team member for capacity check
 * @returns {Object} Monthly distribution { 'YYYY-MM': allocation }
 */
autoDistributeMDs(totalMDs, startDate, endDate, teamMemberId)
```

### 4. Overflow Prevention
```javascript
/**
 * Check for capacity overflow in a specific month
 * @param {string} teamMemberId - Team member to check
 * @param {string} month - Month in YYYY-MM format
 * @param {number} newAllocation - Proposed allocation
 * @returns {Object} { hasOverflow: boolean, overflowAmount: number }
 */
checkCapacityOverflow(teamMemberId, month, newAllocation)
```

### 5. Redistribution After User Changes
```javascript
/**
 * Redistribute MDs after user manual changes
 * Only redistributes to FUTURE months, never past
 * @param {Object} assignment - Project assignment object
 * @param {string} changedMonth - Month that was modified
 * @param {number} newValue - New allocation value
 * @returns {Object} Updated allocations object
 */
redistributeAfterUserChange(assignment, changedMonth, newValue)
```

## 🏗️ Architecture Components

### Core Classes
1. **CapacityManager** - Main controller, coordinates all operations
2. **TeamManager** - CRUD operations for team members
3. **ProjectAllocationManager** - Handles project assignments and calculations
4. **WorkingDaysCalculator** - Business days and holiday calculations
5. **HolidayManager** - National holiday data for Italy and Romania
6. **CapacityTimelineManager** - Timeline visualization and interaction

### Integration Points
- **Projects**: Integrates with existing project system
- **Calculations**: Pulls total MDs from calculations-manager.js
- **Vendors**: Reuses suppliers and internal resources from configuration
- **Navigation**: New section at same level as Projects/Configuration

## 📅 Holiday Configuration

### Italian Holidays (IT)
```javascript
const HOLIDAYS_IT = {
  2024: [
    '2024-01-01', // New Year's Day
    '2024-01-06', // Epiphany
    '2024-04-01', // Easter Monday
    '2024-04-25', // Liberation Day
    '2024-05-01', // Labour Day
    '2024-06-02', // Republic Day
    '2024-08-15', // Assumption of Mary
    '2024-11-01', // All Saints' Day
    '2024-12-08', // Immaculate Conception
    '2024-12-25', // Christmas Day
    '2024-12-26'  // St. Stephen's Day
  ],
  2025: [
    '2025-01-01', '2025-01-06', '2025-04-21', '2025-04-25',
    '2025-05-01', '2025-06-02', '2025-08-15', '2025-11-01',
    '2025-12-08', '2025-12-25', '2025-12-26'
  ]
};
```

### Romanian Holidays (RO)
```javascript
const HOLIDAYS_RO = {
  2024: [
    '2024-01-01', '2024-01-02', // New Year
    '2024-01-24', // Union Day
    '2024-01-29', '2024-05-05', '2024-05-06', // Orthodox Easter
    '2024-05-01', // Labour Day
    '2024-06-01', // Children's Day
    '2024-06-24', // Orthodox Pentecost
    '2024-08-15', // Assumption of Mary
    '2024-11-30', // St. Andrew's Day
    '2024-12-01', // National Day
    '2024-12-25', '2024-12-26' // Christmas
  ],
  2025: [
    '2025-01-01', '2025-01-02', '2025-01-24',
    '2025-04-20', '2025-04-21', '2025-05-01',
    '2025-06-01', '2025-06-08', '2025-08-15',
    '2025-11-30', '2025-12-01', '2025-12-25', '2025-12-26'
  ]
};
```

## 📊 Business Rules

### Allocation Rules
1. **Exclusive Monthly Allocation**: A resource at 100% capacity on a project cannot work on other projects that month
2. **Forward Redistribution**: User changes redistribute excess only to future months
3. **MD Conservation**: Total allocated MDs must equal project calculation MDs
4. **Capacity Limits**: Cannot exceed monthly working days minus vacation days

### Project Status Rules
1. **Approved Projects**: Changes to team assignments require historical tracking
2. **Pending Projects**: All changes allowed without restriction
3. **Status Transitions**: Moving from pending to approved locks current allocations

### Vacation Rules
1. **Annual Planning**: Vacation days planned per fiscal year
2. **Automatic Reduction**: Vacation days automatically reduce monthly capacity
3. **Virtual Project**: Each team member gets a FERIE project for vacation tracking

## 🎨 UI/UX Specifications

### Primary View Layout
```
+-- CAPACITY PLANNING SECTION --+
|                               |
| FILTERS: [Team▼] [Projects▼] [Timeline: 15 months▼] [Status: Approved+Pending▼] |
|                               |
| +-- TEAM MEMBERS --+  +-- PROJECT TIMELINE (2024-01 to 2025-03) --+ |
| | 👤 Mario Rossi   |  | Jan│Feb│Mar│Apr│May│Jun│Jul│Aug│Sep│Oct│Nov│Dec│J25│F25│M25 | |
| | G2 - Vendor A    |  | ████████████████████████████████████████████████████████ | |
| | 22 MD/month      |  | [Project A: 120 MDs] [FERIE] [ALLINEAMENTO]             | |
| | ⚠️ Feb overflow  |  +-------------------------------------------------------+ |
| +------------------+                                                            |
| | 👤 Anna Bianchi  |  +-- PROJECT ASSIGNMENTS --+                              |
| | PM - Internal    |  | ✅ Project A (Approved)  | [Edit] [View Details]      |
| +------------------+  | 🟡 Project B (Pending)   | [Edit] [Approve]           |
|                       | 📊 FERIE-MARIO          | [Edit Calendar]           |
| [+ Add Team Member]   | ⚙️ ALLINEAMENTO-MARIO    | [Adjust]                  |
|                       +-------------------------+                              |
+-----------------------------------------------------------------------+

OVERFLOW ALERTS: ⚠️ Mario Rossi: February 2024 overallocated by 3 MDs
STATISTICS: Total Team: 2 | Active Projects: 2 | This Month Capacity: 44 MDs | Allocated: 38 MDs
```

### Modal Designs

#### Add/Edit Team Member Modal
```
┌─ TEAM MEMBER ─────────────────────────────┐
│ First Name: [Mario                    ]   │
│ Last Name:  [Rossi                    ]   │
│ Vendor:     [Vendor A              ▼]    │
│ Role:       [G2                    ▼]    │
│                                           │
│ +-- VACATION PLANNING --+                 │
│ | 2024: [5 ] days       |                │
│ | 2025: [10] days       |                │
│ | [📅 Edit Calendar]    |                │
│ +------------------------+                │
│                                           │
│ +-- MONTHLY CAPACITY --+                  │
│ | Working Days: [22] per month            │
│ +------------------------+                │
│                                           │
│             [Cancel] [Save Member]        │
└───────────────────────────────────────────┘
```

#### Project Assignment Modal
```
┌─ PROJECT ASSIGNMENT ──────────────────────────────────────┐
│ Project:      [Customer Portal Project          ▼]       │
│ Team Member:  [Mario Rossi                      ▼]       │
│ Start Date:   [2024-02-01]                               │
│ End Date:     [2024-08-15] (auto-calculated)             │
│ Status:       [pending                          ▼]       │
│                                                          │
│ +-- PROJECT CALCULATION DATA --+                        │
│ | Total MDs from calculations: [120]                     │
│ | Development: 80 MDs | UAT: 25 MDs | Other: 15 MDs     │
│ +-------------------------------------------+            │
│                                                          │
│ +-- MONTHLY ALLOCATION (AUTO-DISTRIBUTED) --+           │
│ | Feb 2024: [20] │ Mar 2024: [22] │ Apr 2024: [18]     │
│ | May 2024: [22] │ Jun 2024: [22] │ Jul 2024: [16]     │
│ | Aug 2024: [ 0] │                                      │
│ +---------------------------------------------------+    │
│                                                          │
│ ⚠️ OVERFLOW ALERTS:                                      │
│ • February 2024: Capacity exceeded by 2 MDs             │
│                                                          │
│         [Auto-Redistribute] [Cancel] [Save Assignment]   │
└──────────────────────────────────────────────────────────┘
```

## 🔄 Data Persistence

### File Structure
```
~/Documents/Software Estimation Projects/
├── capacity/
│   ├── team-members.json          # Team member definitions
│   ├── project-assignments.json   # Project assignments
│   └── holidays-config.json       # Holiday configuration
```

### Integration with Existing Projects
```javascript
// Each project file gets extended capacity metadata
{
  // ... existing project data
  capacity: {
    lastSyncDate: "2024-01-15T10:30:00.000Z",
    totalMDs: 120,
    assignedResources: [
      {
        teamMemberId: "tm-001",
        allocations: { "2024-01": 20, "2024-02": 22 }
      }
    ]
  }
}
```

## 🧪 Testing Strategy

### Unit Tests
- WorkingDaysCalculator with various holiday scenarios
- Auto-distribution algorithm with edge cases
- Overflow detection and prevention
- Redistribution logic after user changes

### Integration Tests
- End-to-end project assignment flow
- Navigation integration
- Data persistence and loading
- Vendor integration with existing config

### User Acceptance Tests
- Complete capacity planning workflow
- Multi-project resource allocation
- Holiday and vacation impact on capacity
- Overflow warning and resolution

## ⚡ Performance Considerations

### Optimizations
- Lazy loading for large team datasets
- Cached working days calculations
- Debounced user input for redistribution
- Virtual scrolling for timeline with many months
- Memoized holiday calculations

### Memory Management
- Cleanup event listeners on component destroy
- Efficient DOM manipulation for timeline updates
- Strategic component re-rendering

## 🛡️ Error Handling

### Graceful Degradation
- Fallback when calculations-manager unavailable
- Default values for projects without calculation data
- Graceful handling of corrupted capacity data

### Validation
- Date range validation for project assignments
- Capacity overflow warnings
- Team member data validation
- Project status transition validation

## 🚀 Future Enhancements

### Phase 2 Features
- Drag-and-drop timeline editing
- Advanced Gantt chart visualization
- Capacity utilization reports
- Multi-team management
- API integration for external systems

### Possible Integrations
- Calendar system integration
- HR system sync for vacation data
- Project management tool integration
- Automated capacity alerts via email

---

This specification provides the foundation for implementing a comprehensive capacity planning system that integrates seamlessly with the existing project management architecture.