import { Suspense } from "react";
import { TransactionsView } from "@/components/transactions/transactions-view";

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="h-4" />}>
      <TransactionsView />
    </Suspense>
  );
}
