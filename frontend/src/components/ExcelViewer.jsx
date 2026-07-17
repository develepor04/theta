import React, { useState, useRef, useEffect } from "react";
import {
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Search,
  X,
  ArrowUpDown,
  ChevronDown,
} from "lucide-react";
import "./ExcelViewer.css";

const ExcelViewer = ({
  headers = [],
  rows = [],
  sheetName = "Sheet1",
  onDownload = null,
  isPreview = false,
  totalRows = 0,
  maxHeight = "600px",
}) => {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [filterColumn, setFilterColumn] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const tableRef = useRef(null);
  const containerRef = useRef(null);

  // Filter and sort data
  const processedRows = React.useMemo(() => {
    let filtered = [...rows];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((row) =>
        row.some((cell) =>
          String(cell || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
        ),
      );
    }

    // Apply sorting
    if (sortConfig.key !== null) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        // Handle null/undefined
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        // Compare
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [rows, searchQuery, sortConfig]);

  const handleSort = (columnIndex) => {
    setSortConfig((prev) => ({
      key: columnIndex,
      direction:
        prev.key === columnIndex && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 50));

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Get Excel-style column letter (A, B, C, ..., Z, AA, AB, ...)
  const getColumnLetter = (index) => {
    let letter = "";
    let num = index;
    while (num >= 0) {
      letter = String.fromCharCode(65 + (num % 26)) + letter;
      num = Math.floor(num / 26) - 1;
    }
    return letter;
  };

  const getStatusCellClass = (header, cellValue) => {
    const headerText = String(header || "").toLowerCase();
    const valueText = String(cellValue || "").toLowerCase();
    const isFlagColumn =
      headerText.includes("flag") || headerText.includes("status");
    const isDelayValue =
      valueText.includes("delay") || valueText.includes("delayed");
    const isEarlyValue = valueText.includes("early");
    const isOngoingValue = valueText.includes("ongoing");

    if (isFlagColumn && isDelayValue) {
      return "status-delay";
    }
    if (isFlagColumn && isEarlyValue) {
      return "status-early";
    }
    if (isFlagColumn && isOngoingValue) {
      return "status-ongoing";
    }
    return "";
  };

  return (
    <div
      className={`excel-viewer ${isFullscreen ? "fullscreen" : ""}`}
      ref={containerRef}
      style={{ "--zoom-level": zoom / 100 }}
    >
      {/* Toolbar */}
      <div className="excel-toolbar">
        <div className="toolbar-left">
          <div className="sheet-tab active">{sheetName}</div>
        </div>

        <div className="toolbar-center">
          <div className="excel-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search in sheet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="clear-search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="toolbar-right">
          <div className="zoom-controls">
            <button
              onClick={handleZoomOut}
              title="Zoom out"
              disabled={zoom <= 50}
            >
              <ZoomOut size={16} />
            </button>
            <span className="zoom-level">{zoom}%</span>
            <button
              onClick={handleZoomIn}
              title="Zoom in"
              disabled={zoom >= 150}
            >
              <ZoomIn size={16} />
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            title="Toggle fullscreen"
            className="icon-btn"
          >
            <Maximize2 size={16} />
          </button>

          {onDownload && (
            <button
              onClick={onDownload}
              className="download-btn"
              title="Download"
            >
              <Download size={16} />
              Download
            </button>
          )}
        </div>
      </div>

      {/* Info bar */}
      {isPreview && totalRows > rows.length && (
        <div className="excel-info-bar">
          <span>
            Showing {rows.length} of {totalRows} rows. Download full file to see
            all data.
          </span>
        </div>
      )}

      {/* Stats bar */}
      <div className="excel-stats-bar">
        <span className="stat-item">
          {processedRows.length} row{processedRows.length !== 1 ? "s" : ""}
        </span>
        <span className="stat-separator">|</span>
        <span className="stat-item">
          {headers.length} column{headers.length !== 1 ? "s" : ""}
        </span>
        {searchQuery && (
          <>
            <span className="stat-separator">|</span>
            <span className="stat-item highlight">
              {processedRows.length} match
              {processedRows.length !== 1 ? "es" : ""}
            </span>
          </>
        )}
      </div>

      {/* Spreadsheet Grid */}
      <div className="excel-grid-container" style={{ maxHeight }}>
        <table className="excel-grid" ref={tableRef}>
          <thead>
            {/* Column letters row */}
            <tr className="column-letters-row">
              <th className="row-number-header corner-cell">&nbsp;</th>
              {headers.map((_, index) => (
                <th key={index} className="column-letter">
                  {getColumnLetter(index)}
                </th>
              ))}
            </tr>
            {/* Headers row */}
            <tr className="headers-row">
              <th className="row-number-header">&nbsp;</th>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="excel-header"
                  onClick={() => handleSort(index)}
                >
                  <div className="header-content">
                    <span>{header || `Column ${index + 1}`}</span>
                    <button className="sort-btn">
                      <ArrowUpDown
                        size={14}
                        className={sortConfig.key === index ? "active" : ""}
                      />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processedRows.length === 0 ? (
              <tr>
                <td colSpan={headers.length + 1} className="empty-cell">
                  {searchQuery
                    ? "No matching results found"
                    : "No data available"}
                </td>
              </tr>
            ) : (
              processedRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="row-number">{rowIndex + 1}</td>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`excel-cell ${
                        selectedCell?.row === rowIndex &&
                        selectedCell?.col === cellIndex
                          ? "selected"
                          : ""
                      } ${getStatusCellClass(headers[cellIndex], cell)}`}
                      onClick={() =>
                        setSelectedCell({ row: rowIndex, col: cellIndex })
                      }
                    >
                      {cell !== null && cell !== undefined ? String(cell) : ""}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExcelViewer;
