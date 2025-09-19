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
      const tickets = this.parseCsvContent(csvContent);
      const store = this.getStore();
      const state = store.getState();

      // Store raw ticket data
      state.setTicketData(tickets);

      // Calculate initial metrics
      this.calculateMetrics();

      // Generate alerts
      this.generateAlerts();

      state.markDirty();
    } catch (error) {
      console.error('Error importing CSV data:', error);
      const store = this.getStore();
      const state = store.getState();
      state.setTicketDashboardError('Failed to import CSV data: ' + error.message);
    }
  }

  /**
   * Parse CSV content into ticket objects
   */
  private parseCsvContent(csvContent: string): TicketData[] {
    const lines = csvContent.trim().split('\n');
    const headers = this.parseCsvLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));

    console.log('🔍 CSV Debug:');
    console.log('- Raw headers:', this.parseCsvLine(lines[0]));
    console.log('- Cleaned headers:', headers);
    console.log('- Total lines:', lines.length);

    const tickets = lines.slice(1).map((line, index) => {
      const values = this.parseCsvLine(line);
      const ticket: any = {};

      headers.forEach((header, index) => {
        const value = (values[index] || '').trim().replace(/^"|"$/g, '');
        ticket[header] = value;
      });

      // Debug first ticket
      if (index === 0) {
        console.log('- First ticket sample:', {
          priority: ticket.priority,
          state: ticket.state,
          opened_at: ticket.opened_at,
          raw_keys: Object.keys(ticket)
        });
      }

      return ticket as TicketData;
    });

    console.log('- Parsed tickets count:', tickets.length);
    return tickets;
  }

  /**
   * Parse a CSV line handling quoted values
   */
  private parseCsvLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Apply time period filter
   */
  applyTimeFilter(filterType: string, customStart?: Date, customEnd?: Date): void {
    const store = this.getStore();
    const state = store.getState();

    const timeFilter = this.createTimeFilter(filterType, customStart, customEnd);

    if (filterType === 'all-time') {
      // Clear the filter to show all tickets
      state.setTimeFilter(null);
    } else {
      state.setTimeFilter(timeFilter);
    }

    // Recalculate metrics with filtered data
    this.calculateMetrics();
    this.generateAlerts();

    state.markDirty();
  }

  /**
   * Create time filter based on type
   */
  private createTimeFilter(filterType: string, customStart?: Date, customEnd?: Date): TimeFilter {
    const now = new Date();
    let start: Date;
    let end: Date = now;
    let label: string;

    switch (filterType) {
      case 'all-time':
        return null; // No filter - return all tickets
      case 'last-month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        label = 'Last Month';
        break;
      case 'last-3-months':
        start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        label = 'Last 3 Months';
        break;
      case 'last-6-months':
        start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        label = 'Last 6 Months';
        break;
      case 'current-year':
        start = new Date(now.getFullYear(), 0, 1);
        label = 'Current Year';
        break;
      case 'custom':
        start = customStart || new Date(now.getFullYear(), 0, 1);
        end = customEnd || now;
        label = 'Custom Range';
        break;
      default:
        return null; // Default to no filter (all time)
    }

    return { start, end, label, type: filterType };
  }

  /**
   * Calculate dashboard metrics
   */
  calculateMetrics(): void {
    const store = this.getStore();
    const state = store.getState();
    const allTickets = state.ticketData || [];
    const tickets = this.getFilteredTickets();

    // Debug logging
    console.log('🔍 TicketDashboard Debug:');
    console.log('- All tickets loaded:', allTickets.length);
    console.log('- Filtered tickets:', tickets.length);
    console.log('- Current timeFilter:', state.timeFilter);

    if (tickets.length > 0) {
      console.log('- Sample ticket states:', tickets.slice(0, 3).map(t => t.state));
      console.log('- Sample ticket priorities:', tickets.slice(0, 3).map(t => t.priority));
      console.log('- Sample ticket dates:', tickets.slice(0, 3).map(t => t.opened_at));
    }

    const averageResolutionTime = this.calculateAverageResolutionTime(tickets);
    const metrics: DashboardMetrics = {
      totalTickets: tickets.length,
      averageResolutionTime,
      openTickets: tickets.filter(t => ['Open', 'In Progress', 'Pending', 'On Hold'].includes(t.state)).length,
      // Note: "Resolved" and "Closed" are both considered completed tickets (same functional logic)
      closedTickets: tickets.filter(t => ['Resolved', 'Closed'].includes(t.state)).length,
      resolutionRate: this.calculateResolutionRate(tickets),
      backlogCurrent: tickets.filter(t => ['Open', 'In Progress', 'Pending'].includes(t.state)).length,
      topResolutionTimeTickets: this.calculateTopResolutionTimeTickets(tickets),
      resolutionTimeCategories: this.calculateResolutionTimeCategories(tickets, averageResolutionTime)
    };

    console.log('- Calculated metrics:', metrics);
    state.setDashboardMetrics(metrics);

    // Calculate operator metrics
    const operatorMetrics = this.calculateOperatorMetrics(tickets);
    state.setOperatorMetrics(operatorMetrics);
  }

  /**
   * Calculate average resolution time in hours
   */
  private calculateAverageResolutionTime(tickets: TicketData[]): number {
    const resolvedTickets = tickets.filter(t => t.resolved_at && t.resolved_at.trim());

    if (resolvedTickets.length === 0) return 0;

    const totalHours = resolvedTickets.reduce((sum, ticket) => {
      const opened = new Date(ticket.opened_at);
      const resolved = new Date(ticket.resolved_at);
      const diffMs = resolved.getTime() - opened.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return sum + diffHours;
    }, 0);

    return totalHours / resolvedTickets.length;
  }

  /**
   * Calculate top 3 tickets with highest resolution time
   */
  private calculateTopResolutionTimeTickets(tickets: TicketData[]): { id: string; subject: string; resolutionHours: number; }[] {
    return tickets
      .filter(ticket => ticket.resolved_at && ticket.opened_at)
      .map(ticket => {
        const created = new Date(ticket.opened_at);
        const resolved = new Date(ticket.resolved_at);
        const totalHours = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);

        return {
          id: ticket.number || '',
          subject: ticket.short_description || '',
          resolutionHours: totalHours
        };
      })
      .sort((a, b) => b.resolutionHours - a.resolutionHours)
      .slice(0, 3);
  }

  /**
   * Calculate resolution time categories: slowest, fastest, and average tickets
   */
  private calculateResolutionTimeCategories(tickets: TicketData[], averageTime: number): {
    slowestTickets: { id: string; subject: string; resolutionHours: number; }[];
    fastestTickets: { id: string; subject: string; resolutionHours: number; }[];
    averageTickets: { id: string; subject: string; resolutionHours: number; }[];
  } {
    const resolvedTicketsWithTime = tickets
      .filter(ticket => ticket.resolved_at && ticket.opened_at)
      .map(ticket => {
        const created = new Date(ticket.opened_at);
        const resolved = new Date(ticket.resolved_at);
        const totalHours = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);

        return {
          id: ticket.number || '',
          subject: ticket.short_description || '',
          resolutionHours: totalHours
        };
      });

    if (resolvedTicketsWithTime.length === 0) {
      return {
        slowestTickets: [],
        fastestTickets: [],
        averageTickets: []
      };
    }

    // Calculate thresholds: ±10% of average
    const threshold = averageTime * 0.1;
    const upperBound = averageTime + threshold;
    const lowerBound = averageTime - threshold;

    // Categorize tickets
    const slowestTickets = resolvedTicketsWithTime
      .filter(ticket => ticket.resolutionHours > upperBound)
      .sort((a, b) => b.resolutionHours - a.resolutionHours)
      .slice(0, 3);

    const fastestTickets = resolvedTicketsWithTime
      .filter(ticket => ticket.resolutionHours < lowerBound)
      .sort((a, b) => a.resolutionHours - b.resolutionHours)
      .slice(0, 3);

    const averageTickets = resolvedTicketsWithTime
      .filter(ticket => ticket.resolutionHours >= lowerBound && ticket.resolutionHours <= upperBound)
      .sort((a, b) => Math.abs(a.resolutionHours - averageTime) - Math.abs(b.resolutionHours - averageTime))
      .slice(0, 3);

    return {
      slowestTickets,
      fastestTickets,
      averageTickets
    };
  }

  /**
   * Calculate resolution rate percentage
   */
  private calculateResolutionRate(tickets: TicketData[]): number {
    if (tickets.length === 0) return 0;

    const resolvedCount = tickets.filter(t => ['Resolved', 'Closed'].includes(t.state)).length;
    return (resolvedCount / tickets.length) * 100;
  }

  /**
   * Calculate metrics per operator
   */
  private calculateOperatorMetrics(tickets: TicketData[]): OperatorMetrics[] {
    // Raggruppa solo i ticket RISOLTI per resolved_by (o sys_updated_by come fallback)
    const resolvedTickets = tickets.filter(t => ['Resolved', 'Closed'].includes(t.state));
    
    const operatorGroups = resolvedTickets.reduce((groups, ticket) => {
      const operator = ticket.resolved_by || ticket.sys_updated_by || 'Unassigned';
      if (!groups[operator]) {
        groups[operator] = [];
      }
      groups[operator].push(ticket);
      return groups;
    }, {} as Record<string, TicketData[]>);

    // Aggiungi anche gli operatori con ticket assegnati ma non risolti
    const allTickets = tickets.reduce((groups, ticket) => {
      const assignedOperator = ticket.assigned_to || 'Unassigned';
      if (!groups[assignedOperator]) {
        groups[assignedOperator] = { assigned: [], resolved: [] };
      }
      groups[assignedOperator].assigned.push(ticket);
      
      // Se il ticket è risolto, aggiungilo anche alla sezione resolved
      if (['Resolved', 'Closed'].includes(ticket.state)) {
        const resolverOperator = ticket.resolved_by || ticket.sys_updated_by || 'Unassigned';
        if (!groups[resolverOperator]) {
          groups[resolverOperator] = { assigned: [], resolved: [] };
        }
        groups[resolverOperator].resolved.push(ticket);
      }
      
      return groups;
    }, {} as Record<string, { assigned: TicketData[], resolved: TicketData[] }>);

    return Object.entries(allTickets).map(([operatorName, operatorTickets]) => {
      const assignedTickets = operatorTickets.assigned;
      const resolvedTickets = operatorTickets.resolved;
      const ticketsInDelay = this.getTicketsInDelay(assignedTickets);

      return {
        operatorName,
        assignedTickets: assignedTickets.length,
        resolvedTickets: resolvedTickets.length,
        averageResolutionTime: this.calculateAverageResolutionTime(resolvedTickets),
        ticketsInDelay: ticketsInDelay.length,
        delayPercentage: assignedTickets.length > 0 ? (ticketsInDelay.length / assignedTickets.length) * 100 : 0
      };
    }).sort((a, b) => b.resolvedTickets - a.resolvedTickets);
  }

  /**
   * Generate alerts based on ticket analysis
   */
  generateAlerts(): void {
    const store = this.getStore();
    const state = store.getState();
    const tickets = this.getFilteredTickets();
    const alerts: Alert[] = [];

    // Critical alerts
    const orphanedTickets = this.getOrphanedTickets(tickets);
    if (orphanedTickets.length > 0) {
      alerts.push({
        type: 'critical',
        title: 'Orphaned Tickets',
        description: 'Tickets not assigned for more than 24 hours',
        count: orphanedTickets.length,
        tickets: orphanedTickets
      });
    }

    const stagnantTickets = this.getStagnantTickets(tickets);
    if (stagnantTickets.length > 0) {
      alerts.push({
        type: 'critical',
        title: 'Stagnant Tickets',
        description: 'Tickets in pending state for more than 7 days',
        count: stagnantTickets.length,
        tickets: stagnantTickets
      });
    }

    const expiredHighPriorityTickets = this.getExpiredHighPriorityTickets(tickets);
    if (expiredHighPriorityTickets.length > 0) {
      alerts.push({
        type: 'critical',
        title: 'Expired High Priority',
        description: 'P1/P2 tickets open for more than 2 days',
        count: expiredHighPriorityTickets.length,
        tickets: expiredHighPriorityTickets
      });
    }

    // Warning alerts
    const suspiciousClosures = this.getSuspiciousClosures(tickets);
    if (suspiciousClosures.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Suspicious Closures',
        description: 'High priority tickets resolved in less than 1 hour',
        count: suspiciousClosures.length,
        tickets: suspiciousClosures
      });
    }

    const unworkedTickets = this.getUnworkedTickets(tickets);
    if (unworkedTickets.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Unworked Tickets',
        description: 'No updates for more than 3 days',
        count: unworkedTickets.length,
        tickets: unworkedTickets
      });
    }

    state.setDashboardAlerts(alerts);
  }

  /**
   * Get tickets not assigned for more than 24 hours
   */
  private getOrphanedTickets(tickets: TicketData[]): TicketData[] {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return tickets.filter(ticket =>
      (!ticket.assigned_to || ticket.assigned_to.trim() === '') &&
      new Date(ticket.opened_at) < oneDayAgo &&
      !['Resolved', 'Closed'].includes(ticket.state)  // FIXED: Escludi ticket risolti/chiusi
    );
  }

  /**
   * Get tickets in pending state for more than 7 days
   */
  private getStagnantTickets(tickets: TicketData[]): TicketData[] {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return tickets.filter(ticket =>
      ticket.state === 'Pending' &&
      new Date(ticket.opened_at) < weekAgo
    );
  }

  /**
   * Get P1/P2 tickets open for more than 2 days
   */
  private getExpiredHighPriorityTickets(tickets: TicketData[]): TicketData[] {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    return tickets.filter(ticket =>
      ['P5', 'P6', 'P7', 'P8'].includes(ticket.priority) && // UPDATED: Only P5-P8 exist now
      !['Resolved', 'Closed'].includes(ticket.state) &&
      new Date(ticket.opened_at) < twoDaysAgo
    );
  }

  /**
   * Get tickets resolved suspiciously fast
   */
  private getSuspiciousClosures(tickets: TicketData[]): TicketData[] {
    return tickets.filter(ticket => {
      // Only consider P5-P8 (P1-P4 completely removed)
      if (!['P5', 'P6', 'P7', 'P8'].includes(ticket.priority)) {
        return false;
      }
      
      if (!ticket.resolved_at) {
        return false;
      }

      const opened = new Date(ticket.opened_at);
      const resolved = new Date(ticket.resolved_at);
      const diffHours = (resolved.getTime() - opened.getTime()) / (1000 * 60 * 60);

      return diffHours < 1; // Resolved in less than 1 hour
    });
  }

  /**
   * Get tickets without updates for more than 3 days
   */
  private getUnworkedTickets(tickets: TicketData[]): TicketData[] {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    return tickets.filter(ticket =>
      !['Resolved', 'Closed'].includes(ticket.state) &&
      new Date(ticket.sys_updated_on) < threeDaysAgo
    );
  }

  /**
   * Get tickets that are in delay
   */
  private getTicketsInDelay(tickets: TicketData[]): TicketData[] {
    return tickets.filter(ticket => {
      if (['Resolved', 'Closed'].includes(ticket.state)) return false;

      const opened = new Date(ticket.opened_at);
      const now = new Date();
      const ageHours = (now.getTime() - opened.getTime()) / (1000 * 60 * 60);

      // SLA thresholds - ONLY P5-P8 (P1-P4 completely removed)
      const slaThresholds = {
        'P5': 4,    // 4 hours (critico)
        'P6': 8,    // 8 hours (critico)
        'P7': 24,   // 24 hours (critico)
        'P8': 72    // 72 hours (critico)
      };

      const threshold = slaThresholds[ticket.priority];
      // If priority is not in our thresholds (shouldn't happen with new interface), ignore ticket
      if (!threshold) return false;
      
      return ageHours > threshold;
    });
  }

  /**
   * Get filtered tickets based on current time filter
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
    const csvContent = this.generateCsvContent(tickets);

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
}

// Make available globally for Cucumber tests
(window as any).TicketDashboardActions = TicketDashboardActions;