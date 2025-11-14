# Spec Requirements: Export Report Excel - IT Support Team Performance Dashboard

## Feature Overview & Objectives

**Feature Name**: Export Report Excel - IT Support Team Performance Dashboard

**Purpose**: Enable users to export comprehensive IT Support Team Performance metrics from the Ticket Dashboard into a professionally formatted Excel workbook that can be used for reporting, analysis, and stakeholder communication.

**Primary User**: IT Support Team Leads, Project Managers, and reporting stakeholders who need to generate performance reports with filtered data.

**Delivery Value**:
- One-click export of all dashboard metrics to Excel
- Time-period filtered data exports
- Professional formatting with conditional highlighting
- Detailed backup sheets for alerts and ticket lists
- Suitable for executive reporting and archive retention

---

## Scope Definition

### In Scope

1. **All Dashboard Cards from Ticket Dashboard**:
   - Unified Tickets (Total, Open, Closed counts)
   - Average Resolution Time (metrics and top performers)
   - Resolution Rate (percentage and trend)
   - Current Backlog (count and oldest tickets)
   - Critical Alerts (Orphaned, Stagnant, Expired High Priority)
   - Warning Alerts (Suspicious Closures, Unworked Tickets)
   - Team Analysis (per-operator breakdown)
   - Full Backlog List (all unresolved tickets)

2. **Excel File Generation**:
   - Multi-sheet workbook structure
   - Summary sheet with KPI overview
   - Dedicated metric sheets per card type
   - Alert sheets (one per alert type with ticket lists)
   - Full list sheets for backlog and alerts
   - Professional formatting (headers, fonts, colors, number formats)

3. **Time Period Filtering**:
   - All Time
   - Last 7 days
   - Last Month (30 days)
   - Last 3 Months (90 days)
   - Last 6 Months (180 days)
   - Current Year
   - Custom Range (date picker)

4. **Data Calculations**:
   - Average resolution time in hours
   - Resolution rate as percentage
   - Per-team member metrics (assigned count, resolved count, avg resolution time, SLA delays)
   - Time-based filtering applied to metrics
   - SLA threshold validation (P5=4hrs, P6=8hrs, P7=24hrs, P8=72hrs)

5. **Conditional Formatting & Styling**:
   - Color-coded headers (dark background with white text)
   - Critical alerts in red
   - Warning alerts in yellow
   - Number formatting (%, decimals, thousands separators)
   - Freeze panes for headers
   - Auto-fit column widths

6. **File Naming & Metadata**:
   - Dynamic filename with time period and export date
   - Metadata sheet or document properties with filter parameters
   - Timestamp of export and data snapshot date

7. **Integration with Dashboard UI**:
   - Export button in Ticket Dashboard sidebar menu
   - Button accessible when dashboard has data
   - Loading state during export
   - Success/error feedback to user
   - File saved to user's Downloads folder

### Out of Scope

1. **Advanced Analytics**: Charting, trendlines, or predictive analytics within Excel
2. **Real-Time Updates**: Live-updating Excel files (static snapshot only)
3. **Multi-Format Exports**: PDF, CSV, or other formats (Excel only for this feature)
4. **Email Integration**: Automatic email distribution (user manually shares file)
5. **Cloud Storage**: Direct to cloud/Dropbox/Teams (local filesystem only)
6. **Scheduling**: Automated scheduled reports (manual export only)
7. **Custom Report Builder**: User-defined report templates (fixed structure only)
8. **Drill-Down Interactivity**: Excel hyperlinks or pivot tables (static data only)
9. **Encryption**: Password-protected or encrypted workbooks (open format)
10. **Historical Comparison**: Side-by-side comparison of multiple exports

---

## Excel File Structure

### Overall Structure

**File Naming Pattern**: `IT_Support_Performance_[TIME_PERIOD]_[DATE].xlsx`

Examples:
- `IT_Support_Performance_Last7Days_2025-11-14.xlsx`
- `IT_Support_Performance_Custom_2025-10-01_to_2025-11-14.xlsx`
- `IT_Support_Performance_AllTime_2025-11-14.xlsx`

### Sheet Names & Organization

The workbook contains the following sheets in this order:

1. **Dashboard Summary** - One-page overview of all KPIs
2. **Unified Tickets** - Total, Open, Closed breakdown with details
3. **Resolution Metrics** - Average resolution time with top performers
4. **Resolution Rate** - Percentage and historical context
5. **Backlog** - Current backlog count and oldest tickets detail sheet
6. **Team Analysis** - Per-operator metrics and performance breakdown
7. **Alert: Orphaned Tickets** - Tickets with no assignment
8. **Alert: Stagnant Tickets** - Tickets with no updates for X days
9. **Alert: Expired High Priority** - High priority tickets past due
10. **Alert: Suspicious Closures** - Tickets closed in < 1 hour
11. **Alert: Unworked Tickets** - Assigned but no activity
12. **Full Backlog List** - All unresolved tickets with detailed columns
13. **Metadata** - Export parameters and filter information

### Sheet 1: Dashboard Summary

**Purpose**: Executive overview on single page

**Columns**:
- Metric Name | Value | Unit | Status
- E.g. "Total Tickets | 147 | count | -"
- E.g. "Avg Resolution Time | 18.5 | hours | OK"
- E.g. "Critical Alerts | 5 | count | RED"

**KPIs Displayed** (in order):
1. Total Tickets
2. Open Tickets
3. Closed Tickets
4. Resolution Rate (%)
5. Average Resolution Time (hours)
6. Current Backlog Count
7. Orphaned Tickets Count (Critical)
8. Stagnant Tickets Count (Critical)
9. Expired High Priority Count (Critical)
10. Suspicious Closures Count (Warning)
11. Unworked Tickets Count (Warning)
12. Top Team Member (by resolved count)
13. Slowest Resolution (hours)
14. Fastest Resolution (hours)

**Formatting**:
- Header row: Dark background (RGB 0,0,0), white text, bold, 14pt
- Row spacing: 1.5 line height
- Number formatting: Decimals where applicable
- Status column: Conditional color (Green=OK, Yellow=Warning, Red=Critical)

### Sheet 2: Unified Tickets

**Purpose**: Break down of ticket counts by status

**Columns**:
- Ticket Status | Count | Percentage | Details
- Total | [count] | 100% | -
- Open | [count] | [%] | Tickets currently open
- Closed | [count] | [%] | Tickets closed in period
- In Progress | [count] | [%] | Currently being worked

**Details Section**:
- Open tickets by priority (P5, P6, P7, P8)
- Closed tickets by month/week
- Time to first response (avg)
- Time to resolution (avg)

**Formatting**:
- Numbers right-aligned
- Percentage with % symbol
- Row height: Normal
- Font: 11pt, sans-serif

### Sheet 3: Resolution Metrics

**Purpose**: Deep dive into resolution times and top performers

**Sections**:

**Part A: Aggregate Metrics**
- Metric | Value | Unit
- Avg Resolution Time (All) | [hours] | hours
- Median Resolution Time | [hours] | hours
- Min Resolution Time | [hours] | hours
- Max Resolution Time | [hours] | hours
- Std Dev | [hours] | hours

**Part B: Top 3 Slowest Resolutions**
- Rank | Ticket ID | Title | Days | Hours | Assigned To

**Part C: Top 3 Fastest Resolutions**
- Rank | Ticket ID | Title | Hours | Assigned To

**Part D: Top 3 Average (±10% of mean)**
- Rank | Ticket ID | Title | Hours | Assigned To

