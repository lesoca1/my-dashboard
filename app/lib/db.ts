import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON<T>(filename: string, fallback: T): T {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJSON<T>(filename: string, data: T): void {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ── User types & operations ──────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  balance: number;
  isAdmin: boolean;
  createdAt: string;
}

export function getUsers(): User[] {
  return readJSON<User[]>("users.json", []);
}

export function saveUsers(users: User[]): void {
  writeJSON("users.json", users);
}

export function getUserById(id: string): User | undefined {
  return getUsers().find((u) => u.id === id);
}

export function getUserByUsername(username: string): User | undefined {
  return getUsers().find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
}

export function createUser(user: User): void {
  const users = getUsers();
  users.push(user);
  saveUsers(users);
}

export function updateUser(id: string, updates: Partial<User>): void {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return;
  users[idx] = { ...users[idx], ...updates };
  saveUsers(users);
}

// ── Session types & operations ───────────────────────────────────────

export interface Session {
  userId: string;
  expiresAt: string;
}

export function getSessions(): Record<string, Session> {
  return readJSON<Record<string, Session>>("sessions.json", {});
}

export function saveSessions(sessions: Record<string, Session>): void {
  writeJSON("sessions.json", sessions);
}

export function createSession(token: string, userId: string): void {
  const sessions = getSessions();
  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  sessions[token] = { userId, expiresAt };
  saveSessions(sessions);
}

export function getSession(token: string): Session | undefined {
  const sessions = getSessions();
  const session = sessions[token];
  if (!session) return undefined;
  if (new Date(session.expiresAt) < new Date()) {
    delete sessions[token];
    saveSessions(sessions);
    return undefined;
  }
  return session;
}

export function deleteSession(token: string): void {
  const sessions = getSessions();
  delete sessions[token];
  saveSessions(sessions);
}

// ── Bet types & operations ───────────────────────────────────────────

export type BetStatus = "open" | "closed" | "resolved";
export type BetOutcome = "yes" | "no" | null;

export interface Bet {
  id: string;
  creatorId: string;
  title: string;
  criteria: string;
  expiresAt: string;
  status: BetStatus;
  outcome: BetOutcome;
  createdAt: string;
}

export function getBets(): Bet[] {
  return readJSON<Bet[]>("bets.json", []);
}

export function saveBets(bets: Bet[]): void {
  writeJSON("bets.json", bets);
}

export function getBetById(id: string): Bet | undefined {
  return getBets().find((b) => b.id === id);
}

export function createBet(bet: Bet): void {
  const bets = getBets();
  bets.push(bet);
  saveBets(bets);
}

export function updateBet(id: string, updates: Partial<Bet>): void {
  const bets = getBets();
  const idx = bets.findIndex((b) => b.id === id);
  if (idx === -1) return;
  bets[idx] = { ...bets[idx], ...updates };
  saveBets(bets);
}

// ── Wager types & operations ─────────────────────────────────────────

export interface Wager {
  id: string;
  betId: string;
  userId: string;
  position: "yes" | "no";
  amount: number;
  createdAt: string;
}

export function getWagers(): Wager[] {
  return readJSON<Wager[]>("wagers.json", []);
}

export function saveWagers(wagers: Wager[]): void {
  writeJSON("wagers.json", wagers);
}

export function getWagersByBet(betId: string): Wager[] {
  return getWagers().filter((w) => w.betId === betId);
}

export function getWagersByUser(userId: string): Wager[] {
  return getWagers().filter((w) => w.userId === userId);
}

export function createWager(wager: Wager): void {
  const wagers = getWagers();
  wagers.push(wager);
  saveWagers(wagers);
}
