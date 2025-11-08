# Spec Requirements: Capacity Timeline Collapse on Assignment Update

## Initial Description

### Original Description (Italian)
Nella Capacity Timeline allocation table, quando aggiungo o modifico un assignment usando i pulsanti 'Update Assignment' o 'Create Assignment', le chevron (▶) devono chiudersi collassando gli elementi espandibili. Questo perchè altrimenti la UI non si aggiorna.

### Original Description (English)
In the Capacity Timeline allocation table, when adding or modifying an assignment using the 'Update Assignment' or 'Create Assignment' buttons, the chevrons (▶) must close by collapsing the expandable elements. This is because otherwise the UI doesn't update.

**Feature Type:** UI Bug Fix / Enhancement
**Date Initiated:** 2025-11-08

## Requirements Discussion

### First Round Questions

**Q1: Scope of collapse - Should we collapse ALL chevrons or only the specific member/project being edited?**
**Answer:** ALL chevrons must collapse (tutti)

**Q2: Timing of collapse - Should this happen immediately on button click or after successful save?**
**Answer:** Should collapse immediately on button click (Al click del pulsante)

**Q3: Project-level chevrons - Do we need to collapse both member-level AND project-level chevrons, or just member-level?**
**Answer:** BOTH levels must collapse: member-level AND project-level chevrons (entrambi i livelli)

**Q4: localStorage behavior - Should we reset the localStorage entries for chevron state when collapsing?**
**Answer:** Reset localStorage entries as if it's the first time opening the capacity timeline page (resettare le entry nel localStorage come se fosse la prima volta che viene aperta la pagina)

**Q5: Edge cases - Are there any scenarios where we should NOT collapse chevrons?**
**Answer:**
- Do NOT collapse if user is editing assignment inline (changing phase MDs directly in table)
- Do NOT collapse if save operation fails

**Q6: Existing reset logic - Is there already a function or mechanism in the codebase for resetting chevron states?**
**Answer:** Not answered, use best judgment based on codebase analysis

**Q7: Exclusions - Are there specific features or behaviors we should explicitly NOT include in this fix?**
**Answer:** No specific exclusions mentioned

### Existing Code to Reference

**Similar Features Identified:**
No similar existing features identified for reference. This is a new requirement specific to the capacity timeline UI behavior.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
No visual assets provided.

## Requirements Summary

### Functional Requirements

**Core Functionality:**
1. When user clicks "Update Assignment" or "Create Assignment" buttons in the AssignmentModal, all chevrons in the CapacityTimeline must collapse
2. Collapse must occur immediately on button click, not after save completes
3. Both levels of chevrons must collapse:
   - Member-level chevrons (expand/collapse member rows)
   - Project-level chevrons (expand/collapse phase breakdown)
4. All localStorage entries related to chevron expansion state must be cleared
5. The UI should behave as if the user is opening the capacity timeline page for the first time

**Edge Cases to Handle:**
1. Do NOT collapse chevrons if user is editing phase MDs inline (directly in the table cells)
2. Do NOT collapse chevrons if the save operation fails
3. Save button click is the trigger, not save success

**User Actions Enabled:**
- Click "Update Assignment" button → All chevrons collapse + localStorage cleared + modal closes
- Click "Create Assignment" button → All chevrons collapse + localStorage cleared + modal closes

**Data to be Managed:**
- Member expansion state: `timeline-expanded-{memberId}` in localStorage
- Project expansion state: `timeline-projects-expanded-{memberId}` in localStorage
- Component state: `isMemberExpanded` and `expandedProjects` in ExpandableTimelineRow components

### Reusability Opportunities

No existing similar features identified to reuse. This is a specific UI behavior fix.

### Scope Boundaries

**In Scope:**
- Collapse all chevrons on "Update Assignment" button click
- Collapse all chevrons on "Create Assignment" button click
- Clear all localStorage entries for chevron expansion state
- Maintain existing behavior for inline editing (no collapse)
- Maintain existing behavior for failed saves (no collapse)

**Out of Scope:**
- Changes to inline editing behavior
- Changes to save operation logic
- Changes to other modal behaviors
- Changes to chevron expansion/collapse logic itself
- Changes to localStorage structure or keys

### Technical Considerations

**Integration Points:**
- AssignmentModal component (`handleSubmit` function) - needs to trigger collapse before calling `onSave`
- CapacityTimeline component - needs to provide a collapse handler to child components
- ExpandableTimelineRow component - needs to expose collapse functionality to parent

**Existing System Constraints:**
- Using React functional components with hooks
- State management via Zustand store (app-store.js)
- localStorage for persistent UI state
- Follows State/Actions/Dispatcher pattern

