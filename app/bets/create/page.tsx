"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/app/components/Nav";
import Link from "next/link";

export default function CreateBetPage() {
  const [title, setTitle] = useState("");
  const [criteria, setCriteria] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!title.trim() || !criteria.trim() || !expiresAt) {
      setError("All fields are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          criteria: criteria.trim(),
          expiresAt: new Date(expiresAt).toISOString(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push(`/bets/${data.bet.id}`);
      } else {
        setError(data.error || "Something went wrong.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Default min date: tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().slice(0, 16);

  return (
    <>
      <Nav />
      <hr className="nav-rule" />

      <main className="page-content fade-in">
        <Link href="/bets" className="bt-back-link">
          &larr; Back to Bets
        </Link>

        <h1 className="page-title">Create a Bet</h1>
        <p className="bt-desc">
          Define a prediction market. Other users can wager paper credits on the
          outcome.
        </p>

        <div className="bt-form">
          <div className="bt-field">
            <label className="bt-label">Title</label>
            <input
              type="text"
              className="bt-input"
              placeholder="Will the Eagles win the Super Bowl?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
            <span className="bt-hint">{title.length}/200</span>
          </div>

          <div className="bt-field">
            <label className="bt-label">Resolution Criteria</label>
            <textarea
              className="bt-textarea"
              placeholder="Describe how this bet will be judged. Be specific about what counts as YES and what counts as NO."
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              rows={4}
            />
          </div>

          <div className="bt-field">
            <label className="bt-label">Expiry Date & Time</label>
            <input
              type="datetime-local"
              className="bt-input"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={minDate}
            />
            <span className="bt-hint">
              Wagers close at this time. Admin resolves after expiry.
            </span>
          </div>

          {error && <div className="bt-error">{error}</div>}

          <button
            className="bt-submit-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Bet"}
          </button>
        </div>
      </main>
    </>
  );
}
