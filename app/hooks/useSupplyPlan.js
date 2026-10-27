"use client";
import { useContext, useMemo } from "react";
import { DataContext } from "../context/DataContext";
import { computeSupplyPlan } from "@/lib/nutrient";

// 선택된 조성·원수·배액과 설정으로 급액 계획을 계산한다. 입력이 부족하면 null.
export function useSupplyPlan() {
  const { compositionDetails, waterSource, drainSource, drainTables, settings } = useContext(DataContext);

  return useMemo(() => {
    if (!compositionDetails || !waterSource) return null;
    return computeSupplyPlan({
      standard: compositionDetails,
      rawWater: waterSource,
      drain: drainSource,
      mode: settings.recirculationMode,
      drainMixRatio: settings.drainMixRatio,
      drainTables,
      applyDrainCorrection: settings.applyDrainCorrection,
      drainPH: drainSource?.pH,
      hco3Target: settings.hco3Target,
      supplyEC: settings.supplyEC,
      nSource: settings.nitrogenSource,
      pSource: settings.phosphateType,
      acidType: settings.neutralizationType,
      feSource: settings.feSource,
      clSource: settings.clSource,
      tankVolume: settings.tankVolume,
      concentration: settings.concentration,
    });
  }, [compositionDetails, waterSource, drainSource, drainTables, settings]);
}
