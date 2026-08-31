"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useStore } from "@/lib/store";
import { ruleFormSchema } from "@/lib/validation";
import { CATEGORIES, categoryName } from "@/lib/categories";
import type { CategoryId, RuleMatchField, RuleMatchOp } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label } from "@/components/ui/primitives";
import { Checkbox } from "@/components/ui/controls";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryDot } from "@/components/shared";

type RuleForm = z.infer<typeof ruleFormSchema>;
const OPS: { value: RuleMatchOp; label: string }[] = [
  { value: "contains", label: "contains" },
  { value: "equals", label: "is exactly" },
  { value: "starts_with", label: "starts with" },
];

export function RulesPanel() {
  const { data, addRule, updateRule, removeRule, applyRules } = useStore();
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RuleForm>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: { field: "merchant", op: "contains", value: "", categoryId: "shopping" },
  });

  const submit = handleSubmit((v) => {
    addRule({ field: v.field as RuleMatchField, op: v.op as RuleMatchOp, value: v.value, categoryId: v.categoryId as CategoryId });
    toast.success("Rule added and applied to existing transactions");
    reset({ field: "merchant", op: "contains", value: "", categoryId: "shopping" });
    setShowForm(false);
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Categorization rules</CardTitle>
          <CardDescription>
            Rules run automatically on new and imported transactions. Manual category changes are never overridden.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => { applyRules(); toast.success("Rules re-applied"); }}>
            <Wand2 className="size-4" /> Re-run
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowForm((s) => !s)}>
            <Plus className="size-4" /> New rule
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm ? (
          <form onSubmit={submit} className="grid gap-3 rounded-lg border border-border bg-surface-muted/40 p-3 sm:grid-cols-[1fr_1fr_1.4fr_1fr_auto] sm:items-end">
            <div className="space-y-1">
              <Label>Field</Label>
              <Select value={watch("field")} onValueChange={(v) => setValue("field", v as RuleMatchField)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="merchant">Merchant</SelectItem>
                  <SelectItem value="description">Description</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Match</Label>
              <Select value={watch("op")} onValueChange={(v) => setValue("op", v as RuleMatchOp)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="rule-value">Text</Label>
              <Input id="rule-value" placeholder="e.g. Amazon" {...register("value")} />
              {errors.value ? <p className="text-[11px] text-negative">{errors.value.message}</p> : null}
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={watch("categoryId")} onValueChange={(v) => setValue("categoryId", v as CategoryId)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c.kind !== "transfer").map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" size="sm">Add</Button>
          </form>
        ) : null}

        {data.rules.length ? (
          <ul className="space-y-1.5">
            {data.rules
              .slice()
              .sort((a, b) => b.priority - a.priority)
              .map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-[13px]">
                  <Checkbox
                    checked={r.enabled}
                    onCheckedChange={(v) => updateRule(r.id, { enabled: Boolean(v) })}
                    aria-label="Toggle rule"
                  />
                  <span className="flex-1 text-muted-foreground">
                    If <span className="font-medium text-foreground">{r.field}</span>{" "}
                    {OPS.find((o) => o.value === r.op)?.label}{" "}
                    <span className="font-medium text-foreground">“{r.value}”</span> →
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                    <CategoryDot id={r.categoryId} /> {categoryName(r.categoryId)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-negative hover:bg-negative-soft"
                    aria-label="Delete rule"
                    onClick={() => { removeRule(r.id); toast.success("Rule removed"); }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
          </ul>
        ) : (
          <p className="py-3 text-center text-[13px] text-muted-foreground">
            No custom rules yet. FinFlow still recognises {"~"}120 common Canadian merchants automatically.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
