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

/** Days elapsed since a ticket was last touched. */
function daysSinceUpdate(ticket: TicketData): number {
  return (Date.now() - new Date(ticket.sys_updated_on).getTime()) / (1000 * 60 * 60 * 24);
}

export class TicketDashboardActions {
  private resourceMapCache: Record<string, string> | null = null;
  private cacheProjectId: string | null = null;

  private getStore() {
    return (window as any).appStore;
  }

  /**
   * Build a map of user-id to resource name for looking up operator names
   * Combines global and project-specific internal resources
   */
  private buildResourceMap(): Record<string, string> {
    const store = this.getStore();
    const state = store.getState();
    const projectId = state.currentProject?.id;

    // Invalidate cache if the project changed
    if (this.cacheProjectId !== projectId) {
      this.resourceMapCache = null;
    }

    if (this.resourceMapCache) {
      return this.resourceMapCache;
    }

    // Calculate the map
    const map: Record<string, string> = {};

    // Get global resources
    const globalResources = state.globalConfig?.internalResources || [];

    // Get project resources (override)
    const projectResources = state.currentProject?.config?.internalResources || [];

    // Merge with project overrides
    const allResources = [...globalResources];
    projectResources.forEach(pr => {
      const index = allResources.findIndex(r => r.id === pr.id);
      if (index >= 0) {
        allResources[index] = pr;  // Override existing
      } else {
        allResources.push(pr);     // Add new
      }
    });

    // Create user-id -> name map
    allResources.forEach(resource => {
      if (resource['user-id']) {
        map[resource['user-id']] = resource.name;
      }
    });

    // Cache the result
    this.resourceMapCache = map;
    this.cacheProjectId = projectId;

    return map;
  }

  /**
   * Get resource name by user-id, with fallback to user-id or 'Unassigned'
   */
  private getResourceNameByUserId(userId: string): string {
    if (!userId) return 'Unassigned';
    const map = this.buildResourceMap();
    return map[userId] || userId;
  }