**Formatting**:
- Section headers: Bold, 12pt, light gray background
- Numbers: 2 decimal places for hours
- Days column: Integer values
- Ticket ID as hyperlink (if possible, otherwise as text)

### Sheet 4: Resolution Rate

**Purpose**: Percentage of tickets resolved in period

**Content**:
- Total Tickets in Period | [count]
- Resolved Tickets | [count]
- Resolution Rate | [%] | (Resolved + Closed) / Total * 100
- Unresolved Tickets | [count]
- Time Period | [period] | User's selected filter
- As of Date | [date] | Snapshot date

**By Priority Breakdown**:
- Priority | Count | Resolved | Unresolved | Resolution Rate %
- P5 | [count] | [count] | [count] | [%]
- P6 | [count] | [count] | [count] | [%]
- P7 | [count] | [count] | [count] | [%]
- P8 | [count] | [count] | [count] | [%]
- Total | [count] | [count] | [count] | [%]

**Formatting**:
- Key metrics: 16pt bold
- Percentages: 1 decimal place with % symbol
- Priority table: Alternating row colors (white, light gray)
- P5/P6: Red text for resolution rate if < 80%
- P7/P8: Yellow text for resolution rate if < 90%

### Sheet 5: Backlog

**Purpose**: Overview and details of current unresolved tickets

**Section A: Summary**
- Current Backlog Count | [count]
- Oldest Open Ticket | [days old]
- Newest Added | [date]
- Tickets > 7 days old | [count]
- Tickets > 14 days old | [count]
- Tickets > 30 days old | [count]

**Section B: Oldest Open Tickets (Top 10)**
- Rank | Ticket ID | Title | Created | Days Open | Priority | Assigned To | Last Updated

**Formatting**:
- Days Open: Right-aligned, conditional color (>30 days = red, >14 days = yellow)
- Created & Last Updated: Date format (YYYY-MM-DD)
- Priority: Bold if P5 or P6
- Row height: 1.2 for readability

### Sheet 6: Team Analysis

**Purpose**: Per-team member performance breakdown

**Main Table**:
- Team Member | Assigned Count | Resolved Count | Avg Resolution Hours | Tickets in Delay | Delay % | Utilization

**Column Definitions**:
- Team Member: Full name or identifier
- Assigned Count: Total tickets assigned to person in period
- Resolved Count: Tickets fully resolved by this person
- Avg Resolution Hours: Average hours to resolution for their tickets
- Tickets in Delay: Count exceeding SLA threshold
- Delay %: (Tickets in Delay / Assigned Count) * 100
- Utilization: (Hours Worked / Available Hours) * 100 or capacity allocation

**SLA Thresholds Applied**:
- P5: 4 hours
- P6: 8 hours
- P7: 24 hours
- P8: 72 hours

**Additional Metrics** (as separate table below):
- Team Member | Assigned P5 | Assigned P6 | Assigned P7 | Assigned P8

**Formatting**:
- Team Member column: Bold, dark text
- Numeric columns: Right-aligned
- Resolved Count: Blue text if > assigned (data integrity check)
- Delay %: Red if > 20%, Yellow if 10-20%
- Frozen header row
- Column widths: Auto-fit
- Row height: 1.3 for readability
- Sort: By Resolved Count descending (highest performers first)

### Sheet 7: Alert - Orphaned Tickets

**Purpose**: Tickets with no assignment (critical alert type)

**Table Columns**:
- Ticket ID | Title | Created | Days Open | Priority | Description | Status

**Formatting**:
- Background: Light red tint (RGB 255,220,220)
- Header: Red background with white text
- Priority column: Bold, red if P5/P6
- Days Open: Red if > 7 days
- Title column: Wide (wrap text enabled)

**Summary Row** (at top):
- Total Orphaned: [count]
- Critical (P5/P6): [count]
- Oldest: [X] days
- Newest: [Y] days old

**Sorting**: By Days Open descending (oldest first)

### Sheet 8: Alert - Stagnant Tickets

**Purpose**: Tickets with no updates for X days (critical alert)

**Configuration**: Default threshold = 3 days with no updates

**Table Columns**:
- Ticket ID | Title | Created | Days Since Last Update | Last Updated | Priority | Assigned To | Days Stagnant

**Formatting**:
- Background: Light red tint
- Header: Red background with white text
- Days Stagnant: Red if > 7 days, Yellow if 3-7 days
- Priority: Bold

**Summary Row** (at top):
- Total Stagnant: [count]
- Critical (> 7 days): [count]
- Oldest Stagnant: [X] days

**Sorting**: By Days Since Last Update ascending (oldest updates first)

### Sheet 9: Alert - Expired High Priority

**Purpose**: High priority tickets past their SLA deadline

**Table Columns**:
- Ticket ID | Title | Created | Days Overdue | Priority | SLA Hours | Actual Hours | Assigned To | Status

**Formatting**:
- Background: Light red tint
- Header: Red background with white text
- Days Overdue: Bold red
- Priority: Bold, red if P5/P6
- SLA Hours vs Actual Hours: Actual in red if exceeded
- Row background: Dark red if overdue by > 24 hours

**Summary Row** (at top):
- Total Expired High Priority: [count]
- P5 Overdue: [count]
- P6 Overdue: [count]
- Maximum Overdue: [X] hours

**Sorting**: By Days Overdue descending (most overdue first)

### Sheet 10: Alert - Suspicious Closures

**Purpose**: Tickets closed in less than 1 hour (warning alert)

**Table Columns**:
- Ticket ID | Title | Created | Closed | Time to Close (min) | Assigned To | Closed By | Description

**Formatting**:
- Background: Light yellow tint (RGB 255,255,200)
- Header: Yellow background with black text
- Time to Close: Bold if < 15 minutes
- Row background: Orange if < 5 minutes (potential close without resolution)

**Summary Row** (at top):
- Total Suspicious: [count]
- < 5 minutes: [count]
- < 15 minutes: [count]
- Average close time: [X] minutes

**Sorting**: By Time to Close ascending (fastest closures first)

### Sheet 11: Alert - Unworked Tickets

**Purpose**: Assigned tickets with no activity since assignment (warning alert)

**Table Columns**:
- Ticket ID | Title | Created | Assigned | Days Since Assignment | Assigned To | Priority | Status | Last Activity

**Formatting**:
- Background: Light yellow tint
- Header: Yellow background with black text
- Days Since Assignment: Bold if > 14 days, yellow if > 7 days
- Priority: Bold if P5/P6
- Last Activity: "Never worked" text in bold if no activity

**Summary Row** (at top):
- Total Unworked: [count]
- > 7 days unworked: [count]
- > 14 days unworked: [count]
- Oldest unworked: [X] days

**Sorting**: By Days Since Assignment descending (longest without work first)

### Sheet 12: Full Backlog List

**Purpose**: Complete list of all unresolved tickets with detail columns

**Table Columns**:
- Ticket ID
- Title
- Created
- Days Open
- Priority
- Assigned To
- Status
- Last Updated
- Days Since Update
- Time in Delay (hours)
- Notes / Description

**Formatting**:
- Header: Dark background (RGB 51,51,51), white text, bold
- Days Open: Right-aligned, red if > 30, yellow if > 14
- Priority: Center-aligned, bold
- Status: Center-aligned, color-coded
- Title: Left-aligned, wrap text enabled, width 40%
- Frozen header row
- Auto-fit column widths (except Title)

**Filtering Capability**:
- Enable AutoFilter (user can filter in Excel)
- Apply to all columns

**Sorting** (default in export):
- Primary: Priority (P5, P6, P7, P8)
- Secondary: Days Open (oldest first)

