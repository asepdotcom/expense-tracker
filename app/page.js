"use client";

import { useCallback, useEffect, useState } from "react";

const currency = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0);

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function Home() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [editingId, setEditingId] = useState(null);
  const [date, setDate] = useState(todayISO());
  const [title, setTitle] = useState("");
  const [items, setItems] = useState([{ description: "", amount: "" }]);
  const [saving, setSaving] = useState(false);

  const loadRecords = useCallback(async () => {
    try {
      const res = await fetch("/api/records");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRecords(data.records || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const currentTotal = items.reduce((s, it) => {
    const n = parseFloat(it.amount);
    return s + (Number.isFinite(n) ? n : 0);
  }, 0);

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, { description: "", amount: "" }]);

  const removeItem = (idx) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };

  const resetForm = () => {
    setEditingId(null);
    setDate(todayISO());
    setTitle("");
    setItems([{ description: "", amount: "" }]);
    setError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const valid = items.filter(
      (it) => it.description.trim() && Number.isFinite(parseFloat(it.amount))
    );
    if (valid.length === 0) {
      setError("Please add at least one item with a description and amount.");
      return;
    }
    setSaving(true);
    try {
      const payload = { date, title, items: valid };
      const url = editingId ? `/api/records/${editingId}` : "/api/records";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      resetForm();
      loadRecords();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (rec) => {
    setEditingId(rec.id);
    setDate(rec.date);
    setTitle(rec.title || "");
    setItems(
      (rec.items || []).length
        ? rec.items.map((it) => ({ description: it.description, amount: String(it.amount) }))
        : [{ description: "", amount: "" }]
    );
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const del = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      const res = await fetch(`/api/records/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      if (editingId === id) resetForm();
      loadRecords();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="container">
      <header className="top">
        <h1>💸 Expense Tracker</h1>
        <p>Add items, group them by date, and save as one record.</p>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {/* Add / Edit form */}
      <form className="card" onSubmit={submit}>
        <h2>{editingId ? "Edit record" : "Add expense"}</h2>
        <div className="field">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="field">
          <label>Title (optional, e.g. "Groceries", "Trip")</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled" />
        </div>

        <label style={{ display: "block", margin: "0.5rem 0 0.3rem", color: "var(--muted)", fontSize: "0.85rem" }}>
          Items
        </label>
        <div className="items-head">
          <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Description</span>
          <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Amount</span>
          <span />
        </div>
        {items.map((it, idx) => (
          <div className="item-row" key={idx}>
            <input
              type="text"
              placeholder="e.g. Coffee"
              value={it.description}
              onChange={(e) => updateItem(idx, "description", e.target.value)}
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={it.amount}
              onChange={(e) => updateItem(idx, "amount", e.target.value)}
            />
            <button type="button" className="remove-item" onClick={() => removeItem(idx)} aria-label="Remove item">
              ×
            </button>
          </div>
        ))}
        <button type="button" className="add-item-btn" onClick={addItem}>
          + Add item
        </button>

        <div className="total-row">
          <span>Total</span>
          <span className="amount">{currency(currentTotal)}</span>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : editingId ? "Update record" : "Save record"}
          </button>
          {editingId && (
            <button type="button" className="btn btn-ghost" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Records list */}
      <div className="card">
        <h2>All records</h2>
        {loading ? (
          <p className="empty">Loading…</p>
        ) : records.length === 0 ? (
          <p className="empty">No expenses yet. Add your first one above.</p>
        ) : (
          records.map((rec) => (
            <div className="record" key={rec.id}>
              <div className="record-head">
                <div>
                  <div className="record-title">{rec.title || "Untitled"}</div>
                  <div className="record-date">{rec.date}</div>
                </div>
                <div className="record-total">{currency(rec.total)}</div>
              </div>
              <div className="record-items">
                {(rec.items || []).map((it) => (
                  <div className="li" key={it.id}>
                    <span>{it.description}</span>
                    <span>{currency(it.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="record-actions">
                <button className="btn btn-ghost" onClick={() => startEdit(rec)}>Edit</button>
                <button className="btn btn-danger" onClick={() => del(rec.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