**Technology Stack:**
- React 18 with TypeScript
- Zustand for state management
- localStorage for persistence
- Electron desktop application

**Architecture Pattern:**
```
AssignmentModal → CapacityTimeline → ExpandableTimelineRow
     |                    |                    |
     |                    |                    └─ Manages chevron state
     |                    |                    └─ Persists to localStorage
     |                    |
     |                    └─ Provides collapse callback
     |                    └─ Manages child rows
     |
     └─ Triggers collapse on button click
     └─ Before calling onSave
```

## Technical Findings from Codebase Analysis

### Component Structure Analysis

**CapacityTimeline Component** (`src/renderer/react/components/CapacityTimeline.tsx`):
- Lines 64-65: Manages two collapsible sections - `projectPhasesExpanded` and `teamMemberAllocationsExpanded`
- Lines 108-113: `handleSave` callback receives updated allocation and calls `refresh()` and `handleModalClose()`
- Contains AssignmentModal at lines 325-333

**ExpandableTimelineRow Component** (`src/renderer/react/components/ExpandableTimelineRow.tsx`):
- Lines 85-86: Two levels of expansion state
  - `isMemberExpanded`: Member row chevron state
  - `expandedProjects`: Set of expanded project IDs (project-level chevrons)
- Lines 114-133: localStorage persistence
  - Line 116: Loads member expansion from `timeline-expanded-${member.id}`
  - Line 124: Loads project expansion from `timeline-projects-expanded-${member.id}`
- Lines 301-307: `toggleMemberExpansion` - saves state to localStorage synchronously
- Lines 309-332: `toggleProjectExpansion` - saves state to localStorage synchronously
- Lines 135-164: Auto-reset on section navigation (already implemented!)
  - Resets expansion when leaving capacity section
  - Clears localStorage entries
  - **This is the exact logic we need to trigger on modal save!**

**AssignmentModal Component** (`src/renderer/react/components/AssignmentModal.tsx`):
- Lines 679-801: `handleSubmit` function
  - Line 786: Calls `onSave?.(result.allocation)` on successful save
  - Line 790: Calls `onClose()` after onSave
- Lines 36-43: Props interface
  - `onSave?: (allocation: any) => void`
  - `onClose: () => void`

### Key Technical Insights

**1. localStorage Keys Pattern:**
- Member expansion: `timeline-expanded-${memberId}` (value: 'true' | 'false')
- Project expansion: `timeline-projects-expanded-${memberId}` (value: JSON array of project IDs)

**2. Existing Reset Logic:**
- Lines 135-164 in ExpandableTimelineRow already implement the exact reset logic we need
- It monitors store changes and resets expansion when leaving capacity section
- We can reuse this pattern by calling the same reset logic from CapacityTimeline

**3. State Management:**
- Each ExpandableTimelineRow instance manages its own expansion state
- CapacityTimeline renders multiple ExpandableTimelineRow components (one per member)
- No global state for chevron expansion - it's per-component with localStorage backup

**4. Callback Chain:**
- AssignmentModal.handleSubmit → onSave → CapacityTimeline.handleSave → refresh()
- We need to insert collapse logic before or during this chain

**5. Inline Edit Path:**
- Line 364-433: `handlePhaseMDChange` - inline editing of phase MDs
- This calls `updateAllocation` directly via AllocationActions
- Does NOT go through the modal save flow
- Does NOT call `onRefresh` from parent (only local `loadMemberAllocations`)
- Therefore, our collapse logic won't affect inline editing (requirement met!)

### Implementation Strategy

**Approach 1: Add collapse callback to CapacityTimeline**
- CapacityTimeline creates a `collapseAllChevrons()` function
- Pass this function to AssignmentModal via props
- AssignmentModal calls it in `handleSubmit` before calling `onSave`
- CapacityTimeline's `collapseAllChevrons` clears ALL localStorage entries matching the pattern
- CapacityTimeline triggers re-render or state update to force child components to collapse

**Approach 2: Leverage existing refresh mechanism**
- When `handleSave` in CapacityTimeline is called, clear all localStorage entries before calling `refresh()`
- The `refresh()` call will cause ExpandableTimelineRow components to unmount/remount
- On mount, they'll load from localStorage (which we just cleared) and default to collapsed state

**Recommended: Approach 2** (simpler, less prop drilling)
- Clear all localStorage entries in `handleSave` before calling `refresh()`
- This ensures all members start collapsed after save
- No need to modify AssignmentModal or add new props
- Minimal code changes
- Leverages existing React re-render behavior

### localStorage Cleanup Strategy

Need to clear all entries matching these patterns:
- `timeline-expanded-*` (all member expansion states)
- `timeline-projects-expanded-*` (all project expansion states)