**Row Coloring**:
- Header: Dark gray
- Data rows: Alternating white / very light gray
- P5 rows: Pink tint background
- P6 rows: Orange tint background
- Overdue rows: Additional highlight

### Sheet 13: Metadata

**Purpose**: Document export parameters for audit trail and context

**Content** (as simple key-value pairs):

```
Export Information
==================
Export Date: [timestamp]
Export User: [user name or system]
Data Snapshot Date: [as of date]
Time Period Filter: [selected period]
Filter Start Date: [YYYY-MM-DD]
Filter End Date: [YYYY-MM-DD]
Total Records Included: [count]

Dashboard Metrics Included
==========================
Unified Tickets: Yes
Resolution Metrics: Yes
Resolution Rate: Yes
Backlog: Yes
Team Analysis: Yes
Critical Alerts: Yes
Warning Alerts: Yes

Data Calculation Notes
======================
Average Resolution Time: (resolved_at - created_at) in hours
Resolution Rate: (resolved_count + closed_count) / total_count * 100
SLA Thresholds: P5=4hrs, P6=8hrs, P7=24hrs, P8=72hrs
Team Delay %: Tickets exceeding SLA / Total assigned * 100
Stagnant Definition: No updates for 3+ days
Suspicious Closure: Ticket closed in < 60 minutes
```

**Formatting**:
- Font: 11pt, monospace for data values
- Section headers: Bold, 12pt
- Key-value pairs: Left-aligned
- No borders or styling (information sheet)

---

## Data Requirements & Calculations

### Data Sources

All data comes from the Ticket Dashboard store and TicketDashboardActions:
- Current project's ticket list
- Team member allocation data
- SLA/priority configuration
- Time filter settings from store

### Calculation Rules

#### 1. Average Resolution Time
```
Formula: (resolved_at - created_at) in hours
Logic:
  - Only count tickets with both created_at and resolved_at dates
  - Filter by time period (ignore period filter for "All Time")
  - Exclude tickets closed without resolution (if applicable)
  - Return as decimal hours (e.g., 18.5 hours)
Result: Single aggregate number (avg), plus breakdowns by priority/team
```

#### 2. Resolution Rate
```
Formula: (Resolved + Closed) / Total Tickets * 100
Logic:
  - Total Tickets: All tickets in time period
  - Resolved: Tickets with resolved_at date in period
  - Closed: Tickets with closed_at date in period
  - Return as percentage (e.g., 73.2%)
  - Calculate for each priority level separately
Result: Overall % + per-priority breakdown
```

#### 3. Days Open
```
Formula: (Today - created_at) in days
Logic:
  - For unresolved tickets: days from creation to today
  - For resolved tickets: days from creation to resolution date
  - Return as integer days
Result: Used in backlog and alert sheets
```

#### 4. Time in Delay (SLA Violation)
```
Formula: (actual_resolution_time - sla_threshold) in hours
Logic:
  - SLA Threshold by priority: P5=4, P6=8, P7=24, P8=72 hours
  - Actual Time: (resolved_at - created_at) in hours
  - If Actual > SLA: positive number (hours over)
  - If Actual <= SLA: 0 or no entry
  - For unresolved tickets: (today - created_at) vs SLA
Result: Hours over SLA, used for team delay calculations
```

#### 5. Team Member Metrics
```
Assigned Count: Number of tickets currently assigned to person in period
Resolved Count: Tickets resolved by this person in period
Avg Resolution Time: (sum of resolution hours) / resolved_count
Tickets in Delay: Count where (actual_resolution_time > sla_threshold)
Delay %: (Tickets in Delay / Assigned Count) * 100
Utilization: (Hours Worked on Tickets / Available Hours) * 100
  OR: (Total Assigned Hours Estimate / Available Hours) * 100
```

#### 6. Top Performers (Slowest/Fastest/Average)
```
Top 3 Slowest: Tickets with highest resolution_time, sorted descending
Top 3 Fastest: Tickets with lowest resolution_time (> 0), sorted ascending
Top 3 Average: Tickets within ±10% of mean resolution_time
  - Mean = avg resolution time for period
  - Range: (Mean * 0.9) to (Mean * 1.1)
  - Sorted by resolution_time ascending
```

#### 7. Stagnant Tickets
```
Definition: Tickets with no updates for 3+ consecutive days
Logic:
  - last_updated_at = most recent activity timestamp
  - today - last_updated_at >= 3 days = stagnant
  - Does NOT require ticket to be "in progress"
  - Includes unresolved and recently opened tickets
Result: Count and details in alert sheet
```

#### 8. Suspicious Closures
```
Definition: Tickets closed in < 60 minutes
Logic:
  - closed_at - created_at < 60 minutes
  - Likely indicates immediate close without work
  - Warning alert for potential process issue
Result: Count and ticket details for review
```

#### 9. Unworked Tickets
```
Definition: Assigned but with no activity since assignment
Logic:
  - assigned_at is set
  - last_activity_date = null OR last_activity_date == assigned_at
  - No updates, comments, or status changes since assignment
  - Can be: "in queue", "open", or other non-completed status
Result: Count and ticket list for team lead intervention
```

#### 10. Backlog Definition
```
Current Backlog: All unresolved tickets as of export time
Definition:
  - status != "resolved" AND status != "closed"
  - Respects time period ONLY for creation date
  - DOES NOT exclude by SLA or other criteria
  - Includes: new, in progress, on hold, reopened, waiting
Result: Count + details of all unresolved work
```

### Data Filtering

#### Time Period Application

**When Time Filter IS Applied To**:
1. Total Tickets count (created in period)
2. Open Tickets count (created in period, still open)
3. Closed Tickets count (closed in period)
4. Average Resolution Time (resolved in period)
5. Resolution Rate calculation (tickets in period)
6. Top Performer lists (resolved in period)
7. Team Analysis metrics (activity in period)
8. Alert lists (triggered/detected in period)

**When Time Filter is NOT Applied To**:
1. Current Backlog count (always current snapshot)
2. Oldest Open Tickets (not filtered by creation date)
3. Backlog detail list (all current unresolved)
4. SLA definitions (always same thresholds)

**Special Case: "All Time"**
- No date filtering applied
- Shows entire history
- Still respects deleted/archived tickets

---

## Time Period Handling & Filter Integration

### Time Period Options

1. **All Time**: No date filter, entire history
2. **Last 7 Days**: Today minus 7 days
3. **Last Month**: Today minus 30 days
4. **Last 3 Months**: Today minus 90 days
5. **Last 6 Months**: Today minus 180 days
6. **Current Year**: January 1 of current year to today
7. **Custom Range**: User-selected start and end dates

### Filter Integration Points

**Source**: `TicketDashboardActions.applyTimeFilter(period, startDate, endDate)`

**Integration Pattern**:
```
1. User clicks "Export Report" button
2. System retrieves current time filter from store
3. If time filter is custom range: extract startDate and endDate
4. If time filter is preset: calculate actual date range
5. Pass date range to all calculation functions
6. Calculations filter data based on dates
7. File naming includes period in readable format
```

**File Naming with Period**:
- `IT_Support_Performance_AllTime_[DATE].xlsx`
- `IT_Support_Performance_Last7Days_[DATE].xlsx`
- `IT_Support_Performance_Last30Days_[DATE].xlsx` (if using "Last Month")
- `IT_Support_Performance_Custom_2025-10-01_to_2025-11-14.xlsx` (if custom)
- `IT_Support_Performance_CurrentYear_[DATE].xlsx` (if 2025 year export)

### Date Handling in Sheets

