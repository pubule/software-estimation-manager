# Specification: Export Report Excel - IT Support Team Performance Dashboard

## Goal

Enable IT Support Team Leads and Project Managers to export comprehensive performance metrics from the Ticket Dashboard into a professionally formatted 13-sheet Excel workbook that supports reporting, analysis, stakeholder communication, and archive retention. The export respects current time period filters and provides detailed metrics with conditional formatting and SLA threshold validation.

## User Stories

- As an IT Support Team Lead, I want to export my team's current performance metrics to Excel so that I can share them with executives and track performance trends over time.
- As a Project Manager, I want to export filtered ticket data with time period controls so that I can generate custom reports for different reporting periods and stakeholders.
- As a reporting stakeholder, I want to receive professionally formatted Excel reports with color-coded alerts and SLA metrics so that I can quickly identify performance issues and bottlenecks.

## Specific Requirements

**Excel File Generation and Structure**
- Generate 13-sheet Excel workbook with standardized naming: `IT_Support_Performance_[PERIOD]_[DATE].xlsx`
- Support all time period filters: All Time, Last 7 Days, Last Month (30 days), Last 3 Months (90 days), Last 6 Months (180 days), Current Year, Custom Range
- Apply custom date range format to filename: `IT_Support_Performance_Custom_YYYY-MM-DD_to_YYYY-MM-DD.xlsx`
- Save file to user's Downloads folder via Electron file system API
- Include Excel file properties: Title, Subject, Author, Keywords, Comments with export metadata
- Maintain file size under 5MB for typical datasets (500+ tickets, 20+ team members)

**Dashboard Summary Sheet (Sheet 1)**
- Display 14 KPI metrics on single-page overview: Total Tickets, Open Tickets, Closed Tickets, Resolution Rate (%), Average Resolution Time (hours), Current Backlog Count, Orphaned Tickets (critical), Stagnant Tickets (critical), Expired High Priority (critical), Suspicious Closures (warning), Unworked Tickets (warning), Top Team Member, Slowest Resolution Time, Fastest Resolution Time
- Apply conditional status coloring: Green (OK), Yellow (Warning), Red (Critical) in Status column
- Format header: Dark background (RGB 51,51,51), white text, bold, 14pt with 1.5 line height

**Data Accuracy and Time Filtering**
- Unified Tickets counts apply time filter to creation date only (not resolution date)
- Resolution Rate calculation: (Resolved + Closed) / Total Tickets * 100, filtered by creation date
- Average Resolution Time: Only resolved tickets in period, excluding tickets closed without resolution
- Current Backlog count always shows current snapshot regardless of time filter
- Alert counts and lists respect time period filter for detection dates
- Team Analysis metrics: Assigned Count filtered by creation date, Resolved Count filtered by resolution date
- SLA thresholds applied: P5=4 hours, P6=8 hours, P7=24 hours, P8=72 hours

**Metric Sheets (Sheets 2-6)**
- Unified Tickets: Status breakdown (Total, Open, Closed, In Progress) with percentages and open tickets by priority (P5-P8)
- Resolution Metrics: Part A (Aggregate: Avg, Median, Min, Max, StdDev), Part B (Top 3 Slowest by hours), Part C (Top 3 Fastest by hours), Part D (Top 3 within ±10% of mean)
- Resolution Rate: Overall percentage, by-priority breakdown table with red text for P5/P6 < 80%, yellow text for P7/P8 < 90%
- Backlog: Current unresolved count, oldest open ticket (days), plus top 10 oldest unresolved with details (ID, Title, Created, Days Open, Priority, Assigned To, Last Updated)
- Team Analysis: Per-operator table with Assigned Count, Resolved Count, Avg Resolution Hours (1 decimal), Tickets in Delay, Delay % (conditional color: red >20%, yellow 10-20%, green <10%), Utilization %; secondary table with P5-P8 count breakdown and High Priority %

