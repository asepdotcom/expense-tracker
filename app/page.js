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

const DEFAULT_CATEGORIES = ["Other"];

export default function Home() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Category state (read from the category master in the DB)
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [editingId, setEditingId] = useState(null);
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState("Other");
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

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load categories");
      const list = data.categories || [];
      if (list.length) {
        if (!list.includes("Other")) list.push("Other");
        setCategories(list);
      }
    } catch (e) {
      // Keep defaults if the API fails
    }
  }, []);

  useEffect(() => {
    loadRecords();
    loadCategories();
  }, [loadRecords, loadCategories]);

  const currentTotal = items.reduce((s, it) => {
    const n = parseFloat(it.amount);
    return s + (Number.isFinite(n) ? n : 0);
  }, 0);

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, { description: "", amount: "" }]);

  // Master data: add a category (used by both the master list and the
  // expense-form combo box so a freshly typed value joins the master).
  const ensureCategory = async (name) => {
    const clean = String(name || "").trim();
    if (!clean) return;
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save category");
      setCategories((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
      return clean;
    } catch (e) {
      setError(e.message);
      return null;
    }
  };

  // Save the new category typed in the dropdown's "add new" input.
  const addNewCategoryFromDropdown = async () => {
    const name = newCatName.trim();
    if (!name) return;
    const saved = await ensureCategory(name);
    if (saved) {
      setCategory(saved);
      setNewCatName("");
      setShowNewCat(false);
    }
  };

  const removeItem = (idx) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };

  const resetForm = () => {
    setEditingId(null);
    setDate(todayISO());
    setCategory("Other");
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
      // Persist any freshly-typed category into the dropdown list.
      await ensureCategory(category);
      const payload = { date, category, title, items: valid };
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
    setCategory(rec.category || "Other");
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

  // Bulk selection helpers
  const allSelected = records.length > 0 && selectedIds.length === records.length;

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(records.map((r) => r.id));
    }
  };

  const clearSelection = () => setSelectedIds([]);

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected record(s)?`)) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/records", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk delete failed");
      if (editingId && selectedIds.includes(editingId)) resetForm();
      setSelectedIds([]);
      loadRecords();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
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
          <label>Category</label>
          <select
            className="category-select"
            value={showNewCat ? "__new__" : category}
            onChange={(e) => {
              if (e.target.value === "__new__") {
                setShowNewCat(true);
                setNewCatName("");
              } else {
                setShowNewCat(false);
                setCategory(e.target.value);
              }
            }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="__new__">＋ Add new category…</option>
          </select>
          {showNewCat && (
            <div className="inline-new-cat">
              <input
                type="text"
                placeholder="Type new category name"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addNewCategoryFromDropdown();
                  }
                }}
                autoFocus
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={addNewCategoryFromDropdown}
              >
                Add
              </button>
            </div>
          )}
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
        <div className="list-head">
          <h2>All records</h2>
          {!loading && records.length > 0 && (
            <div className="list-tools">
              {selectedIds.length > 0 && (
                <button
                  className="btn btn-danger"
                  onClick={bulkDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : `Delete selected (${selectedIds.length})`}
                </button>
              )}
              <label className="select-all">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  disabled={records.length === 0}
                />
                Select all
              </label>
            </div>
          )}
        </div>
        {loading ? (
          <p className="empty">Loading…</p>
        ) : records.length === 0 ? (
          <p className="empty">No expenses yet. Add your first one above.</p>
        ) : (
          <div>
            {selectedIds.length > 0 && (
              <button className="btn btn-ghost clear-selection" onClick={clearSelection}>
                × Clear selection ({selectedIds.length})
              </button>
            )}
            {records.map((rec) => (
              <div className={`record ${selectedIds.includes(rec.id) ? "record-selected" : ""}`} key={rec.id}>
                <div className="record-head">
                  <div className="record-title-row">
                    <input
                      type="checkbox"
                      className="record-check"
                      checked={selectedIds.includes(rec.id)}
                      onChange={() => toggleSelect(rec.id)}
                      aria-label={`Select ${rec.title || "record"}`}
                    />
                    <div>
                      <div className="record-title">
                        {rec.title || "Untitled"}
                        {rec.category && rec.category !== "Other" && (
                          <span className="li-cat">{rec.category}</span>
                        )}
                      </div>
                      <div className="record-date">{rec.date}</div>
                    </div>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
