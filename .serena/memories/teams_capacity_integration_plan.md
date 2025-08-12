# Teams → Capacity Integration Plan

## 🎯 OBIETTIVO
Sostituire dati mock in capacity sections con dati reali da Teams configuration e project JSON files per calcoli MD accurati.

## 📊 ANALISI COMPLETATA

### 1. STRUTTURA MOCK CORRENTE
```javascript
// getMockTeamMembers() returns:
{
  id: 'mario-rossi',
  firstName: 'Mario', lastName: 'Rossi',
  role: 'Senior Developer',
  vendor: 'Internal',  // ← Hardcoded text
  maxCapacity: 20,     // ← MDs per month
  currentUtilization: 85,
  allocations: {
    '2025-01': { 
      'E-Commerce Platform': { days: 15, status: 'approved' },
      'Mobile App': { days: 5, status: 'approved' }
    }
    // ← Hardcoded project names
  }
}
```

### 2. TEAMS CONFIGURATION STRUCTURE
```javascript
// createFallbackTeams() returns:
{
  id: 'team-frontend',
  name: 'Frontend Team',
  members: [{
    id: 'member-frontend-1',
    firstName: 'Mario', lastName: 'Rossi',
    vendorId: 'internal1',      // ← References internal resource
    vendorType: 'internal',     // ← 'internal' | 'supplier'  
    monthlyCapacity: 22,        // ← MDs per month
    role: 'Senior Developer'
  }]
}
```

### 3. PROJECT PHASES STRUCTURE
```javascript
// createFallbackPhaseDefinitions() returns phases with:
{
  id: "functionalAnalysis",
  name: "Functional Analysis",
  defaultEffort: { G1: 100, G2: 0, TA: 20, PM: 50 }, // ← % effort per role
  editable: true
}
// 8 fasi totali: functionalAnalysis, technicalAnalysis, development, integrationTests, uatTests, consolidation, deployment, projectManagement
```

## 🚀 PIANO IMPLEMENTAZIONE

### FASE 1: SEQUENTIAL PHASE ALLOCATION SYSTEM

#### A. Working Days Calculator (REAL)
```javascript
// NUOVO: Calcolo giorni lavorativi reali per mese
calculateWorkingDaysInMonth(year, month, country = 'IT') {
  const holidays = this.getHolidays(year, country);
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const dateString = date.toISOString().split('T')[0];
    
    // Skip weekends (0=Sunday, 6=Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Skip holidays
      if (!holidays.includes(dateString)) {
        workingDays++;
      }
    }
  }
  
  return workingDays;
}

// Italian Holidays
const HOLIDAYS_IT = {
  2025: [
    '2025-01-01', '2025-01-06', '2025-04-21', '2025-04-25',
    '2025-05-01', '2025-06-02', '2025-08-15', '2025-11-01',
    '2025-12-08', '2025-12-25', '2025-12-26'
  ]
};
```

#### B. Phase Timeline Calculation
```javascript
// NUOVO: Calcola timeline sequenziale delle fasi
calculateProjectPhaseTimeline(project, startDate) {
  const phases = project.phases.sort((a, b) => a.order || 0 - b.order || 0);
  const timeline = [];
  let currentDate = new Date(startDate);
  
  phases.forEach(phase => {
    const phaseTotalMDs = phase.manDays || 0;
    
    if (phaseTotalMDs > 0) {
      const phaseEndDate = this.addWorkingDays(currentDate, phaseTotalMDs);
      
      timeline.push({
        phaseId: phase.id,
        phaseName: phase.name,
        totalMDs: phaseTotalMDs,
        startDate: new Date(currentDate),
        endDate: phaseEndDate,
        effort: phase.effort || {}, // { G1: 100, G2: 0, TA: 20, PM: 50 }
        months: this.getMonthsInDateRange(currentDate, phaseEndDate)
      });
      
      currentDate = this.addDays(phaseEndDate, 1); // Next phase starts next day
    }
  });
  
  return timeline;
}
```

#### C. Role-Based Phase Participation
```javascript
// NUOVO: Determina se un ruolo partecipa alla fase
getRoleParticipationInPhase(phase, memberRole) {
  const roleEffortPercent = phase.effort[memberRole] || 0;
  
  return {
    participates: roleEffortPercent > 0,
    effortPercent: roleEffortPercent,
    roleMDs: Math.round((phase.totalMDs * roleEffortPercent) / 100)
  };
}
```

#### D. Member Role Resolution
```javascript
// CORRETTO: Il ruolo viene dal vendor associato al team member
getMemberRole(member) {
  if (member.vendorType === 'internal') {
    const internal = this.configManager.globalConfig.internalResources
      .find(r => r.id === member.vendorId);
    return internal?.role || 'G2'; // G1, G2, TA, PM
  } else {
    const supplier = this.configManager.globalConfig.suppliers
      .find(s => s.id === member.vendorId);
    return supplier?.role || 'G2'; // G1, G2, TA, PM
  }
}
```