**Alert Sheets (Sheets 7-11)**
- Orphaned Tickets (critical): Tickets with no assignment, red header (RGB 192,0,0), light red background (RGB 255,230,230), summary row at top with counts and age range
- Stagnant Tickets (critical): No updates for 3+ days, red formatting, summary shows total, >7 days stagnant count, oldest stagnation days
- Expired High Priority (critical): P5/P6 tickets past SLA deadline, red formatting, summary shows total, P5 overdue count, P6 overdue count, maximum overdue hours
- Suspicious Closures (warning): Closed in <60 minutes, yellow header (RGB 255,192,0), light yellow background (RGB 255,255,200), summary shows total, <5 min count, <15 min count, average close time
- Unworked Tickets (warning): Assigned but no activity since assignment, yellow formatting, summary shows total, >7 days unworked, >14 days unworked, oldest unworked days

**Full Backlog List (Sheet 12)**
- Complete list of all unresolved tickets: ID, Title, Created, Days Open, Priority, Assigned To, Status, Last Updated, Days Since Update, Time in Delay (hours), Notes
- Enable AutoFilter on all columns for user filtering/sorting in Excel
- Default sort: Primary by Priority (P5, P6, P7, P8), Secondary by Days Open (descending), Tertiary by Last Updated (ascending)
- Conditional coloring: Days Open >30 = red background, >14 = yellow background; Days Since Update >7 = orange text; P5 rows = pink tint, P6 rows = orange tint; Time in Delay >0 = red text
- Freeze header row for scrolling; auto-fit columns except Title (set to 45% width with text wrap)

**Metadata Sheet (Sheet 13)**
- Document export parameters: Export Date (ISO 8601), Export User, Data Snapshot Date, Time Period Filter, Filter Start/End Dates
- List included metrics with checkmarks
- Document calculation parameters: Average Resolution Time formula, Resolution Rate formula, SLA thresholds, Team metrics calculations, Stagnant/Suspicious/Unworked definitions
- Use key-value format with section headers (bold, 12pt), monospace font for values, no borders

**Number Formatting and Styling Standards**
- Integers: No decimals, thousands separators (1,250 not 1250), right-aligned
- Decimals: 1-2 places for hours (18.5 hours), 1 decimal for percentages (73.2%), right-aligned
- Dates: YYYY-MM-DD format only (no time component), left-aligned
- Hours: Display with "hours" suffix for clarity (e.g., "18.5 hours"), right-aligned
- Minutes: Integer format with "min" suffix (e.g., "45 min")
- All headers: Dark background (RGB 51,51,51 or RGB 192,0,0 for alerts), white text, bold, 11-14pt depending on sheet
- Alternating rows: White and light gray (RGB 245,245,245) for readability

**Conditional Formatting and Color Coding**
- Critical alert sheets: Red header (RGB 192,0,0), light red background (RGB 255,230,230)
- Warning alert sheets: Yellow header (RGB 255,192,0), light yellow background (RGB 255,255,200)
- Days columns: Red if >30 days, Yellow if 14-30 days, Orange text if >7 days since update
- Priority P5/P6: Bold red text in tables
- Resolution Rate: Red text if P5/P6 <80%, Yellow text if P7/P8 <90%
- Delay % column: Red background (RGB 255,200,200) >20%, Yellow (RGB 255,255,200) 10-20%, Green (RGB 200,255,200) <10%
- Utilization % column: Red >100%, Yellow 80-100%, Green <80%
- SLA overdue: Red text and dark red row background for violations >24 hours

**Integration with Dashboard UI and Existing Actions**
- Add "Export Report" button to Ticket Dashboard sidebar menu (alongside existing "Load CSV" button)
- Button enabled when dashboard has loaded ticket data, disabled when no tickets exist
- Show loading indicator during export (< 5 seconds for typical data)
- Display success/error feedback toast message with filename and Downloads folder link
- Reuse existing TicketDashboardActions methods: getFilteredTickets(), getAllUnresolvedTickets(), getOldestOpenTickets(), calculateMetrics(), getOperatorMetrics(), getDashboardAlerts()
- Pass current timeFilter from store state to all calculation functions
- Access store via: window.appStore.getState() for ticketData, timeFilter, dashboardMetrics, operatorMetrics, dashboardAlerts

