import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../hooks/useStore';
import { TicketDashboardActions, TicketData, Alert, OperatorMetrics } from '../actions/TicketDashboardActions';
import ExpandableCardButton from './ExpandableCardButton';
import '../../styles/ticket-dashboard.css';

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
    if (import.meta.env.DEV) console.log('[TICKET-DASHBOARD] File selected:', file.name, 'Size:', file.size);
    setIsProcessing(true);
    try {
      const csvContent = await file.text();
      if (import.meta.env.DEV) console.log('[TICKET-DASHBOARD] CSV content loaded, length:', csvContent.length);
      actions.importCsvData(csvContent);
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
      default: return 'var(--text-primary)';
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
                <ExpandableCardButton
                  expanded={expandedResolutionCard}
                  onClick={() => setExpandedResolutionCard(!expandedResolutionCard)}
                  ariaLabel="Toggle resolution time details"
                  cardType="kpi"
                >
                  <div className="kpi-value">
                    {dashboardMetrics?.averageResolutionTime ? formatDuration(dashboardMetrics.averageResolutionTime) : 'No data'}
                  </div>
                  <div className="kpi-label">Avg Resolution Time</div>
                </ExpandableCardButton>

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
                <ExpandableCardButton
                  expanded={expandedBacklogCard}
                  onClick={() => setExpandedBacklogCard(!expandedBacklogCard)}
                  ariaLabel="Toggle backlog details"
                  cardType="kpi"
                >
                  <div className="kpi-value">{dashboardMetrics?.backlogCurrent || 0}</div>
                  <div className="kpi-label">Current Backlog</div>
                </ExpandableCardButton>

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
                    <ExpandableCardButton
                      expanded={expandedAlerts.has(index)}
                      onClick={() => toggleAlertExpansion(index)}
                      ariaLabel={`${alert.title}, ${alert.count} alerts`}
                      cardType="alert"
                      iconPosition="trailing"
                      icon={<span className="alert-icon" aria-hidden="true">{getAlertIcon(alert.type)}</span>}
                    >
                      <strong>{alert.title}</strong>
                      <span className="alert-count">{alert.count}</span>
                    </ExpandableCardButton>
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
            <div className="modal-overlay" role="presentation" onClick={() => setShowOperatorModal(false)}>
              <div
                className="modal-content"
                role="dialog"
                aria-modal="true"
                aria-labelledby="operator-modal-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h3 id="operator-modal-title">Operator Details: {selectedOperator}</h3>
                  <button
                    className="close-btn"
                    onClick={() => setShowOperatorModal(false)}
                    aria-label="Close operator details modal"
                  >×</button>
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
            <div className="modal-overlay" role="presentation" onClick={closeAlertModal}>
              <div
                className="alert-modal-content"
                role="dialog"
                aria-modal="true"
                aria-labelledby="alert-modal-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <div className="alert-modal-title">
                    <span className="alert-icon" aria-hidden="true">{getAlertIcon(selectedAlert.type)}</span>
                    <h3 id="alert-modal-title">{selectedAlert.title} ({selectedAlert.count} tickets)</h3>
                  </div>
                  <button
                    className="close-btn"
                    onClick={closeAlertModal}
                    aria-label="Close alert details modal"
                  >×</button>
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
    </div>
  );
};

export default TicketDashboard;