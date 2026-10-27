"use client";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from "@mui/material";

export const DISPLAY_KEYS = ["EC", "pH", "NH4", "NO3", "PO4", "K", "Ca", "Mg", "SO4", "Cl", "Na", "HCO3", "Fe", "Mn", "B", "Zn", "Cu", "Mo"];
export const MICRO_KEYS = ["Fe", "Mn", "B", "Zn", "Cu", "Mo"];

const HEADER_LABELS = {
  EC: "EC", pH: "pH", NH4: "NH₄", NO3: "NO₃", PO4: "PO₄", K: "K", Ca: "Ca", Mg: "Mg", SO4: "SO₄",
  Cl: "Cl", Na: "Na", HCO3: "HCO₃", Fe: "Fe", Mn: "Mn", B: "B", Zn: "Zn", Cu: "Cu", Mo: "Mo",
};

export function formatValue(value, key, decimals = 2) {
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "string") return value;
  if (!Number.isFinite(value)) return "-";
  return value.toFixed(decimals);
}

// rows: [{ label, values, decimals?, render?(key) → ReactNode, cellSx?(key) → sx }]
export default function CompositionTable({ rows, keys = DISPLAY_KEYS, caption }) {
  return (
    <TableContainer component={Paper} className="responsive-table-container" sx={{ mt: 1 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell align="center" sx={{ fontWeight: "bold", whiteSpace: "nowrap" }}>구분</TableCell>
            {keys.map((key) => (
              <TableCell key={key} align="center" sx={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                {HEADER_LABELS[key] || key}
              </TableCell>
            ))}
          </TableRow>
          {caption && (
            <TableRow>
              <TableCell align="center" sx={{ fontSize: "0.7rem", color: "#888" }}>단위</TableCell>
              {keys.map((key) => (
                <TableCell key={key} align="center" sx={{ fontSize: "0.7rem", color: "#888", whiteSpace: "nowrap" }}>
                  {key === "EC" ? "dS/m" : key === "pH" ? "" : MICRO_KEYS.includes(key) ? "µmol/L" : "mmol/L"}
                </TableCell>
              ))}
            </TableRow>
          )}
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell align="center" sx={{ whiteSpace: "nowrap", fontWeight: row.bold ? "bold" : "normal" }}>{row.label}</TableCell>
              {keys.map((key) => (
                <TableCell key={key} align="center" sx={row.cellSx ? row.cellSx(key) : undefined}>
                  {row.render ? row.render(key) : formatValue(row.values?.[key], key, row.decimals)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
