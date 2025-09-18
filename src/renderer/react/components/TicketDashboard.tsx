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
  const [activeTab, setActiveTab] = useState('overview');
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial data if available
  useEffect(() => {
    if (ticketData.length > 0 && !dashboardMetrics) {
      actions.applyTimeFilter('all-time');
    }
  }, [ticketData.length]);

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      const csvContent = await file.text();
      actions.importCsvData(csvContent);
    } catch (error) {
      console.error('Error processing file:', error);
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
    if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours.toFixed(1)}h`;
    }
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
      case 'P1': return '#ff4444';
      case 'P2': return '#ff8800';
      case 'P3': return '#ffcc00';
      case 'P4': return '#88cc00';
      case 'P5': return '#00cc88';
      case 'P6': return '#00aacc';
      case 'P7': return '#0088dd';
      case 'P8': return '#0066ff';
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
      <div className="dashboard-header">
        <h1>IT Support Team Performance Dashboard</h1>
        <p>Analyze support ticket metrics and team performance</p>
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
                <option value="last-month">Last Month</option>
                <option value="last-3-months">Last 3 Months</option>
                <option value="last-6-months">Last 6 Months</option>
                <option value="current-year">Current Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Priority:</label>
              <select
                value={additionalFilters.priority || 'all'}
                onChange={(e) => actions.applyAdditionalFilters({
                  ...additionalFilters,
                  priority: e.target.value === 'all' ? undefined : [e.target.value]
                })}
              >
                <option value="all">All Priorities</option>
                <option value="P1">P1 - Critical</option>
                <option value="P2">P2 - High</option>
                <option value="P3">P3 - Medium</option>
                <option value="P4">P4 - Low</option>
                <option value="P5">P5 - Very Low</option>
                <option value="P6">P6 - Low+</option>
                <option value="P7">P7 - Minor</option>
                <option value="P8">P8 - Trivial</option>
              </select>
            </div>

            <div className="filter-group">
              <label>State:</label>
              <select
                value={additionalFilters.state || 'all'}
                onChange={(e) => actions.applyAdditionalFilters({
                  ...additionalFilters,
                  state: e.target.value === 'all' ? undefined : [e.target.value]
                })}
              >
                <option value="all">All States</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending">Pending</option>
                <option value="On Hold">On Hold</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
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
              <div className="kpi-card">
                <div className="kpi-value">{dashboardMetrics?.totalTickets || 0}</div>
                <div className="kpi-label">Total Tickets</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value">
                  {dashboardMetrics?.averageResolutionTime ? formatDuration(dashboardMetrics.averageResolutionTime) : 'No data'}
                </div>
                <div className="kpi-label">Avg Resolution Time</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value">{dashboardMetrics?.openTickets || 0}</div>
                <div className="kpi-label">Open Tickets</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value">{dashboardMetrics?.closedTickets || 0}</div>
                <div className="kpi-label">Closed Tickets</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value">{dashboardMetrics?.resolutionRate?.toFixed(1) || '0.0'}%</div>
                <div className="kpi-label">Resolution Rate</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value">{dashboardMetrics?.backlogCurrent || 0}</div>
                <div className="kpi-label">Current Backlog</div>
              </div>
            </div>

          {/* Alerts Section */}
          {dashboardAlerts.length > 0 && (
            <div className="alerts-section">
              <h3>🚨 Critical Alerts</h3>
              <div className="alerts-grid">
                {dashboardAlerts.map((alert, index) => (
                  <div key={index} className={`alert-card alert-${alert.type}`}>
                    <div className="alert-header">
                      <span className="alert-icon">{getAlertIcon(alert.type)}</span>
                      <strong>{alert.title}</strong>
                      <span className="alert-count">{alert.count}</span>
                    </div>
                    <p>{alert.description}</p>
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
                        {['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'].map(priority => {
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
                    <h4>Operator Performance Ranking</h4>
                    <table className="operators-table">
                      <thead>
                        <tr>
                          <th>Operator</th>
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
                  <div className="advanced-charts-grid">
                    <div className="chart-container">
                      <h4>Ticket Trend Analysis</h4>
                      <div className="trend-chart">
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

                          const sortedDates = Object.keys(dailyStats).sort().slice(-7); // Last 7 days

                          return (
                            <div className="trend-bars">
                              {sortedDates.map(date => (
                                <div key={date} className="trend-day">
                                  <div className="trend-date">{new Date(date).toLocaleDateString('en', {month: 'short', day: 'numeric'})}</div>
                                  <div className="trend-bar-group">
                                    <div
                                      className="trend-bar opened"
                                      style={{height: `${Math.max(10, dailyStats[date].opened * 10)}px`}}
                                      title={`Opened: ${dailyStats[date].opened}`}
                                    />
                                    <div
                                      className="trend-bar closed"
                                      style={{height: `${Math.max(5, dailyStats[date].closed * 10)}px`}}
                                      title={`Closed: ${dailyStats[date].closed}`}
                                    />
                                  </div>
                                  <div className="trend-values">
                                    <span className="opened-count">{dailyStats[date].opened}</span>
                                    <span className="closed-count">{dailyStats[date].closed}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="chart-container">
                      <h4>Resolution Time by Priority</h4>
                      <div className="resolution-time-chart">
                        {['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'].map(priority => {
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

        .dashboard-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .dashboard-header h1 {
          color: #ffffff;
          margin-bottom: 10px;
          font-weight: 600;
        }

        .dashboard-header p {
          color: #9d9d9d;
          font-size: 1.1em;
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
        }
      `}</style>
    </div>
  );
};

export default TicketDashboard;