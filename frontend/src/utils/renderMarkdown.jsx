import React from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#0ea5e9', '#8b5cf6', '#ef4444', '#64748b'];

let _key = 0;
const key = () => _key++;

const asNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const renderCriticalPathTimeline = (config) => {
  const rows = Array.isArray(config?.data) ? config.data : [];
  if (rows.length === 0) return null;

  const normalizedRows = rows.map((row, index) => {
    const start = asNumber(row.start ?? row.baseline_start, 0);
    const end = asNumber(row.end ?? row.baseline_end ?? row.actual_end, start);
    const delayTo = asNumber(row.delay_to ?? row.forecast_end ?? row.recovery_end, end);
    const providedArrows = Array.isArray(row.delay_arrows) ? row.delay_arrows.map((v) => asNumber(v, delayTo)) : [];
    let arrows = providedArrows;
    if (!providedArrows.length && delayTo > end) {
      arrows = [delayTo];
    }
    return {
      id: row.id || `row_${index}`,
      name: row.name || row.label || `Activity ${index + 1}`,
      start,
      end,
      delayTo,
      arrows,
      color: row.color || '#0b2d5f',
    };
  });

  const allValues = normalizedRows.flatMap((row) => [row.start, row.end, row.delayTo, ...row.arrows]);
  const maxValue = Math.max(1, ...allValues);
  const minValue = Math.min(0, ...allValues);
  const span = Math.max(1, maxValue - minValue);

  const leftPad = 220;
  const rightPad = 30;
  const topPad = 46;
  const rowHeight = 84;
  const barHeight = 36;
  const timelineWidth = 760;
  const chartWidth = leftPad + timelineWidth + rightPad;
  const chartHeight = topPad + normalizedRows.length * rowHeight + 30;

  const scaleX = (value) => leftPad + ((value - minValue) / span) * timelineWidth;
  const gridTicks = 8;

  return (
    <div key={key()} className="md-chart-container" style={{ width: '100%', margin: '20px 0', padding: '15px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      {config.title && <h4 style={{ textAlign: 'center', marginBottom: 6, color: '#0f172a', fontWeight: '700' }}>{config.title}</h4>}
      {config.subtitle && <p style={{ textAlign: 'center', margin: '0 0 12px', color: '#475569', fontSize: 13 }}>{config.subtitle}</p>}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} aria-label={config.title || 'Critical path timeline chart'} style={{ width: '100%', minWidth: 780, height: 'auto' }}>
          <defs>
            <marker id="md-arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#d97706" />
            </marker>
          </defs>

          <rect x="0" y="0" width={chartWidth} height={chartHeight} fill="#f8fafc" rx="8" />

          {Array.from({ length: gridTicks + 1 }).map((_, idx) => {
            const tickValue = minValue + (span * idx) / gridTicks;
            const x = scaleX(tickValue);
            return (
              <g key={`grid_${Math.round(tickValue * 1000)}`}>
                <line x1={x} y1={topPad - 14} x2={x} y2={chartHeight - 24} stroke="#dbe2ea" strokeDasharray="4 4" />
                <text x={x} y={topPad - 20} textAnchor="middle" fill="#64748b" fontSize="11">{Math.round(tickValue)}</text>
              </g>
            );
          })}

          {normalizedRows.map((row, index) => {
            const y = topPad + index * rowHeight;
            const barX = scaleX(row.start);
            const barEndX = scaleX(row.end);
            const barWidth = Math.max(3, barEndX - barX);

            return (
              <g key={row.id}>
                <text x="14" y={y + barHeight / 2 + 3} fill="#334155" fontSize="12" fontWeight="600">{row.name}</text>
                <rect x={barX} y={y} width={barWidth} height={barHeight} rx="3" fill={row.color} />

                {row.arrows.map((arrowValue, arrowIdx) => {
                  const targetX = scaleX(arrowValue);
                  if (targetX <= barEndX) return null;
                  const yy = y + 10 + arrowIdx * 6;
                  return (
                    <line
                      key={`${row.id}_arrow_${arrowIdx}`}
                      x1={barEndX + 2}
                      y1={yy}
                      x2={targetX}
                      y2={yy}
                      stroke="#d97706"
                      strokeWidth="1.8"
                      markerEnd="url(#md-arrowhead)"
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      {config.source && <p style={{ margin: '10px 0 0', color: '#64748b', fontSize: 12 }}>Data Source: {config.source}</p>}
    </div>
  );
};

const renderChart = (config) => {
  const { type, data, xKey, yKey, title, dataKey } = config;
  if (!data || !Array.isArray(data)) return null;

  if (type === 'critical_path_timeline') {
    return renderCriticalPathTimeline(config);
  }

  if (type === 'pie' || type === 'PieChart') {
    return (
      <div key={key()} className="md-chart-container" style={{ width: '100%', height: 300, margin: '20px 0', padding: '15px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        {title && <h4 style={{textAlign:'center', marginBottom: 10, color:'#334155', fontWeight: '600'}}>{title}</h4>}
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey={dataKey || yKey || "value"}
              nameKey={xKey || "name"}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              label
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Default to BarChart
  return (
    <div key={key()} className="md-chart-container" style={{ width: '100%', height: 300, margin: '20px 0', padding: '15px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      {title && <h4 style={{textAlign:'center', marginBottom: 10, color:'#334155', fontWeight: '600'}}>{title}</h4>}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey={xKey || "name"} axisLine={false} tickLine={false} tick={{fill:'#64748b', fontSize: 12}} />
          <YAxis axisLine={false} tickLine={false} tick={{fill:'#64748b', fontSize: 12}} />
          <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
          <Legend wrapperStyle={{paddingTop: '10px'}} />
          <Bar dataKey={yKey || "value"} fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const parseInline = (str) => {
  const parts = [];
  const pattern = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
  let last = 0, m;
  while ((m = pattern.exec(str)) !== null) {
    if (m.index > last) parts.push(str.slice(last, m.index));
    if (m[2]) parts.push(<strong key={key()}><em>{m[2]}</em></strong>);
    else if (m[3]) parts.push(<strong key={key()}>{m[3]}</strong>);
    else if (m[4]) parts.push(<em key={key()}>{m[4]}</em>);
    else if (m[5]) parts.push(<code key={key()} className="md-inline-code">{m[5]}</code>);
    last = m.index + m[0].length;
  }
  if (last < str.length) parts.push(str.slice(last));
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
};

const isTableRow = (line) => line.trim().startsWith('|') && line.trim().endsWith('|');
const isSeparatorRow = (line) => /^\|[\s\-|:]+\|$/.test(line.trim());

export const renderMarkdown = (text) => {
  if (!text) return null;
  _key = 0;

  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      elements.push(<hr key={key()} className="md-hr" />);
      i++; continue;
    }

    const hMatch = trimmed.match(/^(#{1,4})\s+(.*)/);
    if (hMatch) {
      const level = hMatch[1].length;
      const Tag = `h${Math.min(level + 2, 6)}`;
      elements.push(<Tag key={key()} className={`md-h md-h${level}`}>{parseInline(hMatch[2])}</Tag>);
      i++; continue;
    }

    if (trimmed.startsWith('> ')) {
      elements.push(<blockquote key={key()} className="md-blockquote">{parseInline(trimmed.slice(2))}</blockquote>);
      i++; continue;
    }

    if (isTableRow(trimmed)) {
      const tableRows = [];
      while (i < lines.length && isTableRow(lines[i].trim())) { tableRows.push(lines[i]); i++; }
      const headerCells = tableRows[0].trim().slice(1, -1).split('|').map(c => c.trim());
      const dataRows = tableRows.slice(2).filter(r => !isSeparatorRow(r));
      elements.push(
        <div key={key()} className="md-table-wrap">
          <table className="md-table">
            <thead><tr>{headerCells.map((c, ci) => <th key={ci}>{parseInline(c)}</th>)}</tr></thead>
            <tbody>{dataRows.map((row, ri) => (
              <tr key={ri}>{row.trim().slice(1, -1).split('|').map((c, ci) => <td key={ci}>{parseInline(c.trim())}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      );
      continue;
    }

    if (/^[-*+]\s/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i].trim())) {
        items.push(<li key={key()}>{parseInline(lines[i].trim().replace(/^[-*+]\s/, ''))}</li>);
        i++;
      }
      elements.push(<ul key={key()} className="md-ul">{items}</ul>);
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(<li key={key()}>{parseInline(lines[i].trim().replace(/^\d+\.\s/, ''))}</li>);
        i++;
      }
      elements.push(<ol key={key()} className="md-ol">{items}</ol>);
      continue;
    }

    if (trimmed.startsWith('```')) {
      const codeType = trimmed.slice(3).trim().toLowerCase();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) { codeLines.push(lines[i]); i++; }
      
      const content = codeLines.join('\n');
      
      if (codeType === 'json_chart' || codeType === 'chart') {
        try {
          const config = JSON.parse(content);
          elements.push(renderChart(config));
        } catch (e) {
          elements.push(<pre key={key()} className="md-pre"><code style={{color:'red'}}>Chart Render Error: {e.message}</code></pre>);
        }
      } else {
        elements.push(<pre key={key()} className="md-pre"><code>{content}</code></pre>);
      }
      i++; continue;
    }

    if (!trimmed) { elements.push(<div key={key()} className="md-spacer" />); i++; continue; }

    elements.push(<p key={key()} className="md-p">{parseInline(trimmed)}</p>);
    i++;
  }

  return elements;
};
