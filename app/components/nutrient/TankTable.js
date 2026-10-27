"use client";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from "@mui/material";

function formatMass(entry) {
  if (entry.micro) return `${entry.grams.toFixed(1)} g`;
  return `${entry.kg.toFixed(2)} kg`;
}

export default function TankTable({ title, entries, totalKg }) {
  return (
    <>
      <Typography variant="h6" sx={{ mt: 3, fontWeight: "bold" }}>
        {title}
        {totalKg !== undefined && (
          <Typography component="span" variant="body2" sx={{ ml: 1, color: "#777" }}>
            총 {totalKg.toFixed(1)} kg
          </Typography>
        )}
      </Typography>
      <TableContainer component={Paper} sx={{ mt: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>비료</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold", whiteSpace: "nowrap" }}>급액 농도</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold", whiteSpace: "nowrap" }}>원액 탱크 투입량</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ color: "#888" }}>투입할 비료가 없습니다.</TableCell>
              </TableRow>
            )}
            {entries.map((entry) => (
              <TableRow key={entry.key} sx={{ backgroundColor: entry.micro ? "#f8f3fb" : "inherit" }}>
                <TableCell>{entry.name}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                  {entry.amount.toFixed(entry.micro ? 1 : 2)} {entry.micro ? "µmol/L" : "mmol/L"}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                  {entry.liters !== undefined ? (
                    <>
                      <span style={{ fontWeight: "bold" }}>{entry.liters.toFixed(2)} L</span>
                      <span style={{ color: "#777", fontSize: "0.85em", marginLeft: 6 }}>({formatMass(entry)})</span>
                    </>
                  ) : (
                    <span style={{ fontWeight: "bold" }}>{formatMass(entry)}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
