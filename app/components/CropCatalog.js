"use client";
import { useContext, useMemo } from "react";
import Link from "next/link";
import { DataContext } from "../context/DataContext";

// 사용 가이드에 보여 주는 수록 작물·배지·조성 목록
export default function CropCatalog() {
  const { nutrientData, targetDrainData } = useContext(DataContext);

  const rows = useMemo(() => {
    if (!nutrientData) return [];
    return Object.entries(nutrientData).map(([crop, substrates]) => ({
      crop,
      hasDrainTable: Boolean(targetDrainData?.[crop]),
      substrates: Object.entries(substrates).map(([substrate, comps]) => ({ substrate, names: Object.keys(comps) })),
    }));
  }, [nutrientData, targetDrainData]);

  if (rows.length === 0) return <p className="info-description">표준 조성을 불러오는 중입니다.</p>;
  const total = rows.reduce((n, r) => n + r.substrates.reduce((m, s) => m + s.names.length, 0), 0);
  const withTables = rows.filter((r) => r.hasDrainTable).map((r) => r.crop);

  return (
    <div>
      <p className="info-description">
        {rows.length}개 작물, {total}개 조성이 들어 있습니다. 조성의 출처는 <Link href="/select">양액 조성 선택</Link>에서 조성을 고르면 아래에 표시됩니다.
        배액(근권) 분석 보정표는 {withTables.join(", ")}에 들어 있습니다.
      </p>
      <div className="crop-catalog-wrap">
        <table className="crop-catalog">
          <thead>
            <tr>
              <th>작물</th>
              <th>배지</th>
              <th>조성</th>
              <th>배액 보정표</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) =>
              r.substrates.map((s, i) => (
                <tr key={`${r.crop}-${s.substrate}`}>
                  {i === 0 && (
                    <td rowSpan={r.substrates.length} className="crop-catalog-crop">{r.crop}</td>
                  )}
                  <td className="crop-catalog-substrate">{s.substrate}</td>
                  <td>{s.names.join(", ")}</td>
                  {i === 0 && (
                    <td rowSpan={r.substrates.length} className="crop-catalog-center">{r.hasDrainTable ? "있음" : "-"}</td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
