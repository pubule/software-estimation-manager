import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../hooks/useStore';
import { TicketDashboardActions, TicketData, Alert, OperatorMetrics } from '../actions/TicketDashboardActions';

interface TicketDashboardState {
  ticketData: TicketData[];
  dashboardMetrics: any;
  operatorMetrics: OperatorMetrics[];
  dashboardAlerts: Alert[];
  selectedOperator: string | null;
  operatorDetails: any;
  timeFilter: any;
  additionalFilters: any;
  ticketDashboardError: string | null;
}

export const TicketDashboard: React.FC = () => {
  // State from store
  const {
    ticketData,
    dashboardMetrics,
    operatorMetrics,
    dashboardAlerts,
    selectedOperator,
    operatorDetails,
    timeFilter,
    additionalFilters,
    ticketDashboardError
  } = useStore((state: any): TicketDashboardState => ({
    ticketData: state.ticketData || [],
    dashboardMetrics: state.dashboardMetrics,
    operatorMetrics: state.operatorMetrics || [],
    dashboardAlerts: state.dashboardAlerts || [],
    selectedOperator: state.selectedOperator,
    operatorDetails: state.operatorDetails,
    timeFilter: state.timeFilter,
    additionalFilters: state.additionalFilters || {},
    ticketDashboardError: state.ticketDashboardError
  }));

  // Actions instance
  const actions = new TicketDashboardActions();

  // Helper function to get filtered tickets
  const getFilteredTickets = () => {
    return actions.getFilteredTickets ? actions.getFilteredTickets() : ticketData;
  };

  // Local UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('charts');
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<number>>(new Set());
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [expandedResolutionCard, setExpandedResolutionCard] = useState(false);
  const [expandedBacklogCard, setExpandedBacklogCard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial data if available
  useEffect(() => {
    if (ticketData.length > 0 && !dashboardMetrics) {
      actions.applyTimeFilter('all-time');
    }
  }, [ticketData.length]);

  const handleFileUpload = async (file: File) => {
    console.log('[TICKET-DASHBOARD] File selected:', file.name, 'Size:', file.size);
    setIsProcessing(true);
    try {
      const csvContent = await file.text();
      console.log('[TICKET-DASHBOARD] CSV content loaded, length:', csvContent.length);
      console.log('[TICKET-DASHBOARD] Calling importCsvData...');
      actions.importCsvData(csvContent);
      console.log('[TICKET-DASHBOARD] importCsvData completed');
    } catch (error) {
      console.error('[TICKET-DASHBOARD] Error processing file:', error);
      alert('Error loading CSV: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsProcessing(false);
    }
  };


  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const formatDuration = (hours: number): string => {
    if (hours < 8) {
      return `${hours.toFixed(1)}h`;
    } else {
      const workingDays = Math.floor(hours / 8);
      const remainingHours = hours % 8;
      if (remainingHours === 0) {
        return `${workingDays}d`;
      } else {
        return `${workingDays}d ${remainingHours.toFixed(1)}h`;
      }
    }
  };

  const formatDurationFromDate = (dateString: string): string => {
    const now = new Date();
    const ticketDate = new Date(dateString);
    const diffMs = now.getTime() - ticketDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return formatDuration(diffHours);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return '🔴';
      case 'warning': return '🟡';
      default: return '📊';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      // P1-P4 REMOVED - Only P5-P8 supported
      case 'P5': return '#ff4444'; // Critical red (was P1 color)
      case 'P6': return '#ff8800'; // High orange (was P2 color)
      case 'P7': return '#ffcc00'; // Medium yellow (was P3 color)
      case 'P8': return '#88cc00'; // Low green (was P4 color)
      default: return '#cccccc';
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'Open': return '#ff6b6b';
      case 'In Progress': return '#4ecdc4';
      case 'Pending': return '#ffe66d';
      case 'On Hold': return '#ff8b94';
      case 'Resolved': return '#95e1d3';
      case 'Closed': return '#a8e6cf';
      default: return '#d3d3d3';
    }
  };

  // Alert management functions
  const toggleAlertExpansion = (alertIndex: number) => {
    const newExpanded = new Set(expandedAlerts);
    if (newExpanded.has(alertIndex)) {
      newExpanded.delete(alertIndex);
    } else {
      newExpanded.add(alertIndex);
    }
    setExpandedAlerts(newExpanded);
  };

  const openAlertModal = (alert: Alert) => {
    setSelectedAlert(alert);
  };

  const closeAlertModal = () => {
    setSelectedAlert(null);
  };

  const openBacklogModal = () => {
    // Create a mock alert for backlog tickets to reuse existing modal
    const backlogAlert: Alert = {
      type: 'info',
      title: 'Current Backlog',
      description: 'All unresolved tickets (ignoring time filter)',
      count: dashboardMetrics?.backlogTickets?.length || 0,
      tickets: actions.sortTicketsByPriority([...(dashboardMetrics?.backlogTickets || [])])
    };
    setSelectedAlert(backlogAlert);
  };

  if (ticketDashboardError) {
    return (
      <div className="ticket-dashboard error">
        <div className="error-message">
          <h3>Error</h3>
          <p>{ticketDashboardError}</p>
          <button onClick={() => actions.clearDashboard()}>Clear and Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ticket-dashboard">
      <div className="page-header">
        <div>
          <h2>📊 IT Support Team Performance Dashboard</h2>
          <p className="page-description">Analyze support ticket metrics and team performance</p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-secondary"
            onClick={() => actions.exportFilteredData()}
            title="Export current dashboard data as CSV"
          >
            <i className="fas fa-file-csv"></i> Export CSV
          </button>

          <button
            className="btn btn-primary"
            onClick={() => actions.exportReportToExcel()}
            title="Export performance report as Excel workbook"
            disabled={!ticketData || ticketData.length === 0}
          >
            <i className="fas fa-file-excel"></i> Export Excel Report
          </button>
        </div>
      </div>


      {/* Dashboard Content */}
          {/* Filter Section */}
          <div className="filters-section">
            <div className="filter-group">
              <label>Time Period:</label>
              <select
                value={timeFilter?.type || 'all-time'}
                onChange={(e) => actions.applyTimeFilter(e.target.value)}
              >
                <option value="all-time">All Time</option>
                <option value="last-7-days">Last 7 days</option>
                <option value="last-month">Last Month</option>
                <option value="last-3-months">Last 3 Months</option>
                <option value="last-6-months">Last 6 Months</option>
                <option value="current-year">Current Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            <button
              className="load-csv-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <i className="fas fa-upload"></i>
              {isProcessing ? 'Loading...' : 'Load CSV'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
          </div>

          {/* KPI Cards */}
            <div className="kpi-section">
              <div className="kpi-card unified-tickets-card">
                <div className="unified-metric">
                  <div className="kpi-value">{dashboardMetrics?.totalTickets || 0}</div>
                  <div className="kpi-label">Total Tickets</div>
                </div>
                <div className="unified-metric">
                  <div className="kpi-value">{dashboardMetrics?.openTickets || 0}</div>
                  <div className="kpi-label">Open Tickets</div>
                </div>
                <div className="unified-metric">
                  <div className="kpi-value">{dashboardMetrics?.closedTickets || 0}</div>
                  <div className="kpi-label">Closed Tickets</div>
                </div>
              </div>
              <div className={`kpi-card resolution-time-card ${expandedResolutionCard ? 'expanded' : ''}`}>
                <div className="resolution-card-header" onClick={() => setExpandedResolutionCard(!expandedResolutionCard)}>
                  <div className="kpi-value">
                    {dashboardMetrics?.averageResolutionTime ? formatDuration(dashboardMetrics.averageResolutionTime) : 'No data'}
                  </div>
                  <div className="kpi-label">Avg Resolution Time</div>
                  <span className="expand-icon">{expandedResolutionCard ? '▼' : '▶'}</span>
                </div>

                {/* Expanded Content - Categories */}
                {expandedResolutionCard && dashboardMetrics?.resolutionTimeCategories && (
                  <div className="resolution-expanded-content">
                    {/* Slowest Tickets */}
                    {dashboardMetrics.resolutionTimeCategories.slowestTickets.length > 0 && (
                      <div className="resolution-category">
                        <div className="category-label">🐌 Top 3 Slowest (Above Average)</div>
                        {dashboardMetrics.resolutionTimeCategories.slowestTickets.map((ticket, index) => (
                          <div key={ticket.id} className="category-ticket-item">
                            <span className="ticket-id">#{ticket.id}</span>
                            <span className="ticket-time slowest">{formatDuration(ticket.resolutionHours)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Fastest Tickets */}
                    {dashboardMetrics.resolutionTimeCategories.fastestTickets.length > 0 && (
                      <div className="resolution-category">
                        <div className="category-label">⚡ Top 3 Fastest (Below Average)</div>
                        {dashboardMetrics.resolutionTimeCategories.fastestTickets.map((ticket, index) => (
                          <div key={ticket.id} className="category-ticket-item">
                            <span className="ticket-id">#{ticket.id}</span>
                            <span className="ticket-time fastest">{formatDuration(ticket.resolutionHours)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Average Tickets */}
                    {dashboardMetrics.resolutionTimeCategories.averageTickets.length > 0 && (
                      <div className="resolution-category">
                        <div className="category-label">📊 Top 3 In Line (±10% Average)</div>
                        {dashboardMetrics.resolutionTimeCategories.averageTickets.map((ticket, index) => (
                          <div key={ticket.id} className="category-ticket-item">
                            <span className="ticket-id">#{ticket.id}</span>
                            <span className="ticket-time average">{formatDuration(ticket.resolutionHours)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="kpi-card">
                <div className="kpi-value">{dashboardMetrics?.resolutionRate?.toFixed(1) || '0.0'}%</div>
                <div className="kpi-label">Resolution Rate</div>
              </div>
              <div className={`kpi-card backlog-card ${expandedBacklogCard ? 'expanded' : ''}`}>
                <div className="backlog-card-header" onClick={() => setExpandedBacklogCard(!expandedBacklogCard)}>
                  <div className="kpi-value">{dashboardMetrics?.backlogCurrent || 0}</div>
                  <div className="kpi-label">Current Backlog</div>
                  <span className="expand-icon">{expandedBacklogCard ? '▼' : '▶'}</span>
                </div>

                {/* Expanded Content - Oldest Open Tickets */}
                {expandedBacklogCard && dashboardMetrics?.backlogTickets && (
                  <div className="backlog-expanded-content">
                    {/* Oldest Tickets Preview */}
                    {actions.getOldestOpenTickets(3).length > 0 && (
                      <div className="resolution-category">
                        <div className="category-label">📅 3 Oldest Open Tickets</div>
                        {actions.getOldestOpenTickets(3).map((ticket, index) => (
                          <div key={index} className="category-ticket-item">
                            <span className="ticket-id">#{ticket.number}</span>
                            <span className="ticket-age">{formatDurationFromDate(ticket.opened_at)} ago</span>
                            <span
                              className="priority-badge"
                              style={{backgroundColor: getPriorityColor(ticket.priority)}}
                            >
                              {ticket.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* View Full List Button */}
                    <div className="backlog-actions">
                      <button
                        className="alert-action-btn view-list"
                        onClick={(e) => {
                          e.stopPropagation();
                          openBacklogModal();
                        }}
                      >
                        <i className="fas fa-list"></i>
                        View Full List ({dashboardMetrics?.backlogTickets?.length || 0} tickets)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          {/* Alerts Section */}
          {dashboardAlerts.length > 0 && (
            <div className="alerts-section">
              <h3>🚨 Critical Alerts</h3>
              <div className="alerts-grid">
                {dashboardAlerts.map((alert, index) => (
                  <div key={index} className={`alert-card alert-${alert.type} ${expandedAlerts.has(index) ? 'expanded' : ''}`}>
                    <div className="alert-header" onClick={() => toggleAlertExpansion(index)}>
                      <span className="alert-icon">{getAlertIcon(alert.type)}</span>
                      <strong>{alert.title}</strong>
                      <span className="alert-count">{alert.count}</span>
                      <span className="expand-icon">{expandedAlerts.has(index) ? '▼' : '▶'}</span>
                    </div>
                    <p>{alert.description}</p>

                    {/* Expanded Content */}
                    {expandedAlerts.has(index) && (
                      <div className="alert-expanded-content">
                        <div className="alert-actions">
                          <button
                            className="alert-action-btn view-list"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAlertModal(alert);
                            }}
                          >
                            <i className="fas fa-list"></i>
                            View Full List ({alert.tickets.length} tickets)
                          </button>
                        </div>

                        {/* Preview of first 3 tickets */}
                        {alert.tickets.length > 0 && (
                          <div className="ticket-preview">
                            <div className="preview-header">Sample Tickets:</div>
                            {actions.sortTicketsByPriority([...alert.tickets]).slice(0, 3).map((ticket, ticketIndex) => (
                              <div key={ticketIndex} className="preview-ticket">
                                <span className="preview-ticket-id">#{ticket.number}</span>
                                <span className="preview-ticket-subject">{ticket.short_description?.substring(0, 40)}...</span>
                                <span className="preview-ticket-state" style={{backgroundColor: getStateColor(ticket.state)}}>
                                  {ticket.state}
                                </span>
                              </div>
                            ))}
                            {alert.tickets.length > 3 && (
                              <div className="preview-more">+ {alert.tickets.length - 3} more tickets</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="tabs-section">
            <div className="tab-nav">
              <button
                className={activeTab === 'overview' ? 'active' : ''}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={activeTab === 'operators' ? 'active' : ''}
                onClick={() => setActiveTab('operators')}
              >
                Team Analysis
              </button>
              <button
                className={activeTab === 'charts' ? 'active' : ''}
                onClick={() => setActiveTab('charts')}
              >
                Charts & Analytics
              </button>
            </div>

            <div className="tab-content">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="overview-tab">
                  <div className="charts-grid">
                    <div className="chart-container">
                      <h4>Priority Distribution</h4>
                      <div className="priority-chart">
                        {['P5', 'P6', 'P7', 'P8'].map(priority => {
                          const filteredTickets = getFilteredTickets();
                          const count = filteredTickets.filter(t => t.priority === priority).length;
                          const percentage = filteredTickets.length > 0 ? (count / filteredTickets.length) * 100 : 0;
                          return (
                            <div key={priority} className="priority-bar">
                              <span className="priority-label">{priority}</span>
                              <div className="bar-container">
                                <div
                                  className="bar-fill"
                                  style={{
                                    width: `${percentage}%`,
                                    backgroundColor: getPriorityColor(priority)
                                  }}
                                />
                              </div>
                              <span className="priority-count">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="chart-container">
                      <h4>State Distribution</h4>
                      <div className="state-chart">
                        {['Open', 'In Progress', 'Pending', 'On Hold', 'Resolved', 'Closed'].map(state => {
                          const filteredTickets = getFilteredTickets();
                          const count = filteredTickets.filter(t => t.state === state).length;
                          const percentage = filteredTickets.length > 0 ? (count / filteredTickets.length) * 100 : 0;
                          return (
                            <div key={state} className="state-bar">
                              <span className="state-label">{state}</span>
                              <div className="bar-container">
                                <div
                                  className="bar-fill"
                                  style={{
                                    width: `${percentage}%`,
                                    backgroundColor: getStateColor(state)
                                  }}
                                />
                              </div>
                              <span className="state-count">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Team Analysis Tab */}
              {activeTab === 'operators' && (
                <div className="operators-tab">
                  <div className="operators-table-container">
                    <h4>Operator Resolution Performance</h4>
                    <table className="operators-table">
                      <thead>
                        <tr>
                          <th>Resolver</th>
                          <th>Assigned</th>
                          <th>Resolved</th>
                          <th>Avg Resolution Time</th>
                          <th>Delayed Tickets</th>
                          <th>Delay %</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {operatorMetrics.map((operator, index) => (
                          <tr key={index}>
                            <td>
                              <strong>{operator.operatorName || 'Unassigned'}</strong>
                            </td>
                            <td>{operator.assignedTickets}</td>
                            <td>{operator.resolvedTickets}</td>
                            <td>{formatDuration(operator.averageResolutionTime)}</td>
                            <td>
                              <span className={operator.ticketsInDelay > 0 ? 'delayed' : ''}>
                                {operator.ticketsInDelay}
                              </span>
                            </td>
                            <td>
                              <span className={operator.delayPercentage > 20 ? 'high-delay' : ''}>
                                {operator.delayPercentage.toFixed(1)}%
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn-small"
                                onClick={() => {
                                  actions.selectOperator(operator.operatorName);
                                  setShowOperatorModal(true);
                                }}
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Charts Tab */}
              {activeTab === 'charts' && (
                <div className="charts-tab">
                  {/* Trend Analysis - Full Width */}
                  <div className="chart-container full-width">
                    <h4>Ticket Trend Analysis</h4>
                    <div className="trend-table-container">
                      {(() => {
                        const filteredTickets = getFilteredTickets();
                        const dailyStats = filteredTickets.reduce((stats, ticket) => {
                          const date = ticket.opened_at.split(' ')[0]; // Get date part
                          if (!stats[date]) stats[date] = { opened: 0, closed: 0 };
                          stats[date].opened++;
                          if (['Resolved', 'Closed'].includes(ticket.state)) {
                            stats[date].closed++;
                          }
                          return stats;
                        }, {} as Record<string, {opened: number, closed: number}>);

                        const sortedDates = Object.keys(dailyStats).sort().slice(-7).reverse(); // Last 7 days, newest first

                        const getTrendAnalysis = (opened: number, closed: number) => {
                          const balance = opened - closed;
                          if (balance === 0) return { text: '✅ Equilibrato', class: 'trend-balanced' };
                          if (balance > 0) return { text: '⚠️ Leggero accumulo', class: 'trend-accumulation' };
                          return { text: '📈 Deficit risolto', class: 'trend-deficit' };
                        };

                        return (
                          <table className="trend-table">
                            <thead>
                              <tr>
                                <th>Data</th>
                                <th>Aperti</th>
                                <th>Chiusi</th>
                                <th>Bilancio</th>
                                <th>Trend</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedDates.map(date => {
                                const opened = dailyStats[date].opened;
                                const closed = dailyStats[date].closed;
                                const balance = opened - closed;
                                const trend = getTrendAnalysis(opened, closed);

                                return (
                                  <tr key={date}>
                                    <td className="trend-date">
                                      {new Date(date).toLocaleDateString('en', {month: 'short', day: 'numeric'})}
                                    </td>
                                    <td className="trend-opened">{opened}</td>
                                    <td className="trend-closed">{closed}</td>
                                    <td className={`trend-balance ${balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'neutral'}`}>
                                      {balance > 0 ? `+${balance}` : balance === 0 ? '0 (=)' : balance}
                                    </td>
                                    <td className={`trend-status ${trend.class}`}>
                                      {trend.text}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Bottom Charts Grid */}
                  <div className="bottom-charts-grid">
                    <div className="chart-container">
                      <h4>Resolution Time by Priority</h4>
                      <div className="resolution-time-chart">
                        {['P5', 'P6', 'P7', 'P8'].map(priority => {
                          const filteredTickets = getFilteredTickets();
                          const priorityTickets = filteredTickets.filter(t =>
                            t.priority === priority && t.resolved_at && t.resolved_at.trim()
                          );

                          const avgTime = priorityTickets.length > 0 ?
                            priorityTickets.reduce((sum, ticket) => {
                              const opened = new Date(ticket.opened_at);
                              const resolved = new Date(ticket.resolved_at);
                              return sum + (resolved.getTime() - opened.getTime()) / (1000 * 60 * 60);
                            }, 0) / priorityTickets.length : 0;

                          return (
                            <div key={priority} className="resolution-bar">
                              <span className="priority-label">{priority}</span>
                              <div className="resolution-bar-container">
                                <div
                                  className="resolution-bar-fill"
                                  style={{
                                    width: `${Math.min(100, (avgTime / 100) * 100)}%`,
                                    backgroundColor: getPriorityColor(priority)
                                  }}
                                />
                              </div>
                              <span className="resolution-time">
                                {avgTime > 0 ? formatDuration(avgTime) : 'N/A'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="chart-container">
                      <h4>Operator Activity Heatmap</h4>
                      <div className="activity-heatmap">
                        {operatorMetrics.slice(0, 6).map((operator, index) => (
                          <div key={index} className="operator-activity-row">
                            <div className="operator-name">{operator.operatorName || 'Unassigned'}</div>
                            <div className="activity-cells">
                              {[...Array(7)].map((_, dayIndex) => {
                                const intensity = Math.min(10, operator.assignedTickets * (1 - dayIndex * 0.1));
                                return (
                                  <div
                                    key={dayIndex}
                                    className="activity-cell"
                                    style={{
                                      backgroundColor: intensity > 0 ?
                                        `rgba(52, 152, 219, ${intensity / 10})` :
                                        '#f1f3f4'
                                    }}
                                    title={`Day ${dayIndex + 1}: ${Math.round(intensity)} tickets`}
                                  />
                                );
                              })}
                            </div>
                            <div className="total-activity">{operator.assignedTickets}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Operator Details Modal */}
          {showOperatorModal && selectedOperator && operatorDetails && (
            <div className="modal-overlay" onClick={() => setShowOperatorModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Operator Details: {selectedOperator}</h3>
                  <button className="close-btn" onClick={() => setShowOperatorModal(false)}>×</button>
                </div>
                <div className="modal-body">
                  <div className="operator-stats">
                    <div className="stat-group">
                      <h4>Statistics</h4>
                      <p>Total Tickets: {operatorDetails.tickets?.length || 0}</p>
                      <p>Resolved: {operatorDetails.tickets?.filter((t: TicketData) => ['Resolved', 'Closed'].includes(t.state)).length || 0}</p>
                      <p>Open: {operatorDetails.tickets?.filter((t: TicketData) => !['Resolved', 'Closed'].includes(t.state)).length || 0}</p>
                    </div>

                    <div className="timeline-section">
                      <h4>Recent Activity Timeline</h4>
                      <div className="timeline">
                        {operatorDetails.timeline?.slice(0, 10).map((event: any, index: number) => (
                          <div key={index} className="timeline-event">
                            <div className="timeline-date">
                              {new Date(event.date).toLocaleDateString()}
                            </div>
                            <div className="timeline-content">
                              <strong>{event.event}</strong> - {event.ticket}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Alert Details Modal */}
          {selectedAlert && (
            <div className="modal-overlay" onClick={closeAlertModal}>
              <div className="alert-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="alert-modal-title">
                    <span className="alert-icon">{getAlertIcon(selectedAlert.type)}</span>
                    <h3>{selectedAlert.title} ({selectedAlert.count} tickets)</h3>
                  </div>
                  <button className="close-btn" onClick={closeAlertModal}>×</button>
                </div>
                <div className="modal-body">
                  <div className="alert-description">
                    <p>{selectedAlert.description}</p>
                  </div>

                  <div className="tickets-table-container">
                    <table className="tickets-table">
                      <thead>
                        <tr>
                          <th>Ticket #</th>
                          <th>Subject</th>
                          <th>Priority</th>
                          <th>State</th>
                          <th>Assigned To</th>
                          <th>Opened</th>
                          <th>Last Updated</th>
                          <th>Resolved By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {actions.sortTicketsByPriority([...selectedAlert.tickets]).map((ticket, index) => (
                          <tr key={index}>
                            <td className="ticket-number">#{ticket.number}</td>
                            <td className="ticket-subject" title={ticket.short_description}>
                              {ticket.short_description?.substring(0, 50)}...
                            </td>
                            <td>
                              <span
                                className="priority-badge"
                                style={{backgroundColor: getPriorityColor(ticket.priority)}}
                              >
                                {ticket.priority}
                              </span>
                            </td>
                            <td>
                              <span
                                className="state-badge"
                                style={{backgroundColor: getStateColor(ticket.state)}}
                              >
                                {ticket.state}
                              </span>
                            </td>
                            <td className="assigned-to">{ticket.assigned_to || 'Unassigned'}</td>
                            <td className="opened-date">
                              {new Date(ticket.opened_at).toLocaleDateString()}
                            </td>
                            <td className="updated-date">
                              {new Date(ticket.sys_updated_on).toLocaleDateString()}
                            </td>
                            <td className="resolved-by">{ticket.resolved_by || 'Not Resolved'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

      <style jsx global>{`
        /* SCROLL LOCALIZZATO: Solo nella page, non in tutto il body */
        body, html {
          height: 100vh !important;
          overflow: hidden !important;
        }

        #app {
          height: 100vh !important;
          overflow: hidden !important;
        }

        .main-container {
          height: calc(100vh - 54px) !important;
          overflow: hidden !important;
        }

        .page {
          height: 100% !important;
          overflow: hidden !important;
          flex-direction: column !important;
        }

        .page.active {
          display: flex !important;
          height: 100% !important;
          overflow: hidden !important;
        }

        /* QUESTO È IL CONTAINER CHE SCROLLA */
        #ticket-dashboard-page {
          height: 100% !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          padding: 0 !important;
          background: #1e1e1e !important;
        }

        /* Contenuto dashboard */
        .ticket-dashboard {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          min-height: calc(100vh - 100px);
          height: auto;
          width: 100%;
          overflow: visible;
          box-sizing: border-box;
          background: #1e1e1e;
          color: #cccccc;
        }


        .upload-section {
          margin-bottom: 30px;
        }

        .upload-area {
          border: 2px dashed #3c3c3c;
          border-radius: 10px;
          padding: 40px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #252526;
        }

        .upload-area:hover,
        .upload-area.drag-over {
          border-color: #007acc;
          background: #2d2d30;
        }

        .upload-icon {
          font-size: 3em;
          margin-bottom: 15px;
        }

        .processing {
          margin-top: 15px;
          color: #007acc;
          font-weight: bold;
        }

        .filters-section {
          display: flex;
          gap: 20px;
          margin-bottom: 30px;
          padding: 20px;
          background: #252526;
          border-radius: 10px;
          border: 1px solid #3c3c3c;
          align-items: center;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .filter-group label {
          font-weight: bold;
          color: #ffffff;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .filter-group select {
          padding: 8px 12px;
          border: 1px solid #3c3c3c;
          border-radius: 3px;
          font-size: 14px;
          background: #2d2d30;
          color: #cccccc;
          outline: none;
        }

        .filter-group select:focus {
          border-color: #007acc;
        }

        .filter-group select option {
          background: #2d2d30;
          color: #cccccc;
        }

        .load-csv-btn {
          margin-left: auto;
          padding: 10px 20px;
          background: #0e639c;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.2s ease;
        }

        .load-csv-btn:hover {
          background: #1177bb;
        }

        .load-csv-btn:disabled {
          background: #3c3c3c;
          cursor: not-allowed;
        }

        .kpi-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .kpi-card {
          background: #252526;
          padding: 25px;
          border-radius: 6px;
          border: 1px solid #3c3c3c;
          text-align: center;
          border-left: 4px solid #007acc;
          transition: background 0.2s ease;
        }

        .kpi-card:hover {
          background: #2d2d30;
        }

        .kpi-value {
          font-size: 2.5em;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 10px;
        }

        .kpi-label {
          color: #9d9d9d;
          font-weight: 500;
          font-size: 14px;
        }

        /* Unified Tickets Card */
        .unified-tickets-card {
          display: flex;
          flex-direction: column;
          gap: 15px;
          padding: 20px;
          min-height: auto;
        }

        .unified-metric {
          text-align: center;
          padding: 5px 0;
        }

        .unified-metric:not(:last-child) {
          border-bottom: 1px solid #3c3c3c;
          padding-bottom: 15px;
        }

        .unified-metric .kpi-value {
          font-size: 2.2em;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 5px;
        }

        .unified-metric .kpi-label {
          color: #9d9d9d;
          font-weight: 500;
          font-size: 13px;
        }

        /* Expandable Resolution Time Card */
        .resolution-time-card {
          min-height: auto;
          transition: all 0.3s ease;
        }

        .resolution-time-card.expanded {
          min-height: auto;
          background: #2d2d30;
        }

        .resolution-card-header {
          cursor: pointer;
          position: relative;
          padding: 5px;
          border-radius: 3px;
          transition: background 0.2s ease;
        }

        .resolution-card-header:hover {
          background: rgba(255,255,255,0.1);
        }

        .expand-icon {
          position: absolute;
          top: 15px;
          right: 15px;
          font-size: 12px;
          color: #007acc;
          transition: transform 0.2s ease;
        }

        .resolution-expanded-content {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #3c3c3c;
          animation: slideDown 0.3s ease;
        }

        /* Expandable Backlog Card */
        .backlog-card {
          min-height: auto;
          transition: all 0.3s ease;
        }

        .backlog-card.expanded {
          min-height: auto;
          background: #2d2d30;
        }

        .backlog-card-header {
          cursor: pointer;
          position: relative;
          padding: 5px;
          border-radius: 3px;
          transition: background 0.2s ease;
        }

        .backlog-card-header:hover {
          background: rgba(255,255,255,0.1);
        }

        .backlog-expanded-content {
          margin-top: 15px;
          padding: 0 5px;
        }

        .ticket-age {
          color: #cccccc;
          font-weight: 600;
          font-family: 'Courier New', monospace;
        }

        .resolution-category {
          margin-bottom: 20px;
        }

        .resolution-category:last-child {
          margin-bottom: 0;
        }

        .category-label {
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #007acc;
        }

        .category-ticket-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          margin-bottom: 5px;
          padding: 3px 0;
        }

        .category-ticket-item:last-child {
          margin-bottom: 0;
        }

        .ticket-id {
          color: #cccccc;
          font-weight: 600;
          font-family: 'Courier New', monospace;
        }

        .ticket-time.slowest {
          color: #f14c4c;
          font-weight: 600;
        }

        .ticket-time.fastest {
          color: #73c991;
          font-weight: 600;
        }

        .ticket-time.average {
          color: #007acc;
          font-weight: 600;
        }

        /* Legacy styles for backward compatibility */
        .top-tickets {
          margin-top: 15px;
          border-top: 1px solid #3c3c3c;
          padding-top: 12px;
          text-align: left;
        }

        .top-tickets-label {
          font-size: 11px;
          color: #007acc;
          margin-bottom: 8px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .top-ticket-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          margin-bottom: 5px;
          padding: 3px 0;
        }

        .top-ticket-item:last-child {
          margin-bottom: 0;
        }

        .ticket-time {
          color: #f14c4c;
          font-weight: 600;
        }

        .alerts-section {
          margin-bottom: 30px;
        }

        .alerts-section h3 {
          color: #f14c4c;
          margin-bottom: 15px;
          font-weight: 600;
        }

        .alerts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 15px;
        }

        .alert-card {
          padding: 15px;
          border-radius: 6px;
          border-left: 4px solid;
          background: #252526;
          border: 1px solid #3c3c3c;
          transition: all 0.3s ease;
        }

        .alert-card:hover {
          background: #2d2d30;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        .alert-card.expanded {
          background: #2d2d30;
        }

        .alert-critical {
          border-left-color: #f14c4c;
          background: #2d1b1b;
          border-color: #5a2d2d;
        }

        .alert-warning {
          border-left-color: #ffcc02;
          background: #2d2619;
          border-color: #5a4d2d;
        }

        .alert-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
          color: #ffffff;
          cursor: pointer;
          padding: 5px;
          border-radius: 3px;
          transition: background 0.2s ease;
        }

        .alert-header:hover {
          background: rgba(255,255,255,0.1);
        }

        .expand-icon {
          margin-left: auto;
          font-size: 12px;
          color: #007acc;
          transition: transform 0.2s ease;
        }

        .alert-count {
          margin-left: auto;
          background: #f14c4c;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.9em;
          font-weight: 600;
        }

        .tabs-section {
          background: #252526;
          border-radius: 6px;
          border: 1px solid #3c3c3c;
          overflow: hidden;
        }

        .tab-nav {
          display: flex;
          background: #2d2d30;
          border-bottom: 1px solid #3c3c3c;
        }

        .tab-nav button {
          padding: 15px 25px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-weight: 500;
          color: #9d9d9d;
          transition: all 0.2s ease;
          border-bottom: 3px solid transparent;
        }

        .tab-nav button.active {
          background: #252526;
          color: #ffffff;
          border-bottom: 3px solid #007acc;
        }

        .tab-nav button:hover:not(.active) {
          background: #3c3c3c;
          color: #cccccc;
        }

        .tab-content {
          padding: 30px;
          background: #252526;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 30px;
        }

        .chart-container {
          background: #2d2d30;
          padding: 20px;
          border-radius: 6px;
          border: 1px solid #3c3c3c;
        }

        .chart-container h4 {
          margin-bottom: 20px;
          color: #ffffff;
          font-weight: 600;
        }

        .priority-chart,
        .state-chart {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .priority-bar,
        .state-bar {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .priority-label,
        .state-label {
          width: 80px;
          font-weight: 600;
          font-size: 0.9em;
          color: #cccccc;
        }

        .bar-container {
          flex: 1;
          height: 20px;
          background: #1e1e1e;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #3c3c3c;
        }

        .bar-fill {
          height: 100%;
          transition: width 0.5s ease;
        }

        .priority-count,
        .state-count {
          width: 40px;
          text-align: right;
          font-weight: 600;
          font-size: 0.9em;
          color: #ffffff;
        }

        .operators-table-container {
          overflow-x: auto;
          background: #252526;
          border-radius: 6px;
          border: 1px solid #3c3c3c;
        }

        .operators-table {
          width: 100%;
          border-collapse: collapse;
          background: #252526;
        }

        .operators-table th,
        .operators-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #3c3c3c;
          color: #cccccc;
        }

        .operators-table th {
          background: #2d2d30;
          font-weight: 600;
          color: #ffffff;
        }

        .operators-table tr:hover {
          background: #2d2d30;
        }

        .delayed {
          color: #f14c4c;
          font-weight: bold;
        }

        .high-delay {
          color: #f14c4c;
          font-weight: bold;
        }

        .btn-small {
          padding: 5px 10px;
          background: #0e639c;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 0.9em;
          transition: background 0.2s ease;
        }

        .btn-small:hover {
          background: #1177bb;
        }

        .advanced-charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 30px;
        }

        .full-width {
          grid-column: 1 / -1;
          margin-bottom: 30px;
        }

        .bottom-charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 30px;
        }

        .trend-chart {
          padding: 20px 0;
        }

        .trend-bars {
          display: flex;
          justify-content: space-around;
          align-items: end;
          height: 200px;
          border-bottom: 2px solid #3c3c3c;
          padding: 20px 0;
        }

        .trend-day {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .trend-date {
          font-size: 0.8em;
          color: #9d9d9d;
          font-weight: 600;
        }

        .trend-bar-group {
          display: flex;
          gap: 3px;
          align-items: end;
        }

        .trend-bar {
          width: 15px;
          min-height: 5px;
          border-radius: 2px;
        }

        .trend-bar.opened {
          background-color: #007acc;
        }

        .trend-bar.closed {
          background-color: #00bc7e;
        }

        .trend-values {
          display: flex;
          gap: 5px;
          font-size: 0.8em;
        }

        .opened-count {
          color: #007acc;
          font-weight: bold;
        }

        .closed-count {
          color: #00bc7e;
          font-weight: bold;
        }

        .resolution-time-chart {
          display: flex;
          flex-direction: column;
          gap: 15px;
          padding: 20px 0;
        }

        .resolution-bar {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .resolution-bar-container {
          flex: 1;
          height: 25px;
          background: #1e1e1e;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #3c3c3c;
        }

        .resolution-bar-fill {
          height: 100%;
          border-radius: 12px;
          transition: width 0.5s ease;
        }

        .resolution-time {
          width: 80px;
          text-align: right;
          font-weight: 600;
          font-size: 0.9em;
          color: #ffffff;
        }

        .activity-heatmap {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 20px 0;
        }

        .operator-activity-row {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .operator-name {
          width: 120px;
          font-weight: 600;
          font-size: 0.9em;
          text-align: right;
          color: #cccccc;
        }

        .activity-cells {
          display: flex;
          gap: 3px;
        }

        .activity-cell {
          width: 25px;
          height: 25px;
          border-radius: 3px;
          border: 1px solid #3c3c3c;
          background: #1e1e1e;
        }

        .total-activity {
          width: 40px;
          text-align: center;
          font-weight: 600;
          font-size: 0.9em;
          color: #ffffff;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: #252526;
          border-radius: 6px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          border: 1px solid #3c3c3c;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #3c3c3c;
          background: #2d2d30;
        }

        .modal-header h3 {
          color: #ffffff;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5em;
          cursor: pointer;
          color: #9d9d9d;
          transition: color 0.2s ease;
        }

        .close-btn:hover {
          color: #ffffff;
        }

        .modal-body {
          padding: 20px;
          background: #252526;
          color: #cccccc;
        }

        .operator-stats {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .stat-group h4 {
          color: #ffffff;
          margin-bottom: 10px;
          font-weight: 600;
        }

        .timeline {
          max-height: 300px;
          overflow-y: auto;
        }

        .timeline-event {
          display: flex;
          gap: 15px;
          padding: 10px 0;
          border-bottom: 1px solid #3c3c3c;
        }

        .timeline-date {
          font-size: 0.9em;
          color: #9d9d9d;
          white-space: nowrap;
        }

        .timeline-content {
          flex: 1;
          color: #cccccc;
        }

        .error {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }

        .error-message {
          text-align: center;
          padding: 40px;
          background: #252526;
          border-radius: 6px;
          border-left: 4px solid #f14c4c;
          border: 1px solid #5a2d2d;
          color: #cccccc;
        }

        .error-message h3 {
          color: #f14c4c;
          margin-bottom: 15px;
        }

        .error-message button {
          margin-top: 15px;
          padding: 10px 20px;
          background: #0e639c;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .error-message button:hover {
          background: #1177bb;
        }

        /* Alert Expanded Content */
        .alert-expanded-content {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #3c3c3c;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 300px;
          }
        }

        .alert-actions {
          margin-bottom: 15px;
        }

        .alert-action-btn {
          padding: 8px 16px;
          background: #0e639c;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background 0.2s ease;
        }

        .alert-action-btn:hover {
          background: #1177bb;
        }

        .ticket-preview {
          background: #1e1e1e;
          border-radius: 4px;
          padding: 12px;
          border: 1px solid #3c3c3c;
        }

        .preview-header {
          font-size: 12px;
          color: #007acc;
          margin-bottom: 8px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .preview-ticket {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 0;
          border-bottom: 1px solid #2d2d30;
          font-size: 12px;
        }

        .preview-ticket:last-child {
          border-bottom: none;
        }

        .preview-ticket-id {
          color: #007acc;
          font-family: 'Courier New', monospace;
          font-weight: 600;
          min-width: 60px;
        }

        .preview-ticket-subject {
          flex: 1;
          color: #cccccc;
        }

        .preview-ticket-state {
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 600;
          color: #000000;
          min-width: 60px;
          text-align: center;
        }

        .preview-more {
          text-align: center;
          font-size: 11px;
          color: #9d9d9d;
          margin-top: 8px;
          font-style: italic;
        }

        /* Alert Modal */
        .alert-modal-content {
          background: #252526;
          border-radius: 6px;
          max-width: 1000px;
          width: 95%;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid #3c3c3c;
        }

        .alert-modal-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .alert-modal-title h3 {
          margin: 0;
          color: #ffffff;
        }

        .alert-description {
          margin-bottom: 20px;
          padding: 15px;
          background: #2d2d30;
          border-radius: 4px;
          border-left: 4px solid #007acc;
        }

        .alert-description p {
          margin: 0;
          color: #cccccc;
          font-size: 14px;
        }

        .tickets-table-container {
          overflow-x: auto;
          background: #1e1e1e;
          border-radius: 6px;
          border: 1px solid #3c3c3c;
        }

        .tickets-table {
          width: 100%;
          border-collapse: collapse;
          background: #1e1e1e;
          font-size: 13px;
        }

        .tickets-table th,
        .tickets-table td {
          padding: 12px 8px;
          text-align: left;
          border-bottom: 1px solid #3c3c3c;
          color: #cccccc;
        }

        .tickets-table th {
          background: #2d2d30;
          font-weight: 600;
          color: #ffffff;
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .tickets-table tr:hover {
          background: #252526;
        }

        .ticket-number {
          font-family: 'Courier New', monospace;
          font-weight: 600;
          color: #007acc;
          min-width: 80px;
        }

        .ticket-subject {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .priority-badge,
        .state-badge {
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          color: #000000;
          display: inline-block;
          min-width: 30px;
          text-align: center;
        }

        .assigned-to {
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .resolved-by {
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #cccccc;
        }

        .opened-date,
        .updated-date {
          min-width: 90px;
          font-size: 12px;
          color: #9d9d9d;
        }

        @media (max-width: 768px) {
          .filters-section {
            flex-direction: column;
            align-items: stretch;
          }

          .kpi-section {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          }

          .charts-grid {
            grid-template-columns: 1fr;
          }

          .tab-nav {
            flex-direction: column;
          }

          .alert-modal-content {
            width: 98%;
            max-height: 95vh;
          }

          .tickets-table {
            font-size: 11px;
          }

          .tickets-table th,
          .tickets-table td {
            padding: 8px 4px;
          }

          .ticket-subject {
            max-width: 120px;
          }

          .assigned-to {
            max-width: 80px;
          }
          .resolved-by {
            max-width: 80px;
          }
        }

        /* Trend Analysis Table Styling */
        .trend-table-container {
          overflow-x: auto;
          background: #1e1e1e;
          border-radius: 6px;
          border: 1px solid #3c3c3c;
          margin-top: 15px;
        }

        .trend-table {
          width: 100%;
          border-collapse: collapse;
          background: #1e1e1e;
          font-size: 13px;
          min-width: 500px;
        }

        .trend-table th,
        .trend-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid #3c3c3c;
          color: #cccccc;
        }

        .trend-table th {
          background: #2d2d30;
          font-weight: 600;
          color: #ffffff;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .trend-table tr:hover {
          background: #252526;
        }

        .trend-date {
          font-family: 'Courier New', monospace;
          font-weight: 600;
          color: #007acc;
          min-width: 80px;
        }

        .trend-opened {
          text-align: center;
          font-weight: 600;
          color: #f14c4c;
        }

        .trend-closed {
          text-align: center;
          font-weight: 600;
          color: #73c991;
        }

        .trend-balance {
          text-align: center;
          font-weight: 700;
          font-family: 'Courier New', monospace;
        }

        .trend-balance.positive {
          color: #f14c4c;
          background: rgba(241, 76, 76, 0.1);
          border-radius: 4px;
        }

        .trend-balance.negative {
          color: #73c991;
          background: rgba(115, 201, 145, 0.1);
          border-radius: 4px;
        }

        .trend-balance.neutral {
          color: #007acc;
          background: rgba(0, 122, 204, 0.1);
          border-radius: 4px;
        }

        .trend-status {
          text-align: center;
          font-weight: 600;
          font-size: 12px;
        }

        .trend-status.trend-balanced {
          color: #007acc;
        }

        .trend-status.trend-accumulation {
          color: #ffcc02;
        }

        .trend-status.trend-deficit {
          color: #73c991;
        }

        @media (max-width: 768px) {
          .trend-table-container {
            margin-top: 10px;
          }

          .trend-table {
            font-size: 11px;
            min-width: 400px;
          }

          .trend-table th,
          .trend-table td {
            padding: 8px 6px;
          }

          .trend-date {
            min-width: 60px;
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default TicketDashboard;