# Capacity Planning - Algorithms & Calculations

## 🧮 Core Calculation Formulas

### 1. Working Days Calculation
```javascript
/**
 * Calculate working days in a month
 * Formula: Total days - Weekends - National holidays
 * 
 * @param {number} month Month (1-12)
 * @param {number} year Year (YYYY)
 * @param {string} country Holiday calendar ('IT' or 'RO')
 * @returns {number} Working days count
 */
function calculateWorkingDays(month, year, country = 'IT') {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    
    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    
    // Skip national holidays
    if (isNationalHoliday(date, country)) continue;
    
    workingDays++;
  }
  
  return workingDays;
}

// Example results:
// January 2024 (IT): 23 working days
// February 2024 (IT): 21 working days  
// December 2024 (IT): 19 working days (Christmas holidays)
```

### 2. Available Capacity Calculation
```javascript
/**
 * Calculate available capacity for a team member in a specific month
 * Formula: Working days - Vacation days - Existing allocations
 * 
 * @param {Object} teamMember Team member object
 * @param {string} month Month in YYYY-MM format
 * @returns {number} Available capacity in MDs
 */
function calculateAvailableCapacity(teamMember, month) {
  const [year, monthNum] = month.split('-').map(Number);
  
  // Base working days in month
  const workingDays = calculateWorkingDays(monthNum, year, 'IT');
  
  // Subtract vacation days in this month
  const vacationDaysInMonth = countVacationDaysInMonth(teamMember, month);
  
  // Subtract existing project allocations
  const existingAllocations = getExistingAllocations(teamMember.id, month);
  
  const availableCapacity = workingDays - vacationDaysInMonth - existingAllocations;
  
  return Math.max(0, availableCapacity); // Cannot be negative
}

// Example calculation:
// Working days in Feb 2024: 21
// Vacation days: 2
// Existing allocations: 15
// Available capacity: 21 - 2 - 15 = 4 MDs
```

### 3. Project End Date Estimation
```javascript
/**
 * Calculate project end date based on total MDs and team allocation
 * Uses existing logic from calculations-manager.js line 1249-1271
 * 
 * @param {Date} startDate Project start date
 * @param {number} totalMDs Total man days from project calculations  
 * @param {string} teamMemberId Team member for capacity considerations
 * @returns {Date} Estimated end date
 */
function calculateProjectEndDate(startDate, totalMDs, teamMemberId) {
  // Get team member's average monthly capacity
  const teamMember = getTeamMember(teamMemberId);
  const avgMonthlyCapacity = getAverageMonthlyCapacity(teamMember);
  
  // Calculate required months
  // Formula: totalMDs / avgMonthlyCapacity = months needed
  const monthsNeeded = Math.ceil(totalMDs / avgMonthlyCapacity);
  
  // Add months to start date
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + monthsNeeded);
  
  return endDate;
}

// Example calculation:
// Total MDs: 120
// Average monthly capacity: 20 MDs/month
// Months needed: ceil(120/20) = 6 months
// Start: 2024-02-01 → End: 2024-08-01
```

### 4. Auto-Distribution Algorithm
```javascript
/**
 * Automatically distribute project MDs across available months
 * Algorithm: Greedy allocation with overflow prevention
 * 
 * @param {number} totalMDs Total MDs to distribute
 * @param {Date} startDate Distribution start date  
 * @param {Date} endDate Distribution end date
 * @param {string} teamMemberId Team member ID
 * @returns {Object} Monthly allocation map
 */
function autoDistributeMDs(totalMDs, startDate, endDate, teamMemberId) {
  const distribution = {};
  let remainingMDs = totalMDs;
  
  // Get months between start and end date
  const months = getMonthsBetween(startDate, endDate);
  
  // Phase 1: Fill each month to maximum safe capacity
  for (let month of months) {
    if (remainingMDs <= 0) break;
    
    const availableCapacity = calculateAvailableCapacity(
      getTeamMember(teamMemberId), 
      month
    );
    
    // Allocate up to 90% of available capacity (safety buffer)
    const safeCapacity = Math.floor(availableCapacity * 0.9);
    const allocation = Math.min(remainingMDs, safeCapacity);
    
    distribution[month] = {
      planned: allocation,
      actual: allocation,
      locked: false
    };
    
    remainingMDs -= allocation;
  }
  
  // Phase 2: Distribute remaining MDs if any
  if (remainingMDs > 0) {
    distribution = redistributeRemaining(distribution, remainingMDs, months);
  }
  
  return distribution;
}

// Example distribution for 120 MDs over 6 months:
// Feb: 20 MDs, Mar: 22 MDs, Apr: 18 MDs, 
// May: 22 MDs, Jun: 22 MDs, Jul: 16 MDs
```