**Every numeric date** in export should be formatted as:
- Format: `YYYY-MM-DD`
- Example: `2025-11-14`
- Time component: Not shown (date only)

**Time Period Metadata** (in Dashboard Summary and Metadata sheet):
```
Time Period: Last 7 Days
Filter Start Date: 2025-11-07
Filter End Date: 2025-11-14
```

---

## Alert Sheets Specification

### Alert Sheet Overview

Each alert type gets a dedicated sheet with:
1. Summary row at top with counts
2. Alert-specific columns tailored to detection logic
3. Color-coded background (red for critical, yellow for warning)
4. Sortable data with relevant metrics
5. Actionable information for team response

### Critical Alerts (Red Sheets)

#### Alert 1: Orphaned Tickets

**Definition**: Tickets with no assignment (assigned_to is null/empty)

**Summary Data**:
- Total Count
- Count of P5/P6 (highest priority)
- Oldest orphaned ticket
- Age range (newest to oldest)

**Table Columns**:
- Ticket ID (sortable)
- Title
- Created (date)
- Days Open (calculated)
- Priority (P5, P6, P7, P8)
- Description / Summary
- Current Status

**Sheet Formatting**:
- Header: Red background (RGB 192,0,0), white text, bold
- Background: Light red tint (RGB 255,230,230)
- Priority P5/P6: Bold red text
- Days Open > 7: Red cell background

**Sorting Default**: By Days Open descending (oldest first)

**Action Suggested** (in metadata): "Assign these tickets to team members"

---

#### Alert 2: Stagnant Tickets

**Definition**: Unresolved tickets with no updates for 3+ consecutive days

**Summary Data**:
- Total Count
- Count > 7 days stagnant
- Count > 14 days stagnant
- Oldest stagnation (days)

**Table Columns**:
- Ticket ID
- Title
- Created (date)
- Last Updated (date)
- Days Since Last Update
- Priority
- Assigned To
- Current Status
- Days Stagnant

**Sheet Formatting**:
- Header: Red background (RGB 192,0,0), white text, bold
- Background: Light red tint
- Days Since Update > 7: Red cell
- Days Since Update 3-7: Yellow cell
- Days Stagnant column: Right-aligned, red if > 7 days

**Sorting Default**: By Days Since Last Update ascending (oldest updates first)

**Action Suggested**: "Update progress or reassign these stalled tickets"

---

#### Alert 3: Expired High Priority

**Definition**: P5 or P6 tickets past their SLA deadline

**Summary Data**:
- Total Count
- P5 Overdue Count
- P6 Overdue Count
- Maximum Overdue (hours or days)

**Table Columns**:
- Ticket ID
- Title
- Created (date)
- Priority (P5, P6 only)
- SLA Hours (threshold: 4 for P5, 8 for P6)
- Actual Hours (time from creation to now)
- Hours Overdue (Actual - SLA, if positive)
- Days Overdue (calculated)
- Assigned To
- Status

**Sheet Formatting**:
- Header: Red background, white text, bold
- Background: Light red tint
- Hours/Days Overdue: Bold red text
- Overdue > 24 hours: Dark red row background
- Priority P5: Extra bold highlighting

**Sorting Default**: By Days Overdue descending (most overdue first)

**Action Suggested**: "Escalate these breached SLAs immediately"

---

### Warning Alerts (Yellow Sheets)

#### Alert 4: Suspicious Closures

**Definition**: Tickets closed in less than 1 hour (60 minutes)

**Summary Data**:
- Total Count
- Count < 5 minutes
- Count < 15 minutes
- Count 15-60 minutes
- Average close time (minutes)

**Table Columns**:
- Ticket ID
- Title
- Created (date & time if available)
- Closed (date & time if available)
- Time to Close (minutes)
- Assigned To
- Closed By (user who closed)
- Description / Summary

**Sheet Formatting**:
- Header: Yellow background (RGB 255,192,0), black text, bold
- Background: Light yellow tint (RGB 255,255,200)
- Time to Close < 5 min: Orange cell background
- Time to Close < 15 min: Bold orange text
- Row background alternates: white / very light yellow

**Sorting Default**: By Time to Close ascending (fastest closures first)

**Action Suggested**: "Review these tickets for premature closure without resolution"

---

#### Alert 5: Unworked Tickets

**Definition**: Assigned tickets with zero activity since assignment

**Summary Data**:
- Total Count
- Count > 7 days unworked
- Count > 14 days unworked
- Oldest unworked (days)

**Table Columns**:
- Ticket ID
- Title
- Created (date)
- Assigned (date)
- Days Since Assignment
- Assigned To
- Priority
- Current Status
- Last Activity (or "Never worked")

**Sheet Formatting**:
- Header: Yellow background, black text, bold
- Background: Light yellow tint
- Days Since Assignment > 14: Red cell
- Days Since Assignment > 7: Yellow cell
- "Never worked" text: Bold red

**Sorting Default**: By Days Since Assignment descending (longest unworked first)

**Action Suggested**: "Follow up with assigned team members on these unstarted tickets"

---

## Team Analysis & Operator Metrics

### Team Analysis Sheet Content

**Main Metrics Table**:

| Team Member | Assigned Count | Resolved Count | Avg Resolution Hours | Tickets in Delay | Delay % | Utilization % |
|:---|---:|---:|---:|---:|---:|---:|
| [Name] | [int] | [int] | [decimal] | [int] | [%] | [%] |

**Column Definitions**:

1. **Team Member**: Unique identifier or full name from assignment records
   - Sortable: Yes, default sort ascending (A-Z)
   - Width: 25% of table

2. **Assigned Count**: Total tickets assigned to this person in the time period
   - Calculation: COUNT(tickets WHERE assigned_to == person AND created_at in period)
   - Format: Integer (right-aligned)
   - Validation: Should match sum of other person's work

3. **Resolved Count**: Tickets completely resolved (status = "resolved" OR "closed")
   - Calculation: COUNT(tickets WHERE assigned_to == person AND (resolved_at OR closed_at) in period)
   - Format: Integer (right-aligned)
   - Note: Must be <= Assigned Count (if not, data integrity issue)

4. **Avg Resolution Hours**: Average hours from creation to resolution for this person
   - Calculation: SUM(hours to resolve) / Resolved Count
   - Format: Decimal, 1 place (e.g., 18.5 hours)
   - Note: Only includes resolved tickets in this person's queue

5. **Tickets in Delay**: Count of tickets exceeding SLA threshold
   - Calculation: For each ticket assigned to person:
     - If (resolution_time > sla_threshold): count += 1
     - SLA by priority: P5=4hrs, P6=8hrs, P7=24hrs, P8=72hrs
   - Format: Integer (right-aligned)
   - Note: For unresolved tickets, use current time instead of resolution time

6. **Delay %**: Percentage of assigned tickets violating SLA
   - Calculation: (Tickets in Delay / Assigned Count) * 100
   - Format: Decimal, 1 place with % symbol (e.g., 15.3%)
   - Conditional color: Red if > 20%, Yellow if 10-20%, Green if < 10%

7. **Utilization %**: Percentage of available time allocated to work
   - Calculation: (Total Hours Assigned in Estimates / Available Hours) * 100
   - OR: (Total Hours Resolved / Available Hours) * 100
   - Format: Decimal, 1 place with % symbol
   - Note: If not tracking available hours, can be marked as "N/A"

**Row Sorting**:
- Primary: Resolved Count (descending) - highest performers first
- If tied: Avg Resolution Hours (ascending) - faster resolvers first
- Display: Frozen header row

