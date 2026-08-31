"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Upload,
  Check,
  Tag as TagIcon,
  Trash2,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import type { CategoryId, Transaction, TransactionType } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { formatDate } from "@/lib/finance/dates";
import {
  EMPTY_FILTER,
  activeFilterCount,
  filterTransactions,
  sortTransactions,
  type SortKey,
  type TxnFilter,
} from "@/lib/finance/filter";
import { toCents } from "@/lib/finance/money";
import { PageHeader, EmptyState, Money, CategoryDot } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input, Label, Badge } from "@/components/ui/primitives";
import { Checkbox } from "@/components/ui/controls";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/controls";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MerchantAvatar } from "./merchant-avatar";
import { CategorySelect } from "./category-select";
import { TransactionDrawer } from "./transaction-drawer";
import { AddTransactionButton } from "./add-transaction";

const PAGE_SIZE = 25;
const TYPE_LABELS: Record<TransactionType, string> = { expense: "Expense", income: "Income", transfer: "Transfer" };

export function TransactionsView() {
  const { data, ready, setCategory, updateTransactionsBulk, removeTransactions } = useStore();
  const router = useRouter();
  const params = useSearchParams();

  // ---- filter state (seeded from URL) ----
  const [filter, setFilter] = useState<TxnFilter>(EMPTY_FILTER);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeTxn, setActiveTxn] = useState<Transaction | null>(null);

  useEffect(() => {
    const cat = params.get("category");
    const account = params.get("account");
    const type = params.get("type");
    const tag = params.get("tag");
    const review = params.get("review");
    setFilter((f) => ({
      ...f,
      categories: cat ? [cat as CategoryId] : [],
      accounts: account ? [account] : [],
      types: type ? [type as TransactionType] : [],
      tag: tag ?? undefined,
      reviewed: review === "1" ? "unreviewed" : undefined,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const filtered = useMemo(() => {
    const f = filterTransactions(data.transactions, filter);
    return sortTransactions(f, sortKey, sortDir);
  }, [data.transactions, filter, sortKey, sortDir]);

  useEffect(() => setPage(1), [filter, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filterCount = activeFilterCount(filter);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "merchant" || key === "category" ? "asc" : "desc");
    }
  };

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((t) => selected.has(t.id));
  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageRows.forEach((t) => next.delete(t.id));
      else pageRows.forEach((t) => next.add(t.id));
      return next;
    });
  };
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const clearSelection = () => setSelected(new Set());

  const patchUrl = useCallback(
    (next: TxnFilter) => {
      const sp = new URLSearchParams();
      if (next.categories[0]) sp.set("category", next.categories[0]);
      if (next.accounts[0]) sp.set("account", next.accounts[0]);
      if (next.types[0]) sp.set("type", next.types[0]);
      router.replace(`/transactions${sp.toString() ? `?${sp}` : ""}`, { scroll: false });
    },
    [router],
  );

  const update = (patch: Partial<TxnFilter>) => {
    setFilter((f) => {
      const next = { ...f, ...patch };
      patchUrl(next);
      return next;
    });
  };

  const sortIcon = (k: SortKey) => <SortIcon k={k} activeKey={sortKey} dir={sortDir} />;

  if (ready && data.transactions.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Transactions" />
        <EmptyState
          icon={ArrowLeftRight}
          title="No transactions yet"
          description="Add one manually or import a CSV from your bank. FinFlow categorizes everything automatically."
          action={
            <div className="flex gap-2">
              <AddTransactionButton />
              <Button variant="outline" asChild>
                <Link href="/transactions/import">
                  <Upload className="size-4" /> Import CSV
                </Link>
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transactions"
        description={`${filtered.length} of ${data.transactions.length} transactions`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/transactions/import">
                <Upload className="size-4" /> Import
              </Link>
            </Button>
            <AddTransactionButton size="sm" />
          </>
        }
      />

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Search merchant, description, notes…"
            className="pl-9"
            aria-label="Search transactions"
          />
        </div>

        <FilterPopover filter={filter} update={update} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ArrowUpDown className="size-4" /> Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            {(["date", "amount", "merchant", "category"] as SortKey[]).map((k) => (
              <DropdownMenuItem key={k} onClick={() => toggleSort(k)} className="capitalize">
                {k}
                {sortKey === k ? <span className="ml-auto text-[11px] text-muted-foreground">{sortDir}</span> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {filterCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilter(EMPTY_FILTER);
              router.replace("/transactions", { scroll: false });
            }}
          >
            <X className="size-4" /> Clear
          </Button>
        ) : null}
      </div>

      {/* active filter chips */}
      {filterCount > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {filter.categories.map((c) => (
            <Chip key={c} onRemoveAction={() => update({ categories: [] })}>
              <CategoryDot id={c} /> {CATEGORIES.find((x) => x.id === c)?.name}
            </Chip>
          ))}
          {filter.accounts.map((a) => (
            <Chip key={a} onRemoveAction={() => update({ accounts: [] })}>
              {data.accounts.find((x) => x.id === a)?.name}
            </Chip>
          ))}
          {filter.types.map((t) => (
            <Chip key={t} onRemoveAction={() => update({ types: [] })}>
              {TYPE_LABELS[t]}
            </Chip>
          ))}
          {filter.reviewed ? <Chip onRemoveAction={() => update({ reviewed: undefined })}>{filter.reviewed}</Chip> : null}
          {filter.minAmount != null || filter.maxAmount != null ? (
            <Chip onRemoveAction={() => update({ minAmount: undefined, maxAmount: undefined })}>Amount</Chip>
          ) : null}
          {filter.from || filter.to ? (
            <Chip onRemoveAction={() => update({ from: undefined, to: undefined })}>Date range</Chip>
          ) : null}
        </div>
      ) : null}

      {/* table (desktop) */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-surface md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
              <th className="w-10 px-3 py-2.5">
                <Checkbox checked={allOnPageSelected} onCheckedChange={toggleSelectAll} aria-label="Select all on page" />
              </th>
              <Th onClick={() => toggleSort("date")}>Date {sortIcon("date")}</Th>
              <Th onClick={() => toggleSort("merchant")}>Merchant {sortIcon("merchant")}</Th>
              <th className="px-3 py-2.5 font-medium">Category</th>
              <th className="px-3 py-2.5 font-medium">Account</th>
              <Th onClick={() => toggleSort("amount")} className="text-right">Amount {sortIcon("amount")}</Th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((t) => {
              const account = data.accounts.find((a) => a.id === t.accountId);
              const signed = t.type === "income" ? t.amount : t.type === "transfer" ? 0 : -t.amount;
              return (
                <tr
                  key={t.id}
                  className="group border-b border-border last:border-0 transition-colors hover:bg-surface-muted/60 data-[selected=true]:bg-surface-muted"
                  data-selected={selected.has(t.id)}
                >
                  <td className="px-3 py-2.5">
                    <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggleOne(t.id)} aria-label={`Select ${t.merchant}`} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 tnum text-[13px] text-muted-foreground">
                    {formatDate(t.date, { month: "short", day: "numeric" })}
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => setActiveTxn(t)} className="flex items-center gap-2.5 text-left">
                      <MerchantAvatar name={t.merchant} className="size-7" />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-foreground">{t.merchant}</span>
                        {t.description ? (
                          <span className="block truncate text-[11px] text-muted-foreground">{t.description}</span>
                        ) : null}
                      </span>
                      {!t.reviewed ? <Badge variant="warning">review</Badge> : null}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    {t.type === "transfer" ? (
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                        <ArrowLeftRight className="size-3" /> Transfer
                      </span>
                    ) : (
                      <CategorySelect
                        value={t.categoryId}
                        onChange={(id) => {
                          setCategory(t.id, id);
                          toast.success("Category updated");
                        }}
                        includeIncome={t.type === "income"}
                        className="h-7 w-[150px] border-transparent bg-transparent px-2 hover:bg-surface-muted shadow-none"
                      />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-muted-foreground">{account?.name ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <Money
                      cents={signed}
                      signed={t.type !== "transfer"}
                      className={`text-[13px] font-semibold ${t.type === "income" ? "text-positive" : "text-foreground"}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {pageRows.length === 0 ? (
          <div className="px-4 py-12 text-center text-[13px] text-muted-foreground">No transactions match your filters.</div>
        ) : null}
      </div>

      {/* list (mobile) */}
      <ul className="space-y-2 md:hidden">
        {pageRows.map((t) => {
          const account = data.accounts.find((a) => a.id === t.accountId);
          const signed = t.type === "income" ? t.amount : t.type === "transfer" ? 0 : -t.amount;
          return (
            <li key={t.id}>
              <button
                onClick={() => setActiveTxn(t)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left"
              >
                <MerchantAvatar name={t.merchant} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">{t.merchant}</p>
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <CategoryDot id={t.categoryId} />
                    {formatDate(t.date, { month: "short", day: "numeric" })} · {account?.name}
                  </p>
                </div>
                <Money
                  cents={signed}
                  signed={t.type !== "transfer"}
                  className={`text-[13px] font-semibold ${t.type === "income" ? "text-positive" : "text-foreground"}`}
                />
              </button>
            </li>
          );
        })}
      </ul>

      {/* pagination */}
      {filtered.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between text-[13px] text-muted-foreground">
          <span>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="tnum flex items-center px-1">
              {page} / {pageCount}
            </span>
            <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}

      {/* bulk toolbar */}
      {selected.size > 0 ? (
        <div className="fixed inset-x-0 bottom-20 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 shadow-[var(--shadow-pop)] lg:bottom-6">
          <span className="tnum px-1 text-[13px] font-medium">{selected.size} selected</span>
          <div className="h-5 w-px bg-border" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <CategoryDot id="other" /> Categorize
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
              {CATEGORIES.filter((c) => c.kind !== "transfer").map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => {
                    updateTransactionsBulk([...selected], {
                      categoryId: c.id,
                      categorySource: "manual",
                      reviewed: true,
                    });
                    toast.success(`Moved ${selected.size} to ${c.name}`);
                    clearSelection();
                  }}
                >
                  <CategoryDot id={c.id} /> {c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              updateTransactionsBulk([...selected], { reviewed: true });
              toast.success("Marked as reviewed");
              clearSelection();
            }}
          >
            <Check className="size-4" /> Reviewed
          </Button>
          <BulkTagButton
            onTag={(tag) => {
              const ids = [...selected];
              ids.forEach((id) => {
                const t = data.transactions.find((x) => x.id === id);
                if (t && !t.tags.includes(tag)) updateTransactionsBulk([id], { tags: [...t.tags, tag] });
              });
              toast.success(`Tagged ${ids.length}`);
              clearSelection();
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="text-negative hover:bg-negative-soft"
            onClick={() => {
              removeTransactions([...selected]);
              toast.success(`Deleted ${selected.size}`);
              clearSelection();
            }}
          >
            <Trash2 className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={clearSelection} aria-label="Clear selection">
            <X className="size-4" />
          </Button>
        </div>
      ) : null}

      <TransactionDrawer transaction={activeTxn} open={!!activeTxn} onOpenChange={(v) => !v && setActiveTxn(null)} />
    </div>
  );
}

function SortIcon({ k, activeKey, dir }: { k: SortKey; activeKey: SortKey; dir: "asc" | "desc" }) {
  if (activeKey !== k) return <ArrowUpDown className="size-3 opacity-40" />;
  return dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />;
}

function Th({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <th className={`px-3 py-2.5 font-medium ${className}`}>
      <button onClick={onClick} className={`inline-flex items-center gap-1 hover:text-foreground ${className.includes("right") ? "flex-row-reverse" : ""}`}>
        {children}
      </button>
    </th>
  );
}

function Chip({ children, onRemoveAction }: { children: React.ReactNode; onRemoveAction: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[12px] font-medium">
      {children}
      <button onClick={onRemoveAction} aria-label="Remove filter" className="text-muted-foreground hover:text-foreground">
        <X className="size-3" />
      </button>
    </span>
  );
}

function BulkTagButton({ onTag }: { onTag: (tag: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <TagIcon className="size-4" /> Tag
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) {
              onTag(value.trim());
              setValue("");
            }
          }}
          className="space-y-2"
        >
          <Label htmlFor="bulk-tag">Add tag</Label>
          <Input id="bulk-tag" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. reimbursable" autoFocus />
          <Button type="submit" size="sm" className="w-full">
            Apply
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function FilterPopover({ filter, update }: { filter: TxnFilter; update: (p: Partial<TxnFilter>) => void }) {
  const { data } = useStore();
  const count = activeFilterCount(filter);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="size-4" /> Filters
          {count > 0 ? <Badge variant="neutral" className="ml-1">{count}</Badge> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-4">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <div className="flex gap-1">
            {(["expense", "income", "transfer"] as TransactionType[]).map((t) => (
              <button
                key={t}
                onClick={() => update({ types: filter.types.includes(t) ? [] : [t] })}
                className={`flex-1 rounded-md border px-2 py-1 text-[12px] capitalize ${
                  filter.types.includes(t) ? "border-primary bg-surface-muted font-medium" : "border-border text-muted-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select
            value={filter.categories[0] ?? "all"}
            onValueChange={(v) => update({ categories: v === "all" ? [] : [v as CategoryId] })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Account</Label>
          <Select value={filter.accounts[0] ?? "all"} onValueChange={(v) => update({ accounts: v === "all" ? [] : [v] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {data.accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="min-amt">Min amount</Label>
            <Input
              id="min-amt"
              inputMode="decimal"
              placeholder="$0"
              defaultValue={filter.minAmount != null ? (filter.minAmount / 100).toString() : ""}
              onBlur={(e) => update({ minAmount: e.target.value ? toCents(e.target.value) : undefined })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max-amt">Max amount</Label>
            <Input
              id="max-amt"
              inputMode="decimal"
              placeholder="Any"
              defaultValue={filter.maxAmount != null ? (filter.maxAmount / 100).toString() : ""}
              onBlur={(e) => update({ maxAmount: e.target.value ? toCents(e.target.value) : undefined })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="from-date">From</Label>
            <Input id="from-date" type="date" defaultValue={filter.from ?? ""} onBlur={(e) => update({ from: e.target.value || undefined })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to-date">To</Label>
            <Input id="to-date" type="date" defaultValue={filter.to ?? ""} onBlur={(e) => update({ to: e.target.value || undefined })} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Review status</Label>
          <div className="flex gap-1">
            {(["reviewed", "unreviewed"] as const).map((r) => (
              <button
                key={r}
                onClick={() => update({ reviewed: filter.reviewed === r ? undefined : r })}
                className={`flex-1 rounded-md border px-2 py-1 text-[12px] capitalize ${
                  filter.reviewed === r ? "border-primary bg-surface-muted font-medium" : "border-border text-muted-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
