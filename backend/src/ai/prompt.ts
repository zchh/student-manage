import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface TrialAssistFacts {
  studentName: string;
  gender: string;
  birthDate: string;
  phone: string;
  parentPhone: string;
  courseType: string;
  timeRange: string;
  remark: string;
  opinion: string;
  plannedEnrollDate: string;
  visits: string;
}

const template = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../prompts/trial-assist.txt"),
  "utf8",
);

export function renderTrialAssistPrompt(facts: TrialAssistFacts): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = facts[key as keyof TrialAssistFacts];
    return value?.trim() ? value : "未填写";
  });
}