**Formatting Rules**:
- Header row: Dark background (RGB 51,51,51), white bold text, 12pt
- Data rows: Alternating white and light gray (RGB 245,245,245)
- Team Member name: Bold, left-aligned
- Numeric columns: Right-aligned, monospace font
- Delay % column:
  - Red (RGB 255,200,200) if > 20%
  - Yellow (RGB 255,255,200) if 10-20%
  - Green (RGB 200,255,200) if < 10%
- Utilization % column:
  - Red if > 100% (over-allocated)
  - Yellow if 80-100% (high utilization)
  - Green if < 80% (comfortable capacity)

### Priority Breakdown Table (Below Main Table)

| Team Member | P5 Count | P6 Count | P7 Count | P8 Count | High Priority % |
|:---|---:|---:|---:|---:|---:|
| [Name] | [int] | [int] | [int] | [int] | [%] |

**Columns**:
- P5 Count: Assigned tickets with priority P5 in period
- P6 Count: Assigned tickets with priority P6 in period
- P7 Count: Assigned tickets with priority P7 in period
- P8 Count: Assigned tickets with priority P8 in period
- High Priority %: (P5 Count + P6 Count) / Assigned Count * 100

**Formatting**:
- Header: Gray background, bold
- P5/P6 columns: Bold red text for values > 0
- High Priority % column: Right-aligned, percentage format

### Individual Team Member Cards (Optional, Additional Sheet)

If space permits in main sheet, or as separate detailed sheet:

**Per Person Detail** (optional section):
- Team Member Name
- Total Assigned: [count]
- Resolved: [count]
- Resolution Rate: [%]
- Avg Time to Resolve: [hours]
- Best Category (fastest resolution): [type]
- Needs Attention: [issue if SLA delays > 20%]

---

## Full List Sheets

### Sheet 12a: Full Backlog List

**Purpose**: Complete, sortable list of all unresolved tickets

**Columns** (in order):
1. **Ticket ID** - System identifier (sortable)
2. **Title** - Ticket subject/description (wrap text, wide)
3. **Created** - Creation date (YYYY-MM-DD format)
4. **Days Open** - Calculated (today - created)
5. **Priority** - P5, P6, P7, P8 (sortable)
6. **Assigned To** - Team member name or ID (sortable)
7. **Status** - Current state (Open, In Progress, On Hold, etc.) (sortable)
8. **Last Updated** - Most recent activity date (YYYY-MM-DD)
9. **Days Since Update** - Calculated (today - last_updated)
10. **Time in Delay (hrs)** - Hours over SLA if applicable
11. **Notes** - Additional context

**Data Scope**:
- All tickets with status != "Resolved" AND != "Closed"
- Includes: New, Open, In Progress, On Hold, Reopened, Waiting
- Excludes: Archived, Deleted

**Filtering**:
- AutoFilter enabled on all columns
- User can sort/filter in Excel after export

**Default Sort**:
- Primary: Priority (P5, P6, P7, P8)
- Secondary: Days Open (descending, oldest first)
- Tertiary: Last Updated (ascending, oldest updates first)

**Formatting**:
- Header: Dark gray background (RGB 51,51,51), white bold, 11pt
- Data rows: Alternating white / light gray
- Frozen header row for scrolling
- Auto-fit column widths (except Title, set to 45% width)
- Title column: Wrap text enabled
- Date columns (Created, Last Updated): Format `YYYY-MM-DD`
- Days columns (Days Open, Days Since Update): Right-aligned, integer
- Priority column: Center-aligned, bold if P5/P6
- Status column: Center-aligned
- Time in Delay: Right-aligned, only show if > 0

**Conditional Highlighting**:
- Days Open > 30: Light red background
- Days Open 14-30: Light yellow background
- Days Since Update > 7: Orange text
- Priority P5: Pink row tint
- Priority P6: Orange row tint
- Time in Delay > 0: Red text

**Row Count**: All rows exported (no limit)

---

### Full List Sheets (Alert Details)

The sheets "Alert: Orphaned Tickets", "Alert: Stagnant Tickets", etc. contain detailed ticket lists per alert type. See respective alert sections above for column specifications.

---

## File Naming, Metadata & Timestamps

### File Naming Convention

**Pattern**: `IT_Support_Performance_[PERIOD]_[DATE].xlsx`

**Examples**:

1. **All Time**:
   - `IT_Support_Performance_AllTime_2025-11-14.xlsx`

2. **Last 7 Days**:
   - `IT_Support_Performance_Last7Days_2025-11-14.xlsx`

3. **Last Month**:
   - `IT_Support_Performance_Last30Days_2025-11-14.xlsx`

4. **Last 3 Months**:
   - `IT_Support_Performance_Last90Days_2025-11-14.xlsx`

5. **Last 6 Months**:
   - `IT_Support_Performance_Last180Days_2025-11-14.xlsx`

6. **Current Year**:
   - `IT_Support_Performance_CurrentYear_2025-11-14.xlsx`

7. **Custom Range**:
   - `IT_Support_Performance_Custom_2025-10-01_to_2025-11-14.xlsx`

**Date Format**: `YYYY-MM-DD` (ISO 8601)

### File Metadata

**Metadata Sheet Content** (Sheet 13):

```
EXPORT INFORMATION
==================
Export Date: 2025-11-14T14:30:45Z
Export Timestamp: 2025-11-14 at 2:30 PM
Exported By: [Current User / System]
Data Snapshot: As of 2025-11-14 at time of export

TIME PERIOD FILTER
==================
Filter Selected: Last 7 Days
Period Start Date: 2025-11-07
Period End Date: 2025-11-14
Period Description: 7-day rolling window

INCLUDED METRICS
================
Unified Tickets: ✓ Included
Average Resolution Time: ✓ Included
Resolution Rate: ✓ Included
Current Backlog: ✓ Included (current snapshot, not filtered)
Team Analysis: ✓ Included (with period filter)
Critical Alerts (3 types): ✓ Included
Warning Alerts (2 types): ✓ Included
Full Backlog List: ✓ Included (all current unresolved)

CALCULATION PARAMETERS
======================
Average Resolution Time Calculation: (resolved_at - created_at) in hours
Resolution Rate Formula: (resolved_count + closed_count) / total_count * 100
SLA Thresholds Used:
  - P5: 4 hours
  - P6: 8 hours
  - P7: 24 hours
  - P8: 72 hours

Team Metrics Calculation:
  - Assigned Count: Tickets assigned to person in period
  - Resolved Count: Tickets resolved by person in period
  - Avg Resolution Time: SUM(hours) / resolved_count
  - Delay Percentage: (tickets exceeding SLA / assigned count) * 100

Stagnant Definition: No updates for 3+ consecutive days
Suspicious Closure Definition: Closed in < 60 minutes
Unworked Definition: Assigned but no activity since assignment
Backlog Definition: All unresolved tickets as of snapshot time

TIME ZONE: UTC (all dates in UTC, local time differences not accounted)
```

**Excel File Properties** (Document Properties):

- **Title**: `IT Support Performance Report - [Period]`
- **Subject**: `IT Support Team Performance Dashboard Export`
- **Author**: `Software Estimation Manager`
- **Keywords**: `IT Support, Tickets, Performance, Dashboard, Report`
- **Comments**: `Exported from Ticket Dashboard with filter: [Period], Data as of [Date]`
- **Last Modified By**: `System`
- **Created**: [Export timestamp]

### Timestamp Handling

**Export Timestamp**:
- Format: `YYYY-MM-DD HH:MM:SS` (or ISO 8601 with T and Z)
- Example: `2025-11-14T14:30:45Z`
- Used in: Filename (date part only), Metadata sheet, File properties