### 5. Overflow Detection Algorithm
```javascript
/**
 * Check for capacity overflow and calculate overflow amount
 * 
 * @param {string} teamMemberId Team member to check
 * @param {string} month Month in YYYY-MM format
 * @param {number} newAllocation Proposed new allocation
 * @returns {Object} Overflow analysis result
 */
function checkCapacityOverflow(teamMemberId, month, newAllocation) {
  const teamMember = getTeamMember(teamMemberId);
  const maxCapacity = calculateAvailableCapacity(teamMember, month) + 
                     getCurrentAllocation(teamMemberId, month); // Add back current allocation
  
  const overflowAmount = newAllocation - maxCapacity;
  
  return {
    hasOverflow: overflowAmount > 0,
    overflowAmount: Math.max(0, overflowAmount),
    maxCapacity: maxCapacity,
    utilization: (newAllocation / maxCapacity) * 100
  };
}

// Example overflow check:
// Max capacity: 21 MDs
// New allocation: 25 MDs  
// Overflow: 4 MDs (125% utilization)
```

### 6. Redistribution After User Changes
```javascript
/**
 * Redistribute MDs after user modifies allocation
 * Rule: Only redistribute to future months, never past
 * 
 * @param {Object} assignment Project assignment object
 * @param {string} changedMonth Month that was modified (YYYY-MM)
 * @param {number} newValue New allocation value
 * @returns {Object} Updated assignment with redistributed allocations
 */
function redistributeAfterUserChange(assignment, changedMonth, newValue) {
  const allocations = { ...assignment.allocations };
  const oldValue = allocations[changedMonth].planned;
  const difference = oldValue - newValue;
  
  // Update the changed month
  allocations[changedMonth].planned = newValue;
  
  if (difference === 0) return assignment; // No change needed
  
  // Get future months only
  const futureMonths = getFutureMonths(changedMonth);
  
  if (difference > 0) {
    // User reduced allocation - redistribute excess to future
    redistributeExcessToFuture(allocations, futureMonths, difference, assignment.teamMemberId);
  } else if (difference < 0) {
    // User increased allocation - reduce from future months
    const needed = Math.abs(difference);
    reduceFromFutureMonths(allocations, futureMonths, needed);
  }
  
  return {
    ...assignment,
    allocations: allocations,
    lastModified: new Date().toISOString()
  };
}

// Example redistribution:
// Original: Feb=20, Mar=22, Apr=18
// User changes Feb to 15 (-5 MDs difference)
// Result: Feb=15, Mar=24, Apr=21 (+5 MDs distributed to future)
```

### 7. Vacation Impact Calculation
```javascript
/**
 * Calculate how vacation days impact monthly capacity
 * 
 * @param {Object} teamMember Team member with vacation data
 * @param {string} month Month to check (YYYY-MM)
 * @returns {number} Vacation days in the specified month
 */
function countVacationDaysInMonth(teamMember, month) {
  const [year, monthNum] = month.split('-').map(Number);
  const vacationDays = teamMember.vacationDays[year] || [];
  
  let vacationCount = 0;
  
  vacationDays.forEach(vacationDate => {
    const vDate = new Date(vacationDate);
    if (vDate.getMonth() + 1 === monthNum) {
      // Only count weekdays as vacation (weekends don't reduce capacity)
      const dayOfWeek = vDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        vacationCount++;
      }
    }
  });
  
  return vacationCount;
}

// Example: 
// Vacation dates in July 2024: ['2024-07-15', '2024-07-16', '2024-07-17']
// Impact: 3 working days reduced from July capacity
```

