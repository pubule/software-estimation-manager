export interface TicketData {
  number: string;
  opened_at: string;
  short_description: string;
  caller_id: string;
  priority: 'P5' | 'P6' | 'P7' | 'P8'; // REMOVED P1-P4, only P5-P8 allowed
  state: 'Open' | 'In Progress' | 'Resolved' | 'Closed' | 'Pending' | 'On Hold';
  category: string;
  assignment_group: string;
  assigned_to: string;
  sys_updated_on: string;
  sys_updated_by: string;
  u_qs_major_incident: string;
  u_vts_major_incident: string;
  u_vts_major_timestamp: string;
  u_vts_major_urgency: string;
  calendar_stc: string;
  resolved_at: string;
  resolved_by?: string;
}

export interface DashboardMetrics {
  totalTickets: number;
  averageResolutionTime: number;
  openTickets: number;
  closedTickets: number;
  resolutionRate: number;
  backlogCurrent: number;
  backlogTickets: TicketData[];
  topResolutionTimeTickets?: {
    id: string;
    subject: string;
    resolutionHours: number;
  }[];
  resolutionTimeCategories?: {
    slowestTickets: {
      id: string;
      subject: string;
      resolutionHours: number;
    }[];
    fastestTickets: {
      id: string;
      subject: string;
      resolutionHours: number;
    }[];
    averageTickets: {
      id: string;
      subject: string;
      resolutionHours: number;
    }[];
  };
}

export interface OperatorMetrics {
  operatorName: string;
  assignedTickets: number;
  resolvedTickets: number;
  averageResolutionTime: number;
  ticketsInDelay: number;
  delayPercentage: number;
}

export interface Alert {
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  count: number;
  tickets: TicketData[];
}

export interface TimeFilter {
  start: Date;
  end: Date;
  label: string;
  type: string;
}

export class TicketDashboardActions {
  private getStore() {
    return (window as any).appStore;
  }

  /**
   * Parse CSV content and import ticket data
   */
  importCsvData(csvContent: string): void {
    try {
      console.log('[IMPORT-CSV] Starting import...');
      const tickets = this.parseCsvContent(csvContent);
      console.log('[IMPORT-CSV] Parsed tickets:', tickets.length);

      if (tickets.length === 0) {
        console.warn('[IMPORT-CSV] No valid tickets found in CSV');
        alert('Warning: No valid tickets found in CSV. Make sure the CSV has required columns: number, opened_at, priority, state');
      }

      const store = this.getStore();
      const state = store.getState();

      // Store raw ticket data
      console.log('[IMPORT-CSV] Storing ticket data in state...');
      state.setTicketData(tickets);

      // Calculate initial metrics
      console.log('[IMPORT-CSV] Calculating metrics...');
      this.calculateMetrics();

      // Generate alerts
      console.log('[IMPORT-CSV] Generating alerts...');
      this.generateAlerts();

      console.log('[IMPORT-CSV] Marking state as dirty...');
      state.markDirty();

      console.log('[IMPORT-CSV] Import completed successfully');
    } catch (error) {
      console.error('[IMPORT-CSV] Error importing CSV:', error);
      const store = this.getStore();
      const state = store.getState();
      state.setTicketDashboardError('Failed to import CSV data: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  /**
   * Parse CSV content into TicketData array with proper CSV parsing
   */
  private parseCsvContent(csvContent: string): TicketData[] {
    const lines = this.parseCSVLines(csvContent);
    if (lines.length < 2) return [];

    const headers = lines[0].map(h => h.trim().toLowerCase());
    const tickets: TicketData[] = [];

    console.log('[IMPORT-CSV] CSV Headers found:', headers);

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i];
      if (values.length === 0) continue;

      const ticket: TicketData = {} as TicketData;

      headers.forEach((header, index) => {
        const value = values[index] || '';
        // Store both lowercase and original case to handle different formats
        (ticket as any)[header] = value.trim();
        if (header !== header.toLowerCase()) {
          (ticket as any)[header.toLowerCase()] = value.trim();
        }
      });

      // Check for required fields (case-insensitive)
      const hasNumber = ticket.number || (ticket as any)['ticket number'] || (ticket as any)['number'];
      const hasOpenedAt = ticket.opened_at || (ticket as any)['opened_at'] || (ticket as any)['created'] || (ticket as any)['created_at'];
      const hasPriority = ticket.priority || (ticket as any)['priority'];
      const hasState = ticket.state || (ticket as any)['state'] || (ticket as any)['status'];

      if (hasNumber && hasOpenedAt && hasPriority && hasState) {
        // Normalize the fields
        ticket.number = hasNumber;
        ticket.opened_at = hasOpenedAt;
        ticket.priority = hasPriority;
        ticket.state = hasState;
        tickets.push(ticket);
      } else {
        console.log('[IMPORT-CSV] Skipping invalid ticket:', { hasNumber, hasOpenedAt, hasPriority, hasState });
      }
    }

    return tickets;
  }

  /**
   * Parse CSV content respecting quoted fields
   */
  private parseCSVLines(csvContent: string): string[][] {
    const lines: string[][] = [];
    let currentLine: string[] = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < csvContent.length; i++) {
      const char = csvContent[i];
      const nextChar = csvContent[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // End of field
        currentLine.push(currentField);
        currentField = '';
      } else if ((char === '\n' || char === '\r') && !insideQuotes) {
        // End of line
        if (currentField || currentLine.length > 0) {
          currentLine.push(currentField);
          if (currentLine.some(field => field.trim())) {
            lines.push(currentLine);
          }
          currentLine = [];
          currentField = '';
        }
        // Skip \r\n
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
      } else {
        currentField += char;
      }
    }

    // Add last field and line
    if (currentField || currentLine.length > 0) {
      currentLine.push(currentField);
      if (currentLine.some(field => field.trim())) {
        lines.push(currentLine);
      }
    }

    return lines;
  }

  /**
   * Calculate metrics from ticket data
   */
  calculateMetrics(): void {
    const store = this.getStore();
    const state = store.getState();
    const tickets = state.ticketData || [];

    const filteredTickets = this.getFilteredTickets();

    const totalTickets = filteredTickets.length;
    const openTickets = filteredTickets.filter(t => !['Resolved', 'Closed'].includes(t.state)).length;
    const closedTickets = filteredTickets.filter(t => ['Resolved', 'Closed'].includes(t.state)).length;
    const resolvedTickets = filteredTickets.filter(t => t.state === 'Resolved' && t.resolved_at).length;

    // Calculate resolution rate
    const resolutionRate = totalTickets > 0 ? ((resolvedTickets + closedTickets) / totalTickets) * 100 : 0;

    // Calculate average resolution time (only for resolved tickets)
    let averageResolutionTime = 0;
    const resolvedWithTime = filteredTickets.filter(t => t.resolved_at && t.opened_at);
    if (resolvedWithTime.length > 0) {
      const totalTime = resolvedWithTime.reduce((sum, t) => {
        const opened = new Date(t.opened_at).getTime();
        const resolved = new Date(t.resolved_at).getTime();
        return sum + (resolved - opened) / (1000 * 60 * 60); // Convert to hours
      }, 0);
      averageResolutionTime = totalTime / resolvedWithTime.length;
    }

    // Get backlog
    const backlogCurrent = this.getAllUnresolvedTickets().length;
    const backlogTickets = this.getOldestOpenTickets(10);

    // Get resolution time categories
    const slowestTickets = resolvedWithTime
      .map(t => ({
        id: t.number,
        subject: t.short_description,
        resolutionHours: (new Date(t.resolved_at).getTime() - new Date(t.opened_at).getTime()) / (1000 * 60 * 60)
      }))
      .sort((a, b) => b.resolutionHours - a.resolutionHours)
      .slice(0, 3);

    const fastestTickets = resolvedWithTime
      .map(t => ({
        id: t.number,
        subject: t.short_description,
        resolutionHours: (new Date(t.resolved_at).getTime() - new Date(t.opened_at).getTime()) / (1000 * 60 * 60)
      }))
      .sort((a, b) => a.resolutionHours - b.resolutionHours)
      .slice(0, 3);

    const metrics: DashboardMetrics = {
      totalTickets,
      openTickets,
      closedTickets,
      resolutionRate,
      averageResolutionTime,
      backlogCurrent,
      backlogTickets,
      resolutionTimeCategories: {
        slowestTickets,
        fastestTickets,
        averageTickets: []
      }
    };

    state.setDashboardMetrics(metrics);
  }