**Data Snapshot Timestamp**:
- Represents when the data was captured
- Typically same as export timestamp
- Included in Metadata sheet
- Used for audit trail and data freshness

**All Dates in Sheets**:
- Format: `YYYY-MM-DD` (date only, no time)
- Time zone: UTC (as stored in system)
- Examples: `2025-11-14`, `2025-10-15`

**Relative Dates in Sheets**:
- "Days Open", "Days Since Update", "Days Overdue" calculated from snapshot date
- Example: If exported 2025-11-14 and ticket created 2025-11-07, Days Open = 7

---

## Color & Conditional Formatting Rules

### Color Palette

**Brand Colors**:
- Primary Dark: RGB 51, 51, 51 (headers)
- Primary Light: RGB 245, 245, 245 (alternating rows)

**Alert Colors**:
- Critical Red: RGB 192, 0, 0 (header), RGB 255, 230, 230 (background)
- Warning Yellow: RGB 255, 192, 0 (header), RGB 255, 255, 200 (background)
- Info Blue: RGB 0, 102, 204 (not heavily used)

**Status Colors**:
- Success Green: RGB 0, 176, 80
- Danger Red: RGB 255, 0, 0
- Caution Yellow: RGB 255, 192, 0
- Neutral Gray: RGB 200, 200, 200

**Data Highlighting**:
- Over-threshold Red: RGB 255, 200, 200
- Warning Yellow: RGB 255, 255, 200
- Good Green: RGB 200, 255, 200
- Neutral White: RGB 255, 255, 255
- Alternating Row: RGB 245, 245, 245

### Sheet-Specific Conditional Formatting

#### Dashboard Summary Sheet
- Status column:
  - "OK" / "Green" status: Green background (RGB 200, 255, 200)
  - "Warning" / "Yellow" status: Yellow background (RGB 255, 255, 200)
  - "Critical" / "Red" status: Red background (RGB 255, 200, 200)
- Metric values with exceeding thresholds: Bold red text

#### Unified Tickets Sheet
- Count numbers right-aligned, bold

#### Resolution Metrics Sheet
- All numeric values: Right-aligned
- Section headers: 12pt bold, light gray background (RGB 220, 220, 220)

#### Resolution Rate Sheet
- By Priority table: Alternating row colors (white, light gray)
- Resolution Rate % for P5/P6: Red text if < 80%
- Resolution Rate % for P7/P8: Yellow text if < 90%

#### Backlog Sheet
- Days Open > 30: Red background (RGB 255, 200, 200)
- Days Open 14-30: Yellow background (RGB 255, 255, 200)
- Priority P5/P6 rows: Pink tint background (RGB 255, 230, 230)

#### Team Analysis Sheet
- Delay % column:
  - > 20%: Red background (RGB 255, 200, 200)
  - 10-20%: Yellow background (RGB 255, 255, 200)
  - < 10%: Green background (RGB 200, 255, 200)
- Utilization % column:
  - > 100%: Red background (RGB 255, 200, 200)
  - 80-100%: Yellow background (RGB 255, 255, 200)
  - < 80%: Green background (RGB 200, 255, 200)
- Row background: Alternating white / light gray
- Team Member names: Bold

#### Alert Sheets (Orphaned, Stagnant, Expired High Priority)
- Sheet background: Light red tint (RGB 255, 230, 230)
- Header: Red background (RGB 192, 0, 0), white text, bold
- Days Open / Days Stagnant / Days Overdue > 7: Red cell background
- Priority P5/P6: Bold red text
- Rows with severe conditions: Darker red background (RGB 255, 200, 200)

#### Alert Sheets (Suspicious Closures, Unworked)
- Sheet background: Light yellow tint (RGB 255, 255, 200)
- Header: Yellow background (RGB 255, 192, 0), black text, bold
- Time to Close < 5 min: Orange cell background (RGB 255, 200, 100)
- Days Unworked > 14: Red cell background
- Days Unworked > 7: Yellow cell background
- Row alternation: White / very light yellow (RGB 255, 255, 240)

#### Full Backlog List Sheet
- Header: Dark gray background (RGB 51, 51, 51), white bold text
- Data rows: Alternating white / light gray
- Days Open > 30: Light red background
- Days Open 14-30: Light yellow background
- Days Since Update > 7: Orange text
- Priority P5 rows: Pink tint background
- Priority P6 rows: Orange tint background
- Time in Delay > 0: Red text

### Conditional Formatting Rules Summary

| Condition | Cell/Range | Format |
|:---|:---|:---|
| Days Open > 30 | Days Open column (backlog) | Red background |
| Days Open 14-30 | Days Open column (backlog) | Yellow background |
| Days Since Update > 7 | Days Since Update (backlog, alerts) | Orange text |
| Priority P5 | Priority column (all sheets) | Bold, red text |
| Priority P6 | Priority column (all sheets) | Bold, orange text |
| Delay % > 20% | Delay % column (team analysis) | Red background |
| Delay % 10-20% | Delay % column (team analysis) | Yellow background |
| Delay % < 10% | Delay % column (team analysis) | Green background |
| Resolution Rate < 80% (P5/P6) | Rate % column (resolution rate) | Red text |
| Resolution Rate < 90% (P7/P8) | Rate % column (resolution rate) | Yellow text |
| Time in Delay > 0 | Time in Delay column | Red text |
| Status = P5 (alert sheets) | Entire row (critical alerts) | Red header + light red background |
| Status = Warning (alert sheets) | Entire row (warning alerts) | Yellow header + light yellow background |
| Assigned = Null (orphaned alert) | Entire row | Red tint + highlight |

---

## Number Formatting Standards

### General Formatting Rules

**Integer Numbers**:
- No decimal places
- Thousands separator: Yes (comma for 1000+)
- Example: `1,250` `847` `15`
- Alignment: Right-aligned

**Decimal Numbers**:
- Default: 1 decimal place (e.g., `18.5`)
- Hours/Time: 1-2 decimal places (e.g., `18.5 hours`, `4.25 hours`)
- Percentages: 1 decimal place (e.g., `73.2%`)
- Alignment: Right-aligned

**Percentages**:
- Format: `[value]%` (e.g., `73.2%`, `15.0%`)
- Decimal places: 1
- No space between number and % symbol
- Alignment: Right-aligned

**Currency** (if applicable):
- Not used in this export (no currency fields)

**Dates**:
- Format: `YYYY-MM-DD` (ISO 8601)
- Examples: `2025-11-14`, `2025-01-01`
- No weekday or full month name
- Alignment: Left-aligned

**Time Values** (hours, minutes):
- Hours: `[decimal] hours` (e.g., `18.5 hours`, `4 hours`)
- Minutes: `[integer] min` (e.g., `45 min`, `120 min`)
- Alignment: Right-aligned

### Column-Specific Formatting

| Column | Format | Decimal Places | Example |
|:---|:---|:---|:---|
| Count / Integer | Number with thousands | 0 | 1,250 |
| Percentage | Percentage | 1 | 73.2% |
| Hours / Time | Decimal | 1-2 | 18.5 hours |
| Minutes | Integer | 0 | 45 min |
| Days | Integer | 0 | 7 |
| Created / Updated | Date | - | 2025-11-14 |
| Ticket ID | Text | - | TICKET-12345 |
| Team Member | Text | - | John Smith |
| Title | Text | - | [full text] |
| Priority | Text (P5-P8) | - | P5 |
| Status | Text | - | Open |

---

## Technical Implementation Approach

### Export Flow

