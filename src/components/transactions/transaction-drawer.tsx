"use client";

import { useState } from "react";
import { Trash2, Wand2, Check } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import type { Transaction } from "@/lib/types";
import { categoryName } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/overlays";
import { DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/overlays";
import { X } from "lucide-react";
import { TransactionForm } from "./transaction-form";
import { Money } from "@/components/shared";

export function TransactionDrawer({
  transaction,
  open,
  onOpenChange,
}: {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data, addRule, removeTransactions, updateTransaction } = useStore();
  const [creatingRule, setCreatingRule] = useState(false);

  if (!transaction) return null;
  const account = data.accounts.find((a) => a.id === transaction.accountId);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader>
          <div>
            <DrawerTitle>{transaction.merchant}</DrawerTitle>
            <DrawerDescription>
              <Money
                cents={transaction.type === "income" ? transaction.amount : -transaction.amount}
                signed
                colorize
                className="font-medium"
              />{" "}
              · {account?.name ?? "—"}
            </DrawerDescription>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close">
              <X className="size-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <TransactionForm
            mode="edit"
            transaction={transaction}
            formId="transaction-drawer-form"
            onDone={() => {
              toast.success("Transaction updated");
              onOpenChange(false);
            }}
          />

          <div className="mt-6 space-y-3 rounded-lg border border-border bg-surface-muted/50 p-4">
            <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
              <Wand2 className="size-4 text-muted-foreground" />
              Categorization rule
            </div>
            <p className="text-[12px] text-muted-foreground">
              Always categorize transactions where the merchant contains
              <span className="font-medium text-foreground"> “{transaction.merchant}” </span>
              as <span className="font-medium text-foreground">{categoryName(transaction.categoryId)}</span>.
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={creatingRule}
              onClick={() => {
                addRule({
                  field: "merchant",
                  op: "contains",
                  value: transaction.merchant,
                  categoryId: transaction.categoryId,
                });
                setCreatingRule(true);
                toast.success("Rule created and applied");
              }}
            >
              {creatingRule ? <Check className="size-4" /> : <Wand2 className="size-4" />}
              {creatingRule ? "Rule created" : "Create rule from this merchant"}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-negative hover:bg-negative-soft"
            onClick={() => {
              removeTransactions([transaction.id]);
              toast.success("Transaction deleted");
              onOpenChange(false);
            }}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
          <div className="flex gap-2">
            {!transaction.reviewed ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  updateTransaction(transaction.id, { reviewed: true });
                  toast.success("Marked as reviewed");
                }}
              >
                <Check className="size-4" />
                Mark reviewed
              </Button>
            ) : null}
            <Button type="submit" form="transaction-drawer-form" size="sm">
              Save changes
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
