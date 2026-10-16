import { notFound, redirect } from "next/navigation";
import { getOrder, getTrackingPayload } from "@/lib/orders";
import { getSession } from "@/lib/session";
import OrderTracker from "./OrderTracker";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Track order",
  description: "Follow your Addis Eats delivery in real time.",
  robots: { index: false, follow: false },
};

export default async function TrackPage({ params }) {
  const { id } = await params;
  const user = await getSession();
  if (!user) {
    redirect(`/signin?next=${encodeURIComponent(`/track/${id}`)}`);
  }

  const order = await getOrder(id);
  if (!order) notFound();
  if (user.role !== "staff" && order.userId !== user.id) notFound();

  return <OrderTracker initial={getTrackingPayload(order)} />;
}
