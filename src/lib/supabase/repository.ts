import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Account,
  Budget,
  CategorizationRule,
  CategoryId,
  FinanceData,
  Goal,
  Transaction,
} from "../types";
import { defaultRules } from "../seed";

// ---------------------------------------------------------------------------
//  Row <-> domain mappers
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */

function accountToRow(a: Account, userId: string) {
  return {
    id: a.id,
    user_id: userId,
    name: a.name,
    type: a.type,
    institution: a.institution ?? null,
    opening_balance: a.openingBalance,
    currency: a.currency,
    updated_at: new Date().toISOString(),
  };
}
function rowToAccount(r: any): Account {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    institution: r.institution ?? undefined,
    openingBalance: r.opening_balance,
    currency: r.currency,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function txnToRow(t: Transaction, userId: string) {
  return {
    id: t.id,
    user_id: userId,
    account_id: t.accountId,
    transfer_account_id: t.transferAccountId ?? null,
    posted_on: t.date,
    merchant: t.merchant,
    description: t.description ?? null,
    amount: t.amount,
    type: t.type,
    category_slug: t.categoryId,
    category_source: t.categorySource,
    category_confidence: t.categoryConfidence ?? null,
    notes: t.notes ?? null,
    tags: t.tags ?? [],
    reviewed: t.reviewed,
    import_hash: t.importHash ?? null,
    is_demo: t.isDemo ?? false,
    updated_at: new Date().toISOString(),
  };
}
function rowToTxn(r: any): Transaction {
  return {
    id: r.id,
    accountId: r.account_id,
    transferAccountId: r.transfer_account_id ?? undefined,
    date: r.posted_on,
    merchant: r.merchant,
    description: r.description ?? undefined,
    amount: r.amount,
    type: r.type,
    categoryId: r.category_slug as CategoryId,
    categorySource: r.category_source,
    categoryConfidence: r.category_confidence ?? undefined,
    notes: r.notes ?? undefined,
    tags: r.tags ?? [],
    reviewed: r.reviewed,
    importHash: r.import_hash ?? undefined,
    isDemo: r.is_demo,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function budgetToRow(b: Budget, userId: string) {
  return {
    id: b.id,
    user_id: userId,
    category_slug: b.categoryId,
    limit_cents: b.limit,
    updated_at: new Date().toISOString(),
  };
}
function rowToBudget(r: any): Budget {
  return {
    id: r.id,
    categoryId: r.category_slug as CategoryId,
    limit: r.limit_cents,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function goalToRow(g: Goal, userId: string) {
  return {
    id: g.id,
    user_id: userId,
    name: g.name,
    target_amount: g.targetAmount,
    current_amount: g.currentAmount,
    target_date: g.targetDate ?? null,
    accent_token: g.accentVar ?? "--positive",
    updated_at: new Date().toISOString(),
  };
}
function rowToGoal(r: any): Goal {
  return {
    id: r.id,
    name: r.name,
    targetAmount: r.target_amount,
    currentAmount: r.current_amount,
    targetDate: r.target_date ?? undefined,
    accentVar: r.accent_token ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function ruleToRow(r: CategorizationRule, userId: string) {
  return {
    id: r.id,
    user_id: userId,
    field: r.field,
    op: r.op,
    value: r.value,
    category_slug: r.categoryId,
    priority: r.priority,
    enabled: r.enabled,
  };
}
function rowToRule(r: any): CategorizationRule {
  return {
    id: r.id,
    field: r.field,
    op: r.op,
    value: r.value,
    categoryId: r.category_slug as CategoryId,
    priority: r.priority,
    enabled: r.enabled,
    createdAt: r.created_at,
  };
}

// ---------------------------------------------------------------------------
//  Repository
// ---------------------------------------------------------------------------
export interface Repo {
  loadSnapshot: () => Promise<FinanceData>;
  ensureDefaultRules: () => Promise<CategorizationRule[]>;
  upsertAccount: (a: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  upsertTransactions: (t: Transaction[]) => Promise<void>;
  deleteTransactions: (ids: string[]) => Promise<void>;
  upsertBudget: (b: Budget) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  upsertGoal: (g: Goal) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  upsertRule: (r: CategorizationRule) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  replaceAll: (data: FinanceData) => Promise<void>;
  clearAll: () => Promise<void>;
  markDemoSeeded: (seeded: boolean, referenceDate?: string | null) => Promise<void>;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function createRepo(supabase: SupabaseClient, userId: string): Repo {
  const throwIf = (error: { message: string } | null, ctx: string) => {
    if (error) throw new Error(`${ctx}: ${error.message}`);
  };

  const upsertTransactions = async (txns: Transaction[]) => {
    if (!txns.length) return;
    for (const part of chunk(txns, 500)) {
      const { error } = await supabase.from("transactions").upsert(part.map((t) => txnToRow(t, userId)));
      throwIf(error, "save transactions");
    }
  };

  return {
    async loadSnapshot() {
      const [accounts, transactions, budgets, goals, rules] = await Promise.all([
        supabase.from("accounts").select("*").order("created_at"),
        supabase.from("transactions").select("*").order("posted_on", { ascending: false }),
        supabase.from("budgets").select("*"),
        supabase.from("goals").select("*").order("created_at"),
        supabase.from("categorization_rules").select("*").order("priority", { ascending: false }),
      ]);
      throwIf(accounts.error, "load accounts");
      throwIf(transactions.error, "load transactions");
      throwIf(budgets.error, "load budgets");
      throwIf(goals.error, "load goals");
      throwIf(rules.error, "load rules");

      const { data: profile } = await supabase
        .from("profiles")
        .select("demo_seeded, demo_reference_date")
        .eq("id", userId)
        .maybeSingle();

      return {
        version: 1,
        accounts: (accounts.data ?? []).map(rowToAccount),
        transactions: (transactions.data ?? []).map(rowToTxn),
        budgets: (budgets.data ?? []).map(rowToBudget),
        goals: (goals.data ?? []).map(rowToGoal),
        rules: (rules.data ?? []).map(rowToRule),
        seededDemo: Boolean(profile?.demo_seeded),
        referenceDate: profile?.demo_reference_date ?? undefined,
      } satisfies FinanceData;
    },

    async ensureDefaultRules() {
      // Starter rules are seeded server-side by the handle_new_user trigger, so
      // here we only read. The insert path is a fallback for accounts created
      // before that trigger existed; conflicts are ignored.
      const { data: all } = await supabase
        .from("categorization_rules")
        .select("*")
        .order("priority", { ascending: false });
      if (all && all.length) return all.map(rowToRule);

      const rules = defaultRules();
      await supabase.from("categorization_rules").insert(rules.map((r) => ruleToRow(r, userId)));
      const { data: seeded } = await supabase
        .from("categorization_rules")
        .select("*")
        .order("priority", { ascending: false });
      return seeded && seeded.length ? seeded.map(rowToRule) : rules;
    },

    async upsertAccount(a) {
      const { error } = await supabase.from("accounts").upsert(accountToRow(a, userId));
      throwIf(error, "save account");
    },
    async deleteAccount(id) {
      const { error } = await supabase.from("accounts").delete().eq("id", id);
      throwIf(error, "delete account");
    },

    upsertTransactions,
    async deleteTransactions(ids) {
      if (!ids.length) return;
      const { error } = await supabase.from("transactions").delete().in("id", ids);
      throwIf(error, "delete transactions");
    },

    async upsertBudget(b) {
      const { error } = await supabase
        .from("budgets")
        .upsert(budgetToRow(b, userId), { onConflict: "user_id,category_slug" });
      throwIf(error, "save budget");
    },
    async deleteBudget(id) {
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      throwIf(error, "delete budget");
    },

    async upsertGoal(g) {
      const { error } = await supabase.from("goals").upsert(goalToRow(g, userId));
      throwIf(error, "save goal");
    },
    async deleteGoal(id) {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      throwIf(error, "delete goal");
    },

    async upsertRule(r) {
      const { error } = await supabase.from("categorization_rules").upsert(ruleToRow(r, userId));
      throwIf(error, "save rule");
    },
    async deleteRule(id) {
      const { error } = await supabase.from("categorization_rules").delete().eq("id", id);
      throwIf(error, "delete rule");
    },

    async replaceAll(data) {
      await this.clearAll();
      const { error: accErr } = await supabase.from("accounts").insert(data.accounts.map((a) => accountToRow(a, userId)));
      throwIf(accErr, "restore accounts");
      await upsertTransactions(data.transactions);
      if (data.budgets.length) {
        const { error } = await supabase.from("budgets").insert(data.budgets.map((b) => budgetToRow(b, userId)));
        throwIf(error, "restore budgets");
      }
      if (data.goals.length) {
        const { error } = await supabase.from("goals").insert(data.goals.map((g) => goalToRow(g, userId)));
        throwIf(error, "restore goals");
      }
      if (data.rules.length) {
        // clearAll() above removed the trigger-seeded rules; re-insert this set
        const { error } = await supabase
          .from("categorization_rules")
          .insert(data.rules.map((r) => ruleToRow(r, userId)));
        if (error) console.warn("restore rules:", error.message);
      }
      await this.markDemoSeeded(data.seededDemo, data.referenceDate ?? null);
    },

    async clearAll() {
      // transactions cascade from accounts, but delete explicitly to be safe
      await supabase.from("transactions").delete().eq("user_id", userId);
      await supabase.from("budgets").delete().eq("user_id", userId);
      await supabase.from("goals").delete().eq("user_id", userId);
      await supabase.from("categorization_rules").delete().eq("user_id", userId);
      await supabase.from("accounts").delete().eq("user_id", userId);
      await this.markDemoSeeded(false, null);
    },

    async markDemoSeeded(seeded, referenceDate = null) {
      await supabase
        .from("profiles")
        .update({ demo_seeded: seeded, demo_reference_date: referenceDate })
        .eq("id", userId);
    },
  };
}
