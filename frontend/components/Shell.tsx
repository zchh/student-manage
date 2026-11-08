"use client";

import { useEffect, useState } from "react";
import { currentUser, logout, type User } from "@/lib/api";

const advisorLinks = [
  ["/advisor/trials", "试听课"],
  ["/advisor/purchases", "消费记录"],
  ["/advisor/students", "学生"],
  ["/advisor/classes", "班级"],
];
const teacherLinks = [
  ["/teacher/sessions", "班级课时"],
  ["/teacher/students", "班级学生"],
  ["/teacher/attendance", "签到"],
];

export function Shell({ role, children }: { role: User["role"]; children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [path, setPath] = useState("");

  useEffect(() => {
    const found = currentUser();
    if (!found || found.role !== role) {
      location.href = "/";
      return;
    }
    setUser(found);
    setPath(location.pathname);
  }, [role]);

  if (!user) return null;
  const links = role === "advisor" ? advisorLinks : teacherLinks;
  return (
    <div className="shell">
      <nav>
        <strong>{user.name}</strong>
        <p>{role === "advisor" ? "顾问" : "教师"}</p>
        {links.map(([href, label]) => (
          <a className={path === href || path.startsWith(`${href}/`) ? "active" : ""} key={href} href={href}>{label}</a>
        ))}
        <button className="ghost" style={{ marginTop: 20, color: "white", borderColor: "white" }} onClick={logout}>退出</button>
      </nav>
      <main>{children}</main>
    </div>
  );
}