```
1. User clicks "Export Report" button in Ticket Dashboard sidebar
   └─> TicketDashboard.tsx handles click

2. System determines current time filter settings
   └─> Retrieve from store: selectedPeriod, startDate, endDate

3. Invoke export action: TicketDashboardActions.exportToExcel(timeFilter)
   └─> Calls new method exportReportToExcel()

4. Gather data from dashboard state
   └─> Retrieve all KPIs and metrics using existing calculations
   └─> Use applyTimeFilter() logic for filtered data
   └─> Collect backlog and alert lists

5. Create Excel workbook
   └─> Use xlsx library (already installed, ^0.18.5)
   └─> Create 13 sheets with headers and formatting

6. Add data to each sheet
   └─> Summary sheet: KPI overview
   └─> Metric sheets: Detailed breakdowns
   └─> Alert sheets: Ticket lists with color coding
   └─> Backlog sheet: Full unresolved list
   └─> Metadata sheet: Filter parameters

7. Apply formatting
   └─> Headers: Dark background, bold, white text
   └─> Rows: Alternating colors
   └─> Conditional formatting: Colors per rules above
   └─> Number formats: Decimals, percentages, dates
   └─> Freeze panes: Header rows

8. Generate filename
   └─> IT_Support_Performance_[PERIOD]_[DATE].xlsx
   └─> Determine PERIOD from timeFilter settings

9. Write file to disk
   └─> Use Electron API for file system access
   └─> Use data-manager.js pattern (Blob + save-as)
   └─> Default location: User's Downloads folder

10. Show success message to user
    └─> "Report exported successfully"
    └─> Provide filename and location
    └─> Offer to open folder
```

### Code Structure

**Location**: `src/renderer/react/actions/TicketDashboardActions.ts`

**New Method**:
```typescript
exportReportToExcel(timeFilter?: TimeFilter): void {
  // 1. Get store and current state
  // 2. Calculate KPIs with time filter applied
  // 3. Gather alert data
  // 4. Create workbook
  // 5. Add sheets with data and formatting
  // 6. Generate filename
  // 7. Write file
  // 8. Show user feedback
}
```

**Helper Methods**:
```typescript
private createSummarySheet(workbook, metrics): void
private createUnifiedTicketsSheet(workbook, data): void
private createResolutionMetricsSheet(workbook, data): void
private createResolutionRateSheet(workbook, data): void
private createBacklogSheet(workbook, data): void
private createTeamAnalysisSheet(workbook, data): void
private createAlertSheet(workbook, alertType, data): void
private createMetadataSheet(workbook, timeFilter): void

private applyHeaderFormatting(sheet, headerRow): void
private applyConditionalFormatting(sheet, range, rule): void
private formatNumberColumn(sheet, columnIndex, format): void
private freezeHeaderRow(sheet): void
private generateFilename(timeFilter): string
private saveFileToDownloads(workbook, filename): void
```

### Library Usage

**xlsx Library** (^0.18.5):

```typescript
import XLSX from 'xlsx';

// Create workbook
const wb = XLSX.utils.book_new();

// Create sheet from data
const ws = XLSX.utils.aoa_to_sheet(dataArray);
XLSX.utils.book_append_sheet(wb, ws, "Sheet Name");

// Set column widths
ws['!cols'] = [
  { wch: 12 },  // Column A width
  { wch: 40 },  // Column B width
  // ... more columns
];

// Write file
XLSX.writeFile(wb, 'filename.xlsx');
```

**Electron File API**:
```typescript
import { ipcRenderer } from 'electron';

// Save file to Downloads
const filePath = await ipcRenderer.invoke('save-file', {
  filename: 'IT_Support_Performance_...xlsx',
  data: excelBuffer
});
```

---

## Dependencies & Libraries

### Already Installed

- **xlsx** (v0.18.5) - Excel read/write
  - Location: `node_modules/xlsx`
  - Used for: Creating workbooks, sheets, cell formatting
  - API: XLSX.utils (aoa_to_sheet, book_new, etc.)

- **Zustand** (v5.0.8) - State management
  - Location: `node_modules/zustand`
  - Used for: Accessing store state
  - API: `window.appStore.getState()`

- **electron** (v28.0.0) - Desktop framework
  - Used for: File system access via IPC
  - API: `ipcRenderer.invoke()` for file save

### No Additional Dependencies Required

The export feature uses only libraries already in the tech stack. No new npm packages need to be installed.

---

## API/Integration Points

### Integration with TicketDashboardActions

**Current State**: TicketDashboardActions.ts has all metric calculations

**Methods to Reference/Reuse**:
```typescript
// From TicketDashboardActions:
- applyTimeFilter(period, startDate, endDate): Updates store filter
- getUnifiedTicketsMetrics(): Returns total, open, closed counts
- getAverageResolutionTime(): Returns avg hours
- getResolutionRate(): Returns percentage
- getBacklogMetrics(): Returns unresolved count
- getTeamMemberMetrics(): Returns per-person breakdown
- getAlertCounts(): Returns critical/warning alert counts
```

**New Method to Create**:
```typescript
exportReportToExcel(timeFilter?: TimeFilter): void
  - Use existing metric calculation methods
  - Pass timeFilter to filter data appropriately
  - Create Excel workbook with all sheets
  - Handle file save operation
```

### Integration with Ticket Dashboard Store

**Store Properties to Access**:
- `store.currentProject?.tickets` - List of all tickets
- `store.timeFilter` - Currently selected time period
- `store.teamMembers` - List of team members
- `store.kpiData` - Any additional KPI data (if used)

**Store Methods to Call**:
- `store.getState()` - Get current state
- `store.markDirty()` - Mark for auto-save if export updates state

### Integration with Electron IPC

**Preload Script** (if needed):
```typescript
// In preload.js
contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (filename, data) =>
    ipcRenderer.invoke('save-file', { filename, data })
});
```

**Main Process** (in main.js):
```typescript
// Handle file save
ipcHandle('save-file', async (event, { filename, data }) => {
  const downloadsPath = app.getPath('downloads');
  const filePath = path.join(downloadsPath, filename);
  await fs.promises.writeFile(filePath, data);
  return filePath;
});
```

---

## Success Criteria & Acceptance Tests

### Functional Requirements Met

1. **Export Button Available**
   - [ ] "Export Report" button visible in Ticket Dashboard sidebar
   - [ ] Button is enabled when dashboard has data
   - [ ] Button is disabled when no tickets exist
   - [ ] Clicking button initiates export flow

2. **Excel File Generated**
   - [ ] File created with name format: `IT_Support_Performance_[PERIOD]_[DATE].xlsx`
   - [ ] File saved to user's Downloads folder
   - [ ] File size reasonable (< 5MB for typical data)
   - [ ] File opens successfully in Excel/LibreOffice/Google Sheets

3. **All Sheets Present**
   - [ ] Dashboard Summary sheet exists and contains all KPIs
   - [ ] Unified Tickets sheet with status breakdown
   - [ ] Resolution Metrics sheet with top performers
   - [ ] Resolution Rate sheet with percentage and by-priority
   - [ ] Backlog sheet with current unresolved tickets
   - [ ] Team Analysis sheet with per-operator metrics
   - [ ] 5 Alert sheets (Orphaned, Stagnant, Expired High Priority, Suspicious Closures, Unworked)
   - [ ] Full Backlog List sheet with all unresolved tickets
   - [ ] Metadata sheet with filter parameters
   - [ ] Total: 13 sheets

