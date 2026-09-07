"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const currency = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0);

const startOfMonthISO = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
};

const PALETTE = [
  "#38bdf8", // blue
  "#22c55e", // green
  "#f97316", // orange
  "#a78bfa", // violet
  "#f472b6", // pink
  "#facc15", // yellow
  "#2dd4bf", // teal
  "#ef4444", // red
  "#94a3b8", // slate
  "#c084fc", // purple
];

export default function Analytics({ categories = [] }) {
  const [startDate, setStartDate] = useState(() => startOfMonthISO());
  const [endDate, setEndDate] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("from", startDate);
      if (endDate) params.set("to", endDate);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/records${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRecords(data.records || []);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const filteredRecords = useMemo(() => {
    if (selectedCategories.length === 0) return records;
    return records.filter((r) => selectedCategories.includes(r.category || "Other"));
  }, [records, selectedCategories]);

  const categoryTotals = useMemo(() => {
    const map = new Map();
    filteredRecords.forEach((r) => {
      const key = r.category || "Other";
      map.set(key, (map.get(key) || 0) + (parseFloat(r.total) || 0));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRecords]);

  const dailyTotals = useMemo(() => {
    const map = new Map();
    filteredRecords.forEach((r) => {
      map.set(r.date, (map.get(r.date) || 0) + (parseFloat(r.total) || 0));
    });
    return Array.from(map.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [filteredRecords]);

  const grandTotal = filteredRecords.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);

  const toggleCategory = (name) => {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const clearCategories = () => setSelectedCategories([]);
  const selectAllCategories = () => setSelectedCategories([...categories]);

  const generateAnalysis = async () => {
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: startDate,
          to: endDate,
          categoryTotals,
          dailyTotals,
          grandTotal,
          recordCount: filteredRecords.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate analysis");
      setAiResult(data);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const categoryLabel =
    selectedCategories.length === 0
      ? "All categories"
      : selectedCategories.length === 1
      ? selectedCategories[0]
      : `${selectedCategories.length} categories`;

  return (
    <div>
      {/* Filter toolbar */}
      <div className="card">
        <div className="toolbar">
          <div className="filters">
            <div className="filter-field">
              <label>From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || undefined}
              />
            </div>
            <div className="filter-field">
              <label>To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
              />
            </div>
            <div className="filter-field">
              <label>Category</label>
              <div className="multi-select">
                <button
                  type="button"
                  className="multi-select-toggle"
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <span>{categoryLabel}</span>
                  <span>▾</span>
                </button>
                {menuOpen && (
                  <div className="multi-select-menu">
                    {categories.map((c) => (
                      <label className="multi-select-option" key={c}>
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(c)}
                          onChange={() => toggleCategory(c)}
                        />
                        {c}
                      </label>
                    ))}
                    <div className="multi-select-actions">
                      <button type="button" onClick={selectAllCategories}>Select all</button>
                      <button type="button" onClick={clearCategories}>Clear</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {(startDate || endDate || selectedCategories.length > 0) && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setSelectedCategories([]);
                }}
              >
                Clear filter
              </button>
            )}
          </div>
        </div>

        <div className="summary">
          <span className="summary-label">Total spending</span>
          <span className="summary-total">{currency(grandTotal)}</span>
          <span className="summary-count">
            {filteredRecords.length} record{filteredRecords.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Pie chart */}
      <div className="card chart-card">
        <h2>Spending by category</h2>
        {loading ? (
          <p className="empty">Loading…</p>
        ) : categoryTotals.length === 0 ? (
          <p className="chart-empty">No data for this filter.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={categoryTotals}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={(entry) => entry.name}
              >
                {categoryTotals.map((entry, i) => (
                  <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => currency(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Daily spending chart */}
      <div className="card chart-card">
        <h2>Daily spending</h2>
        {loading ? (
          <p className="empty">Loading…</p>
        ) : dailyTotals.length === 0 ? (
          <p className="chart-empty">No data for this filter.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailyTotals}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <Tooltip formatter={(value) => currency(value)} />
              <Bar dataKey="total" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* AI Analysis */}
      <div className="card">
        <h2>AI Analysis</h2>
        <button
          type="button"
          className="btn btn-primary"
          onClick={generateAnalysis}
          disabled={aiLoading || filteredRecords.length === 0}
        >
          {aiLoading ? "Analyzing…" : "Generate analysis"}
        </button>
        {filteredRecords.length === 0 && !aiLoading && (
          <p className="empty" style={{ padding: "1rem 0 0" }}>
            No records for this filter to analyze.
          </p>
        )}
        {aiError && <div className="ai-error">{aiError}</div>}
        {aiResult && (
          <div style={{ marginTop: "1rem" }}>
            <p className="ai-analysis-text">{aiResult.analysis}</p>
            {aiResult.recommendations && aiResult.recommendations.length > 0 && (
              <div className="ai-recommendations">
                <h3>Recommendations</h3>
                <ul>
                  {aiResult.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