**Technical Implementation Approach**
- Create new method `exportReportToExcel()` in TicketDashboardActions class
- Use xlsx library (v0.18.5) already installed: XLSX.utils.aoa_to_sheet(), book_new(), book_append_sheet(), writeFile()
- Implement helper methods for each sheet: createSummarySheet(), createUnifiedTicketsSheet(), createResolutionMetricsSheet(), createResolutionRateSheet(), createBacklogSheet(), createTeamAnalysisSheet(), createAlertSheet(), createMetadataSheet()
- Implement utility methods: applyHeaderFormatting(), applyConditionalFormatting(), formatNumberColumn(), freezeHeaderRow(), generateFilename(), saveFileToDownloads()
- Use Electron IPC: ipcRenderer.invoke('save-file', {filename, data}) to save file to Downloads via main process

**Export Data Flow**
- User clicks Export button → System retrieves timeFilter from store → Pass to exportReportToExcel() → Gather metrics using existing action methods with time filter applied → Create workbook and add 13 sheets → Apply all formatting rules → Generate filename with period and date → Save to Downloads → Show success message with file location

**Error Handling and Validation**
- Catch errors during metric calculations and prevent corrupted Excel generation
- Handle missing/invalid dates gracefully (use current date as fallback for snapshot date)
- Validate time filter values before applying to calculations
- Show user-friendly error messages for file system issues (permission denied, disk full, etc.)
- Prevent overwriting existing files by appending timestamp if filename already exists
- Log all errors to browser console for debugging
- Ensure no partial/incomplete Excel files are created on error

## Visual Design

The specification does not include visual mockups. The export feature follows the existing Ticket Dashboard dark theme (RGB 30,30,30 background) and applies professional Excel formatting as documented in the Color & Conditional Formatting section above. Color schemes are adapted from the dashboard's VSCode theme palette.

## Existing Code to Leverage

**TicketDashboardActions.ts (src/renderer/react/actions/TicketDashboardActions.ts)**
- Existing method `getFilteredTickets()` returns tickets matching current time filter - use directly for metric calculations
- Existing method `getAllUnresolvedTickets()` returns unfiltered current backlog - use for backlog sheet
- Existing method `getOldestOpenTickets(count)` returns sorted unresolved tickets - reuse for backlog details
- Existing method `calculateOperatorMetrics()` returns per-operator breakdown - extend with additional metrics for Team Analysis sheet
- Existing method `generateAlerts()` populates dashboardAlerts in store - reuse alert data directly for alert sheets

**TicketData and DashboardMetrics Interfaces (TicketDashboardActions.ts)**
- TicketData interface defines all ticket properties: number, opened_at, short_description, priority (P5-P8 only), state, assigned_to, resolved_at, sys_updated_on, calendar_stc
- DashboardMetrics interface includes: totalTickets, openTickets, closedTickets, resolutionRate, backlogCurrent, backlogTickets, resolutionTimeCategories (slowest/fastest/average)
- Reuse these interfaces for type safety in export methods

**Store State Access Pattern (app-store.js)**
- Existing pattern: `const store = window.appStore; const state = store.getState();`
- Access ticket data: `state.ticketData` (array of TicketData)
- Access metrics: `state.dashboardMetrics` (pre-calculated DashboardMetrics object)
- Access alerts: `state.dashboardAlerts` (array of Alert objects)
- Access filter: `state.timeFilter` (TimeFilter object with start, end, label, type)
- Apply same pattern in exportReportToExcel() for consistency with existing actions