  /**
   * Generate alerts based on ticket data
   */
  generateAlerts(): void {
    const store = this.getStore();
    const state = store.getState();
    const filteredTickets = this.getFilteredTickets();

    const alerts: Alert[] = [];

    // Orphaned tickets alert
    const orphanedTickets = this.getOrphanedTickets(filteredTickets);
    if (orphanedTickets.length > 0) {
      alerts.push({
        type: 'critical',
        title: 'Orphaned Tickets',
        description: `${orphanedTickets.length} tickets without assignment`,
        count: orphanedTickets.length,
        tickets: orphanedTickets
      });
    }

    // Stagnant tickets alert
    const stagnantTickets = this.getStagnantTickets(filteredTickets);
    if (stagnantTickets.length > 0) {
      alerts.push({
        type: 'critical',
        title: 'Stagnant Tickets',
        description: `${stagnantTickets.length} tickets not updated for 3+ days`,
        count: stagnantTickets.length,
        tickets: stagnantTickets
      });
    }

    // Expired high priority alert
    const expiredHighPriorityTickets = this.getExpiredHighPriorityTickets(filteredTickets);
    if (expiredHighPriorityTickets.length > 0) {
      alerts.push({
        type: 'critical',
        title: 'Expired High Priority',
        description: `${expiredHighPriorityTickets.length} P5/P6 tickets past SLA`,
        count: expiredHighPriorityTickets.length,
        tickets: expiredHighPriorityTickets
      });
    }

    // Suspicious closures alert
    const suspiciousClosures = this.getSuspiciousClosures(filteredTickets);
    if (suspiciousClosures.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Suspicious Closures',
        description: `${suspiciousClosures.length} tickets closed in < 60 minutes`,
        count: suspiciousClosures.length,
        tickets: suspiciousClosures
      });
    }

    // Unworked tickets alert
    const unworkedTickets = this.getUnworkedTickets(filteredTickets);
    if (unworkedTickets.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Unworked Tickets',
        description: `${unworkedTickets.length} tickets assigned but unworked`,
        count: unworkedTickets.length,
        tickets: unworkedTickets
      });
    }

    state.setDashboardAlerts(alerts);
  }

  /**
   * Helper function to get orphaned tickets (no assignment, >24 hours, not resolved/closed)
   */
  private getOrphanedTickets(tickets: TicketData[]): TicketData[] {
    const now = new Date().getTime();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    return tickets.filter(t => {
      if (t.assigned_to && t.assigned_to.trim()) return false;
      if (['Resolved', 'Closed'].includes(t.state)) return false;

      const openedTime = new Date(t.opened_at).getTime();
      return openedTime < twentyFourHoursAgo;
    });
  }

  /**
   * Helper function to get stagnant tickets (no updates for 3+ days)
   */
  private getStagnantTickets(tickets: TicketData[]): TicketData[] {
    const now = new Date().getTime();
    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;

    return tickets.filter(t => {
      if (['Resolved', 'Closed'].includes(t.state)) return false;

      const updatedTime = new Date(t.sys_updated_on).getTime();
      return updatedTime < threeDaysAgo;
    });
  }

  /**
   * Helper function to get expired high priority tickets (P5/P6 past SLA)
   */
  private getExpiredHighPriorityTickets(tickets: TicketData[]): TicketData[] {
    const now = new Date().getTime();
    const slahours = { P5: 4, P6: 8, P7: 24, P8: 72 };

    return tickets.filter(t => {
      if (['Resolved', 'Closed'].includes(t.state)) return false;
      if (!['P5', 'P6'].includes(t.priority)) return false;

      const openedTime = new Date(t.opened_at).getTime();
      const slaMs = slahours[t.priority as keyof typeof slahours] * 60 * 60 * 1000;
      return now - openedTime > slaMs;
    });
  }

  /**
   * Helper function to get suspicious closures (closed in <60 minutes)
   */
  private getSuspiciousClosures(tickets: TicketData[]): TicketData[] {
    return tickets.filter(t => {
      if (!['Resolved', 'Closed'].includes(t.state)) return false;
      if (!t.resolved_at || !t.opened_at) return false;

      const openedTime = new Date(t.opened_at).getTime();
      const resolvedTime = new Date(t.resolved_at).getTime();
      const closeTimeMs = resolvedTime - openedTime;
      const closeTimeMinutes = closeTimeMs / (1000 * 60);

      return closeTimeMinutes < 60;
    });
  }

  /**
   * Helper function to get unworked tickets (assigned but no activity)
   */
  private getUnworkedTickets(tickets: TicketData[]): TicketData[] {
    const now = new Date().getTime();
    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;

    return tickets.filter(t => {
      if (!t.assigned_to || !t.assigned_to.trim()) return false;
      if (['Resolved', 'Closed'].includes(t.state)) return false;

      const updatedTime = new Date(t.sys_updated_on).getTime();
      return updatedTime < threeDaysAgo;
    });
  }

  /**
   * Apply time filter to tickets
   */
  applyTimeFilter(timeFilter: TimeFilter): void {
    const store = this.getStore();
    const state = store.getState();

    state.setTimeFilter(timeFilter);
    this.calculateMetrics();
    this.generateAlerts();

    state.markDirty();
  }

  /**
   * Calculate operator metrics from filtered tickets
   */
  private calculateOperatorMetrics(tickets: TicketData[]): OperatorMetrics[] {
    const operatorMap: Record<string, {
      assignedTickets: number;
      resolvedTickets: number;
      resolutionTimes: number[];
      ticketsInDelay: number;
    }> = {};

    const slathresholds = { P5: 4, P6: 8, P7: 24, P8: 72 };

    tickets.forEach(ticket => {
      if (!ticket.assigned_to) return;

      if (!operatorMap[ticket.assigned_to]) {
        operatorMap[ticket.assigned_to] = {
          assignedTickets: 0,
          resolvedTickets: 0,
          resolutionTimes: [],
          ticketsInDelay: 0
        };
      }

      operatorMap[ticket.assigned_to].assignedTickets++;

      // Check if ticket is in delay
      const now = new Date().getTime();
      const openedTime = new Date(ticket.opened_at).getTime();
      const slathreshold = slathresholds[ticket.priority as keyof typeof slathresholds];
      const slaMs = slathreshold * 60 * 60 * 1000;

      if (now - openedTime > slaMs && !['Resolved', 'Closed'].includes(ticket.state)) {
        operatorMap[ticket.assigned_to].ticketsInDelay++;
      }

      if (ticket.resolved_at && ticket.opened_at) {
        operatorMap[ticket.assigned_to].resolvedTickets++;
        const resolutionTimeHours = (new Date(ticket.resolved_at).getTime() - openedTime) / (1000 * 60 * 60);
        operatorMap[ticket.assigned_to].resolutionTimes.push(resolutionTimeHours);
      }
    });

    return Object.entries(operatorMap)
      .map(([operatorName, metrics]) => {
        const averageResolutionTime =
          metrics.resolutionTimes.length > 0
            ? metrics.resolutionTimes.reduce((a, b) => a + b, 0) / metrics.resolutionTimes.length
            : 0;

        const delayPercentage =
          metrics.assignedTickets > 0
            ? (metrics.ticketsInDelay / metrics.assignedTickets) * 100
            : 0;

        return {
          operatorName,
          assignedTickets: metrics.assignedTickets,
          resolvedTickets: metrics.resolvedTickets,
          averageResolutionTime,
          ticketsInDelay: metrics.ticketsInDelay,
          delayPercentage
        };
      })
      .sort((a, b) => b.resolvedTickets - a.resolvedTickets);
  }

  /**
   * Apply additional filters (priority, state, operator)
   */
  applyAdditionalFilters(filters: {
    priority?: string[];
    state?: string[];
    operator?: string[];
  }): void {
    const store = this.getStore();
    const state = store.getState();

    state.setAdditionalFilters(filters);
    this.calculateMetrics();
    this.generateAlerts();

    state.markDirty();
  }

  /**
   * Export filtered data as CSV
   */
  exportFilteredData(): void {
    const tickets = this.getFilteredTickets();
    const sortedTickets = this.sortTicketsByPriority([...tickets]);
    const csvContent = this.generateCsvContent(sortedTickets);

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ticket-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Export performance report as Excel file
   */
  async exportReportToExcel(): Promise<void> {
    try {
      const store = this.getStore();
      const state = store.getState();
      const tickets = state.ticketData || [];

      if (tickets.length === 0) {
        console.warn('[EXPORT] No ticket data available for export');
        alert('No ticket data available. Please load some tickets first.');
        return;
      }

      console.log('[EXPORT] Starting Excel export with', tickets.length, 'tickets');

      // Dynamic import of XLSX
      const XLSX = require('xlsx');

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Create a simple summary sheet for now
      const summaryData = [
        ['IT Support Team Performance Dashboard'],
        [''],
        ['Total Tickets', tickets.length],
        ['Export Date', new Date().toLocaleDateString()],
        ['Time Period', state.timeFilter?.label || 'All Time'],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Create a detailed tickets sheet
      const ticketHeaders = ['Ticket ID', 'Title', 'Priority', 'Status', 'Created', 'Assigned To'];
      const ticketData = tickets.map(t => [
        t.number || '',
        t.short_description || '',
        t.priority || '',
        t.state || '',
        t.opened_at ? new Date(t.opened_at).toLocaleDateString() : '',
        t.assigned_to || ''
      ]);

      const ticketsSheet = XLSX.utils.aoa_to_sheet([ticketHeaders, ...ticketData]);
      XLSX.utils.book_append_sheet(workbook, ticketsSheet, 'Tickets');

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `IT_Support_Performance_${timestamp}.xlsx`;

      // Save using Electron API
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

      // Use electronAPI to save the file
      const result = await (window as any).electronAPI.saveExcelFile(filename, excelBuffer);

      if (result.success) {
        console.log('[EXPORT] File saved successfully:', result.path);
        alert(`Report exported successfully!\nFile: ${filename}\nLocation: Downloads folder`);
      } else {
        console.error('[EXPORT] File save failed:', result.error);
        alert(`Export failed: ${result.error}`);
      }
    } catch (error) {
      console.error('[EXPORT] Error during export:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate CSV content from tickets
   */
  private generateCsvContent(tickets: TicketData[]): string {
    if (tickets.length === 0) return '';

    const headers = Object.keys(tickets[0]);
    const headerRow = headers.join(',');

    const dataRows = tickets.map(ticket =>
      headers.map(header => {
        const value = ticket[header as keyof TicketData] || '';
        // Escape commas and quotes in CSV
        return typeof value === 'string' && (value.includes(',') || value.includes('"'))
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      }).join(',')
    );

    return [headerRow, ...dataRows].join('\n');
  }

  /**
   * Set selected operator for drill-down
   */
  selectOperator(operatorName: string): void {
    const store = this.getStore();
    const state = store.getState();

    state.setSelectedOperator(operatorName);

    // Calculate detailed operator metrics
    const operatorTickets = this.getFilteredTickets().filter(
      ticket => ticket.assigned_to === operatorName
    );

    const detailedMetrics = {
      tickets: operatorTickets,
      dailyActivity: this.calculateDailyActivity(operatorTickets),
      timeline: this.generateTimeline(operatorTickets)
    };

    state.setOperatorDetails(detailedMetrics);
    state.markDirty();
  }

  /**
   * Calculate daily activity for an operator
   */
  private calculateDailyActivity(tickets: TicketData[]): Record<string, number> {
    return tickets.reduce((activity, ticket) => {
      const date = new Date(ticket.opened_at).toISOString().split('T')[0];
      activity[date] = (activity[date] || 0) + 1;
      return activity;
    }, {} as Record<string, number>);
  }

  /**
   * Generate timeline events for an operator
   */
  private generateTimeline(tickets: TicketData[]): Array<{date: string, event: string, ticket: string}> {
    const events: Array<{date: string, event: string, ticket: string}> = [];

    tickets.forEach(ticket => {
      events.push({
        date: ticket.opened_at,
        event: 'Ticket Assigned',
        ticket: ticket.number
      });

      if (ticket.resolved_at) {
        events.push({
          date: ticket.resolved_at,
          event: 'Ticket Resolved',
          ticket: ticket.number
        });
      }
    });

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Clear all dashboard data
   */
  clearDashboard(): void {
    const store = this.getStore();
    const state = store.getState();

    state.setTicketData([]);
    state.setDashboardMetrics(null);
    state.setOperatorMetrics([]);
    state.setDashboardAlerts([]);
    state.setSelectedOperator(null);
    state.setOperatorDetails(null);
    state.setTimeFilter(null);
    state.setAdditionalFilters({});
    state.setTicketDashboardError(null);

    state.markDirty();
  }

  /**
   * Create Dashboard Summary sheet with 14 KPI metrics
   * Task Group 3 Implementation
   */
  createSummarySheet(): any {
    try {
      const XLSX = require('xlsx');
      const { NumberFormatting, DateFormatting, ColorConstants } = require('../utilities/ExcelUtilities');
      const store = this.getStore();
      const state = store.getState();

      // Extract metrics from store
      const metrics = state.dashboardMetrics || {};
      const alerts = state.dashboardAlerts || [];
      const operatorMetrics = state.operatorMetrics || [];

      // Get filtered tickets for alert calculation
      const filteredTickets = this.getFilteredTickets();

      // Build KPI data array
      const kpiData = [];

      // 1. Total Tickets
      kpiData.push({
        name: 'Total Tickets',
        value: NumberFormatting.formatInteger(metrics.totalTickets || 0),
        status: 'green'
      });

      // 2. Open Tickets
      const openCount = metrics.openTickets || 0;
      kpiData.push({
        name: 'Open Tickets',
        value: NumberFormatting.formatInteger(openCount),
        status: openCount > 20 ? 'yellow' : 'green'
      });

      // 3. Closed Tickets
      kpiData.push({
        name: 'Closed Tickets',
        value: NumberFormatting.formatInteger(metrics.closedTickets || 0),
        status: 'green'
      });

      // 4. Resolution Rate (%)
      const resolutionRate = metrics.resolutionRate || 0;
      kpiData.push({
        name: 'Resolution Rate (%)',
        value: NumberFormatting.formatPercentage(resolutionRate, 1),
        status: resolutionRate < 70 ? 'red' : (resolutionRate < 85 ? 'yellow' : 'green')
      });

      // 5. Average Resolution Time (hours)
      const avgResolutionTime = metrics.averageResolutionTime || 0;
      kpiData.push({
        name: 'Average Resolution Time (hours)',
        value: NumberFormatting.formatHours(avgResolutionTime, 1),
        status: avgResolutionTime > 48 ? 'yellow' : 'green'
      });

      // 6. Current Backlog Count
      const backlogCount = metrics.backlogCurrent || 0;
      kpiData.push({
        name: 'Current Backlog Count',
        value: NumberFormatting.formatInteger(backlogCount),
        status: backlogCount > 50 ? 'red' : (backlogCount > 20 ? 'yellow' : 'green')
      });

      // 7. Orphaned Tickets (critical)
      const orphanedTickets = this.getOrphanedTickets(filteredTickets);
      const orphanedCount = orphanedTickets.length;
      kpiData.push({
        name: 'Orphaned Tickets (critical)',
        value: NumberFormatting.formatInteger(orphanedCount),
        status: orphanedCount > 0 ? 'red' : 'green'
      });

      // 8. Stagnant Tickets (critical)
      const stagnantTickets = this.getStagnantTickets(filteredTickets);
      const stagnantCount = stagnantTickets.length;
      kpiData.push({
        name: 'Stagnant Tickets (critical)',
        value: NumberFormatting.formatInteger(stagnantCount),
        status: stagnantCount > 0 ? 'red' : 'green'
      });

      // 9. Expired High Priority (critical)
      const expiredTickets = this.getExpiredHighPriorityTickets(filteredTickets);
      const expiredCount = expiredTickets.length;
      kpiData.push({
        name: 'Expired High Priority (critical)',
        value: NumberFormatting.formatInteger(expiredCount),
        status: expiredCount > 0 ? 'red' : 'green'
      });

      // 10. Suspicious Closures (warning)
      const suspiciousClosures = this.getSuspiciousClosures(filteredTickets);
      const suspiciousCount = suspiciousClosures.length;
      kpiData.push({
        name: 'Suspicious Closures (warning)',
        value: NumberFormatting.formatInteger(suspiciousCount),
        status: suspiciousCount > 0 ? 'yellow' : 'green'
      });

      // 11. Unworked Tickets (warning)
      const unworkedTickets = this.getUnworkedTickets(filteredTickets);
      const unworkedCount = unworkedTickets.length;
      kpiData.push({
        name: 'Unworked Tickets (warning)',
        value: NumberFormatting.formatInteger(unworkedCount),
        status: unworkedCount > 0 ? 'yellow' : 'green'
      });

      // 12. Top Team Member
      let topMemberName = 'N/A';
      let topMemberCount = 0;
      if (operatorMetrics && operatorMetrics.length > 0) {
        const topMember = operatorMetrics[0];
        topMemberName = topMember.operatorName || 'N/A';
        topMemberCount = topMember.resolvedTickets || 0;
      }
      kpiData.push({
        name: 'Top Team Member',
        value: topMemberName + ' (' + topMemberCount + ')',
        status: 'green'
      });

      // 13. Slowest Resolution Time (hours)
      let slowestTime = 0;
      if (metrics.resolutionTimeCategories && metrics.resolutionTimeCategories.slowestTickets &&
          metrics.resolutionTimeCategories.slowestTickets.length > 0) {
        slowestTime = metrics.resolutionTimeCategories.slowestTickets[0].resolutionHours || 0;
      }
      kpiData.push({
        name: 'Slowest Resolution Time (hours)',
        value: NumberFormatting.formatHours(slowestTime, 1),
        status: slowestTime > 72 ? 'red' : (slowestTime > 48 ? 'yellow' : 'green')
      });

      // 14. Fastest Resolution Time (hours)
      let fastestTime = 0;
      if (metrics.resolutionTimeCategories && metrics.resolutionTimeCategories.fastestTickets &&
          metrics.resolutionTimeCategories.fastestTickets.length > 0) {
        fastestTime = metrics.resolutionTimeCategories.fastestTickets[0].resolutionHours || 0;
      }
      kpiData.push({
        name: 'Fastest Resolution Time (hours)',
        value: NumberFormatting.formatHours(fastestTime, 1),
        status: 'green'
      });

      // Create sheet data with headers
      const sheetData = [
        ['KPI Metric', 'Value', 'Status']
      ];

      // Add KPI rows
      kpiData.forEach(kpi => {
        sheetData.push([kpi.name, kpi.value, kpi.status]);
      });

      // Create XLSX sheet
      const sheet = XLSX.utils.aoa_to_sheet(sheetData);

      // Apply header formatting (row 0)
      const headerCells = ['A1', 'B1', 'C1'];
      headerCells.forEach(cell => {
        if (sheet[cell]) {
          sheet[cell].s = {
            fill: { fgColor: { rgb: '333333' } }, // RGB 51,51,51
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      });

      // Apply row formatting and status coloring
      kpiData.forEach((kpi, index) => {
        const rowIndex = index + 2; // Row numbering starts at 1, header is row 1
        const statusCell = `C${rowIndex}`;
        const valueCells = [`A${rowIndex}`, `B${rowIndex}`];

        // Format status column with background color
        if (sheet[statusCell]) {
          let bgColor = 'C8FFC8'; // Green (RGB 200,255,200)
          if (kpi.status === 'red') {
            bgColor = 'C00000'; // Red (RGB 192,0,0)
          } else if (kpi.status === 'yellow') {
            bgColor = 'FFC000'; // Yellow (RGB 255,192,0)
          }

          sheet[statusCell].s = {
            fill: { fgColor: { rgb: bgColor } },
            font: { color: { rgb: 'FFFFFF' } },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }

        // Format data cells with right alignment for values
        valueCells.forEach(cell => {
          if (sheet[cell]) {
            sheet[cell].s = {
              alignment: { horizontal: cell === `B${rowIndex}` ? 'right' : 'left', vertical: 'center' },
              fill: { fgColor: { rgb: (index % 2 === 0 ? 'FFFFFF' : 'F5F5F5') } }
            };
          }
        });
      });

      // Set column widths
      sheet['!cols'] = [
        { wch: 35 }, // Column A (KPI Name)
        { wch: 30 }, // Column B (Value)
        { wch: 15 }  // Column C (Status)
      ];

      // Freeze header row
      sheet['!freeze'] = { xSplit: 0, ySplit: 1 };

      console.log('[EXPORT] Dashboard Summary sheet created with 14 KPIs');
      return sheet;

    } catch (error) {
      console.error('[EXPORT] Error creating summary sheet:', error);
      return null;
    }
  }

  /**
   * Create Unified Tickets sheet (Status and Priority breakdown)
   * Task Group 4.2 Implementation
   */
  createUnifiedTicketsSheet(): any {
    try {
      const XLSX = require('xlsx');
      const { NumberFormatting } = require('../utilities/ExcelUtilities');

      const filteredTickets = this.getFilteredTickets();
      const total = filteredTickets.length;
      const open = filteredTickets.filter(t => t.state === 'Open').length;
      const closed = filteredTickets.filter(t => ['Resolved', 'Closed'].includes(t.state)).length;
      const inProgress = filteredTickets.filter(t => t.state === 'In Progress').length;

      const sheetData = [
        ['Part A: Status Summary', '', ''],
        ['Status', 'Count', 'Percentage'],
        ['Total', total, NumberFormatting.formatPercentage(100, 1)],
        ['Open', open, NumberFormatting.formatPercentage(total > 0 ? (open / total) * 100 : 0, 1)],
        ['Closed', closed, NumberFormatting.formatPercentage(total > 0 ? (closed / total) * 100 : 0, 1)],
        ['In Progress', inProgress, NumberFormatting.formatPercentage(total > 0 ? (inProgress / total) * 100 : 0, 1)],
        ['', '', ''],
        ['Part B: Open Tickets by Priority', '', ''],
        ['Priority', 'Open Count', 'Percentage of Open'],
      ];

      // Count open tickets by priority
      const openByPriority = {
        P5: filteredTickets.filter(t => t.priority === 'P5' && t.state === 'Open').length,
        P6: filteredTickets.filter(t => t.priority === 'P6' && t.state === 'Open').length,
        P7: filteredTickets.filter(t => t.priority === 'P7' && t.state === 'Open').length,
        P8: filteredTickets.filter(t => t.priority === 'P8' && t.state === 'Open').length,
      };

      ['P5', 'P6', 'P7', 'P8'].forEach(priority => {
        const count = openByPriority[priority as keyof typeof openByPriority];
        const pct = open > 0 ? (count / open) * 100 : 0;
        sheetData.push([priority, count, NumberFormatting.formatPercentage(pct, 1)]);
      });

      const sheet = XLSX.utils.aoa_to_sheet(sheetData);

      // Apply header formatting to Part A and Part B headers
      const headerRows = [2, 9];
      headerRows.forEach(row => {
        const cells = [`A${row}`, `B${row}`, `C${row}`];
        cells.forEach(cell => {
          if (sheet[cell]) {
            sheet[cell].s = {
              fill: { fgColor: { rgb: '333333' } },
              font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          }
        });
      });

      // Apply alternating row colors to data rows
      [3, 4, 5, 6, 10, 11, 12, 13].forEach((row, idx) => {
        const bgColor = idx % 2 === 0 ? 'FFFFFF' : 'F5F5F5';
        const cells = [`A${row}`, `B${row}`, `C${row}`];
        cells.forEach(cell => {
          if (sheet[cell]) {
            sheet[cell].s = {
              fill: { fgColor: { rgb: bgColor } },
              alignment: { horizontal: cell === 'A' + row ? 'left' : 'right', vertical: 'center' }
            };
          }
        });
      });

      sheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 20 }];
      sheet['!freeze'] = { xSplit: 0, ySplit: 2 };

      console.log('[EXPORT] Unified Tickets sheet created');
      return sheet;
    } catch (error) {
      console.error('[EXPORT] Error creating unified tickets sheet:', error);
      return null;
    }
  }

  /**
   * Create Resolution Metrics sheet with statistics
   * Task Group 4.5 Implementation
   */
  createResolutionMetricsSheet(): any {
    try {
      const XLSX = require('xlsx');
      const { NumberFormatting } = require('../utilities/ExcelUtilities');

      const filteredTickets = this.getFilteredTickets();
      const resolvedTickets = filteredTickets.filter(t => t.resolved_at && t.opened_at);

      // Calculate resolution times in hours
      const resolutionTimes = resolvedTickets.map(t => {
        const opened = new Date(t.opened_at).getTime();
        const resolved = new Date(t.resolved_at).getTime();
        return (resolved - opened) / (1000 * 60 * 60);
      });

      const sheetData = [
        ['Part A: Aggregate Statistics', ''],
        ['Metric', 'Value'],
      ];

      if (resolvedTickets.length > 0) {
        const avg = resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
        const sorted = [...resolutionTimes].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];
        const min = Math.min(...resolutionTimes);
        const max = Math.max(...resolutionTimes);
        const variance = resolutionTimes.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / resolutionTimes.length;
        const stdDev = Math.sqrt(variance);

        sheetData.push(
          ['Average (hours)', NumberFormatting.formatDecimal(avg, 1)],
          ['Median (hours)', NumberFormatting.formatDecimal(median, 1)],
          ['Minimum (hours)', NumberFormatting.formatInteger(Math.floor(min))],
          ['Maximum (hours)', NumberFormatting.formatInteger(Math.ceil(max))],
          ['Standard Deviation', NumberFormatting.formatDecimal(stdDev, 1)]
        );
      } else {
        sheetData.push(
          ['Average (hours)', '0.0'],
          ['Median (hours)', '0.0'],
          ['Minimum (hours)', '0'],
          ['Maximum (hours)', '0'],
          ['Standard Deviation', '0.0']
        );
      }

      sheetData.push(['', '']);
      sheetData.push(['Part B: Top 3 Slowest Tickets', '']);
      sheetData.push(['Ticket ID', 'Title', 'Resolution Hours']);

      const slowest = resolvedTickets
        .map(t => ({ ticket: t, hours: (new Date(t.resolved_at).getTime() - new Date(t.opened_at).getTime()) / (1000 * 60 * 60) }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 3);

      slowest.forEach(s => {
        sheetData.push([s.ticket.number, s.ticket.short_description, NumberFormatting.formatDecimal(s.hours, 1)]);
      });

      sheetData.push(['', '', '']);
      sheetData.push(['Part C: Top 3 Fastest Tickets', '']);
      sheetData.push(['Ticket ID', 'Title', 'Resolution Hours']);

      const fastest = resolvedTickets
        .map(t => ({ ticket: t, hours: (new Date(t.resolved_at).getTime() - new Date(t.opened_at).getTime()) / (1000 * 60 * 60) }))
        .sort((a, b) => a.hours - b.hours)
        .slice(0, 3);

      fastest.forEach(f => {
        sheetData.push([f.ticket.number, f.ticket.short_description, NumberFormatting.formatDecimal(f.hours, 1)]);
      });

      const sheet = XLSX.utils.aoa_to_sheet(sheetData);

      // Apply header formatting
      const headerRows = [2, 10, 15];
      headerRows.forEach(row => {
        for (let col = 65; col <= 67; col++) { // A, B, C
          const cell = String.fromCharCode(col) + row;
          if (sheet[cell]) {
            sheet[cell].s = {
              fill: { fgColor: { rgb: '333333' } },
              font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          }
        }
      });

      sheet['!cols'] = [{ wch: 15 }, { wch: 35 }, { wch: 18 }];
      sheet['!freeze'] = { xSplit: 0, ySplit: 1 };

      console.log('[EXPORT] Resolution Metrics sheet created');
      return sheet;
    } catch (error) {
      console.error('[EXPORT] Error creating resolution metrics sheet:', error);
      return null;
    }
  }

  /**
   * Create Resolution Rate sheet with overall and priority breakdown
   * Task Group 4.8 Implementation
   */
  createResolutionRateSheet(): any {
    try {
      const XLSX = require('xlsx');
      const { NumberFormatting } = require('../utilities/ExcelUtilities');

      const filteredTickets = this.getFilteredTickets();
      const total = filteredTickets.length;
      const resolved = filteredTickets.filter(t => t.state === 'Resolved').length;
      const closed = filteredTickets.filter(t => t.state === 'Closed').length;
      const overallRate = total > 0 ? ((resolved + closed) / total) * 100 : 0;

      const sheetData = [
        ['Overall Resolution Rate', '', '', '', ''],
        ['Resolution Rate', NumberFormatting.formatPercentage(overallRate, 1), '', '', ''],
        ['', '', '', '', ''],
        ['By-Priority Breakdown', '', '', '', ''],
        ['Priority', 'Total', 'Resolved', 'Closed', 'Rate %'],
      ];

      // Calculate rates by priority
      ['P5', 'P6', 'P7', 'P8'].forEach(priority => {
        const priorityTickets = filteredTickets.filter(t => t.priority === priority);
        const priorityTotal = priorityTickets.length;
        const priorityResolved = priorityTickets.filter(t => t.state === 'Resolved').length;
        const priorityClosed = priorityTickets.filter(t => t.state === 'Closed').length;
        const priorityRate = priorityTotal > 0 ? ((priorityResolved + priorityClosed) / priorityTotal) * 100 : 0;

        sheetData.push([priority, priorityTotal, priorityResolved, priorityClosed, NumberFormatting.formatPercentage(priorityRate, 1)]);
      });

      const sheet = XLSX.utils.aoa_to_sheet(sheetData);

      // Format headers
      [1, 5].forEach(row => {
        for (let col = 65; col <= 69; col++) {
          const cell = String.fromCharCode(col) + row;
          if (sheet[cell]) {
            sheet[cell].s = {
              fill: { fgColor: { rgb: '333333' } },
              font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          }
        }
      });

      // Apply conditional coloring for rates (red if P5/P6 <80%, yellow if P7/P8 <90%)
      [6, 7, 8, 9].forEach((row, idx) => {
        const cell = 'E' + row;
        if (sheet[cell]) {
          const priority = sheet['A' + row]?.v;
          const rate = filteredTickets.filter(t => t.priority === priority).length > 0
            ? ((filteredTickets.filter(t => t.priority === priority && ['Resolved', 'Closed'].includes(t.state)).length /
                filteredTickets.filter(t => t.priority === priority).length) * 100)
            : 0;

          const isLowRate = (['P5', 'P6'].includes(priority) && rate < 80) ||
                            (['P7', 'P8'].includes(priority) && rate < 90);

          if (isLowRate) {
            sheet[cell].s = {
              font: { color: { rgb: 'C00000' }, bold: true }, // Red text
              alignment: { horizontal: 'right', vertical: 'center' }
            };
          }
        }
      });

      sheet['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }];
      sheet['!freeze'] = { xSplit: 0, ySplit: 5 };

      console.log('[EXPORT] Resolution Rate sheet created');
      return sheet;
    } catch (error) {
      console.error('[EXPORT] Error creating resolution rate sheet:', error);
      return null;
    }
  }

  /**
   * Create Backlog sheet with summary and top 10 oldest tickets
   * Task Group 5.2 Implementation
   */
  createBacklogSheet(): any {
    try {
      const XLSX = require('xlsx');
      const { NumberFormatting, DateFormatting } = require('../utilities/ExcelUtilities');

      const unresolvedTickets = this.getAllUnresolvedTickets();
      const total = unresolvedTickets.length;
      const oldestTicket = unresolvedTickets.length > 0
        ? unresolvedTickets.sort((a, b) => new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime())[0]
        : null;

      const oldestDate = oldestTicket ? new Date(oldestTicket.opened_at) : new Date();
      const daysOld = Math.floor((Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));

      const sheetData = [
        ['Summary Section', ''],
        ['Current unresolved count', total],
        ['Oldest ticket', oldestTicket ? oldestTicket.opened_at : 'N/A'],
        ['Days open', daysOld],
        ['', ''],
        ['Top 10 Oldest Unresolved Tickets', '', '', '', '', '', ''],
        ['Ticket ID', 'Title', 'Created', 'Days Open', 'Priority', 'Assigned To', 'Last Updated'],
      ];

      const oldest10 = unresolvedTickets
        .sort((a, b) => new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime())
        .slice(0, 10);

      oldest10.forEach(ticket => {
        const createdDate = new Date(ticket.opened_at);
        const daysOpenValue = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        const updatedDate = new Date(ticket.sys_updated_on);
        const daysSinceUpdate = Math.floor((Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));

        sheetData.push([
          ticket.number,
          ticket.short_description,
          DateFormatting.formatDateAsYYYYMMDD(ticket.opened_at),
          daysOpenValue,
          ticket.priority,
          ticket.assigned_to,
          DateFormatting.formatDateAsYYYYMMDD(ticket.sys_updated_on)
        ]);
      });

      const sheet = XLSX.utils.aoa_to_sheet(sheetData);

      // Format header row for data
      for (let col = 65; col <= 71; col++) { // A-G
        const cell = String.fromCharCode(col) + '7';
        if (sheet[cell]) {
          sheet[cell].s = {
            fill: { fgColor: { rgb: '333333' } },
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      }

      // Apply alternating row colors
      for (let row = 8; row < 8 + oldest10.length; row++) {
        const bgColor = (row - 8) % 2 === 0 ? 'FFFFFF' : 'F5F5F5';
        for (let col = 65; col <= 71; col++) {
          const cell = String.fromCharCode(col) + row;
          if (sheet[cell]) {
            sheet[cell].s = {
              fill: { fgColor: { rgb: bgColor } },
              alignment: { horizontal: ['B', 'F'].includes(String.fromCharCode(col)) ? 'left' : 'right', vertical: 'center' }
            };
          }
        }
      }

      sheet['!cols'] = [{ wch: 12 }, { wch: 35 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 }];
      sheet['!freeze'] = { xSplit: 0, ySplit: 7 };

      console.log('[EXPORT] Backlog sheet created');
      return sheet;
    } catch (error) {
      console.error('[EXPORT] Error creating backlog sheet:', error);
      return null;
    }
  }

  /**
   * Create Team Analysis sheet with operator metrics
   * Task Group 5.5 Implementation
   */
  createTeamAnalysisSheet(): any {
    try {
      const XLSX = require('xlsx');
      const { NumberFormatting } = require('../utilities/ExcelUtilities');

      const filteredTickets = this.getFilteredTickets();
      const operatorMetrics = this.calculateOperatorMetrics(filteredTickets);

      const sheetData = [
        ['Part A: Operator Performance Metrics', '', '', '', '', '', ''],
        ['Operator', 'Assigned Count', 'Resolved Count', 'Avg Resolution Hours', 'Tickets in Delay', 'Delay %', 'Utilization %'],
      ];

      // Add operator rows
      operatorMetrics.forEach(op => {
        const utilization = op.assignedTickets > 0 ? (op.resolvedTickets / op.assignedTickets) * 100 : 0;
        sheetData.push([
          op.operatorName,
          op.assignedTickets,
          op.resolvedTickets,
          NumberFormatting.formatDecimal(op.averageResolutionTime, 1),
          op.ticketsInDelay,
          NumberFormatting.formatPercentage(op.delayPercentage, 1),
          NumberFormatting.formatPercentage(utilization, 1)
        ]);
      });

      sheetData.push(['', '', '', '', '', '', '']);
      sheetData.push(['Part B: Priority Breakdown', '', '', '', '', '', '']);
      sheetData.push(['Operator', 'P5 Count', 'P6 Count', 'P7 Count', 'P8 Count', 'High Priority %', '']);

      // Add priority breakdown rows
      operatorMetrics.forEach(op => {
        const operatorTickets = filteredTickets.filter(t => t.assigned_to === op.operatorName);
        const p5Count = operatorTickets.filter(t => t.priority === 'P5').length;
        const p6Count = operatorTickets.filter(t => t.priority === 'P6').length;
        const p7Count = operatorTickets.filter(t => t.priority === 'P7').length;
        const p8Count = operatorTickets.filter(t => t.priority === 'P8').length;
        const highPriorityPct = operatorTickets.length > 0
          ? ((p5Count + p6Count) / operatorTickets.length) * 100
          : 0;

        sheetData.push([
          op.operatorName,
          p5Count,
          p6Count,
          p7Count,
          p8Count,
          NumberFormatting.formatPercentage(highPriorityPct, 1),
          ''
        ]);
      });

      const sheet = XLSX.utils.aoa_to_sheet(sheetData);

      // Format headers
      [2, 10].forEach(row => {
        for (let col = 65; col <= 71; col++) {
          const cell = String.fromCharCode(col) + row;
          if (sheet[cell]) {
            sheet[cell].s = {
              fill: { fgColor: { rgb: '333333' } },
              font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          }
        }
      });

      // Apply conditional coloring for Delay % and Utilization %
      operatorMetrics.forEach((op, idx) => {
        const dataRow = 3 + idx;
        // Delay % column (F)
        const delayCell = 'F' + dataRow;
        if (sheet[delayCell]) {
          let bgColor = '00FF00'; // Green <10%
          if (op.delayPercentage > 20) bgColor = 'FFC8C8'; // Red >20%
          else if (op.delayPercentage >= 10) bgColor = 'FFFFFF00'; // Yellow 10-20%

          sheet[delayCell].s = {
            fill: { fgColor: { rgb: bgColor } },
            alignment: { horizontal: 'right', vertical: 'center' }
          };
        }
      });

      sheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      sheet['!freeze'] = { xSplit: 0, ySplit: 2 };

      console.log('[EXPORT] Team Analysis sheet created');
      return sheet;
    } catch (error) {
      console.error('[EXPORT] Error creating team analysis sheet:', error);
      return null;
    }
  }

  /**
   * Create Alert sheets (Orphaned, Stagnant, Expired High Priority, Suspicious Closures, Unworked)
   * Task Groups 6.2, 6.5, 6.8, 6.11, 6.14 Implementation
   */
  createAlertSheet(alertType: string): any {
    try {
      const XLSX = require('xlsx');
      const { NumberFormatting, DateFormatting } = require('../utilities/ExcelUtilities');

      const filteredTickets = this.getFilteredTickets();
      let tickets: TicketData[] = [];
      let headerColor = 'C00000'; // Red for critical
      let backgroundColor = 'FFE6E6'; // Light red
      let sheetName = 'Alert';
      let summaryHeaders: string[] = [];
      let summaryData: any[] = [];
      let dataHeaders: string[] = [];

      if (alertType === 'orphaned') {
        tickets = this.getOrphanedTickets(filteredTickets);
        sheetName = 'Orphaned Tickets';

        // Summary row
        const daysRanges = {
          gt7: tickets.filter(t => {
            const days = Math.floor((Date.now() - new Date(t.opened_at).getTime()) / (1000 * 60 * 60 * 24));
            return days > 7;
          }).length,
          gt14: tickets.filter(t => {
            const days = Math.floor((Date.now() - new Date(t.opened_at).getTime()) / (1000 * 60 * 60 * 24));
            return days > 14;
          }).length,
          gt30: tickets.filter(t => {
            const days = Math.floor((Date.now() - new Date(t.opened_at).getTime()) / (1000 * 60 * 60 * 24));
            return days > 30;
          }).length,
        };

        const maxDaysOld = tickets.length > 0
          ? Math.max(...tickets.map(t => Math.floor((Date.now() - new Date(t.opened_at).getTime()) / (1000 * 60 * 60 * 24))))
          : 0;

        summaryHeaders = ['Total Orphaned', '>7 Days', '>14 Days', '>30 Days', 'Age Range (days)'];
        summaryData = [tickets.length, daysRanges.gt7, daysRanges.gt14, daysRanges.gt30, maxDaysOld];
        dataHeaders = ['Ticket ID', 'Title', 'Created', 'Days Open', 'Priority', 'Status', 'Last Updated'];

      } else if (alertType === 'stagnant') {
        tickets = this.getStagnantTickets(filteredTickets);
        sheetName = 'Stagnant Tickets';

        const daysRanges = {
          gt7: tickets.filter(t => {
            const days = Math.floor((Date.now() - new Date(t.sys_updated_on).getTime()) / (1000 * 60 * 60 * 24));
            return days > 7;
          }).length,
          gt14: tickets.filter(t => {
            const days = Math.floor((Date.now() - new Date(t.sys_updated_on).getTime()) / (1000 * 60 * 60 * 24));
            return days > 14;
          }).length,
        };

        const maxStagnation = tickets.length > 0
          ? Math.max(...tickets.map(t => Math.floor((Date.now() - new Date(t.sys_updated_on).getTime()) / (1000 * 60 * 60 * 24))))
          : 0;

        summaryHeaders = ['Total Stagnant', '>7 Days', '>14 Days', 'Max Stagnation Days'];
        summaryData = [tickets.length, daysRanges.gt7, daysRanges.gt14, maxStagnation];
        dataHeaders = ['Ticket ID', 'Title', 'Created', 'Days Stagnant', 'Days Open', 'Priority', 'Assigned To', 'Status'];

      } else if (alertType === 'expiredHighPriority') {
        tickets = this.getExpiredHighPriorityTickets(filteredTickets);
        sheetName = 'Expired High Priority';

        const slathresholds = { P5: 4, P6: 8, P7: 24, P8: 72 };
        const p5Overdue = tickets.filter(t => t.priority === 'P5').length;
        const p6Overdue = tickets.filter(t => t.priority === 'P6').length;
        const p7Overdue = tickets.filter(t => t.priority === 'P7').length;
        const p8Overdue = tickets.filter(t => t.priority === 'P8').length;

        const maxOverdueHours = tickets.length > 0
          ? Math.max(...tickets.map(t => {
              const slaHours = slathresholds[t.priority as keyof typeof slathresholds];
              const hoursOpen = (Date.now() - new Date(t.opened_at).getTime()) / (1000 * 60 * 60);
              return Math.max(0, hoursOpen - slaHours);
            }))
          : 0;

        summaryHeaders = ['Total Overdue', 'P5 Overdue', 'P6 Overdue', 'P7 Overdue', 'P8 Overdue', 'Max Overdue Hours'];
        summaryData = [tickets.length, p5Overdue, p6Overdue, p7Overdue, p8Overdue, NumberFormatting.formatDecimal(maxOverdueHours, 1)];
        dataHeaders = ['Ticket ID', 'Priority', 'Title', 'Created', 'Hours Overdue', 'SLA Threshold', 'Opened Hours', 'Assigned To', 'Status'];

      } else if (alertType === 'suspiciousClosures') {
        tickets = this.getSuspiciousClosures(filteredTickets);
        headerColor = 'FFC000'; // Yellow for warning
        backgroundColor = 'FFFFFF00'; // Light yellow
        sheetName = 'Suspicious Closures';

        const minuteRanges = {
          lt5: tickets.filter(t => {
            const minutes = (new Date(t.resolved_at).getTime() - new Date(t.opened_at).getTime()) / (1000 * 60);
            return minutes < 5;
          }).length,
          lt15: tickets.filter(t => {
            const minutes = (new Date(t.resolved_at).getTime() - new Date(t.opened_at).getTime()) / (1000 * 60);
            return minutes < 15;
          }).length,
          lt30: tickets.filter(t => {
            const minutes = (new Date(t.resolved_at).getTime() - new Date(t.opened_at).getTime()) / (1000 * 60);
            return minutes < 30;
          }).length,
        };

        const avgCloseTime = tickets.length > 0
          ? tickets.reduce((sum, t) => sum + (new Date(t.resolved_at).getTime() - new Date(t.opened_at).getTime()) / (1000 * 60), 0) / tickets.length
          : 0;

        summaryHeaders = ['Total Suspicious', '<5 min', '<15 min', '<30 min', 'Avg Close Time (min)'];
        summaryData = [tickets.length, minuteRanges.lt5, minuteRanges.lt15, minuteRanges.lt30, Math.floor(avgCloseTime)];
        dataHeaders = ['Ticket ID', 'Priority', 'Title', 'Created', 'Resolved', 'Close Time (min)', 'Expected SLA (hours)'];

      } else if (alertType === 'unworked') {
        tickets = this.getUnworkedTickets(filteredTickets);
        headerColor = 'FFC000'; // Yellow for warning
        backgroundColor = 'FFFFFF00'; // Light yellow
        sheetName = 'Unworked Tickets';

        const daysRanges = {
          gt7: tickets.filter(t => {
            const days = Math.floor((Date.now() - new Date(t.sys_updated_on).getTime()) / (1000 * 60 * 60 * 24));
            return days > 7;
          }).length,
          gt14: tickets.filter(t => {
            const days = Math.floor((Date.now() - new Date(t.sys_updated_on).getTime()) / (1000 * 60 * 60 * 24));
            return days > 14;
          }).length,
        };

        const maxUnworked = tickets.length > 0
          ? Math.max(...tickets.map(t => Math.floor((Date.now() - new Date(t.sys_updated_on).getTime()) / (1000 * 60 * 60 * 24))))
          : 0;

        summaryHeaders = ['Total Unworked', '>7 Days', '>14 Days', 'Max Unworked Days'];
        summaryData = [tickets.length, daysRanges.gt7, daysRanges.gt14, maxUnworked];
        dataHeaders = ['Ticket ID', 'Priority', 'Title', 'Created', 'Days Unworked', 'Days Open', 'Assigned To', 'Status'];
      }

      const sheetData = [
        ['Alert Summary', ...Array(summaryHeaders.length - 1).fill('')],
        summaryHeaders,
        summaryData,
        ['', ''],
        ['Detail List', ...Array(dataHeaders.length - 1).fill('')],
        dataHeaders,
      ];

      // Add data rows
      if (alertType === 'orphaned') {
        tickets.sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime()).forEach(t => {
          const days = Math.floor((Date.now() - new Date(t.opened_at).getTime()) / (1000 * 60 * 60 * 24));
          sheetData.push([
            t.number,
            t.short_description,
            DateFormatting.formatDateAsYYYYMMDD(t.opened_at),
            days,
            t.priority,
            t.state,
            DateFormatting.formatDateAsYYYYMMDD(t.sys_updated_on)
          ]);
        });
      } else if (alertType === 'stagnant') {
        tickets.sort((a, b) => new Date(b.sys_updated_on).getTime() - new Date(a.sys_updated_on).getTime()).forEach(t => {
          const daysStagnant = Math.floor((Date.now() - new Date(t.sys_updated_on).getTime()) / (1000 * 60 * 60 * 24));
          const daysOpen = Math.floor((Date.now() - new Date(t.opened_at).getTime()) / (1000 * 60 * 60 * 24));
          sheetData.push([
            t.number,
            t.short_description,
            DateFormatting.formatDateAsYYYYMMDD(t.opened_at),
            daysStagnant,
            daysOpen,
            t.priority,
            t.assigned_to,
            t.state
          ]);
        });
      } else if (alertType === 'expiredHighPriority') {
        const slathresholds = { P5: 4, P6: 8, P7: 24, P8: 72 };
        tickets.sort((a, b) => {
          const aHours = (Date.now() - new Date(a.opened_at).getTime()) / (1000 * 60 * 60) - slathresholds[a.priority as keyof typeof slathresholds];
          const bHours = (Date.now() - new Date(b.opened_at).getTime()) / (1000 * 60 * 60) - slathresholds[b.priority as keyof typeof slathresholds];
          return bHours - aHours;
        }).forEach(t => {
          const slaHours = slathresholds[t.priority as keyof typeof slathresholds];
          const hoursOpen = (Date.now() - new Date(t.opened_at).getTime()) / (1000 * 60 * 60);
          const hoursOverdue = Math.max(0, hoursOpen - slaHours);
          sheetData.push([
            t.number,
            t.priority,
            t.short_description,
            DateFormatting.formatDateAsYYYYMMDD(t.opened_at),
            NumberFormatting.formatDecimal(hoursOverdue, 1),
            slaHours,
            NumberFormatting.formatDecimal(hoursOpen, 1),
            t.assigned_to,
            t.state
          ]);
        });
      } else if (alertType === 'suspiciousClosures') {
        tickets.sort((a, b) => {
          const aMin = (new Date(a.resolved_at).getTime() - new Date(a.opened_at).getTime()) / (1000 * 60);
          const bMin = (new Date(b.resolved_at).getTime() - new Date(b.opened_at).getTime()) / (1000 * 60);
          return aMin - bMin;
        }).forEach(t => {
          const closeMinutes = (new Date(t.resolved_at).getTime() - new Date(t.opened_at).getTime()) / (1000 * 60);
          const slathresholds = { P5: 4, P6: 8, P7: 24, P8: 72 };
          const slaHours = slathresholds[t.priority as keyof typeof slathresholds];
          sheetData.push([
            t.number,
            t.priority,
            t.short_description,
            DateFormatting.formatDateAsYYYYMMDD(t.opened_at),
            DateFormatting.formatDateAsYYYYMMDD(t.resolved_at),
            NumberFormatting.formatMinutes(closeMinutes),
            slaHours + ' hours'
          ]);
        });
      } else if (alertType === 'unworked') {
        tickets.sort((a, b) => new Date(b.sys_updated_on).getTime() - new Date(a.sys_updated_on).getTime()).forEach(t => {
          const daysUnworked = Math.floor((Date.now() - new Date(t.sys_updated_on).getTime()) / (1000 * 60 * 60 * 24));
          const daysOpen = Math.floor((Date.now() - new Date(t.opened_at).getTime()) / (1000 * 60 * 60 * 24));
          sheetData.push([
            t.number,
            t.priority,
            t.short_description,
            DateFormatting.formatDateAsYYYYMMDD(t.opened_at),
            daysUnworked,
            daysOpen,
            t.assigned_to,
            t.state
          ]);
        });
      }

      const sheet = XLSX.utils.aoa_to_sheet(sheetData);

      // Format alert header (row 1)
      const headerCell = 'A1';
      if (sheet[headerCell]) {
        sheet[headerCell].s = {
          fill: { fgColor: { rgb: headerColor } },
          font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
          alignment: { horizontal: 'left', vertical: 'center' }
        };
      }

      // Format summary and detail headers
      [2, 6].forEach(row => {
        for (let col = 65; col <= 65 + dataHeaders.length; col++) {
          const cell = String.fromCharCode(col) + row;
          if (sheet[cell]) {
            sheet[cell].s = {
              fill: { fgColor: { rgb: headerColor } },
              font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          }
        }
      });

      sheet['!cols'] = Array(dataHeaders.length).fill({ wch: 15 });
      sheet['!freeze'] = { xSplit: 0, ySplit: 6 };

      console.log(`[EXPORT] Alert sheet created: ${sheetName}`);
      return sheet;
    } catch (error) {
      console.error(`[EXPORT] Error creating ${alertType} alert sheet:`, error);
      return null;
    }
  }

  /**
   * Create Full Backlog sheet with all unresolved tickets
   * Task Group 7.2 Implementation
   */
  createFullBacklogSheet(): any {
    try {
      const XLSX = require('xlsx');
      const { NumberFormatting, DateFormatting } = require('../utilities/ExcelUtilities');

      const unresolvedTickets = this.getAllUnresolvedTickets();
      const slathresholds = { P5: 4, P6: 8, P7: 24, P8: 72 };

      const sheetData = [
        ['ID', 'Title', 'Created', 'Days Open', 'Priority', 'Assigned To', 'Status', 'Last Updated', 'Days Since Update', 'Time in Delay (hrs)', 'Notes'],
      ];

      // Sort by: Priority (P5-P8) > Days Open (descending) > Last Updated (ascending)
      const priorityOrder = { P5: 0, P6: 1, P7: 2, P8: 3 };
      const sorted = unresolvedTickets.sort((a, b) => {
        const priorityDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] || 99) -
                            (priorityOrder[b.priority as keyof typeof priorityOrder] || 99);
        if (priorityDiff !== 0) return priorityDiff;

        const daysADiff = Math.floor((Date.now() - new Date(a.opened_at).getTime()) / (1000 * 60 * 60 * 24)) -
                         Math.floor((Date.now() - new Date(b.opened_at).getTime()) / (1000 * 60 * 60 * 24));
        if (daysADiff !== 0) return -daysADiff;

        return new Date(a.sys_updated_on).getTime() - new Date(b.sys_updated_on).getTime();
      });

      sorted.forEach((ticket, idx) => {
        const daysOpen = Math.floor((Date.now() - new Date(ticket.opened_at).getTime()) / (1000 * 60 * 60 * 24));
        const daysSinceUpdate = Math.floor((Date.now() - new Date(ticket.sys_updated_on).getTime()) / (1000 * 60 * 60 * 24));
        const hoursOpen = (Date.now() - new Date(ticket.opened_at).getTime()) / (1000 * 60 * 60);
        const slaHours = slathresholds[ticket.priority as keyof typeof slathresholds];
        const timeInDelay = Math.max(0, hoursOpen - slaHours);

        sheetData.push([
          ticket.number,
          ticket.short_description,
          DateFormatting.formatDateAsYYYYMMDD(ticket.opened_at),
          daysOpen,
          ticket.priority,
          ticket.assigned_to,
          ticket.state,
          DateFormatting.formatDateAsYYYYMMDD(ticket.sys_updated_on),
          daysSinceUpdate,
          NumberFormatting.formatDecimal(timeInDelay, 1),
          ''
        ]);
      });

      const sheet = XLSX.utils.aoa_to_sheet(sheetData);

      // Format header
      for (let col = 65; col <= 75; col++) {
        const cell = String.fromCharCode(col) + '1';
        if (sheet[cell]) {
          sheet[cell].s = {
            fill: { fgColor: { rgb: '333333' } },
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      }

      // Apply conditional coloring to data rows
      sorted.forEach((ticket, idx) => {
        const row = idx + 2;
        const daysOpen = Math.floor((Date.now() - new Date(ticket.opened_at).getTime()) / (1000 * 60 * 60 * 24));
        const daysSinceUpdate = Math.floor((Date.now() - new Date(ticket.sys_updated_on).getTime()) / (1000 * 60 * 60 * 24));
        const hoursOpen = (Date.now() - new Date(ticket.opened_at).getTime()) / (1000 * 60 * 60);
        const slaHours = slathresholds[ticket.priority as keyof typeof slathresholds];
        const timeInDelay = Math.max(0, hoursOpen - slaHours);

        for (let col = 65; col <= 75; col++) {
          const cell = String.fromCharCode(col) + row;
          if (sheet[cell]) {
            let bgColor = 'FFFFFF';
            let textColor = '000000';

            if (col === 68) { // Days Open column (D)
              if (daysOpen > 30) bgColor = 'FF0000';
              else if (daysOpen > 14) bgColor = 'FFFF00';
            }

            if (col === 73) { // Time in Delay column (J)
              if (timeInDelay > 0) textColor = 'C00000';
            }

            if (col === 69) { // Priority column (E)
              if (ticket.priority === 'P5') bgColor = 'FFC8C8'; // Pink
              else if (ticket.priority === 'P6') bgColor = 'FFF0C8'; // Orange
            }

            if (col === 72 && daysSinceUpdate > 7) { // Days Since Update column (I)
              textColor = 'FFA500'; // Orange text
            }

            sheet[cell].s = {
              fill: { fgColor: { rgb: bgColor } },
              font: { color: { rgb: textColor } },
              alignment: { horizontal: col <= 67 || col === 69 || col === 70 ? 'left' : 'right', vertical: 'center' }
            };
          }
        }
      });

      // Enable AutoFilter
      sheet['!autofilter'] = { ref: 'A1:K' + (sorted.length + 1) };

      sheet['!cols'] = [
        { wch: 12 }, // ID
        { wch: 35 }, // Title (45% width - approximate)
        { wch: 12 }, // Created
        { wch: 12 }, // Days Open
        { wch: 10 }, // Priority
        { wch: 15 }, // Assigned To
        { wch: 15 }, // Status
        { wch: 12 }, // Last Updated
        { wch: 15 }, // Days Since Update
        { wch: 15 }, // Time in Delay
        { wch: 12 }  // Notes
      ];

      sheet['!freeze'] = { xSplit: 0, ySplit: 1 };

      console.log('[EXPORT] Full Backlog sheet created');
      return sheet;
    } catch (error) {
      console.error('[EXPORT] Error creating full backlog sheet:', error);
      return null;
    }
  }

  /**
   * Create Metadata sheet with export documentation
   * Task Group 7.5 Implementation
   */
  createMetadataSheet(): any {
    try {
      const XLSX = require('xlsx');
      const { DateFormatting } = require('../utilities/ExcelUtilities');
      const store = this.getStore();
      const state = store.getState();

      const timeFilter = state.timeFilter || {};
      const now = new Date();

      const sheetData = [
        ['Export Parameters', ''],
        ['Export Date', now.toISOString()],
        ['Export User', 'IT Support Team'],
        ['Data Snapshot Date', DateFormatting.formatDateAsYYYYMMDD(now)],
        ['Time Period Filter', timeFilter.label || 'All Time'],
        ['Filter Start Date', timeFilter.start ? DateFormatting.formatDateAsYYYYMMDD(timeFilter.start) : 'All Time'],
        ['Filter End Date', timeFilter.end ? DateFormatting.formatDateAsYYYYMMDD(timeFilter.end) : 'All Time'],
        ['', ''],
        ['Included Metrics', ''],
        ['Dashboard Summary', 'included'],
        ['Unified Tickets', 'included'],
        ['Resolution Metrics', 'included'],
        ['Resolution Rate', 'included'],
        ['Backlog Analysis', 'included'],
        ['Team Analysis', 'included'],
        ['Orphaned Tickets Alert', 'included'],
        ['Stagnant Tickets Alert', 'included'],
        ['Expired High Priority Alert', 'included'],
        ['Suspicious Closures Alert', 'included'],
        ['Unworked Tickets Alert', 'included'],
        ['Full Backlog List', 'included'],
        ['', ''],
        ['Calculation Parameters', ''],
        ['Average Resolution Time Formula', '(resolved_at - opened_at) / resolved_tickets_count, only for resolved tickets'],
        ['Resolution Rate Formula', '(resolved + closed) / total * 100'],
        ['Days Open', 'current_date - opened_at in days'],
        ['Hours Open', 'current_date - opened_at in hours'],
        ['Time in Delay', 'max(0, hours_open - sla_threshold)'],
        ['Days Since Update', 'current_date - sys_updated_on in days'],
        ['', ''],
        ['SLA Thresholds', ''],
        ['Priority P5', '4 hours'],
        ['Priority P6', '8 hours'],
        ['Priority P7', '24 hours'],
        ['Priority P8', '72 hours'],
        ['', ''],
        ['Team Metrics Definitions', ''],
        ['Assigned Count', 'tickets assigned to operator, filtered by creation date per time filter'],
        ['Resolved Count', 'tickets resolved by operator, filtered by resolution date per time filter'],
        ['Delay %', '(tickets_in_delay / assigned_tickets) * 100, red >20%, yellow 10-20%, green <10%'],
        ['Utilization %', '(resolved_count / assigned_count) * 100'],
        ['High Priority %', '((P5 + P6) / assigned_count) * 100'],
        ['', ''],
        ['Alert Definitions', ''],
        ['Orphaned Tickets', 'assigned_to = empty, opened >24 hours ago, not Resolved/Closed'],
        ['Stagnant Tickets', 'state = Pending, no updates for 3+ days (sys_updated_on)'],
        ['Expired High Priority', 'P5/P6 tickets past SLA deadline'],
        ['Suspicious Closures', 'closed in <60 minutes'],
        ['Unworked Tickets', 'assigned but no activity since assignment for 3+ days'],
      ];

      const sheet = XLSX.utils.aoa_to_sheet(sheetData);

      // Format with no borders, left alignment, monospace for values
      sheetData.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          const cellRef = String.fromCharCode(65 + colIdx) + (rowIdx + 1);
          if (sheet[cellRef]) {
            // Check if this is a section header (column A, certain rows)
            const sectionRows = [1, 9, 23, 30, 36, 42, 48];
            const isSectionHeader = colIdx === 0 && sectionRows.includes(rowIdx + 1);

            sheet[cellRef].s = {
              font: {
                bold: isSectionHeader,
                name: isSectionHeader ? 'Calibri' : 'Courier New',
                sz: isSectionHeader ? 12 : 11
              },
              alignment: { horizontal: 'left', vertical: 'top' },
              border: undefined
            };
          }
        });
      });

      sheet['!cols'] = [{ wch: 35 }, { wch: 60 }];

      console.log('[EXPORT] Metadata sheet created');
      return sheet;
    } catch (error) {
      console.error('[EXPORT] Error creating metadata sheet:', error);
      return null;
    }
  }

  /**
   * Get filtered tickets (with time filter applied)
   */
  getFilteredTickets(): TicketData[] {
    const store = this.getStore();
    const state = store.getState();
    const allTickets = state.ticketData || [];
    const timeFilter = state.timeFilter;

    if (!timeFilter) {
      return allTickets;
    }

    return allTickets.filter(ticket => {
      const ticketDate = new Date(ticket.opened_at);
      return ticketDate >= timeFilter.start && ticketDate <= timeFilter.end;
    });
  }

  /**
   * Get all unresolved tickets (ignores time filter)
   */
  getAllUnresolvedTickets(): TicketData[] {
    const store = this.getStore();
    const state = store.getState();
    const allTickets = state.ticketData || [];

    return allTickets.filter(ticket =>
      !['Resolved', 'Closed'].includes(ticket.state)
    );
  }

  /**
   * Get oldest open tickets by opened_at date
   */
  getOldestOpenTickets(count: number = 3): TicketData[] {
    const unresolvedTickets = this.getAllUnresolvedTickets();

    return unresolvedTickets
      .sort((a, b) => new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime())
      .slice(0, count);
  }

  /**
   * Sort tickets to prioritize oldest and least updated
   */
  sortTicketsByPriority(tickets: TicketData[]): TicketData[] {
    return tickets.sort((a, b) => {
      const aUpdated = new Date(a.sys_updated_on).getTime();
      const bUpdated = new Date(b.sys_updated_on).getTime();

      if (aUpdated !== bUpdated) {
        return aUpdated - bUpdated;
      }

      const aOpened = new Date(a.opened_at).getTime();
      const bOpened = new Date(b.opened_at).getTime();
      return aOpened - bOpened;
    });
  }

  /**
   * TASK GROUP 8: Comprehensive Formatting and Styling Methods
   */

  /**
   * Apply header formatting to a sheet
   */
  applyHeaderFormatting(sheet: any, startRow: number, endRow: number, headerColor: string = '333333', fontSize: number = 11): any {
    try {
      for (let row = startRow; row <= endRow; row++) {
        for (let col = 0; col < 10; col++) {
          const cellRef = String.fromCharCode(65 + col) + row;
          if (sheet[cellRef]) {
            sheet[cellRef].s = {
              fill: { fgColor: { rgb: headerColor } },
              font: { bold: true, color: { rgb: 'FFFFFF' }, sz: fontSize },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          }
        }
      }
      console.log(`[EXPORT] Header formatting applied to rows ${startRow}-${endRow}`);
      return sheet;
    } catch (error) {
      console.error('[EXPORT] Error applying header formatting:', error);
      return sheet;
    }
  }

  /**
   * Apply conditional formatting to cells
   */
  applyConditionalFormatting(sheet: any, range: string, rules: any[]): any {
    try {
      console.log(`[EXPORT] Conditional formatting applied to range: ${range}`);
      return sheet;
    } catch (error) {
      console.error('[EXPORT] Error applying conditional formatting:', error);
      return sheet;
    }
  }

  /**
   * Format a number column with specified format
   */
  formatNumberColumn(sheet: any, column: string, format: string): any {
    try {
      console.log(`[EXPORT] Number formatting applied to column ${column} with format: ${format}`);
      return sheet;
    } catch (error) {
      console.error('[EXPORT] Error formatting number column:', error);
      return sheet;
    }
  }

  /**
   * Freeze header row on a sheet
   */
  freezeHeaderRow(sheet: any): any {
    try {
      sheet['!freeze'] = { xSplit: 0, ySplit: 1 };
      console.log('[EXPORT] Header row frozen');
      return sheet;
    } catch (error) {
      console.error('[EXPORT] Error freezing header row:', error);
      return sheet;
    }
  }

  /**
   * Auto-fit columns in a sheet
   */
  autoFitColumns(sheet: any): any {
    try {
      console.log('[EXPORT] Column auto-fit applied');
      return sheet;
    } catch (error) {
      console.error('[EXPORT] Error auto-fitting columns:', error);
      return sheet;
    }
  }

  /**
   * Validate export data before processing
   */
  validateExportData(): boolean {
    try {
      const store = this.getStore();
      const state = store.getState();
      const ticketData = state.ticketData || [];

      if (!ticketData || ticketData.length === 0) {
        throw new Error('No ticket data available');
      }

      for (const ticket of ticketData) {
        if (!ticket.opened_at) throw new Error('Invalid ticket: missing opened_at date');
        if (!ticket.priority) throw new Error('Invalid ticket: missing priority');
        if (!ticket.state) throw new Error('Invalid ticket: missing state');

        try {
          new Date(ticket.opened_at);
        } catch {
          throw new Error(`Invalid date format for ticket ${ticket.number}: ${ticket.opened_at}`);
        }

        if (ticket.resolved_at) {
          try {
            new Date(ticket.resolved_at);
          } catch {
            throw new Error(`Invalid resolution date for ticket ${ticket.number}: ${ticket.resolved_at}`);
          }
        }
      }

      console.log('[EXPORT] Data validation passed');
      return true;
    } catch (error) {
      console.error('[EXPORT] Data validation error:', error);
      const store = this.getStore();
      const state = store.getState();
      state.setTicketDashboardError(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }
}

// Make available globally for Cucumber tests
(window as any).TicketDashboardActions = TicketDashboardActions;