4. **Data Accuracy**
   - [ ] Unified Tickets counts match dashboard display
   - [ ] Resolution Rate calculation correct
   - [ ] Average resolution time calculated correctly
   - [ ] Backlog count matches current snapshot
   - [ ] Team Analysis metrics accurate per person
   - [ ] Alert counts match dashboard alerts
   - [ ] All monetary/numeric values displayed correctly

5. **Time Period Filtering**
   - [ ] All Time filter shows entire history
   - [ ] Last 7 Days shows correct date range
   - [ ] Last Month shows correct date range
   - [ ] Last 3 Months shows correct date range
   - [ ] Last 6 Months shows correct date range
   - [ ] Current Year shows Jan 1 - today
   - [ ] Custom Range respects user-selected dates
   - [ ] File naming reflects selected period
   - [ ] Metadata sheet shows correct filter parameters
   - [ ] Metrics apply filter appropriately

6. **Alert Sheets Accuracy**
   - [ ] Orphaned Tickets: Shows all tickets with no assignment
   - [ ] Stagnant Tickets: Shows tickets with no updates for 3+ days
   - [ ] Expired High Priority: Shows P5/P6 past SLA deadline
   - [ ] Suspicious Closures: Shows tickets closed in < 60 minutes
   - [ ] Unworked Tickets: Shows assigned but never worked on
   - [ ] Each alert sheet has correct count and details
   - [ ] Alert sheet data matches "FULL LIST" buttons in dashboard (if applicable)

7. **Formatting & Styling**
   - [ ] Headers have dark background with white text
   - [ ] Headers are bold and 12pt
   - [ ] Rows alternate between white and light gray background
   - [ ] Numbers right-aligned with appropriate decimals
   - [ ] Percentages formatted with % symbol
   - [ ] Dates formatted as YYYY-MM-DD
   - [ ] Thousands separators applied to large numbers
   - [ ] Freeze panes applied to header rows
   - [ ] Column widths auto-fit or set appropriately
   - [ ] Conditional coloring applied (red/yellow/green)

8. **Conditional Formatting**
   - [ ] Critical alerts have red header and light red background
   - [ ] Warning alerts have yellow header and light yellow background
   - [ ] Overdue SLA items highlighted in red
   - [ ] High delay % highlighted appropriately
   - [ ] Days columns colored by thresholds (> 30 = red, > 14 = yellow)
   - [ ] Priority P5/P6 bolded and colored in red/orange

9. **Metadata & Documentation**
   - [ ] Metadata sheet contains export timestamp
   - [ ] Time period filter documented
   - [ ] SLA thresholds documented
   - [ ] Calculation methods explained
   - [ ] Data snapshot date recorded
   - [ ] File properties set (title, author, keywords)

10. **User Experience**
    - [ ] Export completes in < 5 seconds for typical data
    - [ ] Success message shown to user after export
    - [ ] File location provided in message
    - [ ] Option to open Downloads folder
    - [ ] Error handling for file write failures
    - [ ] Loading indicator during export
    - [ ] No errors in browser console

### Acceptance Test Scenarios

#### Test 1: Basic Export All Time
```gherkin
Given the user has the Ticket Dashboard open
And the Time Period filter is set to "All Time"
And there are 50+ tickets with various statuses
When the user clicks the "Export Report" button
Then a file named "IT_Support_Performance_AllTime_[DATE].xlsx" is created
And the file is saved to Downloads folder
And Excel opens without errors
And all 13 sheets are present and populated
```

#### Test 2: Time Period - Last 7 Days
```gherkin
Given the user has the Ticket Dashboard open
And the Time Period filter is set to "Last 7 Days"
When the user clicks "Export Report"
Then file name contains "Last7Days"
And metrics include only tickets created in last 7 days
And filename metadata shows correct date range
And backlog shows current snapshot (not filtered)
```

#### Test 3: Time Period - Custom Range
```gherkin
Given the user has set a custom date range: Oct 1 - Nov 14, 2025
When the user clicks "Export Report"
Then filename is "IT_Support_Performance_Custom_2025-10-01_to_2025-11-14.xlsx"
And all metrics respect this date range
And metadata sheet documents the custom range
```

#### Test 4: Alert Data Accuracy
```gherkin
Given the Ticket Dashboard shows:
  - 3 Orphaned Tickets
  - 2 Stagnant Tickets
  - 1 Expired High Priority
  - 5 Suspicious Closures
  - 2 Unworked Tickets
When the user exports the report
Then each alert sheet contains exactly those tickets
And summaries at top of each sheet match counts
And ticket details (ID, title, dates) are accurate
```

#### Test 5: Team Analysis Metrics
```gherkin
Given a team member "John Smith" has:
  - 15 assigned tickets in period
  - 12 resolved tickets
  - Average resolution time of 18.5 hours
  - 2 tickets in SLA delay
When the user exports the report
Then Team Analysis sheet shows:
  - Assigned Count: 15
  - Resolved Count: 12
  - Avg Resolution Hours: 18.5
  - Tickets in Delay: 2
  - Delay %: 13.3%
```

#### Test 6: Conditional Formatting Applied
```gherkin
Given an exported Excel file
When opening the file in Excel
Then the following conditional formatting is visible:
  - Alert sheet headers are red/yellow per alert type
  - Days columns > 30 have red background
  - Days columns > 14 have yellow background
  - Delay % > 20% has red background
  - Priority P5/P6 text is bold and red
  - Unresolved tickets show in team analysis correctly
```

#### Test 7: Formatting Standards
```gherkin
Given an exported Excel file
When examining the data
Then:
  - Percentages are formatted as "73.2%" (1 decimal + % symbol)
  - Hours are shown as "18.5 hours" (1 decimal place)
  - Dates are "YYYY-MM-DD" format
  - Integers have thousands separators (1,250 not 1250)
  - All numeric columns are right-aligned
  - Headers are 12pt bold white on dark background
```

#### Test 8: Error Handling
```gherkin
Given the export process encounters an error
When the error occurs (file system issue, invalid data)
Then:
  - User sees error message with explanation
  - No partial/corrupted file is created
  - User can retry export
  - Error is logged for debugging
```

#### Test 9: Performance
```gherkin
Given a large dataset with:
  - 500 tickets
  - 20 team members
  - 6 months of historical data
When the user clicks "Export Report"
Then:
  - Export completes in < 5 seconds
  - Excel file is < 3MB
  - No performance degradation in dashboard
  - UI remains responsive during export
```

#### Test 10: File Accessibility
```gherkin
Given an exported Excel file
When opening in different applications:
  - Microsoft Excel (Windows)
  - LibreOffice Calc
  - Google Sheets
  - Mac Numbers
Then:
  - File opens without corruption
  - All data is visible
  - Formatting is preserved (or reasonably compatible)
  - No warnings or error messages
```

---

## Summary

This comprehensive requirements document covers all aspects of the Export Report Excel feature for the IT Support Team Performance Dashboard. The feature provides professional-grade reporting with 13 worksheets, time-period filtering, conditional formatting, and detailed metric calculations.

**Key Deliverables**:
- Multi-sheet Excel workbook with summary and detailed metrics
- 5 dedicated alert sheets for critical/warning conditions
- Full backlog and ticket lists for detailed analysis
- Professional formatting with color coding and number formats
- Time period filtering with custom date range support
- Metadata documentation for audit trail
- Integration with existing Ticket Dashboard store and metrics

**Implementation Scope**: Add single `exportReportToExcel()` method to TicketDashboardActions with helper methods for each sheet. Use existing xlsx library and Electron APIs.

**Success Metric**: Export generates professional, accurate Excel reports in < 5 seconds with all data correctly calculated and formatted per specifications.
