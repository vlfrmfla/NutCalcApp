// 표준 조성·목표 배액 데이터 검증. 사용: npm run validate:data
import { readFileSync } from "node:fs";
import { validateComposition } from "../lib/nutrient/index.js";

const nutrient = JSON.parse(readFileSync(new URL("../public/nutrient_solution.json", import.meta.url), "utf-8"));
const targetDrain = JSON.parse(readFileSync(new URL("../public/target_drain.json", import.meta.url), "utf-8"));

let errors = 0;
const report = (label, comp) => {
  const v = validateComposition(comp);
  const flag = v.issues.some((i) => i.level === "error") ? "ERROR" : v.issues.length ? "warn " : "ok   ";
  if (flag === "ERROR") errors += 1;
  const ecNominal = comp.EC !== undefined ? String(comp.EC) : "-";
  console.log(`${flag} ${label.padEnd(40)} CAT ${v.cationMeq.toFixed(2).padStart(6)} AN ${v.anionMeq.toFixed(2).padStart(6)} diff ${v.chargeBalance.toFixed(2).padStart(6)}  EC(est) ${v.ecEstimated.toFixed(2)} EC(표기) ${ecNominal}`);
  for (const issue of v.issues) console.log(`       - [${issue.level}] ${issue.message}`);
};

console.log("== nutrient_solution.json ==");
for (const [crop, substrates] of Object.entries(nutrient)) {
  for (const [substrate, comps] of Object.entries(substrates)) {
    for (const [name, comp] of Object.entries(comps)) report(`${crop}/${substrate}/${name}`, comp);
  }
}
console.log("\n== target_drain.json (배액 보정표) ==");
for (const [crop, entry] of Object.entries(targetDrain)) {
  if (crop.startsWith("_")) continue;
  for (const mode of ["비순환식", "순환식"]) {
    const t = entry[mode];
    if (!t) { console.log(`ERROR ${crop}/${mode}: 표 없음`); errors += 1; continue; }
    const problems = [];
    if (!(t.ecRef > 0)) problems.push("ecRef 없음");
    for (const [ion, table] of Object.entries({ ...(t.macro || {}), ...(t.micro || {}) })) {
      if (!Array.isArray(table.upper) || !Array.isArray(table.steps)) { problems.push(`${ion}: upper/steps 누락`); continue; }
      if (table.steps.length !== table.upper.length + 1) problems.push(`${ion}: steps(${table.steps.length}) != upper(${table.upper.length})+1`);
      if (table.steps.filter((x) => x === 0).length !== 1) problems.push(`${ion}: 0 단계가 하나여야 함`);
      for (let i = 1; i < table.upper.length; i++) if (!(table.upper[i] > table.upper[i - 1])) problems.push(`${ion}: upper 오름차순 아님`);
    }
    if (!Array.isArray(t.nh4Extra) || t.nh4Extra.length !== 3) problems.push("nh4Extra는 [a,b,c]");
    const flag = problems.length ? "ERROR" : "ok   ";
    if (problems.length) errors += 1;
    console.log(`${flag} ${(crop + "/" + mode).padEnd(40)} EC(c) ${t.ecRef}  목표 K ${t.targets?.K} Ca ${t.targets?.Ca} NO3 ${t.targets?.NO3}  (${t.source || "출처 없음"})`);
    for (const pr of problems) console.log("       - " + pr);
  }
}

if (errors > 0) {
  console.log(`\n${errors}개 조성에 오류가 있습니다.`);
  process.exit(1);
}
console.log("\n모든 조성이 유효합니다.");
