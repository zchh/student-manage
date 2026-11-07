"use client";

import { Shell } from "@/components/Shell";
import type { ReactNode } from "react";

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return <Shell role="teacher">{children}</Shell>;
}
