"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/overlays";
import { TransactionForm } from "./transaction-form";
import { useStore } from "@/lib/store";

export function AddTransactionButton({
  variant = "default",
  size = "default",
  label = "Add transaction",
  iconOnly = false,
}: {
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  label?: string;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { data } = useStore();
  const hasAccounts = data.accounts.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={iconOnly ? "icon" : size} aria-label={label}>
          <Plus className="size-4" />
          {!iconOnly && label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add transaction</DialogTitle>
          <DialogDescription>
            {hasAccounts
              ? "Record an expense, income, or transfer between accounts."
              : "Create an account first from Settings, then add transactions."}
          </DialogDescription>
        </DialogHeader>
        {hasAccounts ? (
          <TransactionForm
            mode="create"
            onDone={() => {
              setOpen(false);
              toast.success("Transaction added");
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