**Implementation:**
```typescript
const collapseAllTimelineChevrons = () => {
  // Get all localStorage keys
  const keys = Object.keys(localStorage);

  // Remove all timeline expansion state keys
  keys.forEach(key => {
    if (key.startsWith('timeline-expanded-') ||
        key.startsWith('timeline-projects-expanded-')) {
      localStorage.removeItem(key);
    }
  });

  console.log('🧹 All timeline chevron states cleared from localStorage');
};
```

### Error Handling

**Save Failure Scenario:**
- If `result.success === false` in AssignmentModal.handleSubmit (line 786-795)
- onSave is NOT called
- Therefore, collapse will NOT happen
- Requirement met: "Do NOT collapse if save operation fails"

**Inline Edit Scenario:**
- Inline edits go through `handlePhaseMDChange` (line 364-433)
- This path does NOT call `onSave` or `handleSave` on CapacityTimeline
- Therefore, collapse will NOT happen
- Requirement met: "Do NOT collapse if user is editing assignment inline"

### Architecture Notes

**Component Hierarchy:**
```
CapacityTimeline
├── CollapsibleSection (Project Phases Timeline) [currently unused]
├── CollapsibleSection (Team Member Allocations)
│   └── ExpandableTimelineRow (for each member)
│       ├── Member Row (always visible, chevron toggles expansion)
│       ├── AvailableCapacityRow (shown when member expanded)
│       └── Project Rows (shown when member expanded)
│           └── Phase Rows (shown when project expanded, chevron on project row)
└── AssignmentModal (when open)
```

**State Flow:**
1. User clicks "Update Assignment" or "Create Assignment" button in modal
2. AssignmentModal.handleSubmit validates and calls AllocationActions
3. On success, calls `onSave?.(result.allocation)`
4. CapacityTimeline.handleSave receives callback
5. **[NEW]** Clear all localStorage chevron keys
6. Call `refresh()` to reload data
7. ExpandableTimelineRow components re-render
8. On mount, they try to load from localStorage (finds nothing)
9. Default to collapsed state (isMemberExpanded = false, expandedProjects = new Set())

**Files to Modify:**
1. `src/renderer/react/components/CapacityTimeline.tsx`
   - Modify `handleSave` function (around line 108-113)
   - Add localStorage cleanup before `refresh()` call

**Files to Review (no changes needed):**
- `src/renderer/react/components/AssignmentModal.tsx` - already calls onSave correctly
- `src/renderer/react/components/ExpandableTimelineRow.tsx` - already loads from localStorage on mount

### Testing Considerations

**Manual Test Scenarios:**
1. Open Capacity Timeline
2. Expand a member row (chevron rotates down)
3. Expand a project row (chevron rotates down)
4. Click "Add Assignment" button
5. Fill in assignment details
6. Click "Create Assignment" button
7. **Expected:** All chevrons collapse, modal closes, data refreshes
8. Verify localStorage has no `timeline-expanded-*` or `timeline-projects-expanded-*` entries

**Edge Case Tests:**
1. Inline edit a phase MD value → chevrons should NOT collapse
2. Open assignment modal, click Cancel → chevrons should NOT collapse
3. Create assignment with invalid data (save fails) → chevrons should NOT collapse
4. Navigate away from capacity section and back → chevrons should start collapsed (existing behavior)

**Cucumber Test Scenarios (to be written):**
```gherkin
Feature: Capacity Timeline Chevron Collapse on Assignment Update

  Scenario: All chevrons collapse when creating new assignment
    Given user is on Capacity Timeline page
    And user has expanded member "John Doe" row
    And user has expanded project "Project Alpha" phases
    When user clicks "Add Assignment" button
    And user fills in assignment details
    And user clicks "Create Assignment" button
    Then all member row chevrons should be collapsed
    And all project row chevrons should be collapsed
    And localStorage should not contain timeline expansion keys

  Scenario: All chevrons collapse when updating existing assignment
    Given user is on Capacity Timeline page
    And user has expanded member "Jane Smith" row
    When user clicks edit button on an allocation
    And user modifies assignment details
    And user clicks "Update Assignment" button
    Then all member row chevrons should be collapsed
    And all project row chevrons should be collapsed

  Scenario: Chevrons do NOT collapse on inline edit
    Given user is on Capacity Timeline page
    And user has expanded member "Bob Wilson" row with phases
    When user edits a phase MD value inline
    Then member row chevrons should remain expanded
    And project row chevrons should remain expanded

  Scenario: Chevrons do NOT collapse on save failure
    Given user is on Capacity Timeline page
    And user has expanded member rows
    When user attempts to create assignment with invalid data
    And save operation fails
    Then chevrons should remain in their current state
```
