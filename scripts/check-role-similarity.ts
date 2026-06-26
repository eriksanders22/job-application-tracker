import { areLikelySameRole } from "../lib/application-normalization";

const checks = [
  {
    roleA: "junior software engineering program",
    roleB: "junior software engineering program engineer associate",
    expected: true
  },
  {
    roleA: "software engineer",
    roleB: "software engineer i",
    expected: true
  },
  {
    roleA: "junior software developer",
    roleB: "software developer",
    expected: true
  },
  {
    roleA: "data analyst",
    roleB: "senior data analyst",
    expected: true
  },
  {
    roleA: "engineer",
    roleB: "software engineer",
    expected: false
  },
  {
    roleA: "analyst",
    roleB: "financial analyst",
    expected: false
  },
  {
    roleA: "software engineer",
    roleB: "data engineer",
    expected: false
  }
];

for (const check of checks) {
  const actual = areLikelySameRole(check.roleA, check.roleB);

  if (actual !== check.expected) {
    throw new Error(
      `${check.roleA} / ${check.roleB}: expected ${check.expected}, got ${actual}`
    );
  }
}

console.log("Role similarity checks passed.");
