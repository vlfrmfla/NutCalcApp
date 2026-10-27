"use client";
import { Alert, Stack } from "@mui/material";

const SEVERITY = { error: "error", warning: "warning", info: "info" };

export default function WarningList({ warnings = [], sx }) {
  if (!warnings.length) return null;
  const order = { error: 0, warning: 1, info: 2 };
  const sorted = [...warnings].sort((a, b) => (order[a.level] ?? 3) - (order[b.level] ?? 3));
  return (
    <Stack spacing={1} sx={sx}>
      {sorted.map((w, i) => (
        <Alert key={`${w.code}-${w.ion || ""}-${i}`} severity={SEVERITY[w.level] || "info"} sx={{ py: 0 }}>
          {w.message}
        </Alert>
      ))}
    </Stack>
  );
}