**CSV Export Pattern (TicketDashboardActions.ts)**
- Existing method `exportFilteredData()` demonstrates file download pattern using Blob and createObjectURL
- Use Electron IPC instead of Blob for Excel binary format (more reliable for .xlsx files)
- Reuse `generateCsvContent()` helper pattern for structured data generation

**Time Filter Implementation (TicketDashboardActions.ts)**
- Existing `applyTimeFilter()` method creates TimeFilter objects with start/end dates
- Existing `createTimeFilter()` helper calculates date ranges for all preset periods
- Existing `getFilteredTickets()` filters data by comparing ticket.opened_at against timeFilter.start/end
- Reuse time filter logic; extract filter start/end dates for metadata sheet and filename

## Out of Scope

- Advanced analytics features: No charting, trendlines, pivot tables, or predictive analytics within exported Excel
- Real-time or live-updating Excel files: Static snapshot only at export time
- Multi-format exports: Excel (.xlsx) only, no PDF, CSV, or other formats in this feature
- Email distribution: No automatic email sending; users manually share exported files
- Cloud storage integration: Local filesystem only (Downloads folder), no Dropbox, Google Drive, OneDrive, or Teams
- Scheduled/automated reports: Manual export only, no scheduled recurring exports
- Custom report builder: Fixed report structure only, no user-defined templates or custom sheet layouts
- Interactive Excel features: No drill-down hyperlinks, no pivot table interactivity, no formula-based updates
- Workbook protection: No password encryption, no cell-level protection, open format
- Historical comparison: No side-by-side multi-export comparison features, no version history tracking
- Custom calculations in Excel: All data pre-calculated during export, no formulas left in cells for user modification
- Multi-language support: English language only, localization out of scope
- Performance optimization for >1000 tickets: Acceptable performance baseline <5 seconds for datasets up to 500 tickets

## Success Criteria

**Feature Completeness**
- Export button visible and functional in Ticket Dashboard sidebar
- All 13 sheets generated with correct names and content
- File naming follows convention with correct time period and export date
- File saves to user's Downloads folder successfully
- File opens in Excel, LibreOffice, Google Sheets without corruption
- All dashboard metrics accurately reflected in export

**Data Accuracy**
- Unified Tickets counts match dashboard display
- Resolution Rate calculation matches dashboard percentage
- Average Resolution Time matches dashboard hours display
- Team member metrics match Team Analysis tab table
- Alert counts match dashboard alert card counts
- SLA threshold validation correct for P5-P8 priorities

**Time Period Filtering**
- All Time export shows entire ticket history
- Last 7/30/90/180 days exports show correct date ranges
- Custom Range export respects user-selected start and end dates
- Filename reflects selected period
- Metadata sheet documents filter parameters accurately
- Metrics calculations apply/exclude filter appropriately per requirements

**Formatting and Styling**
- Headers have dark background (RGB 51,51,51) with white bold text
- Alert sheet headers have red/yellow background per alert type
- Numbers formatted with correct decimal places, thousands separators, and alignment
- Percentages show with % symbol (e.g., 73.2%)
- Dates formatted as YYYY-MM-DD
- Freeze panes applied to header rows
- Column widths auto-fitted or manually set appropriately
- Conditional coloring applied to Days columns, Delay %, Utilization %, Priority fields

**User Experience**
- Export completes in < 5 seconds for typical datasets
- Success message shown with filename and folder location
- Option to open Downloads folder provided
- Loading indicator displayed during export
- Error messages clear and actionable
- No browser console errors or warnings
- Button state changes appropriately (disabled when no data, enabled with data)

**Acceptance Test Scenarios**
- Test 1: All Time export with 50+ tickets generates all 13 sheets
- Test 2: Last 7 Days export respects 7-day date range
- Test 3: Custom range export with Oct 1 - Nov 14 dates matches range
- Test 4: Alert counts in export match dashboard alert cards
- Test 5: Team Analysis metrics match operator table percentages
- Test 6: Conditional formatting colors visible in Excel (red/yellow/green backgrounds)
- Test 7: Number formatting correct (decimals, %, thousands separators)
- Test 8: File opens without errors in Excel, LibreOffice, Google Sheets
- Test 9: Large dataset (500 tickets) exports in < 5 seconds
- Test 10: Error handling: graceful failure when file system access denied

