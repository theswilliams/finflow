"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import type {
  Account,
  Budget,
  CategorizationRule,
  FinanceData,
  Goal,
  Transaction,
} from "./types";
import { buildDemoData } from "./seed";
import { categorize, recategorize } from "./categorization/engine";
import { computeImportHash } from "./finance/hash";
import { setReferenceDate } from "./finance/dates";
import { uid } from "./utils";
import { createClient, isSupabaseConfigured } from "./supabase/client";
import { createRepo, type Repo } from "./supabase/repository";

export { computeImportHash };

const STORAGE_KEY = "finflow.data.v1";
/** bump when the demo seed generator changes so returning demo users get fresh data */
const SEED_VERSION = 7;

type Draft<T> = Omit<T, "id" | "createdAt" | "updatedAt">;
export type StoreMode = "local" | "supabase";

interface StoreValue {
  data: FinanceData;
  ready: boolean;
  isDemo: boolean;
  mode: StoreMode;
  user: User | null;
  signOut: () => Promise<void>;
  // accounts
  addAccount: (d: Draft<Account>) => Account;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  removeAccount: (id: string) => void;
  // transactions
  addTransaction: (
    d: Omit<Draft<Transaction>, "categorySource" | "categoryConfidence" | "reviewed" | "tags" | "categoryId"> & {
      tags?: string[];
      categoryId?: Transaction["categoryId"];
    },
  ) => Transaction;
  addTransactionsBulk: (rows: Transaction[]) => { added: number; duplicates: number };
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  updateTransactionsBulk: (ids: string[], patch: Partial<Transaction>) => void;
  removeTransactions: (ids: string[]) => void;
  setCategory: (id: string, categoryId: Transaction["categoryId"], source?: Transaction["categorySource"]) => void;
  // budgets
  upsertBudget: (categoryId: Budget["categoryId"], limit: number) => void;
  removeBudget: (id: string) => void;
  // goals
  addGoal: (d: Draft<Goal>) => Goal;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  // rules
  addRule: (d: Omit<Draft<CategorizationRule>, "priority" | "enabled"> & { priority?: number; enabled?: boolean }) => CategorizationRule;
  updateRule: (id: string, patch: Partial<CategorizationRule>) => void;
  removeRule: (id: string) => void;
  applyRules: () => void;
  // lifecycle
  resetDemo: () => void;
  clearAll: () => void;
  importJson: (raw: string) => void;
  exportJson: () => string;
}

const StoreContext = createContext<StoreValue | null>(null);

const nowIso = () => new Date().toISOString();
const byDateDesc = (a: Transaction, b: Transaction) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);

