"use client";

import { useState, useEffect, useContext } from "react";
import { DataContext } from "../context/DataContext";
import {
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
} from "@mui/material";
import { Solution, Adjustment } from "@/utils/calculation";

export default function Calculate() {
  const {
    data,
    selectedCrop,
    selectedSubstrate,
    selectedComposition,
    selectedWaterSource,
    selectedDrainSource,
    tankVolume,
    setTankVolume,
  } = useContext(DataContext);

  const [compositionDetails, setCompositionDetails] = useState(null);
  const [waterSourceDetails, setWaterSourceDetails] = useState(null);
  const [targetIons, setTargetIons] = useState(null);
  const [fertilizerResult, setFertilizerResult] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fertilizerType, setFertilizerType] = useState("4수염");
  const [FefertilizerType, setFeFertilizerType] = useState("Fe-DTPA");
  const [concentration, setConcentration] = useState(100);
  const aTankKeys = [
    "KNO3_A", // ✅ 추가된 KNO3 분할 항목
    fertilizerType === "4수염" ? "CaNO3_4H2O" : "CaNO3_10H2O",
    "NH4NO3",
    "HNO3",
    FefertilizerType === "Fe-EDTA" ? "Fe_EDTA" : "Fe_DTPA",
  ];
  const bTankKeys = [
    "KNO3_B",
    "KH2PO4",
    "MgSO4",
    "K2SO4",
    "MnSO4",
    "ZnSO4",
    "Borax",
    "CuSO4",
    "NaMoO4",
  ];
  const getFertValue = (key) => {
    const kg = fertilizerResult?.kgPerStock?.[key];
    const g = fertilizerResult?.microFertgPerStock?.[key];
    const value =
      kg !== undefined ? kg : g !== undefined ? g / 1000 : undefined;
    return value && value > 0 ? value : null; // ✅ 0 이하 값은 무시
  };

  const fertilizerLabels = {
    HNO3: { label: "질산", unit: "kg" },
    NH4NO3: { label: "질산암모늄", unit: "kg" },
    CaNO3_4H2O: { label: "질산칼슘 (4수염)", unit: "kg" },
    CaNO3_10H2O: { label: "질산칼슘 (10수염)", unit: "kg" },
    KH2PO4: { label: "인산칼륨", unit: "kg" },
    MgSO4: { label: "황산마그네슘", unit: "kg" },
    K2SO4: { label: "황산칼륨", unit: "kg" },
    KNO3_A: { label: "질산칼륨 (A)", unit: "kg" },
    KNO3_B: { label: "질산칼륨 (B)", unit: "kg" },
    Fe_DTPA: { label: "철 (DTPA)", unit: "g" },
    Fe_EDTA: { label: "철 (EDTA)", unit: "g" },
    MnSO4: { label: "황산망간", unit: "g" },
    ZnSO4: { label: "황산아연", unit: "g" },
    Borax: { label: "붕사", unit: "g" },
    CuSO4: { label: "황산구리", unit: "g" },
    NaMoO4: { label: "몰리브덴산나트륨", unit: "g" },
  };

  const microFertKeys = [
    "Fe_DTPA",
    "Fe_EDTA",
    "MnSO4",
    "ZnSO4",
    "Borax",
    "CuSO4",
    "NaMoO4",
  ];

  // ✅ 조성 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/nutrient_solution.json");
      const nutrientData = await res.json();
      const composition =
        nutrientData?.[selectedCrop]?.[selectedSubstrate]?.[
          selectedComposition
        ];
      setCompositionDetails(composition || null);
    };
    if (selectedCrop && selectedSubstrate && selectedComposition) {
      fetchData();
    }
  }, [selectedCrop, selectedSubstrate, selectedComposition]);

  // ✅ 원수 데이터
  useEffect(() => {
    if (data && selectedWaterSource) {
      const source = data.find((d) => d.analysis === selectedWaterSource);
      setWaterSourceDetails(source || null);
    }
  }, [selectedWaterSource, data]);

  // ✅ 목표 조성 계산 (composition - water)
  useEffect(() => {
    if (compositionDetails && waterSourceDetails) {
      const solution = new Solution(compositionDetails);
      const rawWater = new Solution(waterSourceDetails);
      const ions = Adjustment.calculateOpenLoop(solution, rawWater);
      setTargetIons(ions);
    }
  }, [compositionDetails, waterSourceDetails]);

  // ✅ 계산 요청
  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crop: selectedCrop,
          substrate: selectedSubstrate,
          composition: selectedComposition,
          waterSource: selectedWaterSource,
          drainSource: selectedDrainSource,
          fertilizerType,
          FeType: FefertilizerType,
          concentration,
          tankVolume,
        }),
      });

      if (!res.ok) throw new Error("요청 실패");

      const data = await res.json();
      setResult(data);

      console.log("👉 계산된 이온 값 (fertilizerResult.ions):", data.ions);

      setTargetIons(data.targetIons);
      setFertilizerResult({
        ions: data.ions,
        gramsPerLiter: data.gramsPerLiter,
        fertilizers: data.fertilizers,
        kgPerStock: data.kgPerStock,
        microFertgPerStock: data.microFertgPerStock,
      });
    } catch (err) {
      console.error(err);
      setError("서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const displayKeys = [
    "EC",
    "pH",
    "NH4",
    "NO3",
    "PO4",
    "K",
    "Ca",
    "Mg",
    "SO4",
    "Cl",
    "Na",
    "HCO3",
    "Fe",
    "Mn",
    "B",
    "Zn",
    "Cu",
    "Mo",
  ];

  return (
    <Grid container spacing={2} sx={{ padding: 3 }}>
      <Grid item xs={12}>
        <Typography variant="h5" sx={{ fontWeight: "bold", color: "grey" }}>
          조성계산 탭
        </Typography>
      </Grid>

      {targetIons && (
        <Grid item xs={12}>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    구분
                  </TableCell>
                  {displayKeys.map((key) => (
                    <TableCell
                      key={key}
                      align="center"
                      sx={{ fontWeight: "bold" }}
                    >
                      {key}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {/* 목표 조성 */}
                <TableRow>
                  <TableCell align="center">목표 조성</TableCell>
                  {displayKeys.map((key) => (
                    <TableCell key={key} align="center">
                      {targetIons[key] !== undefined
                        ? targetIons[key].toFixed(2)
                        : "-"}
                    </TableCell>
                  ))}
                </TableRow>

                {/* 실제 조성 */}
                {fertilizerResult?.ions && (
                  <TableRow>
                    <TableCell align="center">실제 조성</TableCell>
                    {displayKeys.map((key) => (
                      <TableCell key={key} align="center">
                        {fertilizerResult.ions[key] !== undefined
                          ? fertilizerResult.ions[key].toFixed(2)
                          : "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                )}

                {/* 비교 (%) */}
                {fertilizerResult?.ions && (
                  <TableRow>
                    <TableCell align="center">비교 (%)</TableCell>
                    {displayKeys.map((key) => {
                      const target = targetIons[key];
                      const actual = fertilizerResult.ions[key];
                      let ratioDisplay = "-";
                      let bgColor = "transparent";

                      if (target && actual !== undefined) {
                        const ratio = (actual / target) * 100;
                        ratioDisplay = `${Math.round(ratio)}`;

                        if (ratio > 105) {
                          bgColor = "#ef9a9a"; // 연한 빨간색
                        } else if (ratio < 95) {
                          bgColor = "#90caf9"; // 연한 파란색
                        }
                      } else if (target === 0 && actual > 0) {
                        ratioDisplay = ">100%";
                        bgColor = "#ef9a9a";
                      } else if (target === 0 && actual === 0) {
                        ratioDisplay = "100%";
                      }

                      return (
                        <TableCell
                          key={key}
                          align="center"
                          sx={{ backgroundColor: bgColor }}
                        >
                          {ratioDisplay}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      )}

      {/* ✅ 질소비료 종류 & 희석 비율 & 탱크용량 - 수평 배치 */}
      <Grid item xs={12}>
        <Grid container spacing={2} alignItems="center">
          {/* 질소비료 종류 */}
          <Grid item xs={3}>
            <Typography sx={{ fontWeight: "bold", mb: 1 }}>
              질소비료 종류
            </Typography>
            <ToggleButtonGroup
              value={fertilizerType}
              exclusive
              onChange={(e, val) => val && setFertilizerType(val)}
              fullWidth
            >
              <ToggleButton value="4수염">4수염</ToggleButton>
              <ToggleButton value="10수염">10수염</ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item xs={3}>
            <Typography sx={{ fontWeight: "bold", mb: 1 }}>
              Fe 비료 종류
            </Typography>
            <ToggleButtonGroup
              value={FefertilizerType}
              exclusive
              onChange={(e, val) => val && setFeFertilizerType(val)}
              fullWidth
            >
              <ToggleButton value="Fe-DTPA">Fe-DTPA</ToggleButton>
              <ToggleButton value="Fe-EDTA">Fe-EDTA</ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          {/* 농도 */}
          <Grid item xs={3}>
            <Typography sx={{ fontWeight: "bold", mb: 1 }}>농도</Typography>
            <ToggleButtonGroup
              value={concentration}
              exclusive
              onChange={(e, val) => val && setConcentration(val)}
              fullWidth
            >
              <ToggleButton value={50}>50배</ToggleButton>
              <ToggleButton value={100}>100배</ToggleButton>
              <ToggleButton value={200}>200배</ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          {/* 양액탱크 용량 */}
          <Grid item xs={3}>
            <Typography sx={{ fontWeight: "bold", mb: 1 }}>
              양액탱크 용량 (L)
            </Typography>
            <TextField
              type="number"
              size="small"
              variant="outlined"
              value={tankVolume}
              onChange={(e) => setTankVolume(Number(e.target.value))}
              InputProps={{ inputProps: { min: 1 } }}
              fullWidth
            />
          </Grid>
        </Grid>
      </Grid>

      {/* ✅ 계산하기 버튼 */}
      <Grid item xs={12} sx={{ textAlign: "center", mt: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCalculate}
          disabled={
            loading ||
            !selectedCrop ||
            !selectedSubstrate ||
            !selectedComposition
          }
        >
          {loading ? "계산 중..." : "계산하기"}
        </Button>
      </Grid>

      {fertilizerResult?.kgPerStock && (
        <>
          {/* A Tank */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" sx={{ mt: 4, fontWeight: "bold" }}>
              A Tank 구성
            </Typography>
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ fontWeight: "bold" }}>
                      비료
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold" }}>
                      필요량 (
                      <span
                        dangerouslySetInnerHTML={{
                          __html: "kg 또는 g",
                        }}
                      />
                      )
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aTankKeys.map((key) => {
                    const value =
                      fertilizerResult.kgPerStock?.[key] ??
                      fertilizerResult.microFertgPerStock?.[key];

                    const isMicro = microFertKeys.includes(key);

                    return (
                      value !== undefined && (
                        <TableRow key={key}>
                          <TableCell
                            align="center"
                            sx={{
                              backgroundColor: isMicro ? "#f3e5f5" : "inherit",
                            }}
                          >
                            {key}
                          </TableCell>
                          <TableCell align="center">
                            {value.toFixed(2)}{" "}
                            {fertilizerResult.kgPerStock?.[key] !== undefined
                              ? "kg"
                              : "g"}
                          </TableCell>
                        </TableRow>
                      )
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          {/* B Tank */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" sx={{ mt: 4, fontWeight: "bold" }}>
              B Tank 구성
            </Typography>
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ fontWeight: "bold" }}>
                      비료
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold" }}>
                      필요량 (
                      <span
                        dangerouslySetInnerHTML={{
                          __html: "kg 또는 g",
                        }}
                      />
                      )
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bTankKeys.map((key) => {
                    const value =
                      fertilizerResult.kgPerStock?.[key] ??
                      fertilizerResult.microFertgPerStock?.[key];

                    const isMicro = microFertKeys.includes(key);

                    return (
                      value !== undefined && (
                        <TableRow key={key}>
                          <TableCell
                            align="center"
                            sx={{
                              backgroundColor: isMicro ? "#f3e5f5" : "inherit",
                            }}
                          >
                            {key}
                          </TableCell>
                          <TableCell align="center">
                            {value.toFixed(2)}{" "}
                            {fertilizerResult.kgPerStock?.[key] !== undefined
                              ? "kg"
                              : "g"}
                          </TableCell>
                        </TableRow>
                      )
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </>
      )}

      {error && (
        <Grid item xs={12}>
          <Typography color="error" align="center" sx={{ mt: 2 }}>
            {error}
          </Typography>
        </Grid>
      )}
    </Grid>
  );
}
