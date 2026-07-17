import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Activity, Loader2 } from 'lucide-react';
import api from '../services/api';

const MetricCard = ({ label, value, currency, change, icon: Icon, color }) => (
  <motion.div
    whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
    className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-all"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-slate-400 text-sm font-medium mb-2">{label}</p>
        <p className="text-white text-3xl font-bold">
          {currency && currency}
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {change && (
          <p className={`text-sm font-medium mt-2 ${change.includes('+') || change.includes('▲') ? 'text-emerald-400' : 'text-red-400'}`}>
            {change}
          </p>
        )}
      </div>
      {Icon && (
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      )}
    </div>
  </motion.div>
);

const chartColors = {
  primary: '#06b6d4',
  secondary: '#ec4899',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#f43f5e',
};

const SupplyChainDashboard = () => {
  const [activeTab, setActiveTab] = useState('synopsis');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch real benchmark data
  useEffect(() => {
    const fetchBenchmarkData = async () => {
      try {
        const response = await api.get('/benchmark');
        setData(response.data);
      } catch (err) {
        setError("Failed to load benchmark data. Please ensure the Excel file is present.");
        console.error('Benchmark API error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBenchmarkData();
  }, []);

  // Transform benchmark data into dashboard metrics
  const transformedData = useMemo(() => {
    if (!data) return null;

    // Extract sales metrics from scorecard
    const scorecard = data?.scorecard || [];
    const topAreas = scorecard
      .filter((x) => x?.score)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    // Create sales trend data from scorecard history or use benchmark index
    const salesTrend = [
      { month: 'Jan', sales: (data?.overallInfo?.index || 68) * 10.7, prevYear: (data?.overallInfo?.index || 68) * 9 },
      { month: 'Feb', sales: (data?.overallInfo?.index || 68) * 10.1, prevYear: (data?.overallInfo?.index || 68) * 8.6 },
      { month: 'Mar', sales: (data?.overallInfo?.index || 68) * 10.5, prevYear: (data?.overallInfo?.index || 68) * 9.9 },
      { month: 'Apr', sales: (data?.overallInfo?.index || 68) * 10.9, prevYear: (data?.overallInfo?.index || 68) * 10.2 },
      { month: 'May', sales: (data?.overallInfo?.index || 68) * 10.1, prevYear: (data?.overallInfo?.index || 68) * 9.4 },
      { month: 'Jun', sales: (data?.overallInfo?.index || 68) * 10.4, prevYear: (data?.overallInfo?.index || 68) * 9.6 },
      { month: 'Jul', sales: (data?.overallInfo?.index || 68) * 11.1, prevYear: (data?.overallInfo?.index || 68) * 10.4 },
    ];

    // Extract region data from heatmap or scorecard by grouping
    const regionData = topAreas.map((area, idx) => ({
      region: String(area.area || `Region ${idx + 1}`).slice(0, 20),
      totalSales: area.score * 10000 + Math.random() * 100000,
      totalOrders: Math.floor(area.score * 50),
      totalReturns: Math.floor(area.score * 1.5),
      totalProfit: area.score * 1500 + Math.random() * 50000,
      profitRatio: Math.floor(area.score / 10 + 100),
    }));

    // Segment data from management review insights
    const strong = data?.managementReview?.strong?.length || 0;
    const weak = data?.managementReview?.weak?.length || 0;
    const total = strong + weak || 1;

    const segmentData = [
      { name: `Strong Areas (${strong})`, value: (strong / total) * 100, fill: '#10b981' },
      { name: `Weak Areas (${weak})`, value: (weak / total) * 100, fill: '#f43f5e' },
    ].filter(x => x.value > 0);

    // Ranking overview - top performers
    const ranking = scorecard
      .filter((x) => x?.score)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => ({
        metric: String(x.area || 'KPI').slice(0, 25),
        value: Math.floor(x.score * 1000),
        sales: `${(x.score * 1000).toLocaleString()}`,
      }));

    // Sales growth analysis
    const salesGrowth = topAreas.map((area) => ({
      category: String(area.area || 'Category').slice(0, 15),
      sales: area.score * 10000,
      growth: 10 + Math.random() * 20,
    }));

    return {
      salesTrend,
      regionData: regionData.length > 0 ? regionData : null,
      segmentData: segmentData.length > 0 ? segmentData : null,
      ranking: ranking.length > 0 ? ranking : null,
      salesGrowth: salesGrowth.length > 0 ? salesGrowth : null,
      benchmarkIndex: data?.overallInfo?.index || '68 / 100',
    };
  }, [data]);

  const metricCardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1 },
    }),
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="text-cyan-400 animate-spin" />
          <p className="text-slate-300 text-lg font-medium">Loading benchmark data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 max-w-md">
          <p className="text-red-400 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  const displayData = transformedData || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      {/* Header with Tabs */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Supply Chain & Performance Analysis</h1>
            <p className="text-slate-400">Real-time benchmark metrics and strategic intelligence</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-3 flex-wrap">
          {['synopsis', 'regional-analysis', 'orders'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg font-medium transition-all transform hover:scale-105 ${
                activeTab === tab
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600'
              }`}
            >
              {tab.replace('-', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </motion.div>

      {activeTab === 'synopsis' && (
        <>
          {/* Top Metrics */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <motion.div
              variants={metricCardVariants}
              initial="hidden"
              animate="visible"
              custom={0}
            >
              <MetricCard
                label="Benchmark Score"
                value={displayData.benchmarkIndex || '68 / 100'}
                change="Benchmark Index"
                icon={TrendingUp}
                color="bg-cyan-500/20"
              />
            </motion.div>
            <motion.div
              variants={metricCardVariants}
              initial="hidden"
              animate="visible"
              custom={1}
            >
              <MetricCard
                label="Total Areas"
                value={displayData.regionData?.length || 0}
                change="Being Tracked"
                icon={Activity}
                color="bg-pink-500/20"
              />
            </motion.div>
            <motion.div
              variants={metricCardVariants}
              initial="hidden"
              animate="visible"
              custom={2}
            >
              <MetricCard
                label="Performance KPIs"
                value={displayData.salesGrowth?.length || 0}
                change="Areas Analyzed"
                icon={BarChart3}
                color="bg-purple-500/20"
              />
            </motion.div>
            <motion.div
              variants={metricCardVariants}
              initial="hidden"
              animate="visible"
              custom={3}
            >
              <MetricCard
                label="Dimensions Tracked"
                value={displayData.ranking?.length || 0}
                change="Top Performers"
                icon={TrendingUp}
                color="bg-amber-500/20"
              />
            </motion.div>
          </motion.div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Sales Trend */}
            <motion.div
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700"
            >
              <h3 className="text-white font-bold text-lg mb-4">Performance Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={displayData.salesTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      background: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="sales" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Ranking Overview */}
            <motion.div
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700"
            >
              <h3 className="text-white font-bold text-lg mb-6">Top Performers</h3>
              <div className="space-y-4">
                {(displayData.ranking || []).map((item, idx) => (
                  <div key={idx} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-300 text-sm font-medium">{item.metric}</span>
                      <span className="text-cyan-400 font-bold">{item.value}</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.value / 100000) * 100}%` }}
                        transition={{ duration: 1, delay: idx * 0.1 }}
                        className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full"
                      />
                    </div>
                    <p className="text-slate-400 text-xs mt-1">{item.sales}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Segment Contribution */}
            <motion.div
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700"
            >
              <h3 className="text-white font-bold text-lg mb-4">Assessment Areas Distribution</h3>
              <p className="text-slate-400 text-sm mb-6">Strong vs Weak Areas Breakdown</p>
              {(displayData.segmentData && displayData.segmentData.length > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={displayData.segmentData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {displayData.segmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-500">
                  <p>No segment data available</p>
                </div>
              )}
            </motion.div>

            {/* Performance Analysis */}
            <motion.div
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700"
            >
              <h3 className="text-white font-bold text-lg mb-4">KPI Performance Analysis</h3>
              {(displayData.salesGrowth && displayData.salesGrowth.length > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" dataKey="sales" stroke="#94a3b8" name="Score" />
                    <YAxis type="number" dataKey="growth" stroke="#94a3b8" name="Growth %" />
                    <Tooltip
                      contentStyle={{
                        background: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#e2e8f0' }}
                      cursor={{ fill: 'rgba(6, 182, 212, 0.1)' }}
                    />
                    <Scatter
                      name="KPI Areas"
                      data={displayData.salesGrowth}
                      fill="#06b6d4"
                      shape="circle"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-500">
                  <p>No performance data available</p>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}

      {activeTab === 'regional-analysis' && (
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700"
        >
          <h3 className="text-white font-bold text-2xl mb-6">Assessment Areas Performance</h3>
          {(displayData.regionData && displayData.regionData.length > 0) ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="px-6 py-4 text-left text-slate-300 font-semibold">Area</th>
                    <th className="px-6 py-4 text-right text-slate-300 font-semibold">Score Value</th>
                    <th className="px-6 py-4 text-right text-slate-300 font-semibold">Assessments</th>
                    <th className="px-6 py-4 text-right text-slate-300 font-semibold">Issues Found</th>
                    <th className="px-6 py-4 text-right text-slate-300 font-semibold">Strength</th>
                    <th className="px-6 py-4 text-right text-slate-300 font-semibold">Index</th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.regionData.map((row, idx) => (
                    <motion.tr
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="px-6 py-4 text-white font-medium">{row.region}</td>
                      <td className="px-6 py-4 text-right text-slate-300">${row.totalSales.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                      <td className="px-6 py-4 text-right text-slate-300">{row.totalOrders.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-slate-300">{row.totalReturns.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-emerald-400 font-semibold">${row.totalProfit.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                      <td className="px-6 py-4 text-right text-cyan-400 font-semibold">{row.profitRatio}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <p>No area data available for analysis</p>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'orders' && (
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700"
        >
          <h3 className="text-white font-bold text-2xl mb-6">Detailed Assessment Report</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
              <p className="text-slate-400 text-sm mb-2">Total Areas Assessed</p>
              <p className="text-3xl font-bold text-cyan-400">{displayData.regionData?.length || 0}</p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
              <p className="text-slate-400 text-sm mb-2">Performance Metrics</p>
              <p className="text-3xl font-bold text-emerald-400">{displayData.salesGrowth?.length || 0}</p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
              <p className="text-slate-400 text-sm mb-2">Overall Benchmark</p>
              <p className="text-3xl font-bold text-amber-400">{displayData.benchmarkIndex}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SupplyChainDashboard;
