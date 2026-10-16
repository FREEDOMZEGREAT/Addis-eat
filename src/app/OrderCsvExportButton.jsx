"use client";

import { createOrdersCsv } from "@/lib/orders-csv";

export default function OrderCsvExportButton({ orders, dishNames, filename }) {
  function downloadCsv() {
    const csv = createOrdersCsv(orders, dishNames);
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <button
      type="button"
      className="btn btn-outline"
      onClick={downloadCsv}
      disabled={orders.length === 0}
    >
      Export CSV ({orders.length})
    </button>
  );
}
