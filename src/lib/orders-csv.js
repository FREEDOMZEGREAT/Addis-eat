function csvCell(value) {
  let text = String(value ?? "");

  // Prefix spreadsheet formulas with an apostrophe to avoid executing customer
  // supplied text when the CSV is opened in spreadsheet software.
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;

  return `"${text.replaceAll('"', '""')}"`;
}

export function createOrdersCsv(orders, dishNames = {}) {
  const columns = [
    "Order ID",
    "Placed at",
    "Status",
    "Customer name",
    "Phone",
    "Area",
    "Address",
    "Items",
    "Subtotal",
    "Delivery fee",
    "Total",
    "Currency",
    "Note",
  ];

  const rows = orders.map((order) => [
    order.id,
    order.createdAt,
    order.status,
    order.name,
    order.phone,
    order.area,
    order.address,
    (order.items ?? [])
      .map(
        (item) =>
          `${item.qty ?? 1} x ${dishNames[item.id] ?? `Dish #${item.id}`}`,
      )
      .join("; "),
    order.subtotal,
    order.deliveryFee,
    order.total,
    order.currency ?? "ETB",
    order.note,
  ]);

  return `\uFEFF${[columns, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n")}`;
}