function emptyData(): FinanceData {
  return { version: 1, accounts: [], transactions: [], budgets: [], goals: [], rules: [], seededDemo: false };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const mode: StoreMode = isSupabaseConfigured ? "supabase" : "local";

  const [data, setData] = useState<FinanceData>(emptyData);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const bootstrapped = useRef(false);
  const repoRef = useRef<Repo | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  // keep the app's reference clock in sync with the active dataset (demo data
  // pins "today" to the end of its showcase month; real accounts use the real clock)
  setReferenceDate(data.referenceDate ?? null);

  // ---------------------------------------------------------------- bootstrap
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    if (mode === "local") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as FinanceData & { seedVersion?: number }) : null;
        const untouchedDemo = parsed?.seededDemo && parsed.transactions.every((t) => t.isDemo);
        if (parsed && !(untouchedDemo && parsed.seedVersion !== SEED_VERSION)) {
          setData(parsed);
        } else {
          const demo = { ...buildDemoData(), seedVersion: SEED_VERSION } as FinanceData;
          setData(demo);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
        }
      } catch {
        setData(buildDemoData());
      }
      setReady(true);
      return;
    }

    // ---- supabase mode ----
    const supabase = createClient();
    if (!supabase) {
      setReady(true);
      return;
    }

    const loadFor = async (u: User | null) => {
      setUser(u);
      if (!u) {
        repoRef.current = null;
        setData(emptyData());
        setReady(true);
        return;
      }
      const repo = createRepo(supabase, u.id);
      repoRef.current = repo;
      try {
        await repo.ensureDefaultRules();
        const snapshot = await repo.loadSnapshot();
        setData(snapshot);
      } catch (e) {
        console.error(e);
        toast.error("Could not load your data. Please refresh.");
      } finally {
        setReady(true);
      }
    };

    supabase.auth.getUser().then(({ data: { user: u } }) => loadFor(u));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user ?? null;
      // only re-load when the user identity actually changes
      setUser((prev) => {
        if (prev?.id === next?.id) return prev;
        void loadFor(next);
        return prev;
      });
    });
    return () => sub.subscription.unsubscribe();
  }, [mode]);

  // ---- local mode: persist to localStorage on every change ----
  useEffect(() => {
    if (mode !== "local" || !ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* quota — ignore */
    }
  }, [data, ready, mode]);

  const api = useMemo<StoreValue>(() => {
    const mutate = (fn: (d: FinanceData) => FinanceData) => setData((d) => fn(structuredClone(d)));

    /** fire a write to Supabase (when in that mode) and surface failures */
    const persist = (run: (repo: Repo) => Promise<unknown>) => {
      const repo = repoRef.current;
      if (mode !== "supabase" || !repo) return;
      Promise.resolve(run(repo)).catch((e) => {
        console.error(e);
        toast.error("Change could not be saved. It may not persist after a refresh.");
      });
    };

    const signOut = async () => {
      const supabase = createClient();
      await supabase?.auth.signOut();
      repoRef.current = null;
      setUser(null);
      setData(emptyData());
      if (typeof window !== "undefined") window.location.assign("/login");
    };

    return {
      data,
      ready,
      mode,
      user,
      signOut,
      isDemo: data.seededDemo && data.transactions.some((t) => t.isDemo),

      addAccount(d) {
        const acc: Account = { ...d, id: uid("acc"), createdAt: nowIso(), updatedAt: nowIso() };
        mutate((s) => ({ ...s, accounts: [...s.accounts, acc] }));
        persist((r) => r.upsertAccount(acc));
        return acc;
      },
      updateAccount(id, patch) {
        const current = dataRef.current.accounts.find((a) => a.id === id);
        if (!current) return;
        const next = { ...current, ...patch, updatedAt: nowIso() };
        mutate((s) => ({ ...s, accounts: s.accounts.map((a) => (a.id === id ? next : a)) }));
        persist((r) => r.upsertAccount(next));
      },
      removeAccount(id) {
        mutate((s) => ({
          ...s,
          accounts: s.accounts.filter((a) => a.id !== id),
          transactions: s.transactions.filter((t) => t.accountId !== id && t.transferAccountId !== id),
        }));
        persist((r) => r.deleteAccount(id));
      },

      addTransaction(input) {
        const res = input.categoryId
          ? { categoryId: input.categoryId, source: "manual" as const, confidence: 1 }
          : categorize({ merchant: input.merchant, description: input.description, type: input.type }, dataRef.current.rules);
        const t: Transaction = {
          id: uid("txn"),
          accountId: input.accountId,
          date: input.date,
          merchant: input.merchant,
          description: input.description,
          amount: input.amount,
          type: input.type,
          transferAccountId: input.transferAccountId,
          notes: input.notes,
          tags: input.tags ?? [],
          categoryId: res.categoryId,
          categorySource: input.categoryId ? "manual" : res.source,
          categoryConfidence: res.confidence,
          reviewed: res.source !== "uncategorized",
          importHash: undefined,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        t.importHash = computeImportHash(t);
        mutate((s) => ({ ...s, transactions: [t, ...s.transactions] }));
        persist((r) => r.upsertTransactions([t]));
        return t;
      },

      addTransactionsBulk(rows) {
        const existing = new Set(
          dataRef.current.transactions.map((t) => t.importHash ?? computeImportHash(t)),
        );
        const fresh: Transaction[] = [];
        let duplicates = 0;
        for (const r of rows) {
          const h = computeImportHash(r);
          if (existing.has(h)) {
            duplicates++;
            continue;
          }
          existing.add(h);
          fresh.push({ ...r, importHash: h });
        }
        if (fresh.length) {
          mutate((s) => ({ ...s, transactions: [...fresh, ...s.transactions].sort(byDateDesc) }));
          persist((r) => r.upsertTransactions(fresh));
        }
        return { added: fresh.length, duplicates };
      },

      updateTransaction(id, patch) {
        const current = dataRef.current.transactions.find((t) => t.id === id);
        if (!current) return;
        const next = { ...current, ...patch, updatedAt: nowIso() };
        mutate((s) => ({ ...s, transactions: s.transactions.map((t) => (t.id === id ? next : t)) }));
        persist((r) => r.upsertTransactions([next]));
      },
      updateTransactionsBulk(ids, patch) {
        const set = new Set(ids);
        const updated = dataRef.current.transactions
          .filter((t) => set.has(t.id))
          .map((t) => ({ ...t, ...patch, updatedAt: nowIso() }));
        mutate((s) => ({
          ...s,
          transactions: s.transactions.map((t) => (set.has(t.id) ? { ...t, ...patch, updatedAt: nowIso() } : t)),
        }));
        persist((r) => r.upsertTransactions(updated));
      },
      removeTransactions(ids) {
        const set = new Set(ids);
        mutate((s) => ({ ...s, transactions: s.transactions.filter((t) => !set.has(t.id)) }));
        persist((r) => r.deleteTransactions(ids));
      },
      setCategory(id, categoryId, source = "manual") {
        const current = dataRef.current.transactions.find((t) => t.id === id);
        if (!current) return;
        const next = { ...current, categoryId, categorySource: source, reviewed: true, updatedAt: nowIso() };
        mutate((s) => ({ ...s, transactions: s.transactions.map((t) => (t.id === id ? next : t)) }));
        persist((r) => r.upsertTransactions([next]));
      },

      upsertBudget(categoryId, limit) {
        const existing = dataRef.current.budgets.find((b) => b.categoryId === categoryId);
        const budget: Budget = existing
          ? { ...existing, limit, updatedAt: nowIso() }
          : { id: uid("bgt"), categoryId, limit, createdAt: nowIso(), updatedAt: nowIso() };
        mutate((s) => ({
          ...s,
          budgets: existing ? s.budgets.map((b) => (b.id === existing.id ? budget : b)) : [...s.budgets, budget],
        }));
        persist((r) => r.upsertBudget(budget));
      },
      removeBudget(id) {
        mutate((s) => ({ ...s, budgets: s.budgets.filter((b) => b.id !== id) }));
        persist((r) => r.deleteBudget(id));
      },

      addGoal(d) {
        const g: Goal = { ...d, id: uid("goal"), createdAt: nowIso(), updatedAt: nowIso() };
        mutate((s) => ({ ...s, goals: [...s.goals, g] }));
        persist((r) => r.upsertGoal(g));
        return g;
      },
      updateGoal(id, patch) {
        const current = dataRef.current.goals.find((g) => g.id === id);
        if (!current) return;
        const next = { ...current, ...patch, updatedAt: nowIso() };
        mutate((s) => ({ ...s, goals: s.goals.map((g) => (g.id === id ? next : g)) }));
        persist((r) => r.upsertGoal(next));
      },
      removeGoal(id) {
        mutate((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }));
        persist((r) => r.deleteGoal(id));
      },

      addRule(d) {
        const rule: CategorizationRule = {
          field: d.field,
          op: d.op,
          value: d.value,
          categoryId: d.categoryId,
          priority: d.priority ?? 100,
          enabled: d.enabled ?? true,
          id: uid("rule"),
          createdAt: nowIso(),
        };
        const prev = dataRef.current.transactions;
        const rules = [...dataRef.current.rules, rule];
        const nextTxns = recategorize(prev, rules);
        const changed = nextTxns.filter((t, i) => t !== prev[i]);
        mutate((s) => ({ ...s, rules, transactions: nextTxns }));
        persist((r) => r.upsertRule(rule));
        if (changed.length) persist((r) => r.upsertTransactions(changed));
        return rule;
      },
      updateRule(id, patch) {
        const prev = dataRef.current.transactions;
        const rules = dataRef.current.rules.map((r) => (r.id === id ? { ...r, ...patch } : r));
        const updated = rules.find((r) => r.id === id);
        const nextTxns = recategorize(prev, rules);
        const changed = nextTxns.filter((t, i) => t !== prev[i]);
        mutate((s) => ({ ...s, rules, transactions: nextTxns }));
        if (updated) persist((r) => r.upsertRule(updated));
        if (changed.length) persist((r) => r.upsertTransactions(changed));
      },
      removeRule(id) {
        mutate((s) => ({ ...s, rules: s.rules.filter((r) => r.id !== id) }));
        persist((r) => r.deleteRule(id));
      },
      applyRules() {
        const prev = dataRef.current.transactions;
        const nextTxns = recategorize(prev, dataRef.current.rules);
        const changed = nextTxns.filter((t, i) => t !== prev[i]);
        mutate((s) => ({ ...s, transactions: nextTxns }));
        if (changed.length) persist((r) => r.upsertTransactions(changed));
      },

      resetDemo() {
        const demo = { ...buildDemoData(), seedVersion: SEED_VERSION } as FinanceData;
        setData(demo);
        persist((r) => r.replaceAll(demo));
      },
      clearAll() {
        setData({ ...emptyData(), seededDemo: false });
        persist((r) => r.clearAll());
      },
      importJson(raw) {
        const parsed = JSON.parse(raw) as FinanceData;
        setData(parsed);
        persist((r) => r.replaceAll(parsed));
      },
      exportJson() {
        return JSON.stringify(dataRef.current, null, 2);
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, ready, mode, user]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
