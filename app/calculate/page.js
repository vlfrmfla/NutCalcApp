"use client";

import { useContext, useMemo } from "react";
import Link from "next/link";
import {
  Grid,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  Button,
  Alert,
  Chip,
  Box,
  Tooltip,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { DataContext } from "../context/DataContext";
import { useSupplyPlan } from "../hooks/useSupplyPlan";
import { estimateEC } from "@/lib/nutrient";
import CompositionTable, { DISPLAY_KEYS } from "../components/nutrient/CompositionTable";
import TankTable from "../components/nutrient/TankTable";
import WarningList from "../components/nutrient/WarningList";
import "../select/calculate.css";

const NON_COMPARISON_KEYS = ["EC", "pH", "Cl", "Na", "HCO3"];
const OPTION_LABEL_SX = { fontWeight: "bold", mb: 1, fontSize: { xs: "0.85rem", sm: "1rem" } };

export default function CalculatePage() {
  const {
    settings,
    updateSettings,
    compositionDetails,
    waterSource,
    drainSource,
    selectedCrop,
    selectedSubstrate,
    selectedComposition,
  } = useContext(DataContext);
  const plan = useSupplyPlan();

  const rows = useMemo(() => {
    if (!plan) return [];
    const { final, target } = plan;
    return [
      {
        label: plan.advice ? "보정된 표준 조성" : "표준 조성",
        values: { ...plan.effectiveStandard, EC: estimateEC(plan.effectiveStandard) },
      },
      {
        label: plan.baseLabel,
        values: { ...plan.base, EC: plan.base.EC, pH: plan.mode === "순환식" ? undefined : waterSource?.pH },
      },
      {
        label: "추가 필요량 (EC 연동)",
        values: { ...plan.scaledAdditions, HCO3: -plan.acidDemand, EC: estimateEC(plan.scaledAdditions) },
      },
      {
        label: "비료 공급량",
        values: { ...plan.recipe.supplied, Na: undefined, Cl: undefined, HCO3: undefined },
      },
      { label: "최종 급액 조성", bold: true, values: final },
      {
        label: "목표 대비 (%)",
        render: (key) => {
          if (NON_COMPARISON_KEYS.includes(key)) return "-";
          const t = target[key] || 0;
          const f = final[key] || 0;
          if (t <= 1e-9) return f > 1e-9 ? ">100" : "-";
          return String(Math.round((f / t) * 100));
        },
        cellSx: (key) => {
          if (NON_COMPARISON_KEYS.includes(key)) return undefined;
          const t = target[key] || 0;
          const f = final[key] || 0;
          if (t <= 1e-9) return f > 1e-9 ? { backgroundColor: "#ef9a9a" } : undefined;
          const ratio = (f / t) * 100;
          if (ratio > 105) return { backgroundColor: "#ef9a9a" };
          if (ratio < 95) return { backgroundColor: "#90caf9" };
          return undefined;
        },
      },
    ];
  }, [plan, waterSource]);

  const handleSupplyECChange = (e) => {
    const raw = e.target.value;
    if (raw === "") {
      updateSettings({ supplyEC: null });
      return;
    }
    let v = parseFloat(raw);
    if (Number.isNaN(v)) return;
    if (v < 0.3) v = 0.3;
    if (v > 6) v = 6;
    updateSettings({ supplyEC: v });
  };

  return (
    <Grid container spacing={2} sx={{ padding: 3 }}>
      <Grid item xs={12}>
        <Typography variant="h5" sx={{ fontWeight: "bold", color: "grey", display: "flex", alignItems: "center" }}>
          양액 조성 계산
          <Tooltip title="양액 조성 선택 탭에서 고른 표준 조성과 원수(순환식은 혼합수)로 비료 투입량을 계산합니다.">
            <InfoOutlinedIcon color="primary" sx={{ ml: 2 }} />
          </Tooltip>
        </Typography>
        <Typography variant="caption" sx={{ color: "#b0b0b0", display: "block", mt: 0.8, mb: 0.4, fontSize: "0.75rem", lineHeight: 1.2 }}>
          추가 필요량(표준 조성 − 기준수)을 급액 EC에 맞춰 비례 조정한 뒤, 선택한 비료 종류로 A/B 탱크 투입량을 계산합니다.
          NH₄는 pH 관리용이라 EC 연동에서 제외하고, NO₃는 양이온 균형의 결과로 정해집니다. 중탄산은 설정한 목표값을 남기고 산으로 중화합니다.
          비료량은 음수가 되지 않으며, 맞출 수 없는 조건은 아래 경고로 표시됩니다.
        </Typography>
      </Grid>

      {!plan && (
        <Grid item xs={12} md={6}>
          <Alert severity="info">
            <Link href="/select">양액 조성 선택</Link> 탭에서 작물·조성과 <strong>원수</strong>를 먼저 선택해주세요.
            {compositionDetails && !waterSource && " (조성은 선택되었고 원수가 비어 있습니다.)"}
          </Alert>
        </Grid>
      )}

      {plan && (
        <Grid item xs={12}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
            <Chip label={plan.mode} color={plan.mode === "순환식" ? "success" : "default"} size="small" />
            <Chip label={`${selectedCrop} / ${selectedSubstrate} / ${selectedComposition}`} size="small" variant="outlined" />
            <Chip label={`원수: ${waterSource.analysis}`} size="small" variant="outlined" />
            {plan.mode === "순환식" && drainSource && (
              <Chip label={`배액: ${drainSource.analysis} (${Math.round(settings.drainMixRatio)}%)`} size="small" variant="outlined" />
            )}
            {plan.mode === "비순환식" && drainSource && plan.advice && (
              <Chip label={`배액: ${drainSource.analysis}`} size="small" variant="outlined" />
            )}
            {plan.advice && <Chip label="배액 분석 보정 적용" size="small" color="info" variant="outlined" />}
            <Chip
              label={`EC 연동 배율 ×${plan.ecFactor.toFixed(2)} (기준수 ${plan.baseEC.toFixed(2)} + 조성 → 급액 ${plan.supplyEC.toFixed(2)} dS/m)`}
              size="small"
              variant="outlined"
            />
          </Box>
          {settings.recirculationMode === "순환식" && !drainSource && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              순환식이 선택되었지만 배액이 선택되지 않아 원수 기준으로 계산합니다.
            </Alert>
          )}
        </Grid>
      )}

      {plan && (
        <Grid item xs={12}>
          <CompositionTable rows={rows} caption />
          <Typography variant="caption" sx={{ color: "#888", display: "block", mt: 0.5 }}>
            목표 대비(%)는 최종 급액 조성 ÷ (기준수 + EC 연동 추가량)입니다. 빨강은 5% 이상 초과, 파랑은 5% 이상 부족. 미량원소는 비료로 정확히 맞추므로 100%가 됩니다.
          </Typography>
        </Grid>
      )}

      {plan && plan.warnings.length > 0 && (
        <Grid item xs={12}>
          <WarningList warnings={plan.warnings} />
        </Grid>
      )}

      <Grid item xs={12}>
        <Grid container spacing={2} alignItems="flex-start">
          <Grid item xs={12} sm={6} md={3}>
            <Typography sx={OPTION_LABEL_SX}>질소비료 종류</Typography>
            <ToggleButtonGroup
              value={settings.nitrogenSource}
              exclusive
              onChange={(_, v) => v && updateSettings({ nitrogenSource: v })}
              fullWidth
              size="small"
            >
              <ToggleButton value="4수염">4수염</ToggleButton>
              <ToggleButton value="10수염">10수염</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography sx={OPTION_LABEL_SX}>인산비료 종류</Typography>
            <ToggleButtonGroup
              value={settings.phosphateType}
              exclusive
              onChange={(_, v) => v && updateSettings({ phosphateType: v })}
              fullWidth
              size="small"
            >
              <ToggleButton value="제일인산칼륨">제일인산칼륨</ToggleButton>
              <ToggleButton value="제일인산암모늄">제일인산암모늄</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography sx={OPTION_LABEL_SX}>Fe 비료 종류</Typography>
            <ToggleButtonGroup
              value={settings.feSource}
              exclusive
              onChange={(_, v) => v && updateSettings({ feSource: v })}
              fullWidth
              size="small"
            >
              <ToggleButton value="Fe-DTPA">DTPA 6% 액상</ToggleButton>
              <ToggleButton value="Fe-EDTA">EDTA 13%</ToggleButton>
              <ToggleButton value="Fe-EDDHA">EDDHA 6%</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography sx={OPTION_LABEL_SX}>원액 농축 배율</Typography>
            <ToggleButtonGroup
              value={settings.concentration}
              exclusive
              onChange={(_, v) => v && updateSettings({ concentration: v })}
              fullWidth
              size="small"
            >
              <ToggleButton value={50}>50배</ToggleButton>
              <ToggleButton value={100}>100배</ToggleButton>
              <ToggleButton value={200}>200배</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Grid>

      <Grid item xs={12}>
        <Grid container spacing={2} alignItems="flex-start">
          <Grid item xs={12} sm={6} md={3}>
            <Typography sx={OPTION_LABEL_SX}>남길 HCO₃⁻ (mmol/L)</Typography>
            <TextField
              type="number"
              size="small"
              fullWidth
              value={settings.hco3Target}
              onChange={(e) => {
                let v = parseFloat(e.target.value);
                if (Number.isNaN(v)) v = 0;
                updateSettings({ hco3Target: Math.min(5, Math.max(0, v)) });
              }}
              inputProps={{ min: 0, max: 5, step: 0.1 }}
              helperText="기준수 HCO₃에서 이 값을 뺀 만큼 산으로 중화"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography sx={OPTION_LABEL_SX}>중화 방식</Typography>
            <ToggleButtonGroup
              value={settings.neutralizationType}
              exclusive
              onChange={(_, v) => v && updateSettings({ neutralizationType: v })}
              fullWidth
              size="small"
            >
              <ToggleButton value="질산">질산 60%</ToggleButton>
              <ToggleButton value="인산">인산 85%</ToggleButton>
            </ToggleButtonGroup>
            {plan && plan.acidDemand > 0 && (
              <Typography variant="caption" sx={{ color: "#777" }}>중화량 {plan.acidDemand.toFixed(2)} mmol/L</Typography>
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography sx={OPTION_LABEL_SX}>급액 EC (dS/m)</Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                type="number"
                size="small"
                fullWidth
                value={settings.supplyEC ?? ""}
                placeholder={plan ? `자동 ${plan.defaultSupplyEC.toFixed(2)}` : "자동"}
                onChange={handleSupplyECChange}
                inputProps={{ min: 0.3, max: 6, step: 0.1 }}
              />
              <Button size="small" variant="outlined" onClick={() => updateSettings({ supplyEC: null })} disabled={settings.supplyEC == null}>
                자동
              </Button>
            </Box>
            <Typography variant="caption" sx={{ color: "#777" }}>
              {plan ? `자동값 ${plan.defaultSupplyEC.toFixed(2)} = 기준수 ${plan.baseEC.toFixed(2)} + 표준 조성 추가량` : "기준수 EC + 표준 조성 EC"}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography sx={OPTION_LABEL_SX}>원액 탱크 용량 (L)</Typography>
            <TextField
              type="number"
              size="small"
              fullWidth
              value={settings.tankVolume}
              onChange={(e) => {
                const v = Number(e.target.value);
                updateSettings({ tankVolume: Number.isFinite(v) && v > 0 ? v : 1 });
              }}
              inputProps={{ min: 1 }}
              helperText="A, B 탱크 각각의 용량"
            />
          </Grid>
        </Grid>
      </Grid>

      <Grid item xs={12}>
        <Grid container spacing={2} alignItems="flex-start">
          <Grid item xs={12} sm={6} md={3}>
            <Typography sx={OPTION_LABEL_SX}>Cl 공급</Typography>
            <ToggleButtonGroup
              value={settings.clSource}
              exclusive
              onChange={(_, v) => v && updateSettings({ clSource: v })}
              fullWidth
              size="small"
            >
              <ToggleButton value="none">공급 안 함</ToggleButton>
              <ToggleButton value="CaCl2">염화칼슘</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" sx={{ color: "#777" }}>
              표준 조성에 Cl이 있을 때만 의미가 있습니다. 공급하지 않으면 그만큼 NO₃가 늘어납니다.
            </Typography>
          </Grid>
        </Grid>
      </Grid>

      {plan && (
        <>
          <Grid item xs={12} md={6}>
            <TankTable title="A 탱크 구성" entries={plan.recipe.tanks.A} totalKg={plan.recipe.tanks.massA} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TankTable title="B 탱크 구성" entries={plan.recipe.tanks.B} totalKg={plan.recipe.tanks.massB} />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" sx={{ color: "#888" }}>
              투입량은 {settings.concentration}배 원액 {settings.tankVolume} L 기준입니다. 질산칼륨은 A/B 탱크 질량이 비슷해지도록 나눕니다.
              액상 비료(질산, 인산, 액상 질산암모늄, 액상 Fe-DTPA)는 부피(L)를 먼저 표시하고 괄호 안에 제품 질량을 적습니다.
              10수염 + 제일인산암모늄 + 염화칼슘 조합은 Nutrient Solutions for Greenhouse Crops(2020)의 A/B 탱크 처방과 같은 계산입니다.
              제품 규격(질산 60%, 인산 85%, 질산암모늄 N 18%, Fe 함량)이 다르면 lib/nutrient/fertilizers.js의 값을 바꾸세요.
            </Typography>
          </Grid>
        </>
      )}
    </Grid>
  );
}
