"use client";

import { markNotificationsReadAction } from "@/lib/actions/loans";
import { ActionButton } from "./action-button";

export function MarkReadButton() {
  return <ActionButton size="sm" variant="ghost" action={() => markNotificationsReadAction()}>Mark all read</ActionButton>;
}