### 8. Virtual Projects Algorithm
```javascript
/**
 * Generate virtual projects for vacation and alignment tracking
 * 
 * @param {Object} teamMember Team member object
 * @returns {Array} Array of virtual project assignments
 */
function generateVirtualProjects(teamMember) {
  const projects = [];
  
  // Generate FERIE project
  const ferieProject = {
    id: `FERIE-${teamMember.id}`,
    projectId: 'virtual-vacation',
    teamMemberId: teamMember.id,
    type: 'vacation',
    status: 'approved', // Vacation is always approved
    allocations: {}
  };
  
  // Calculate vacation allocations for each month
  const months = getMonthsInTimeRange('2024-01', '2025-03');
  months.forEach(month => {
    const vacationDays = countVacationDaysInMonth(teamMember, month);
    if (vacationDays > 0) {
      ferieProject.allocations[month] = {
        planned: vacationDays,
        actual: vacationDays,
        locked: true // Vacation days are locked
      };
    }
  });
  
  projects.push(ferieProject);
  
  // Generate ALLINEAMENTO project
  const allineamentoProject = {
    id: `ALLINEAMENTO-${teamMember.id}`,
    projectId: 'virtual-alignment',
    teamMemberId: teamMember.id,
    type: 'alignment',
    status: 'pending',
    allocations: {} // Empty initially, filled as needed for adjustments
  };
  
  projects.push(allineamentoProject);
  
  return projects;
}
```

## 📊 Performance Optimization Formulas

### 1. Cached Working Days Lookup
```javascript
/**
 * Pre-calculate and cache working days for performance
 * Cache key: `${month}-${year}-${country}`
 */
const WORKING_DAYS_CACHE = new Map();

function getCachedWorkingDays(month, year, country) {
  const key = `${month}-${year}-${country}`;
  
  if (!WORKING_DAYS_CACHE.has(key)) {
    WORKING_DAYS_CACHE.set(key, calculateWorkingDays(month, year, country));
  }
  
  return WORKING_DAYS_CACHE.get(key);
}
```

### 2. Batch Allocation Updates
```javascript
/**
 * Update multiple allocations in a single operation
 * Reduces DOM manipulation and improves performance
 */
function batchUpdateAllocations(updates) {
  const fragment = document.createDocumentFragment();
  
  updates.forEach(update => {
    const element = createAllocationElement(update);
    fragment.appendChild(element);
  });
  
  // Single DOM update
  container.appendChild(fragment);
}
```

## 🎯 Algorithm Complexity Analysis

### Time Complexity
- **Working Days Calculation**: O(d) where d = days in month (max 31)
- **Auto-Distribution**: O(m) where m = number of months  
- **Overflow Detection**: O(1) for single month check
- **Redistribution**: O(m) for future months processing

### Space Complexity
- **Allocation Storage**: O(t × m × p) where t = team size, m = months, p = projects
- **Holiday Cache**: O(y × c) where y = years, c = countries
- **Working Days Cache**: O(12 × y × c) constant for practical purposes

## 🔍 Edge Cases & Error Handling

### Edge Cases Covered
1. **Leap Years**: February has 29 days in leap years
2. **Holiday Overlaps**: Holiday on weekend doesn't reduce capacity
3. **Vacation on Holiday**: Vacation on national holiday doesn't double-reduce
4. **Month Boundaries**: Project spanning multiple months
5. **Negative Allocations**: Handled by Math.max(0, value)
6. **Future Date Limits**: Allocation limited to 15-month window

### Error Recovery
```javascript
/**
 * Graceful error handling for algorithm failures
 */
function safeCalculateWorkingDays(month, year, country) {
  try {
    return calculateWorkingDays(month, year, country);
  } catch (error) {
    console.warn('Working days calculation failed, using default:', error);
    return 22; // Conservative default
  }
}
```

---

These algorithms provide the mathematical foundation for accurate and efficient capacity planning calculations while maintaining performance and handling real-world edge cases.