## Integration Points

**Integration with TicketDashboardActions**
- Call existing methods: getFilteredTickets(), getAllUnresolvedTickets(), calculateOperatorMetrics()
- Reuse calculation logic for: Average Resolution Time, Resolution Rate, Days Open, SLA Delay calculations
- Access store state through: window.appStore.getState() pattern
- Mark as dirty after export: state.markDirty() if export updates any state

**Integration with Ticket Dashboard Component (TicketDashboard.tsx)**
- Add Export Report button to page-actions div alongside existing Export button
- Button triggers: actions.exportReportToExcel() on click
- Disable button if: ticketData.length === 0 or !dashboardMetrics
- Show loading state during export
- Display result toast/notification after export completes

**Integration with Zustand Store**
- Read access to: state.ticketData, state.timeFilter, state.dashboardMetrics, state.operatorMetrics, state.dashboardAlerts
- No write operations required during export (read-only operation)
- Use existing store selectors: useStore() hook pattern for consistency

**Integration with Electron**
- Use IPC: ipcRenderer.invoke('save-file', {filename, data}) for file system access
- Main process handler must create/update: ipcHandle('save-file', async (event, {filename, data}) => {...})
- Default save path: app.getPath('downloads')
- Handle errors: Permission denied, disk full, invalid filename characters

## Testing Strategy

**Unit Tests (Cucumber/BDD)**
- Test each calculation method in isolation: average resolution time, resolution rate, delay calculation, etc.
- Test time filter application: verify data filtered correctly for each period type
- Test data organization methods: ensure tickets sorted, grouped, summarized correctly for each sheet
- Test formatting application: verify colors, fonts, number formats applied to correct cells

**Integration Tests**
- Test complete export flow: button click → export action → file creation → user notification
- Test with real store data: export current dashboard state to Excel and verify results
- Test time period integration: apply filter, export, verify filtered data in Excel
- Test alert data consistency: compare dashboard alerts with export alert sheets

**End-to-End Scenarios**
- Export All Time with various data volumes (10, 50, 500 tickets)
- Export each time period filter type (7 day, month, custom, etc.)
- Export with no alerts (verify empty alert sheets handled)
- Export with mixed priority tickets and verify color coding
- Verify file opens correctly in multiple applications

**Data Validation Tests**
- Verify counts match: dashboard cards vs export summary sheet
- Verify percentages: dashboard metrics vs export calculations
- Verify operator metrics: dashboard table vs export Team Analysis sheet
- Verify alert lists: dashboard cards vs export alert sheets

**Performance Tests**
- Measure export time: 50 tickets (should be <2s), 500 tickets (should be <5s)
- Verify file size: confirm under 5MB for typical datasets
- Monitor memory usage: ensure no memory leaks during/after export
- Test concurrent exports: handle multiple rapid export clicks gracefully

## Success Metrics

**Delivery Success**
- Feature implemented in single sprint (1-2 weeks)
- All 13 sheets generated with correct data and formatting
- Export button integrated into existing dashboard UI
- File successfully saves to Downloads folder
- No regressions in existing dashboard functionality

**Quality Success**
- All acceptance test scenarios pass
- Data accuracy verified against dashboard display
- Formatting matches specification (colors, fonts, number formats)
- Performance target met: < 5 seconds for 500 tickets
- No critical bugs or console errors

**User Success**
- Users can export performance reports with one click
- Exported Excel files are professional and shareable with executives
- Time period filters work correctly in export
- Alert sheets provide actionable insights for team leads
- No user complaints about export accuracy or formatting
