import React, { useState, useEffect } from 'react';
import './PowerBIReport.css';
import {
  X,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  Download,
  RefreshCw,
  Maximize2,
} from 'lucide-react';
import './PowerBIReport.css';

const PowerBIReport = ({ data, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState(null);

  // Parse and analyze Pulse data
  const analytics = React.useMemo(() => {
    if (!data || !data.results) return null;

    const allActivities = [];
    
    data.results.forEach(sheet => {
      if (sheet.data && Array.isArray(sheet.data)) {
        allActivities.push(...sheet.data);
      }
    });

    const totalActivities = allActivities.length;
    const completedActivities = allActivities.filter(a => 
      a['Actual start date as A'] || a['flag'] === 'Completed'
    ).length;
    
    const delayed = allActivities.filter(a => 
      a['deviation'] && parseFloat(a['deviation']) > 0
    ).length;

    const onTrack = allActivities.filter(a => 
      a['deviation'] && parseFloat(a['deviation']) <= 0
    ).length;

    // Stage gate distribution
    const stageGates = {};
    allActivities.forEach(a => {
      const stage = a['Stage gate'] || 'Unknown';
      stageGates[stage] = (stageGates[stage] || 0) + 1;
    });

    // Deviation analysis
    const deviations = allActivities
      .filter(a => a['deviation'] !== null && a['deviation'] !== undefined)
      .map(a => parseFloat(a['deviation']) || 0);
    
    const avgDeviation = deviations.length > 0 
      ? deviations.reduce((a, b) => a + b, 0) / deviations.length 
      : 0;

    return {
      totalActivities,
      completedActivities,
      delayed,
      onTrack,
      completionRate: totalActivities > 0 ? (completedActivities / totalActivities * 100).toFixed(1) : 0,
      stageGates,
      avgDeviation: avgDeviation.toFixed(2),
      activities: allActivities,
    };
  }, [data]);

  if (!analytics) {
    return (
      <div className="powerbi-loading">
        <RefreshCw className="spinning" size={32} />
        <p>Processing data...</p>
      </div>
    );
  }

  const KPICard = ({ title, value, subtitle, icon: Icon, trend, color = 'green', kpiKey }) => (
    <div
      className={`kpi-card kpi-${color}${kpiKey ? ' kpi-clickable' : ''}${selectedKPI === kpiKey ? ' kpi-active' : ''}`}
      onClick={kpiKey ? () => setSelectedKPI(selectedKPI === kpiKey ? null : kpiKey) : undefined}
    >
      <div className="kpi-icon">
        <Icon size={24} />
      </div>
      <div className="kpi-content">
        <div className="kpi-value">{value}</div>
        <div className="kpi-title">{title}</div>
        {subtitle && <div className="kpi-subtitle">{subtitle}</div>}
        {trend && (
          <div className={`kpi-trend ${trend > 0 ? 'positive' : 'negative'}`}>
            {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );

  const KPIBreakdownChart = () => {
    let chartData = [];
    let chartTitle = '';

    if (selectedKPI === 'total' || selectedKPI === 'ontrack' || selectedKPI === 'delayed') {
      const groups = {};
      analytics.activities.forEach((a) => {
        const stage = a['Stage gate'] || 'Other';
        if (!groups[stage]) groups[stage] = { total: 0, onTrack: 0, delayed: 0 };
        groups[stage].total++;
        const dev = parseFloat(a['deviation']) || 0;
        if (dev > 0) groups[stage].delayed++;
        else groups[stage].onTrack++;
      });
      const entries = Object.entries(groups).sort((a, b) => b[1].total - a[1].total).slice(0, 10);
      if (selectedKPI === 'total') {
        chartTitle = 'Total Activities by Stage Gate';
        chartData = entries.map(([label, v]) => ({ label, value: v.total }));
      } else if (selectedKPI === 'ontrack') {
        chartTitle = 'On Track Activities by Stage Gate';
        chartData = entries.map(([label, v]) => ({ label, value: v.onTrack }));
      } else {
        chartTitle = 'Delayed Activities by Stage Gate';
        chartData = entries.map(([label, v]) => ({ label, value: v.delayed }));
      }
    } else if (selectedKPI === 'completion') {
      chartTitle = 'Activities Status';
      chartData = [
        { label: 'Completed', value: analytics.completedActivities },
        { label: 'In Progress', value: analytics.totalActivities - analytics.completedActivities },
      ];
    }

    if (chartData.length === 0) return null;
    const maxVal = Math.max(...chartData.map((d) => d.value), 1);

    return (
      <div className="pbi-breakdown-chart">
        <div className="pbi-breakdown-header">
          <span className="pbi-breakdown-title">{chartTitle}</span>
          <button className="pbi-breakdown-close" onClick={() => setSelectedKPI(null)}>
            <X size={14} />
          </button>
        </div>
        <div className="pbi-breakdown-bars">
          {chartData.map(({ label, value }, i) => (
            <div key={i} className="pbi-breakdown-row">
              <div className="pbi-breakdown-label" title={label}>{label}</div>
              <div className="pbi-breakdown-track">
                <div
                  className="pbi-breakdown-fill"
                  style={{ width: value > 0 ? `${Math.max(4, (value / maxVal) * 100)}%` : '0%' }}
                />
              </div>
              <div className="pbi-breakdown-count">{value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const StageGateChart = () => {
    const maxCount = Math.max(...Object.values(analytics.stageGates));
    
    return (
      <div className="chart-container">
        <h3>Stage Gate Distribution</h3>
        <div className="bar-chart">
          {Object.entries(analytics.stageGates).map(([stage, count]) => (
            <div key={stage} className="bar-item">
              <div className="bar-label">{stage}</div>
              <div className="bar-wrapper">
                <div 
                  className="bar-fill"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                >
                  <span className="bar-value">{count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const DeviationChart = () => {
    const deviationRanges = {
      'On Time (<= 0)': 0,
      'Slight Delay (1-5)': 0,
      'Moderate Delay (6-15)': 0,
      'High Delay (>15)': 0,
    };

    analytics.activities.forEach(a => {
      const dev = parseFloat(a['deviation']) || 0;
      if (dev <= 0) deviationRanges['On Time (<= 0)']++;
      else if (dev <= 5) deviationRanges['Slight Delay (1-5)']++;
      else if (dev <= 15) deviationRanges['Moderate Delay (6-15)']++;
      else deviationRanges['High Delay (>15)']++;
    });

    const colors = ['#10b981', '#fbbf24', '#f59e0b', '#ef4444'];

    return (
      <div className="chart-container">
        <h3>Deviation Analysis</h3>
        <div className="pie-chart">
          <div className="pie-legend">
            {Object.entries(deviationRanges).map(([range, count], index) => (
              <div key={range} className="legend-item">
                <div 
                  className="legend-color" 
                  style={{ backgroundColor: colors[index] }}
                ></div>
                <span className="legend-label">{range}</span>
                <span className="legend-value">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const ActivityTable = () => {
    const recentActivities = analytics.activities.slice(0, 10);

    return (
      <div className="chart-container">
        <h3>Recent Activities</h3>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Activity Code</th>
                <th>Activity</th>
                <th>Stage Gate</th>
                <th>EP Dates</th>
                <th>Deviation</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentActivities.map((activity, index) => (
                <tr key={index}>
                  <td>{activity['Activity code'] || '-'}</td>
                  <td className="activity-name">{activity['Activity'] || '-'}</td>
                  <td>{activity['Stage gate'] || '-'}</td>
                  <td>{activity['EP dates'] || '-'}</td>
                  <td>
                    <span className={`deviation-badge ${parseFloat(activity['deviation']) > 0 ? 'negative' : 'positive'}`}>
                      {activity['deviation'] || '0'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${activity['flag'] === 'Completed' ? 'completed' : 'pending'}`}>
                      {activity['flag'] || 'In Progress'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className={`powerbi-report-overlay ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="powerbi-report-container">
        {/* Header */}
        <div className="powerbi-header">
          <div className="powerbi-title">
            <BarChart3 size={24} />
            <div>
              <h2>Pulse Analytics Dashboard</h2>
              <p>Project Performance Report - {data.filename}</p>
            </div>
          </div>
          <div className="powerbi-actions">
            <button className="powerbi-action-btn" title="Refresh">
              <RefreshCw size={18} />
            </button>
            <button 
              className="powerbi-action-btn" 
              onClick={() => setIsFullscreen(!isFullscreen)}
              title="Toggle Fullscreen"
            >
              <Maximize2 size={18} />
            </button>
            <button className="powerbi-action-btn" title="Export">
              <Download size={18} />
            </button>
            <button className="powerbi-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="powerbi-tabs">
          <button 
            className={`powerbi-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={16} />
            Overview
          </button>
          <button 
            className={`powerbi-tab ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            <Calendar size={16} />
            Timeline
          </button>
          <button 
            className={`powerbi-tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <PieChart size={16} />
            Detailed View
          </button>
        </div>

        {/* Content */}
        <div className="powerbi-content">
          {activeTab === 'overview' && (
            <>
              {/* KPI Cards */}
              <div className="kpi-grid">
                <KPICard
                  title="Total Activities"
                  value={analytics.totalActivities}
                  subtitle="Click to view breakdown"
                  icon={Activity}
                  color="blue"
                  kpiKey="total"
                />
                <KPICard
                  title="Completion Rate"
                  value={`${analytics.completionRate}%`}
                  subtitle={`${analytics.completedActivities} completed — click for chart`}
                  icon={CheckCircle}
                  color="green"
                  trend={5}
                  kpiKey="completion"
                />
                <KPICard
                  title="On Track"
                  value={analytics.onTrack}
                  subtitle="Click to view breakdown"
                  icon={Clock}
                  color="green"
                  kpiKey="ontrack"
                />
                <KPICard
                  title="Delayed"
                  value={analytics.delayed}
                  subtitle={`Avg: ${analytics.avgDeviation} days — click for chart`}
                  icon={AlertTriangle}
                  color="red"
                  trend={-3}
                  kpiKey="delayed"
                />
              </div>

              {/* KPI Breakdown Chart */}
              {selectedKPI && <KPIBreakdownChart />}

              {/* Charts */}
              <div className="charts-grid">
                <StageGateChart />
                <DeviationChart />
              </div>

              {/* Activity Table */}
              <ActivityTable />
            </>
          )}

          {activeTab === 'timeline' && (
            <div className="timeline-view">
              <div className="chart-container">
                <h3>Project Timeline</h3>
                <p className="placeholder-text">
                  Timeline visualization coming soon. This will show Gantt chart 
                  with planned vs actual dates, milestones, and critical path.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="details-view">
              <ActivityTable />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="powerbi-footer">
          <div className="powerbi-footer-info">
            <span>Last updated: {new Date().toLocaleString()}</span>
            <span>•</span>
            <span>{analytics.totalActivities} records analyzed</span>
          </div>
          <div className="powerbi-branding">
            Powered by Theta Pulse Analytics
          </div>
        </div>
      </div>
    </div>
  );
};

export default PowerBIReport;
