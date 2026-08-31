"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { UploadCloud, FileSpreadsheet, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import {
  COLUMN_ROLES,
  buildRows,
  guessRoles,
  rowsToTransactions,
  type ColumnRole,
  type ParsedRow,
} from "@/lib/csv";
import { formatDate } from "@/lib/finance/dates";
import { PageHeader, Money, CategoryPill } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Step = 1 | 2 | 3 | 4;

const SAMPLE_CSV = `Date,Description,Amount
2026-08-02,LOBLAWS #1234 TORONTO ON,-84.21
2026-08-03,TIM HORTONS #402,-4.85
2026-08-04,NETFLIX.COM,-22.99
2026-08-05,PAYROLL DEPOSIT NORTHBRIDGE,2985.40
2026-08-06,ESSO CIRCLE K,-61.40
2026-08-08,AMZN Mktp CA*2X4YT,-53.10
2026-08-09,SPOTIFY P0K2LM,-11.99
2026-08-11,UBER *TRIP HELP.UBER.CO,-18.60
2026-08-14,SHOPPERS DRUG MART #661,-32.44
2026-08-16,SQ *THE CORNER STORE,-12.75`;

export function ImportWizard() {
  const { data, addTransactionsBulk } = useStore();
  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<Record<string, string>[]>([]);
  const [roles, setRoles] = useState<ColumnRole[]>([]);
  const [accountId, setAccountId] = useState(data.accounts[0]?.id ?? "");
  const [result, setResult] = useState<{ added: number; duplicates: number; invalid: number; needsReview: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseText = (text: string, name: string) => {
    const out = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    const hs = out.meta.fields ?? [];
    if (!hs.length) {
      toast.error("Could not find a header row in that file");
      return;
    }
    setFileName(name);
    setHeaders(hs);
    setRecords(out.data);
    setRoles(guessRoles(hs));
    setStep(2);
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => parseText(String(reader.result), file.name);
    reader.readAsText(file);
  };

  const rows: ParsedRow[] = useMemo(() => {
    if (!headers.length) return [];
    return buildRows(records, headers, roles);
  }, [records, headers, roles]);

  const validCount = rows.filter((r) => r.ok).length;
  const hasDate = roles.includes("date");
  const hasAmount = roles.includes("amount") || roles.includes("amount_in") || roles.includes("amount_out");
  const hasMerchant = roles.includes("merchant") || roles.includes("description");
  const canProceed = hasDate && hasAmount && hasMerchant && !!accountId;

  const runImport = () => {
    const { transactions, skippedInvalid } = rowsToTransactions(rows, accountId, data.rules);
    const { added, duplicates } = addTransactionsBulk(transactions);
    const needsReview = transactions.slice(0, added).filter((t) => !t.reviewed).length;
    setResult({ added, duplicates, invalid: skippedInvalid, needsReview });
    setStep(4);
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "finflow-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Import transactions"
        description="Upload a CSV export from your bank. FinFlow maps the columns, removes duplicates, and categorizes everything."
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/transactions">
              <ArrowLeft className="size-4" /> Back
            </Link>
          </Button>
        }
      />

      <Stepper step={step} />

      {step === 1 ? (
        <Card>
          <CardContent className="p-6">
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) onFile(f);
              }}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-strong bg-surface-muted/40 px-6 py-12 text-center transition-colors hover:border-ring"
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-surface text-muted-foreground">
                <UploadCloud className="size-6" />
              </span>
              <span className="mt-3 text-[14px] font-medium text-foreground">Drop a CSV here, or click to browse</span>
              <span className="mt-1 text-[12px] text-muted-foreground">.csv files up to a few thousand rows</span>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
              />
            </label>
            <div className="mt-4 flex items-center justify-between text-[12px] text-muted-foreground">
              <span>Don&apos;t have one handy?</span>
              <Button variant="outline" size="sm" onClick={downloadSample}>
                <Download className="size-4" /> Download sample CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <FileSpreadsheet className="size-4" />
              <span className="font-medium text-foreground">{fileName}</span> · {records.length} rows
            </div>

            <div className="space-y-2">
              <p className="text-[13px] font-medium">Map your columns</p>
              <div className="grid gap-2">
                {headers.map((h, i) => (
                  <div key={h + i} className="grid grid-cols-[1fr_1fr] items-center gap-3 rounded-lg border border-border px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-foreground">{h}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        e.g. {records[0]?.[h] ?? "—"}
                      </p>
                    </div>
                    <Select
                      value={roles[i]}
                      onValueChange={(v) => setRoles((prev) => prev.map((r, idx) => (idx === i ? (v as ColumnRole) : r)))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COLUMN_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[13px] font-medium">Import into account</p>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Choose an account" /></SelectTrigger>
                <SelectContent>
                  {data.accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!canProceed ? (
              <p className="flex items-center gap-1.5 text-[12px] text-warning">
                <AlertTriangle className="size-3.5" />
                Map a date, an amount, and a merchant/description column{!accountId ? ", and pick an account" : ""} to continue.
              </p>
            ) : (
              <p className="text-[12px] text-muted-foreground">{validCount} of {records.length} rows look valid.</p>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button disabled={!canProceed} onClick={() => setStep(3)}>
                Preview <ArrowRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <p className="text-[13px] font-medium">Preview — first 8 rows</p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Merchant</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map((r, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {r.ok ? (
                        <>
                          <td className="whitespace-nowrap px-3 py-2 tnum text-muted-foreground">{formatDate(r.date, { month: "short", day: "numeric" })}</td>
                          <td className="px-3 py-2 font-medium text-foreground">{r.merchant}</td>
                          <td className="px-3 py-2">
                            <CategoryPill id={rowsToTransactions([r], accountId, data.rules).transactions[0].categoryId} />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Money cents={r.type === "income" ? r.amount : -r.amount} signed colorize />
                          </td>
                        </>
                      ) : (
                        <td colSpan={4} className="px-3 py-2 text-[12px] text-warning">
                          Row {i + 1} skipped — {r.reason}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[12px] text-muted-foreground">
              {validCount} valid rows · duplicates already in FinFlow will be skipped automatically.
            </p>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button onClick={runImport}>Import {validCount} transactions</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 && result ? (
        <Card>
          <CardContent className="space-y-5 p-6 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-positive-soft text-positive">
              <CheckCircle2 className="size-6" />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-foreground">Import complete</p>
              <p className="text-[13px] text-muted-foreground">{fileName}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Imported" value={result.added} />
              <Stat label="Duplicates skipped" value={result.duplicates} />
              <Stat label="Need review" value={result.needsReview} tone="warning" />
            </div>
            {result.invalid > 0 ? (
              <p className="text-[12px] text-muted-foreground">{result.invalid} rows were skipped because a date or amount couldn&apos;t be read.</p>
            ) : null}
            <div className="flex justify-center gap-2">
              <Button asChild>
                <Link href="/transactions">View transactions</Link>
              </Button>
              {result.needsReview > 0 ? (
                <Button variant="outline" asChild>
                  <Link href="/review">Review {result.needsReview}</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const labels = ["Upload", "Map columns", "Preview", "Done"];
  return (
    <ol className="flex items-center gap-2 text-[12px]">
      {labels.map((l, i) => {
        const n = (i + 1) as Step;
        const state = n < step ? "done" : n === step ? "current" : "todo";
        return (
          <li key={l} className="flex items-center gap-2">
            <span
              className={`flex size-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                state === "done"
                  ? "bg-positive text-white"
                  : state === "current"
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </span>
            <span className={state === "todo" ? "text-muted-foreground" : "font-medium text-foreground"}>{l}</span>
            {i < labels.length - 1 ? <span className="mx-1 h-px w-6 bg-border" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warning" }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className={`tnum text-xl font-semibold ${tone === "warning" && value > 0 ? "text-warning" : "text-foreground"}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
