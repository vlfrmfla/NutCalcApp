import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { Solution, Adjustment, calculateFertilizers } from "@/utils/calculation";


export async function POST(req) {
  try {
    const body = await req.json();
    console.log(body);
    const { crop, substrate, composition, waterSource, drainSource, fertilizerType, FeFertilizerType, concentration, tankVolume } = body;

    if (!crop || !substrate || !composition) {
      return NextResponse.json({ error: "필수 데이터가 누락됨" }, { status: 400 });
    }

    // 1. 데이터 불러오기
    const basePath = path.join(process.cwd(), "public");
    const nutrientData = JSON.parse(await fs.readFile(`${basePath}/nutrient_solution.json`, "utf-8"));
    const drainData = JSON.parse(await fs.readFile(`${basePath}/drain_solution.json`, "utf-8"));

    // 2. 조성 및 수질 정보 추출
    const solutionData = nutrientData?.[crop]?.[substrate]?.[composition] || {};
    
    if (typeof body.hco3 === "number") {
      solutionData.HCO3 = body.hco3;
    }

    console.log("=== API 요청 파라미터 확인 ===");
    console.log("waterSource:", waterSource);
    console.log("drainData 키들:", Object.keys(drainData));

    const waterSourceData = drainData?.[waterSource] || {};
    // 임시 설정 제거
    // if (!waterSourceData.HCO3) {
    //   waterSourceData.HCO3 = 1.04;
    // }
    console.log("waterSourceData:", waterSourceData);
    console.log("waterSourceData.HCO3:", waterSourceData.HCO3);

    // 디버깅 추가
    console.log("=== 목표조성 계산 디버깅 ===");
    console.log("solutionData.HCO3 (조성표):", solutionData.HCO3);
    console.log("waterSourceData.HCO3 (원수):", waterSourceData.HCO3);

    const solution = new Solution(solutionData);
    const rawWater = new Solution(waterSourceData);
    const drain = new Solution(drainSourceData);

    // 목표 조성 계산
    const targetIons = Adjustment.calculateOpenLoop(solution, rawWater);
    console.log("targetIons.HCO3 (계산결과):", targetIons.HCO3);
    console.log("예상값: solutionData.HCO3 - waterSourceData.HCO3 =", solutionData.HCO3, "-", waterSourceData.HCO3, "=", solutionData.HCO3 - waterSourceData.HCO3);

    // 4. 비료량 계산
    let fertilizerResult;
    try {
      fertilizerResult = calculateFertilizers(
        targetIons,
        fertilizerType,
        FeFertilizerType,
        { tankVolume, concentration } // options 객체로 전달
      );
    } catch (calcError) {
      console.error("calculateFertilizers 에러:", calcError);
      throw calcError;
    }

    // 5. 응답
    return NextResponse.json({
      solution: solution,
      targetIons,
      fertilizers: fertilizerResult.fertilizers,
      gramsPerLiter: fertilizerResult.gramsPerLiter,
      kgPerStock: fertilizerResult.kgPerStock,
      microFertgPerStock: fertilizerResult.microFertgPerStock,
      ions: fertilizerResult.ions,
    });

  } catch (error) {
    console.error("❌ API /api/calculate 에러:", error);
    console.error("에러 스택:", error.stack);
    return NextResponse.json({ error: "서버 내부 오류" }, { status: 500 });
  }
}
