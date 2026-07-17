import React, { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  CheckCircle,
  Calendar,
  Filter,
  Search,
} from 'lucide-react';
import useStore from '../store/useStore';
import ExcelViewer from '../components/ExcelViewer';
import './Output.css';

const Output = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { history } = useStore();
  const outputRef = useRef(null);

  const historyItem = history.find((item) => item.outputId === parseInt(id));

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.output-header', {
        y: -20,
        opacity: 0,
        duration: 0.6,
      });

      gsap.from('.output-table', {
        y: 20,
        opacity: 0,
        duration: 0.6,
        delay: 0.3,
      });
    });

    return () => ctx.revert();
  }, []);

  if (!historyItem) {
    return (
      <div className="output-page">
        <div className="output-container">
          <div className="empty-state">
            <FileSpreadsheet size={64} />
            <h3>Output Not Found</h3>
            <p>The requested output could not be found</p>
            <button className="btn-primary" onClick={() => navigate('/reports')}>
              View History
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mock data for demonstration - convert to match ExcelViewer format
  const mockHeaders = [
    'Activity Code',
    'Activity',
    'Stage Gate',
    'EP Date',
    'LP Date',
    'Actual Start',
    'Deviation',
    'Date Diff',
    'Flag',
  ];

  const mockRows = [
    [
      'ACT-001',
      'Engineering Design Phase 1',
      'START',
      '2026-01-15',
      '2026-01-20',
      '2026-01-18',
      '-2',
      '2',
      'early',
    ],
    [
      'ACT-002',
      'Document Submission',
      'IDCs',
      '2026-02-01',
      '2026-02-05',
      '2026-02-08',
      '3',
      '-3',
      'delay',
    ],
    [
      'ACT-003',
      'Client Review',
      'IFR',
      '2026-02-10',
      '2026-02-15',
      '2026-02-15',
      '0',
      '0',
      '',
    ],
    [
      'ACT-004',
      'Technical Review Phase 1',
      'START',
      '2026-02-20',
      '2026-02-25',
      '2026-02-23',
      '-2',
      '2',
      'early',
    ],
    [
      'ACT-005',
      'Final Approval',
      'IFR',
      '2026-03-01',
      '2026-03-05',
      '2026-03-06',
      '1',
      '-1',
      'delay',
    ],
  ];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="output-page" ref={outputRef}>
      <div className="output-container">
        <div className="output-header">
          <div className="header-left">
            <button className="btn-back" onClick={() => navigate('/reports')}>
              <ArrowLeft size={20} />
              Back to History
            </button>
            <div>
              <h1>Processing Output #{historyItem.id}</h1>
              <p>
                <Calendar size={16} />
                Processed on {formatDate(historyItem.processedAt)}
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-secondary">
              <FileSpreadsheet size={18} />
              Export to Excel
            </button>
            <button className="btn-primary">
              <Download size={18} />
              Download
            </button>
          </div>
        </div>

        <div className="output-info card">
          <div className="info-item">
            <CheckCircle size={20} color="#00ca72" />
            <div>
              <strong>Status</strong>
              <span>Completed Successfully</span>
            </div>
          </div>
          <div className="info-item">
            <FileSpreadsheet size={20} color="#0073ea" />
            <div>
              <strong>Files Processed</strong>
              <span>{historyItem.files.length} files</span>
            </div>
          </div>
          <div className="info-item">
            <Filter size={20} color="#0073ea" />
            <div>
              <strong>Total Rows</strong>
              <span>{mockRows.length} rows</span>
            </div>
          </div>
        </div>

        <ExcelViewer
          headers={mockHeaders}
          rows={mockRows}
          sheetName={historyItem.files[0] || 'Output'}
          isPreview={false}
          totalRows={mockRows.length}
          maxHeight="calc(100vh - 400px)"
          onDownload={() => {
            // Handle download logic
            console.log('Download clicked');
          }}
        />
      </div>
    </div>
  );
};

export default Output;
