"use client";

import { Printer } from "lucide-react";
import { btnClass } from "@/components/ui";

export function PrintButton() {
  return <button type="button" className={btnClass("ghost", "sm")} onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Print</button>;
}
