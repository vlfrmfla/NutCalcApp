"use client";

import { useContext, useEffect, useMemo } from "react";
import {
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  IconButton,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  Box,
  styled,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { DataContext } from "../context/DataContext";
import { useSupplyPlan } from "../hooks/useSupplyPlan";
import { validateComposition, normalizeComposition, estimateEC, CLASS_LABELS } from "@/lib/nutrient";
import CompositionTable, { DISPLAY_KEYS } from "../components/nutrient/CompositionTable";
import WarningList from "../components/nutrient/WarningList";
import "./calculate.css";

const CustomTooltip = styled(({ className, ...props }) => <Tooltip {...props} classes={{ popper: className }} />)(
  ({ theme }) => ({
    [`& .MuiTooltip-tooltip`]: {
      fontSize: "0.8rem",
      lineHeight: "1.5",
      whiteSpace: "pre-wrap",
      padding: theme.spacing(1),
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      boxShadow: theme.shadows[3],
    },
  })
);

const SELECT_WARNING_CODES = ["base_exceeds_target", "na_high", "cl_high", "cl_not_supplied"];

// 샘플 행(원수/배액)을 표에 보여줄 값으로 변환
function sampleValues(sample) {
  const c = normalizeComposition(sample);
  return { ...c, EC: sample.EC ?? c.EC, pH: sample.pH };
}

export default function SelectPage() {
  const {
    nutrientData,
    data,
    selectedCrop, setSelectedCrop,
    selectedSubstrate, setSelectedSubstrate,
    selectedComposition, setSelectedComposition,
    selectedWaterSourceId, setSelectedWaterSourceId,
    selectedDrainSourceId, setSelectedDrainSourceId,
    settings, updateSettings,
    compositionDetails, waterSource, drainSource, drainTables,
  } = useContext(DataContext);
  const plan = useSupplyPlan();
  const recirculating = settings.recirculationMode === "순환식";
  const modeTables = drainTables?.[settings.recirculationMode] || null;

  // 저장된 선택값이 데이터에 없으면 초기화
  useEffect(() => {
    if (!nutrientData) return;
    if (selectedCrop && !nutrientData[selectedCrop]) {
      setSelectedCrop("");
      setSelectedSubstrate("");
      setSelectedComposition("");
    } else if (selectedSubstrate && !nutrientData[selectedCrop]?.[selectedSubstrate]) {
      setSelectedSubstrate("");
      setSelectedComposition("");
    } else if (selectedComposition && !nutrientData[selectedCrop]?.[selectedSubstrate]?.[selectedComposition]) {
      setSelectedComposition("");
    }
  }, [nutrientData, selectedCrop, selectedSubstrate, selectedComposition, setSelectedCrop, setSelectedSubstrate, setSelectedComposition]);

  const validation = useMemo(
    () => (compositionDetails ? validateComposition(compositionDetails) : null),
    [compositionDetails]
  );

  const rows = useMemo(() => {
    if (!compositionDetails) return [];
    const std = normalizeComposition(compositionDetails);
    const list = [{ label: "표준 조성", values: { ...std, EC: std.EC ?? estimateEC(std) } }];
    if (waterSource) list.push({ label: "원수", values: sampleValues(waterSource) });
    if (drainSource) list.push({ label: "배액(근권) 분석", values: sampleValues(drainSource) });
    if (plan && plan.mode === "순환식") list.push({ label: plan.baseLabel, values: { ...plan.base, EC: plan.base.EC } });
    if (plan?.advice) {
      list.push({ label: "보정된 표준 조성", values: { ...plan.effectiveStandard, EC: estimateEC(plan.effectiveStandard) } });
    }
    if (plan) {
      list.push({
        label: "추가 필요량 (목표 조성)",
        bold: true,
        values: { ...plan.additions, HCO3: -plan.acidDemand, EC: estimateEC(plan.additions) },
      });
    }
    return list;
  }, [compositionDetails, waterSource, drainSource, plan]);

  const adviceRows = useMemo(() => {
    const a = plan?.advice;
    if (!a) return [];
    const colorFor = (v) => (!v ? undefined : { backgroundColor: v > 0 ? "#e3f2fd" : "#fdecea" });
    return [
      { label: `목표 (EC(c) ${a.ecRef})`, values: a.targets },
      { label: "배액 분석", values: { ...a.drain, pH: a.drainPH } },
      { label: `배액 (EC(c) 환산 ×${a.scaleFactor.toFixed(2)})`, values: { ...a.scaledDrain, pH: undefined } },
      {
        label: "판정",
        render: (key) => (a.classes[key] === undefined ? "-" : CLASS_LABELS[String(a.classes[key])] || "-"),
        cellSx: (key) => colorFor(-(a.classes[key] || 0)),
      },
      {
        label: "표준 조성 보정량",
        bold: true,
        values: { ...a.corrections, EC: undefined, pH: undefined },
        cellSx: (key) => colorFor(a.corrections[key]),
      },
    ];
  }, [plan]);

  const selectWarnings = plan ? plan.warnings.filter((w) => SELECT_WARNING_CODES.includes(w.code)) : [];

  // 옵션 목록이 아직 없거나(로딩 전) 저장된 값이 목록에 없으면 빈 값으로 표시
  const cropValue = nutrientData?.[selectedCrop] ? selectedCrop : "";
  const substrateValue = nutrientData?.[selectedCrop]?.[selectedSubstrate] ? selectedSubstrate : "";
  const compositionValue = compositionDetails ? selectedComposition : "";
  const hasSample = (id) => data?.some((d) => String(d.id) === String(id));
  const waterValue = hasSample(selectedWaterSourceId) ? selectedWaterSourceId : "";
  const drainValue = hasSample(selectedDrainSourceId) ? selectedDrainSourceId : "";

  return (
    <Grid container spacing={2} sx={{ p: 3 }}>
      <Grid item xs={12}>
        <Typography variant="h5" sx={{ fontWeight: "bold", color: "grey" }}>
          양액 조성 선택
        </Typography>
        <Typography variant="caption" sx={{ color: "#b0b0b0", display: "block", mt: 0.8, mb: 0.4, fontSize: "0.75rem", lineHeight: 1.2 }}>
          작물과 생육 단계에 맞는 표준 양액 조성을 고르고 원수 조성을 선택하면, 비료로 추가해야 할 양(표준 조성 − 기준수)이 계산됩니다.
          순환식에서는 배액과 원수를 혼합한 혼합수를 기준수로 씁니다. 배액(근권) 분석값을 고르면 두 방식 모두에서 네덜란드 보정표(Bemestings Adviesbasis 1999)에 따라 표준 조성을 단계 보정할 수 있습니다.
        </Typography>
      </Grid>

      <Grid item xs={12} sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <ToggleButtonGroup
          value={settings.recirculationMode}
          exclusive
          onChange={(_, mode) => mode && updateSettings({ recirculationMode: mode })}
          size="small"
        >
          <ToggleButton value="비순환식">비순환식</ToggleButton>
          <ToggleButton value="순환식">순환식</ToggleButton>
        </ToggleButtonGroup>
        <CustomTooltip
          title={
            <>
              <strong>비순환식:</strong> 배액을 배출합니다. 원수를 기준으로 비료량을 계산합니다. 배액 분석을 고르면 자유배액 보정표를 씁니다.{"\n"}
              <strong>순환식:</strong> 배액을 원수와 섞어 다시 급액합니다. 혼합수를 기준으로 비료량을 계산하고, 배액 분석을 고르면 폐쇄계 보정표를 씁니다.
            </>
          }
          arrow
        >
          <IconButton size="small">
            <InfoOutlinedIcon color="primary" />
          </IconButton>
        </CustomTooltip>
      </Grid>

      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel id="crop-label">작물 선택</InputLabel>
          <Select
            labelId="crop-label"
            value={cropValue}
            label="작물 선택"
            onChange={(e) => {
              setSelectedCrop(e.target.value);
              setSelectedSubstrate("");
              setSelectedComposition("");
            }}
          >
            <MenuItem value=""><em>작물을 선택하세요</em></MenuItem>
            {nutrientData && Object.keys(nutrientData).map((crop) => (
              <MenuItem key={crop} value={crop}>{crop}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth disabled={!selectedCrop}>
          <InputLabel id="substrate-label">배지 선택</InputLabel>
          <Select
            labelId="substrate-label"
            value={substrateValue}
            label="배지 선택"
            onChange={(e) => {
              setSelectedSubstrate(e.target.value);
              setSelectedComposition("");
            }}
          >
            <MenuItem value=""><em>배지를 선택하세요</em></MenuItem>
            {nutrientData && selectedCrop && nutrientData[selectedCrop] && Object.keys(nutrientData[selectedCrop]).map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth disabled={!selectedSubstrate}>
          <InputLabel id="composition-label">표준 양액 조성</InputLabel>
          <Select
            labelId="composition-label"
            value={compositionValue}
            label="표준 양액 조성"
            onChange={(e) => setSelectedComposition(e.target.value)}
          >
            <MenuItem value=""><em>조성을 선택하세요</em></MenuItem>
            {nutrientData && selectedCrop && selectedSubstrate && nutrientData[selectedCrop]?.[selectedSubstrate] &&
              Object.keys(nutrientData[selectedCrop][selectedSubstrate]).map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
          </Select>
        </FormControl>
      </Grid>

      {compositionDetails?._source && (
        <Grid item xs={12}>
          <Typography variant="caption" sx={{ color: "#888" }}>출처: {compositionDetails._source}</Typography>
        </Grid>
      )}

      {validation && validation.issues.length > 0 && (
        <Grid item xs={12}>
          <WarningList warnings={validation.issues.map((i) => ({ ...i, message: `표준 조성 데이터: ${i.message}` }))} />
        </Grid>
      )}

      {compositionDetails && (
        <>
          <Grid item xs={12} sm={recirculating ? 4 : 6}>
            <FormControl fullWidth>
              <InputLabel id="water-label">원수 조성</InputLabel>
              <Select
                labelId="water-label"
                value={waterValue}
                label="원수 조성"
                onChange={(e) => setSelectedWaterSourceId(e.target.value)}
              >
                <MenuItem value=""><em>선택</em></MenuItem>
                {data?.map((entry) => (
                  <MenuItem key={entry.id} value={String(entry.id)}>{entry.analysis}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={recirculating ? 4 : 6}>
            <FormControl fullWidth>
              <InputLabel id="drain-label">배액(근권) 분석</InputLabel>
              <Select
                labelId="drain-label"
                value={drainValue}
                label="배액(근권) 분석"
                onChange={(e) => setSelectedDrainSourceId(e.target.value)}
              >
                <MenuItem value=""><em>선택 안 함</em></MenuItem>
                {data?.map((entry) => (
                  <MenuItem key={entry.id} value={String(entry.id)}>{entry.analysis}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {recirculating && (
            <Grid item xs={12} sm={4}>
              <TextField
                label="급액 중 배액 혼합 비율 (%)"
                type="number"
                fullWidth
                value={settings.drainMixRatio}
                onChange={(e) => {
                  let v = parseFloat(e.target.value);
                  if (Number.isNaN(v)) v = 0;
                  updateSettings({ drainMixRatio: Math.min(100, Math.max(0, v)) });
                }}
                inputProps={{ min: 0, max: 100, step: 5 }}
                helperText="배액 30%면 급액 1 L 중 배액 0.3 L + 원수 0.7 L"
              />
            </Grid>
          )}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.applyDrainCorrection}
                  disabled={!modeTables || !drainSource}
                  onChange={(e) => updateSettings({ applyDrainCorrection: e.target.checked })}
                />
              }
              label={`배액 분석값으로 표준 조성 보정 (${recirculating ? "폐쇄계" : "자유배액"} 등급표)`}
            />
            {!drainTables && selectedCrop && (
              <Typography variant="caption" sx={{ display: "block", color: "#999" }}>
                {selectedCrop}의 보정표가 없어 보정을 쓸 수 없습니다. 토마토와 파프리카만 들어 있으며, public/target_drain.json에 추가할 수 있습니다.
              </Typography>
            )}
            {drainTables && !drainSource && (
              <Typography variant="caption" sx={{ display: "block", color: "#999" }}>
                배액(근권) 분석을 선택하면 보정을 켤 수 있습니다.
              </Typography>
            )}
          </Grid>
          {recirculating && !drainSource && (
            <Grid item xs={12}>
              <Alert severity="info">배액을 선택하기 전까지는 원수만 기준으로 계산합니다.</Alert>
            </Grid>
          )}
        </>
      )}

      {rows.length > 0 && (
        <Grid item xs={12}>
          <CompositionTable rows={rows} caption />
          {plan && (
            <Typography variant="caption" sx={{ color: "#888", display: "block", mt: 0.5 }}>
              추가 필요량의 HCO₃ 음수는 산으로 중화할 중탄산량입니다 (남길 HCO₃ {settings.hco3Target} mmol/L). EC는 이온 합으로 추정한 값입니다.
            </Typography>
          )}
        </Grid>
      )}

      {selectWarnings.length > 0 && (
        <Grid item xs={12}>
          <WarningList warnings={selectWarnings} />
        </Grid>
      )}

      {adviceRows.length > 0 && plan?.advice && (
        <Grid item xs={12}>
          <Typography variant="subtitle1" sx={{ fontWeight: "bold", mt: 1 }}>
            배액(근권) 분석 기반 보정
          </Typography>
          <Typography variant="caption" sx={{ color: "#888", display: "block" }}>
            {plan.advice.source}. 배액 EC {plan.advice.ecMeasured.toFixed(2)}에서 Na/Cl 몫을 뺀 EC(v) {plan.advice.ecV.toFixed(2)}를 EC(c) {plan.advice.ecRef}로 환산해
            K, Ca, Mg, NO₃, SO₄, P의 등급을 매기고(NH₄, 미량원소는 환산 없이 판정), 등급에 따라 표준 조성을 보정합니다.
            보정 뒤 K:Ca:Mg와 NO₃:SO₄ 비율을 유지한 채 이온합을 표준 조성({plan.advice.referenceSum.toFixed(1)} meq/L)으로 되돌립니다.
            {plan.advice.kCaApplied && " K/Ca 비율이 기준을 넘어 K를 줄이고 Ca를 늘렸습니다."}
          </Typography>
          <CompositionTable rows={adviceRows} />
          {plan.advice.nh4.code > 0 && (
            <Box sx={{ mt: 1 }}>
              <Alert severity={plan.advice.nh4.code >= 6 ? "info" : "warning"}>
                배액 pH {plan.advice.drainPH ?? "-"}, NH₄ {plan.advice.drain.NH4.toFixed(2)}, HCO₃ {plan.advice.drain.HCO3.toFixed(2)} mmol/L (조합 {plan.advice.nh4.code}):{" "}
                {plan.advice.nh4.advice}
                {plan.advice.nh4.extra > 0 && ` 질산암모늄 추가량 ${plan.advice.nh4.extra} mmol/L를 표준 조성에 더했습니다.`}
              </Alert>
            </Box>
          )}
        </Grid>
      )}

      {compositionDetails && !waterSource && (
        <Grid item xs={12}>
          <Box>
            <Alert severity="info">원수 조성을 선택하면 추가 필요량이 계산됩니다. 원수 데이터가 없으면 데이터 관리 탭에서 먼저 입력하세요.</Alert>
          </Box>
        </Grid>
      )}
    </Grid>
  );
}
