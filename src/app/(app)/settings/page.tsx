"use client";

import { PageHeader } from "@/components/shared";
import { AccountsPanel } from "@/components/settings/accounts-panel";
import { RulesPanel } from "@/components/settings/rules-panel";
import { DataPanel } from "@/components/settings/data-panel";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Accounts, categorization rules, and your data." />
      <AccountsPanel />
      <RulesPanel />
      <DataPanel />
      <p className="text-center text-[11px] text-muted-foreground">
        FinFlow · Amounts in CAD · Data stays in your browser
      </p>
    </div>
  );
}