#### E. Sequential Allocation Generator
```javascript
// NUOVO: Genera allocazioni sequenziali per fasi
generateSequentialAllocations(member, memberRole, projects) {
  const allocations = {};
  
  projects.forEach(project => {
    const mockProject = this.generateMockProjectData(project);
    const phaseTimeline = this.calculateProjectPhaseTimeline(project, mockProject.startDate);
    
    phaseTimeline.forEach(phase => {
      const participation = this.getRoleParticipationInPhase(phase, memberRole);
      
      if (participation.participates && participation.roleMDs > 0) {
        // Distribuisci MDs della fase sui mesi della fase
        const phaseDistribution = this.distributePhaseAcrossMonths(
          participation.roleMDs,
          phase.startDate,
          phase.endDate,
          phase.months
        );
        
        Object.entries(phaseDistribution).forEach(([month, dayData]) => {
          if (!allocations[month]) allocations[month] = {};
          
          // Combina allocazioni se progetto già presente nel mese
          if (allocations[month][project.name]) {
            allocations[month][project.name].days += dayData.days;
            allocations[month][project.name].phases.push({
              phaseName: phase.phaseName,
              phaseDays: dayData.days
            });
          } else {
            allocations[month][project.name] = {
              days: dayData.days,
              status: mockProject.status,
              hasOverflow: false,
              overflowAmount: 0,
              phases: [{
                phaseName: phase.phaseName,
                phaseDays: dayData.days
              }]
            };
          }
        });
      }
    });
  });
  
  return allocations;
}
```

#### F. Phase Distribution Across Months
```javascript
// NUOVO: Distribuisce MDs di una fase sui suoi mesi CON CALCOLO REALE
distributePhaseAcrossMonths(phaseMDs, phaseStartDate, phaseEndDate, phaseMonths) {
  const distribution = {};
  let remainingMDs = phaseMDs;
  
  // Calcola giorni lavorativi totali della fase
  const totalWorkingDaysInPhase = this.calculateWorkingDaysBetween(phaseStartDate, phaseEndDate);
  
  phaseMonths.forEach((month, index) => {
    const isLastMonth = index === phaseMonths.length - 1;
    
    // CALCOLO REALE: giorni lavorativi del mese che appartengono alla fase
    const workingDaysInMonth = this.getWorkingDaysInMonthForPhase(
      month, 
      phaseStartDate, 
      phaseEndDate
    );
    
    // Distribuisci proporzionalmente ai giorni lavorativi REALI
    const monthMDs = isLastMonth ? 
      remainingMDs : 
      Math.round((workingDaysInMonth / totalWorkingDaysInPhase) * phaseMDs);
    
    if (monthMDs > 0) {
      distribution[month] = {
        days: monthMDs,
        workingDaysInMonth: workingDaysInMonth,
        phaseStartDate: phaseStartDate,
        phaseEndDate: phaseEndDate
      };
      
      remainingMDs -= monthMDs;
    }
  });
  
  return distribution;
}
```

#### G. Mock Data for Missing Fields
```javascript
// CORRETTO: Mock casuale per campi mancanti
generateMockProjectData(project) {
  const mockStartDates = [
    '2025-01-15', '2025-02-01', '2025-03-10', 
    '2025-04-01', '2025-05-15', '2025-06-01'
  ];
  const mockStatuses = ['approved', 'pending'];
  
  return {
    ...project,
    startDate: mockStartDates[Math.floor(Math.random() * mockStartDates.length)],
    status: mockStatuses[Math.floor(Math.random() * mockStatuses.length)]
  };
}
```

### FASE 2: CURRENT UTILIZATION & OVERFLOW MANAGEMENT

#### H. Current Utilization Calculation
```javascript
// CORRETTO: Calcola utilizzo in base alle allocazioni effettive
calculateCurrentUtilization(allocations, memberRole) {
  const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const currentAllocations = allocations[currentMonth] || {};
  
  // Calcola giorni lavorativi reali del mese corrente
  const currentDate = new Date();
  const realWorkingDaysInMonth = this.calculateWorkingDaysInMonth(
    currentDate.getFullYear(), 
    currentDate.getMonth() + 1
  );
  
  // Somma tutti i giorni allocati nel mese corrente
  const totalAllocatedDays = Object.values(currentAllocations)
    .reduce((sum, allocation) => sum + allocation.days, 0);
  
  // Calcola percentuale di utilizzo su giorni lavorativi reali
  const utilizationPercentage = realWorkingDaysInMonth > 0 ? 
    Math.round((totalAllocatedDays / realWorkingDaysInMonth) * 100) : 0;
  
  return {
    utilizationPercentage,
    allocatedDays: totalAllocatedDays,
    availableDays: realWorkingDaysInMonth - totalAllocatedDays,
    realWorkingDaysInMonth
  };
}
```

