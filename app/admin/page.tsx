"use client";

import { useState, useEffect } from "react";
import Nav from "@/app/components/Nav";
import { useRouter } from "next/navigation";

interface UserInfo {
  id: string;
  username: string;
  balance: number;
  isAdmin: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [me, setMe] = useState<{ isAdmin: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const fetchData = () => {
    Promise.all([
      fetch("/api/admin/credits").then((r) => {
        if (r.status === 403) throw new Error("not-admin");
        return r.json();
      }),
      fetch("/api/auth/me").then((r) => r.json()),
    ])
      .then(([creditsData, meData]) => {
        setUsers(creditsData.users || []);
        setMe(meData.user);
        setLoading(false);
      })
      .catch((err) => {
        if (err.message === "not-admin") {
          router.push("/");
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGiveCredits = async () => {
    if (!target || !amount) return;
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: target, amount: Number(amount) }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(
          `Gave $${Number(amount).toLocaleString()} to ${data.username}. New balance: $${data.newBalance.toLocaleString()}`
        );
        setTarget("");
        setAmount("");
        fetchData();
      } else {
        setError(data.error || "Failed");
      }
    } catch {
      setError("Something went wrong");
    }
  };

  if (loading) {
    return (
      <>
        <Nav />
        <hr className="nav-rule" />
        <main className="page-content fade-in">
          <p className="bt-loading">Loading...</p>
        </main>
      </>
    );
  }

  if (!me?.isAdmin) {
    return (
      <>
        <Nav />
        <hr className="nav-rule" />
        <main className="page-content fade-in">
          <p>Access denied.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <hr className="nav-rule" />

      <main className="page-content fade-in">
        <h1 className="page-title">Admin Panel</h1>
        <p className="bt-desc">
          Manage users and distribute paper credits.
        </p>

        {/* Give credits */}
        <div className="admin-section">
          <span className="bt-section-label">Give Credits</span>
          <div className="admin-credits-row">
            <input
              type="text"
              className="bt-input"
              placeholder="Username"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <input
              type="number"
              className="bt-input admin-amount-input"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button className="bt-submit-btn" onClick={handleGiveCredits}>
              Give
            </button>
          </div>
          {message && <div className="admin-success">{message}</div>}
          {error && <div className="bt-error">{error}</div>}
        </div>

        {/* Users table */}
        <div className="admin-section">
          <div className="bt-wagers-header">
            <span className="bt-section-label">All Users</span>
            <span className="bt-wager-count">{users.length}</span>
          </div>
          <table className="tk-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Balance</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: u.isAdmin ? 600 : 400 }}>
                    {u.username}
                  </td>
                  <td>${u.balance.toLocaleString()}</td>
                  <td>
                    {u.isAdmin ? (
                      <span className="admin-badge">Admin</span>
                    ) : (
                      "User"
                    )}
                  </td>
                  <td>
                    {new Date(u.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
