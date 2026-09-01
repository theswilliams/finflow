"use client";

import { useRef } from "react";
import { RotateCcw, Trash2, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/primitives";

export function DataPanel() {
  const { data, isDemo, mode, user, resetDemo, clearAll, exportJson, importJson } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const synced = mode === "supabase" && !!user;

  const download = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finflow-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your data</CardTitle>
        <CardDescription>
          {synced
            ? `Your data syncs to your account${user?.email ? ` (${user.email})` : ""}.`
            : "Everything is stored locally in this browser — nothing is sent to a server."}{" "}
          {isDemo ? "You're currently viewing sample data." : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-3">
          <p className="text-[13px] font-medium">Sample data</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {data.transactions.length} transactions, {data.accounts.length} accounts, {data.budgets.length} budgets.
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => { resetDemo(); toast.success("Sample data restored"); }}>
            <RotateCcw className="size-4" /> Reset to sample data
          </Button>
        </div>

        <div className="rounded-lg border border-border p-3">
          <p className="text-[13px] font-medium">Start fresh</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Remove all sample data and begin with your own.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 text-negative hover:bg-negative-soft"
            onClick={() => {
              if (confirm("Delete all accounts, transactions, budgets and goals?")) {
                clearAll();
                toast.success("Cleared. Add an account to begin.");
              }
            }}
          >
            <Trash2 className="size-4" /> Clear everything
          </Button>
        </div>

        <div className="rounded-lg border border-border p-3">
          <p className="text-[13px] font-medium">Export</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Download a JSON backup of all your data.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={download}>
            <Download className="size-4" /> Export JSON
          </Button>
        </div>

        <div className="rounded-lg border border-border p-3">
          <p className="text-[13px] font-medium">Import</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Restore from a FinFlow JSON backup.</p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  importJson(String(reader.result));
                  toast.success("Data imported");
                } catch {
                  toast.error("That file could not be read");
                }
              };
              reader.readAsText(file);
            }}
          />
          <Button variant="outline" size="sm" className="mt-3" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> Import JSON
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