#### I. Overflow Detection & UI Management
```javascript
// Overflow styling: .capacity-mds-input cells → RED
applyCellOverflowStyling(allocation, memberId, month, projectName) {
  const cell = document.querySelector(
    `.capacity-mds-input[data-member="${memberId}"][data-month="${month}"][data-project="${projectName}"]`
  );
  
  if (cell && allocation.hasOverflow) {
    cell.classList.add('capacity-overflow');
    cell.style.backgroundColor = '#fee';
    cell.style.borderColor = '#f56565';
    cell.style.color = '#c53030';
    cell.title = `Overflow: ${allocation.overflowAmount} MDs exceed capacity`;
  }
}

// Alerts: .alert-item.alert-high
displayOverflowAlerts(alerts) {
  alerts.forEach(alert => {
    const alertElement = document.createElement('div');
    alertElement.className = 'alert-item alert-high';
    alertElement.innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      <span>${alert.message}</span>
    `;
    document.querySelector('.capacity-alerts-container').appendChild(alertElement);
  });
}
```

### FASE 3: MAIN METHOD REPLACEMENT

#### J. Updated getRealTeamMembers Method
```javascript
async getRealTeamMembers() {
  const teams = this.configManager.globalConfig.teams || [];
  const projects = await this.app.managers.data.loadAllProjects();
  
  return teams.flatMap(team => 
    team.members.map(member => {
      const memberRole = this.getMemberRole(member);
      const vendor = this.resolveVendorName(member);
      
      // STEP 1: Genera allocazioni sequenziali per fasi
      const allocations = this.generateSequentialAllocations(member, memberRole, projects);
      
      // STEP 2: Calcola utilizzo corrente basato sulle allocazioni
      const utilizationData = this.calculateCurrentUtilization(allocations, memberRole);
      
      return {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        role: memberRole, // ← DA VENDOR (G1/G2/TA/PM)
        vendor: vendor,
        maxCapacity: utilizationData.realWorkingDaysInMonth, // ← GIORNI REALI
        currentUtilization: utilizationData.utilizationPercentage,
        allocations: allocations,
        _debugInfo: {
          allocatedDays: utilizationData.allocatedDays,
          availableDays: utilizationData.availableDays
        }
      };
    })
  );
}
```

## 📍 METHOD REPLACEMENTS

**Files to Modify:** `src/renderer/js/components/calculations-manager.js`

**Replace in 8 locations:**
```javascript
// OLD: const teamMembers = this.getMockTeamMembers();
// NEW: const teamMembers = await this.getRealTeamMembers();
```

**Methods to update:**
- loadAllocationChart() (line 1666)
- loadTeamPerformanceData() (line 1846)  
- getTeamMembers() (line 2739)
- populateOverviewFilters() (line 2983)
- loadCapacityTable() (line 3003)
- handleCapacityValueReset() (line 3186)
- updateCapacityValue() (line 3208)
- loadTeamMemberOptions() (line 3535)
- loadVendorOptions() (line 3555)
- applyFilters() (line 3647)

## 🎯 EXPECTED OUTCOMES

✅ **Real Team Members**: Da Teams configuration invece di mock  
✅ **Sequential Phase Allocation**: Rispetta timeline e % effort reali  
✅ **Real Working Days**: Calcolo accurato giorni lavorativi per mese  
✅ **Role-Based Participation**: Solo ruoli con effort > 0 vengono allocati  
✅ **Overflow Management**: Segnalazione visual + alert per capacità eccedente  
✅ **Vendor Resolution**: Linking corretto a suppliers/internal resources  

## 📊 ESEMPI PRATICI

### Scenario A: G2 Developer
```javascript
// Progetto: E-Commerce, Start: 1 Marzo 2025
// Fasi:
// 1. Functional Analysis: 22 MDs, G2=0% → G2 NON LAVORA
// 2. Technical Analysis: 30 MDs, G2=100% → G2: 30 MDs  
// 3. Development: 80 MDs, G2=100% → G2: 80 MDs

// Allocazioni Result:
{
  '2025-03': {}, // ← NESSUNA allocazione per G2 (Functional Analysis)
  '2025-04': {
    'E-Commerce Platform': { 
      days: 20, 
      phases: [{ phaseName: 'Technical Analysis', phaseDays: 20 }]
    }
  },
  '2025-05': {
    'E-Commerce Platform': { 
      days: 22, 
      phases: [
        { phaseName: 'Technical Analysis', phaseDays: 10 },
        { phaseName: 'Development', phaseDays: 12 }
      ]
    }
  }
}
```

### Working Days per mese 2025 (IT):
- Gennaio: 23 giorni lavorativi (escl. 1 gen, 6 gen)
- Febbraio: 20 giorni lavorativi
- Marzo: 21 giorni lavorativi  
- Aprile: 21 giorni lavorativi (escl. 21 apr, 25 apr)
- Maggio: 21 giorni lavorativi (escl. 1 mag)
- Giugno: 21 giorni lavorativi (escl. 2 giu)

## 🚀 IMPLEMENTATION READY
Tutti i componenti sono definiti per implementazione completa del sistema phase-based sequential allocation con calcolo reale giorni lavorativi!