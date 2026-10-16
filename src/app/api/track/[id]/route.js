import { getOrder, getTrackingPayload } from "@/lib/orders";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const user = await getSession();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await getOrder(id);

  if (!order) {
    return Response.json({ error: "No such order" }, { status: 404 });
  }

  if (user.role !== "staff" && order.userId !== user.id) {
    return Response.json({ error: "No such order" }, { status: 404 });
  }

  return Response.json(getTrackingPayload(order));
}