  /**
   * Parse CSV content and import ticket data
   */
  importCsvData(csvContent: string): void {
    try {
      if (import.meta.env?.DEV) console.log('[IMPORT-CSV] Starting import...');
      const tickets = this.parseCsvContent(csvContent);
      if (import.meta.env?.DEV) console.log('[IMPORT-CSV] Parsed tickets:', tickets.length);

      if (tickets.length === 0) {
        console.warn('[IMPORT-CSV] No valid tickets found in CSV');
        alert('Warning: No valid tickets found in CSV. Make sure the CSV has required columns: number, opened_at, priority, state');
      }

      const store = this.getStore();
      const state = store.getState();

      // Store raw ticket data
      if (import.meta.env?.DEV) console.log('[IMPORT-CSV] Storing ticket data in state...');
      state.setTicketData(tickets);

      // Calculate initial metrics
      if (import.meta.env?.DEV) console.log('[IMPORT-CSV] Calculating metrics...');
      this.calculateMetrics();

      // Generate alerts
      if (import.meta.env?.DEV) console.log('[IMPORT-CSV] Generating alerts...');
      this.generateAlerts();

      if (import.meta.env?.DEV) console.log('[IMPORT-CSV] Marking state as dirty...');
      state.markDirty();

      if (import.meta.env?.DEV) console.log('[IMPORT-CSV] Import completed successfully');
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

    if (import.meta.env?.DEV) console.log('[IMPORT-CSV] CSV Headers found:', headers);

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
        if (import.meta.env?.DEV) console.log('[IMPORT-CSV] Skipping invalid ticket:', { hasNumber, hasOpenedAt, hasPriority, hasState });
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

    // Calculate and save operator metrics for Team Analysis tab
    const operatorMetrics = this.calculateOperatorMetrics(filteredTickets);
    state.setOperatorMetrics(operatorMetrics);
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
   * Convert time filter string to TimeFilter object
   */
  private getTimeFilterFromString(filterType: string): TimeFilter {
    const now = new Date();
    let start: Date;

    switch (filterType) {
      case 'all-time':
        start = new Date(2000, 0, 1);
        break;
      case 'last-7-days':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case 'last-month':
        start = new Date(now);
        start.setMonth(now.getMonth() - 1);
        break;
      case 'last-3-months':
        start = new Date(now);
        start.setMonth(now.getMonth() - 3);
        break;
      case 'last-6-months':
        start = new Date(now);
        start.setMonth(now.getMonth() - 6);
        break;
      case 'current-year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return {
          type: filterType,
          label: filterType,
          start: now,
          end: new Date(now)
        };
    }

    return {
      type: filterType,
      label: this.getTimeFilterLabel(filterType),
      start,
      end: new Date(now)
    };
  }

  /**
   * Get label for time filter type
   */
  private getTimeFilterLabel(filterType: string): string {
    const labels: Record<string, string> = {
      'all-time': 'All Time',
      'last-7-days': 'Last 7 days',
      'last-month': 'Last Month',
      'last-3-months': 'Last 3 Months',
      'last-6-months': 'Last 6 Months',
      'current-year': 'Current Year'
    };
    return labels[filterType] || filterType;
  }

  /**
   * Apply time filter to tickets
   */
  applyTimeFilter(filterTypeOrObject: string | TimeFilter): void {
    // Convert string to TimeFilter object if needed
    const timeFilter = typeof filterTypeOrObject === 'string'
      ? this.getTimeFilterFromString(filterTypeOrObject)
      : filterTypeOrObject;

    const store = this.getStore();
    const state = store.getState();

    state.setTimeFilter(timeFilter);
    this.calculateMetrics();
    this.generateAlerts();

    state.markDirty();
  }

  /**
   * Calculate operator metrics from filtered tickets
   * Maps user-id to resource names for display
   */
  private calculateOperatorMetrics(tickets: TicketData[]): OperatorMetrics[] {
    const operatorMap: Record<string, {
      assignedTickets: number;
      resolvedTickets: number;
      resolutionTimes: number[];
      ticketsInDelay: number;
      userId: string; // Keep the original user-id for matching
    }> = {};

    const slathresholds = { P5: 4, P6: 8, P7: 24, P8: 72 };

    tickets.forEach(ticket => {
      if (!ticket.assigned_to) return;

      // Use the resource name as the map key, but keep the user-id
      const operatorName = this.getResourceNameByUserId(ticket.assigned_to);

      if (!operatorMap[operatorName]) {
        operatorMap[operatorName] = {
          assignedTickets: 0,
          resolvedTickets: 0,
          resolutionTimes: [],
          ticketsInDelay: 0,
          userId: ticket.assigned_to
        };
      }

      operatorMap[operatorName].assignedTickets++;

      // Check if ticket is in delay
      const now = new Date().getTime();
      const openedTime = new Date(ticket.opened_at).getTime();
      const slathreshold = slathresholds[ticket.priority as keyof typeof slathresholds];
      const slaMs = slathreshold * 60 * 60 * 1000;

      if (now - openedTime > slaMs && !['Resolved', 'Closed'].includes(ticket.state)) {
        operatorMap[operatorName].ticketsInDelay++;
      }

      if (ticket.resolved_at && ticket.opened_at) {
        operatorMap[operatorName].resolvedTickets++;
        const resolutionTimeHours = (new Date(ticket.resolved_at).getTime() - openedTime) / (1000 * 60 * 60);
        operatorMap[operatorName].resolutionTimes.push(resolutionTimeHours);
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
          operatorName, // Now contains the resource name, not the user-id
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
  /**
   * Prepare export data for Excel sheets
   * Returns a structured object with data for all sheets
   */
  private prepareExportData(): any {
    const store = this.getStore();
    const state = store.getState();
    const tickets = this.getFilteredTickets();
    const timeFilterLabel = state.timeFilter?.label || 'All Time';

    // Get alert tickets
    const orphanedTickets = this.getOrphanedTickets(tickets);
    const stagnantTickets = this.getStagnantTickets(tickets);
    const expiredHighPriorityTickets = this.getExpiredHighPriorityTickets(tickets);
    const suspiciousClosures = this.getSuspiciousClosures(tickets);
    const unworkedTickets = this.getUnworkedTickets(tickets);

    // Get team metrics
    const operatorMetrics = this.calculateOperatorMetrics(tickets);

    // Get full backlog (unresolved tickets sorted by priority and days open)
    const unresolvedTickets = tickets.filter(t => !['Resolved', 'Closed'].includes(t.state));
    const fullBacklog = unresolvedTickets.sort((a, b) => {
      const priorityOrder: Record<string, number> = { P5: 1, P6: 2, P7: 3, P8: 4 };
      const priorityDiff = (priorityOrder[a.priority as string] || 99) - (priorityOrder[b.priority as string] || 99);
      if (priorityDiff !== 0) return priorityDiff;
      
      const daysOpenA = (new Date().getTime() - new Date(a.opened_at).getTime()) / (1000 * 60 * 60 * 24);
      const daysOpenB = (new Date().getTime() - new Date(b.opened_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysOpenB - daysOpenA;
    });

    return {
      timeFilterLabel,
      teamAnalysis: {
        metrics: operatorMetrics,
        totalTickets: tickets.length,
        resolvedTickets: tickets.filter(t => ['Resolved', 'Closed'].includes(t.state)).length
      },
      alerts: {
        orphaned: {
          tickets: orphanedTickets,
          summary: {
            total: orphanedTickets.length,
            overSevenDays: orphanedTickets.filter(t => {
              const daysSince = (new Date().getTime() - new Date(t.opened_at).getTime()) / (1000 * 60 * 60 * 24);
              return daysSince > 7;
            }).length,
            overFourteenDays: orphanedTickets.filter(t => {
              const daysSince = (new Date().getTime() - new Date(t.opened_at).getTime()) / (1000 * 60 * 60 * 24);
              return daysSince > 14;
            }).length,
            overThirtyDays: orphanedTickets.filter(t => {
              const daysSince = (new Date().getTime() - new Date(t.opened_at).getTime()) / (1000 * 60 * 60 * 24);
              return daysSince > 30;
            }).length
          }
        },
        stagnant: {
          tickets: stagnantTickets,
          summary: {
            total: stagnantTickets.length,
            overSevenDays: stagnantTickets.filter(t => {
              const daysSinceUpdate = (new Date().getTime() - new Date(t.sys_updated_on).getTime()) / (1000 * 60 * 60 * 24);
              return daysSinceUpdate > 7;
            }).length,
            overFourteenDays: stagnantTickets.filter(t => {
              const daysSinceUpdate = (new Date().getTime() - new Date(t.sys_updated_on).getTime()) / (1000 * 60 * 60 * 24);
              return daysSinceUpdate > 14;
            }).length,
            maxStagnationDays: Math.max(...stagnantTickets.map(t => {
              const daysSinceUpdate = (new Date().getTime() - new Date(t.sys_updated_on).getTime()) / (1000 * 60 * 60 * 24);
              return daysSinceUpdate;
            }), 0)
          }
        },
        expiredHighPriority: {
          tickets: expiredHighPriorityTickets,
          summary: {
            total: expiredHighPriorityTickets.length,
            p5Overdue: expiredHighPriorityTickets.filter(t => t.priority === 'P5').length,
            p6Overdue: expiredHighPriorityTickets.filter(t => t.priority === 'P6').length,
            p7Overdue: expiredHighPriorityTickets.filter(t => t.priority === 'P7').length,
            p8Overdue: expiredHighPriorityTickets.filter(t => t.priority === 'P8').length,
            maxOverdueHours: Math.max(...expiredHighPriorityTickets.map(t => {
              const slaThresholds = { P5: 4, P6: 8, P7: 24, P8: 72 };
              const slaMs = (slaThresholds[t.priority as keyof typeof slaThresholds] || 72) * 60 * 60 * 1000;
              const openedTime = new Date(t.opened_at).getTime();
              const now = new Date().getTime();
              return (now - openedTime - slaMs) / (1000 * 60 * 60);
            }), 0)
          }
        },
        suspiciousClosures: {
          tickets: suspiciousClosures,
          summary: {
            total: suspiciousClosures.length,
            lessThan5Min: suspiciousClosures.filter(t => {
              const closeTimeMinutes = (new Date(t.resolved_at || '').getTime() - new Date(t.opened_at).getTime()) / (1000 * 60);
              return closeTimeMinutes < 5;
            }).length,
            lessThan15Min: suspiciousClosures.filter(t => {
              const closeTimeMinutes = (new Date(t.resolved_at || '').getTime() - new Date(t.opened_at).getTime()) / (1000 * 60);
              return closeTimeMinutes < 15;
            }).length,
            lessThan30Min: suspiciousClosures.filter(t => {
              const closeTimeMinutes = (new Date(t.resolved_at || '').getTime() - new Date(t.opened_at).getTime()) / (1000 * 60);
              return closeTimeMinutes < 30;
            }).length,
            avgCloseTimeMin: suspiciousClosures.length > 0
              ? suspiciousClosures.reduce((sum, t) => {
                  const closeTimeMinutes = (new Date(t.resolved_at || '').getTime() - new Date(t.opened_at).getTime()) / (1000 * 60);
                  return sum + closeTimeMinutes;
                }, 0) / suspiciousClosures.length
              : 0
          }
        },
        unworked: {
          tickets: unworkedTickets,
          summary: {
            total: unworkedTickets.length,
            // Unworked is measured from the last update, like getUnworkedTickets and
            // the "Days Unworked" column; measuring it from opened_at made the header
            // counters disagree with the rows underneath them.
            overSevenDays: unworkedTickets.filter(t => daysSinceUpdate(t) > 7).length,
            overFourteenDays: unworkedTickets.filter(t => daysSinceUpdate(t) > 14).length,
            maxUnworkedDays: Math.max(...unworkedTickets.map(daysSinceUpdate), 0)
          }
        }
      },
      // Day counts are deliberately absent: the main process derives them from these
      // timestamps for every sheet, so there is one clock and one rounding rule.
      // Sending our own produced a ticket that read 15 here and 14 on an alert sheet.
      fullBacklog: fullBacklog.map(t => ({
        id: t.number,
        title: t.short_description,
        assignment_group: t.assignment_group,
        created: t.opened_at,
        priority: t.priority,
        assignedTo: t.assigned_to,
        status: t.state,
        lastUpdated: t.sys_updated_on,
        timeInDelay: (() => {
          const slaThresholds = { P5: 4, P6: 8, P7: 24, P8: 72 };
          const slaMs = (slaThresholds[t.priority as keyof typeof slaThresholds] || 72) * 60 * 60 * 1000;
          const openedTime = new Date(t.opened_at).getTime();
          const now = new Date().getTime();
          const timeInDelayMs = now - openedTime - slaMs;
          return timeInDelayMs > 0 ? timeInDelayMs / (1000 * 60 * 60) : 0;
        })(),
        notes: ''
      }))
    };
  }

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

      if (import.meta.env?.DEV) console.log('[EXPORT] Starting Excel export with', tickets.length, 'tickets');

      // Prepare all export data
      const exportData = this.prepareExportData();

      // Call main process to generate and save Excel file with all sheets
      const result = await (window as any).electronAPI.exportTicketReport(exportData);

      if (result.success) {
        if (import.meta.env?.DEV) console.log('[EXPORT] Report exported successfully:', result.path);
        alert(`Report exported successfully!\nFile: ${result.filename}\nLocation: Downloads folder`);
      } else {
        console.error('[EXPORT] Export failed:', result.error);
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
   * Handles both resource names and user-ids for backward compatibility
   */
  selectOperator(operatorNameOrUserId: string): void {
    const store = this.getStore();
    const state = store.getState();

    state.setSelectedOperator(operatorNameOrUserId);

    // Reverse mapping: convert the resource name back to user-id for filtering
    const resourceMap = this.buildResourceMap();
    const userId = Object.keys(resourceMap).find(
      id => resourceMap[id] === operatorNameOrUserId
    ) || operatorNameOrUserId;

    // Calculate detailed operator metrics using the user-id for matching
    const operatorTickets = this.getFilteredTickets().filter(
      ticket => ticket.assigned_to === userId
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

      if (import.meta.env?.DEV) console.log('[EXPORT] Data validation passed');
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
