import type { Route } from "next";
import { redirect } from "next/navigation";

export default async function MpInviteCodeRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/invite/${id.toUpperCase()}` as Route);
}
