    state.setAdditionalFilters({});
    state.setTicketDashboardError(null);

    state.markDirty();
  }

  /**
   * Create Dashboard Summary sheet with 14 KPI metrics
   * Task Group 3 Implementation
   * KPIs: Total Tickets, Open, Closed, Resolution Rate %, Avg Resolution Time, Current Backlog,
   * Orphaned, Stagnant, Expired High Priority, Suspicious Closures, Unworked, Top Team Member,
   * Slowest and Fastest Resolution Time
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
}

// Make available globally for Cucumber tests
(window as any).TicketDashboardActions = TicketDashboardActions;
