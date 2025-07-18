"use client";

import { useState, useEffect, useContext, useRef } from "react";
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
  Switch,
  FormControlLabel,
} from "@mui/material";
import { Solution, Adjustment, calculateActualComposition, scaleCompositionByEC } from "@/utils/calculation";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Tooltip, Alert } from "@mui/material";

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
    hco3, setHco3,
    neutralizationType, setNeutralizationType,
    phosphateType, setPhosphateType,
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
  const [ph, setPh] = useState(5.8); // pH 상태 추가 (기본값 5.8)
  const [neutralizeHCO3, setNeutralizeHCO3] = useState(false); // HCO3 중화 옵션
  
  // 급액 EC 관련 상태 state
  const [supplyEC, setSupplyEC] = useState(null); // 급액 EC (원수 + 목표조성 EC로 자동 설정)
  const [finalComposition, setFinalComposition] = useState(null); // 최종 급액 조성 (원수 + EC조정된 목표조성)
  const [ecAdjustedTarget, setEcAdjustedTarget] = useState(null); // EC 조정된 목표 조성 (비료 계산용)
  const supplyECInitialized = useRef(false); // 급액 EC 초기 설정 여부 추적

  // ✅ 조성이 변경될 때마다 급액 EC 초기화 플래그 리셋
  useEffect(() => {
    supplyECInitialized.current = false;
    setSupplyEC(null);
  }, [selectedCrop, selectedSubstrate, selectedComposition, selectedWaterSource]);

  
  const aTankKeys = [
    "KNO3_A",
    fertilizerType === "4수염" ? "CaNO3_4H2O" : "CaNO3_10H2O",
    "NH4NO3",
    FefertilizerType === "Fe-EDTA" ? "Fe_EDTA" : "Fe_DTPA",
  ];

  const bTankKeys = [
    "HNO3", // 질산 = B Tank
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
    return value && value > 0 ? value : null; //  0 이하 값은 무시
  };

  const fertilizerLabels = {
    HNO3: { label: "질산 (HNO₃)", unit: "kg" },
    H3PO4: { label: "인산 (H₃PO₄)", unit: "kg" },
    NH4NO3: { label: "질산암모늄 (NH₄NO₃)", unit: "kg" },
    NH4H2PO4: { label: "제일인산암모늄 (NH₄H₂PO₄)", unit: "kg" },
    CaNO3_4H2O: { label: "질산칼슘 4수염 (Ca(NO₃)₂·4H₂O)", unit: "kg" },
    CaNO3_10H2O: { label: "질산칼슘 10수염 (5Ca(NO₃)₂·NH₄NO₃·10H₂O)", unit: "kg" },
    KH2PO4: { label: "인산칼륨 (KH₂PO₄)", unit: "kg" },
    MgSO4: { label: "황산마그네슘 (MgSO₄·7H₂O)", unit: "kg" },
    K2SO4: { label: "황산칼륨 (K₂SO₄)", unit: "kg" },
    KNO3_A: { label: "질산칼륨 A탱크 (KNO₃)", unit: "kg" },
    KNO3_B: { label: "질산칼륨 B탱크 (KNO₃)", unit: "kg" },
    Fe_DTPA: { label: "철 DTPA (Fe-DTPA)", unit: "g" },
    Fe_EDTA: { label: "철 EDTA (Fe-EDTA)", unit: "g" },
    MnSO4: { label: "황산망간 (MnSO₄·H₂O)", unit: "g" },
    ZnSO4: { label: "황산아연 (ZnSO₄·7H₂O)", unit: "g" },
    Borax: { label: "붕사 (Na₂B₄O₇·10H₂O)", unit: "g" },
    CuSO4: { label: "황산구리 (CuSO₄·5H₂O)", unit: "g" },
    NaMoO4: { label: "몰리브덴산나트륨 (Na₂MoO₄·2H₂O)", unit: "g" },
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
    console.log("조성 데이터 로드 트리거:");
    console.log("selectedCrop:", selectedCrop);
    console.log("selectedSubstrate:", selectedSubstrate);
    console.log("selectedComposition:", selectedComposition);
    
    const fetchData = async () => {
      try {
        const res = await fetch("/nutrient_solution.json");
        const nutrientData = await res.json();
        const composition = nutrientData?.[selectedCrop]?.[selectedSubstrate]?.[selectedComposition];
        console.log("로드된 조성:", composition);
        setCompositionDetails(composition || null);
      } catch (error) {
        console.error("조성 데이터 로드 에러:", error);
      }
    };
    
    if (selectedCrop && selectedSubstrate && selectedComposition) {
      fetchData();
    } else {
      console.log("조성 선택 값이 부족함");
      setCompositionDetails(null);
    }
  }, [selectedCrop, selectedSubstrate, selectedComposition]);

  // 원수 데이터
  useEffect(() => {
    if (data && selectedWaterSource) {
      const source = data.find((d) => d.analysis === selectedWaterSource);
      setWaterSourceDetails(source || null);
    }
  }, [selectedWaterSource, data]);

  // 방어 코드: selectedWaterSource가 옵션에 없으면 자동으로 ""로 리셋
  useEffect(() => {
    if (
      selectedWaterSource &&
      data &&
      !data.some((d) => d.analysis === selectedWaterSource)
    ) {
      setWaterSourceDetails(null);
      // DataContext에서 setSelectedWaterSource가 있다면 아래도 추가:
      // setSelectedWaterSource("");
    }
  }, [selectedWaterSource, data]);

  // 목표 조성 계산 (composition - water)
  useEffect(() => {
    if (compositionDetails && waterSourceDetails) {
      const solution = new Solution(compositionDetails);
      const rawWater = new Solution(waterSourceDetails);
      const ions = Adjustment.calculateOpenLoop(solution, rawWater);
      setTargetIons(ions);
    }
  }, [compositionDetails, waterSourceDetails]);

  useEffect(() => {
    console.log("compositionDetails:", compositionDetails);
    if (compositionDetails && compositionDetails.pH !== undefined) {
      setPh(compositionDetails.pH);
    }
  }, [compositionDetails]);

  // 계산 요청
  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    try {
      // EC 조정된 목표 조성을 기준으로 비료 계산
      if (!ecAdjustedTarget || !targetIons) {
        setError("EC 조정된 목표 조성이 계산되지 않았습니다.");
        setLoading(false);
        return;
      }

      // 비료 계산용 조성: EC 조정 + HNO3/NH4는 원래값 유지
      const fertilizerTarget = { ...ecAdjustedTarget };
      fertilizerTarget.HNO3 = targetIons.HNO3; // 원래 중화량 유지
      fertilizerTarget.NH4 = targetIons.NH4;   // 원래 NH4 유지
      fertilizerTarget.HCO3 = targetIons.HCO3; // 원래 HCO3 유지 (중화량)

      console.log("비료 계산에 사용할 조성:", fertilizerTarget);
      console.log("HCO3 중화량:", fertilizerTarget.HCO3);
      console.log("NH4 고정값:", fertilizerTarget.NH4);

      const res = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // EC 조정된 목표 조성 사용 (HNO3, NH4는 고정값 유지)
          targetComposition: fertilizerTarget,
          waterSource: selectedWaterSource,
          drainSource: selectedDrainSource,
          fertilizerType,
          FeType: FefertilizerType,
          concentration,
          tankVolume,
          ph,
          neutralizeHCO3,
          hco3: hco3,
          supplyEC: supplyEC,
        }),
      });

      if (!res.ok) throw new Error("요청 실패");

      const data = await res.json();
      setResult(data);

      console.log("👉 계산된 이온 값 (fertilizerResult.ions):", data.ions);

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

  // ✅ 비교 대상이 아닌 키들 (테이블에는 표시하지만 비교 % 계산은 안함)
  const nonComparisonKeys = ["EC", "pH", "Cl", "Na"];
  
  // ✅ 미량원소들 (항상 100%로 표시)
  const micronutrientKeys = ["Fe", "Mn", "B", "Zn", "Cu", "Mo"];

  // 목표 조성 표시용: Adjustment.calculateOpenLoop 함수 직접 사용
  const compositionWithHCO3 = compositionDetails
    ? { ...compositionDetails, HCO3: hco3 !== undefined ? hco3 : compositionDetails.HCO3 }
    : null;

  const targetIonsDisplay = (compositionWithHCO3 && waterSourceDetails)
    ? Adjustment.calculateOpenLoop(new Solution(compositionWithHCO3), new Solution(waterSourceDetails))
    : compositionWithHCO3;

  useEffect(() => {
    console.log('compositionDetails:', compositionDetails);
    console.log('waterSourceDetails:', waterSourceDetails);
    console.log('targetIonsDisplay:', targetIonsDisplay);
  }, [compositionDetails, waterSourceDetails, targetIonsDisplay]);

  // 목표조성 계산 useEffect에 의존성 추가
  useEffect(() => {
    console.log("목표조성 계산 트리거:");
    console.log("compositionDetails:", compositionDetails);
    console.log("waterSourceDetails:", waterSourceDetails);
    console.log("hco3:", hco3);
    
    if (compositionDetails && waterSourceDetails) {
      const compositionWithHCO3 = { 
        ...compositionDetails, 
        HCO3: hco3 !== undefined ? hco3 : compositionDetails.HCO3 
      };
      const solution = new Solution(compositionWithHCO3);
      const rawWater = new Solution(waterSourceDetails);
      const ions = Adjustment.calculateOpenLoop(solution, rawWater);
      setTargetIons(ions);
      console.log("목표조성 계산 완료:", ions);
      
      // ✅ 급액 EC 기본값 설정: 목표 조성 EC + 원수 EC (처음에만)
      const targetSolution = new Solution(ions);
      const targetEC = targetSolution.calcECNut();
      const rawWaterSolution = new Solution(waterSourceDetails);
      const rawWaterEC = rawWaterSolution.calcECNut();
      const totalSupplyEC = targetEC + rawWaterEC;
      
      if (!supplyECInitialized.current) {
        setSupplyEC(Number(totalSupplyEC.toFixed(2)));
        supplyECInitialized.current = true;
        console.log("급액 EC 기본값 설정:", `목표 EC(${targetEC.toFixed(2)}) + 원수 EC(${rawWaterEC.toFixed(2)}) = ${totalSupplyEC.toFixed(2)}`);
      }
    }
  }, [compositionDetails, waterSourceDetails, hco3]); // hco3도 의존성에 추가

  // ✅ EC 조정된 목표 조성 계산 useEffect
  useEffect(() => {
    if (targetIons && waterSourceDetails && supplyEC) {
      // 1. 원수 EC 계산
      const rawWaterSolution = new Solution(waterSourceDetails);
      const rawWaterEC = rawWaterSolution.calcECNut();
      
      // 2. 필요한 목표 조성 EC = 급액 EC - 원수 EC
      const requiredTargetEC = Math.max(0, supplyEC - rawWaterEC);
      
      // 3. EC 연동 제외 이온들 (HNO3, NH4는 고정)
      const nonScalableIons = ['HNO3', 'NH4', 'HCO3'];
      
      // 4. EC 연동 대상 이온들의 현재 EC 계산
      const scalableTarget = { ...targetIons };
      nonScalableIons.forEach(ion => {
        if (scalableTarget[ion] !== undefined) {
          scalableTarget[ion] = 0; // EC 계산에서 제외
        }
      });
      
      const scalableTargetSolution = new Solution(scalableTarget);
      const scalableEC = scalableTargetSolution.calcECNut();
      
      console.log("EC 조정된 목표 조성 계산:");
      console.log("급액 EC:", supplyEC);
      console.log("원수 EC:", rawWaterEC.toFixed(2));
      console.log("필요한 목표 조성 EC:", requiredTargetEC.toFixed(2));
      console.log("EC 연동 대상 이온들의 현재 EC:", scalableEC.toFixed(2));
      
      // 5. EC 연동 대상 이온들만 스케일링
      const ecAdjustedTarget = { ...targetIons };
      if (scalableEC > 0) {
        const scaleFactor = requiredTargetEC / scalableEC;
        console.log("EC 스케일링 비율:", scaleFactor.toFixed(3));
        
        // EC 연동 대상 이온들만 스케일링
        Object.keys(targetIons).forEach(key => {
          if (!nonScalableIons.includes(key) && typeof targetIons[key] === 'number' && key !== 'pH') {
            ecAdjustedTarget[key] = targetIons[key] * scaleFactor;
          }
        });
      }
      
      // 6. 최종 급액 조성 = 원수 + EC 조정된 목표 조성
      const finalComposition = {};
      Object.keys(targetIons).forEach(key => {
        if (key === 'pH') {
          finalComposition[key] = ecAdjustedTarget[key] || targetIons[key];
        } else if (key === 'HCO3') {
          finalComposition[key] = hco3 !== undefined ? hco3 : 0.5; // 사용자 설정값
        } else {
          const waterValue = waterSourceDetails[key] || 0;
          const targetValue = ecAdjustedTarget[key] || 0;
          finalComposition[key] = waterValue + targetValue;
        }
      });
      
      // EC 계산
      const finalSolution = new Solution(finalComposition);
      finalComposition.EC = finalSolution.calcECNut();
      finalComposition.EC_Calc = finalComposition.EC;
      
      setFinalComposition(finalComposition);
      setEcAdjustedTarget(ecAdjustedTarget);
      console.log("EC 조정된 목표 조성:", ecAdjustedTarget);
      console.log("최종 급액 조성:", finalComposition);
      console.log("최종 급액 EC:", finalComposition.EC.toFixed(2));
    }
  }, [targetIons, waterSourceDetails, supplyEC, hco3]);

  useEffect(() => {
    console.log("=== 계산탭 상태 확인 ===");
    console.log("selectedCrop:", selectedCrop);
    console.log("selectedSubstrate:", selectedSubstrate);  
    console.log("selectedComposition:", selectedComposition);
    console.log("selectedWaterSource:", selectedWaterSource);
    console.log("compositionDetails:", compositionDetails);
    console.log("waterSourceDetails:", waterSourceDetails);
    console.log("targetIonsDisplay:", targetIonsDisplay);
  }, [selectedCrop, selectedSubstrate, selectedComposition, selectedWaterSource, compositionDetails, waterSourceDetails, targetIonsDisplay]);

  useEffect(() => {
    console.log("원수 정보 확인:");
    console.log("selectedWaterSource:", selectedWaterSource);
    console.log("waterSourceDetails:", waterSourceDetails);
    console.log("waterSourceDetails.HCO3:", waterSourceDetails?.HCO3);
  }, [selectedWaterSource, waterSourceDetails]);

  return (
    <Grid container spacing={2} sx={{ padding: 3 }}>
      <Grid item xs={12}>
        <Typography variant="h5" sx={{ fontWeight: "bold", color: "grey", display: 'flex', alignItems: 'center' }}>
          양액 조성 계산
          {!waterSourceDetails && (
            <Tooltip title="양액 조성 계산을 위한 페이지">
              <InfoOutlinedIcon color="primary" sx={{ ml: 2 }} />
            </Tooltip>
          )}
        </Typography>
        <Typography
            variant="caption"
            sx={{
              color: "#b0b0b0",
              display: "block",
              mt: 0.8,
              mb: 0.4,
              fontSize: "0.75rem",
              lineHeight: 1.2,
            }}
          >
          Disclaimer : 양액조성계산 탭에서는 양액조성선택 텝에서 불러온 목표 조성을 통해서 최종 양분 함량을 설정하도록 구현되어있습니다. 여기서는 질소비료, 인산비료, Fe 비료, 중화용 산을 선택하게 되어있으며, 중탄산(HCO₃⁻) 목표값, 급액 EC 농도, 양액탱크 용량을 설정하게 되어있습니다.
          최종 급액 조성은 원수 조성과 목표 조성을 통해서 계산되며, 비료 계산 결과는 목표 조성과 비교하여 표시됩니다. 급액 EC범위를 설정하는 이유는 미량원소를 급액 농도에 비례해서 보정해주기 위해서 필요합니다.
          </Typography>
      </Grid>
      {!waterSourceDetails && (
        <Grid item xs={4}>
          <Alert severity="info" sx={{ mb: 2 }}>
            양액조성 선택 탭에서 <strong>원수</strong>를 먼저 선택해주세요.
          </Alert>
        </Grid>
      )}

      {targetIonsDisplay && (
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
                {/* 1. 목표 조성: 원수 선택 시에만 표시 */}
                {waterSourceDetails && (
                  <TableRow>
                    <TableCell align="center">목표 조성</TableCell>
                    {displayKeys.map((key) => (
                      <TableCell key={key} align="center">
                        {targetIonsDisplay[key] !== undefined
                          ? targetIonsDisplay[key].toFixed(2)
                          : "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                )}

                {/* 2. 최종 급액 조성 (EC 연동): finalComposition이 있을 때 표시 */}
                {finalComposition && (
                  <TableRow>
                    <TableCell align="center">최종 급액 조성 (EC 연동)</TableCell>
                    {displayKeys.map((key) => (
                      <TableCell key={key} align="center">
                        {finalComposition[key] !== undefined
                          ? finalComposition[key].toFixed(2)
                          : "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                )}

                {/* 3. 비료 계산 결과: fertilizerResult가 있을 때만 표시 */}
                {fertilizerResult?.ions && (
                  <TableRow>
                    <TableCell align="center">비료 계산 결과</TableCell>
                    {displayKeys.map((key) => (
                      <TableCell key={key} align="center">
                        {fertilizerResult.ions[key] !== undefined
                          ? fertilizerResult.ions[key].toFixed(2)
                          : "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                )}

                {/* 4. 비교 (%): 비료 계산 결과가 있을 때만 표시 */}
                {fertilizerResult?.ions && finalComposition && (
                  <TableRow>
                    <TableCell align="center">비교 (%)<br/>(비료 계산/EC 조정 목표)</TableCell>
                    {displayKeys.map((key) => {
                      // ✅ 비교 대상이 아닌 키들은 "-" 표시
                      if (nonComparisonKeys.includes(key)) {
                        return (
                          <TableCell key={key} align="center">
                            -
                          </TableCell>
                        );
                      }

                      // ✅ 미량원소는 항상 100% (정확한 양이 공급되므로)
                      if (micronutrientKeys.includes(key)) {
                        return (
                          <TableCell key={key} align="center">
                            100
                          </TableCell>
                        );
                      }

                      // 비료 계산 결과 + 원수를 고려한 비교
                      const waterValue = waterSourceDetails?.[key] || 0;
                      const fertilizerValue = fertilizerResult.ions[key] || 0;
                      const actualFinal = waterValue + fertilizerValue;
                      const targetFinal = finalComposition[key];
                      
                      let ratioDisplay = "-";
                      let bgColor = "transparent";

                      if (targetFinal && actualFinal !== undefined) {
                        const ratio = (actualFinal / targetFinal) * 100;
                        ratioDisplay = `${Math.round(ratio)}`;

                        // ✅ 색상 기준 조정: 100% 기준으로 변경
                        if (ratio > 100) {
                          bgColor = "#ef9a9a"; // 연한 빨간색 (과다)
                        } else if (ratio < 100) {
                          bgColor = "#90caf9"; // 연한 파란색 (부족)
                        }
                      } else if (targetFinal === 0 && actualFinal > 0) {
                        ratioDisplay = ">100%";
                        bgColor = "#ef9a9a";
                      } else if (targetFinal === 0 && actualFinal === 0) {
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

          {/* 인산비료 종류 */}
          <Grid item xs={3}>
            <Typography sx={{ fontWeight: "bold", mb: 1 }}>
              인산비료 종류
            </Typography>
            <ToggleButtonGroup
              value={phosphateType}
              exclusive
              onChange={(e, val) => val && setPhosphateType(val)}
              fullWidth
            >
              <ToggleButton value="제일인산암모늄">제일인산암모늄</ToggleButton>
              <ToggleButton value="제일인산칼륨">제일인산칼륨</ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          {/* Fe 비료 종류 */}
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


        </Grid>
      </Grid>

      {/* 두 번째 줄: 중탄산, 중화 방식, 양액탱크 용량 */}
      <Grid item xs={12}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={2.4}>
            <Typography sx={{ fontWeight: "bold", mb: 1 }}>중탄산(HCO₃⁻) 목표값 설정</Typography>
            <TextField
              type="number"
              size="small"
              variant="outlined"
              value={hco3}
              onChange={e => {
                let v = parseFloat(e.target.value);
                if (isNaN(v)) v = 0.5;
                if (v < -5) v = -5;
                if (v > 5) v = 5;
                setHco3(v);
              }}
              inputProps={{ min: -5, max: 5, step: 0.01 }}
              fullWidth
            />
          </Grid>
          <Grid item xs={2.4}>
            <Typography sx={{ fontWeight: "bold", mb: 1 }}>중화 방식</Typography>
            <ToggleButtonGroup
              value={neutralizationType}
              exclusive
              onChange={(e, val) => val && setNeutralizationType(val)}
              fullWidth
            >
              <ToggleButton value="질산">질산(60%)</ToggleButton>
              <ToggleButton value="인산">인산(85.5%)</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          {/* 급액 EC */}
                     <Grid item xs={2.4}>
             <Typography sx={{ fontWeight: "bold", mb: 1 }}>급액 EC (dS/m, 범위 1.5-5)</Typography>
             <TextField
               type="number"
               size="small"
               variant="outlined"
               value={supplyEC || ""} 
               placeholder="목표 조성 선택 시 자동 설정"
               onChange={e => {
                 let v = parseFloat(e.target.value);
                 if (isNaN(v)) return;
                 if (v < 1.5) v = 1.5;
                 if (v > 5.0) v = 5.0;
                 setSupplyEC(v);
               }}
               inputProps={{ min: 1.5, max: 5.0, step: 0.1 }}
               fullWidth
             />
           </Grid>
          {/* 농도 */}
          <Grid item xs={2.4}>
            <Typography sx={{ fontWeight: "bold", mb: 1 }}>농도 (기본: 100배액)</Typography>
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
          <Grid item xs={2.4}>
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
            !ecAdjustedTarget ||
            !supplyEC
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
                            {fertilizerLabels[key]?.label || key}
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
                            {fertilizerLabels[key]?.label || key}
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
