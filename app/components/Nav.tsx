"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface UserInfo {
  id: string;
  username: string;
  balance: number;
  isAdmin: boolean;
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState("dark");
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("theme") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const links = [
    { href: "/", label: "Home" },
    { href: "/notes", label: "Notes" },
    { href: "/tracker", label: "Tracker" },
    { href: "/algotrading", label: "Bots" },
    { href: "/bets", label: "Bets" },
  ];

  return (
    <nav className="site-nav">
      <div className="nav-links">
        {links.map((link, i) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <span key={link.href}>
              {i > 0 && <span className="nav-sep">&middot;</span>}
              <Link
                href={link.href}
                className={`nav-link ${isActive ? "active" : ""}`}
              >
                {link.label}
              </Link>
            </span>
          );
        })}
      </div>
      <div className="nav-right">
        {user && (
          <div className="nav-user">
            <span className="nav-balance">
              ${user.balance.toLocaleString()}
            </span>
            <span className="nav-username">{user.username}</span>
            {user.isAdmin && (
              <Link href="/admin" className="nav-admin-link" title="Admin panel">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1.5l1.7 3.5 3.8.5-2.75 2.7.65 3.8L8 10.4l-3.4 1.6.65-3.8L2.5 5.5l3.8-.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
              </Link>
            )}
            <button
              className="nav-logout"
              onClick={handleLogout}
              title="Sign out"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M6 2H3.5A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14H6M10.5 11.5L14 8l-3.5-3.5M14 8H6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
        {mounted && (
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 9.5a5.5 5.5 0 01-7-7 5.5 5.5 0 107 7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )}
      </div>
    </nav>
  );
}
