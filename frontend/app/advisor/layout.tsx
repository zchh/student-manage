"use client";

import { Shell } from "@/components/Shell";
import type { ReactNode } from "react";

export default function AdvisorLayout({ children }: { children: ReactNode }) {
  return <Shell role="advisor">{children}</Shell>;
}
