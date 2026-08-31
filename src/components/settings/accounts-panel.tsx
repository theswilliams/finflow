"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { accountBalance } from "@/lib/finance/calculations";
import { toCents } from "@/lib/finance/money";
import type { Account, AccountType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label } from "@/components/ui/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/overlays";
import { Money, AccountTypeBadge, accountTypeLabel } from "@/components/shared";

const TYPES: AccountType[] = ["chequing", "savings", "credit_card", "cash", "investment", "loan"];

type Draft = { id?: string; name: string; type: AccountType; institution: string; opening: string };

export function AccountsPanel() {
  const { data, addAccount, updateAccount, removeAccount } = useStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const startCreate = () => {
    setDraft({ name: "", type: "chequing", institution: "", opening: "" });
    setOpen(true);
  };
  const startEdit = (a: Account) => {
    setDraft({ id: a.id, name: a.name, type: a.type, institution: a.institution ?? "", opening: (a.openingBalance / 100).toString() });
    setOpen(true);
  };

  const save = () => {
    if (!draft?.name.trim()) return;
    const opening = draft.opening ? toCents(draft.opening) : 0;
    if (draft.id) {
      updateAccount(draft.id, { name: draft.name.trim(), type: draft.type, institution: draft.institution || undefined, openingBalance: opening });
      toast.success("Account updated");
    } else {
      addAccount({ name: draft.name.trim(), type: draft.type, institution: draft.institution || undefined, openingBalance: opening, currency: "CAD" });
      toast.success("Account added");
    }
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>Balances are opening balance plus every transaction. No bank connection required.</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={startCreate}>
          <Plus className="size-4" /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.accounts.map((a) => {
          const balance = accountBalance(a, data.transactions);
          const count = data.transactions.filter((t) => t.accountId === a.id || t.transferAccountId === a.id).length;
          return (
            <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-surface-muted text-muted-foreground">
                <Building2 className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                  {a.name} <AccountTypeBadge type={a.type} />
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {a.institution ? `${a.institution} · ` : ""}
                  {count} transactions
                </p>
              </div>
              <Money cents={balance} showCents={false} className={`text-[13px] font-semibold ${balance < 0 ? "text-negative" : "text-foreground"}`} />
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" aria-label={`Edit ${a.name}`} onClick={() => startEdit(a)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${a.name}`}
                  className="text-negative hover:bg-negative-soft"
                  onClick={() => {
                    if (confirm(`Delete ${a.name} and its transactions?`)) {
                      removeAccount(a.id);
                      toast.success("Account deleted");
                    }
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
        {data.accounts.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-muted-foreground">No accounts yet. Add one to start tracking.</p>
        ) : null}
      </CardContent>

      {draft ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{draft.id ? "Edit account" : "Add account"}</DialogTitle>
              <DialogDescription>For credit cards and loans, enter a negative opening balance if you owe money.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="acc-name">Name</Label>
                <Input id="acc-name" autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Everyday Chequing" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v as AccountType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{accountTypeLabel(t)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acc-open">Opening balance</Label>
                  <Input id="acc-open" inputMode="decimal" className="tnum" placeholder="0.00" value={draft.opening} onChange={(e) => setDraft({ ...draft, opening: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-inst">Institution (optional)</Label>
                <Input id="acc-inst" value={draft.institution} onChange={(e) => setDraft({ ...draft, institution: e.target.value })} placeholder="TD Canada Trust" />
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                <Button type="submit">{draft.id ? "Save" : "Add account"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </Card>
  );
}
