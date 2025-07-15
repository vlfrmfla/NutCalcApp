import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { Solution, Adjustment, calculateFertilizers } from "@/utils/calculation";


export async function POST(req) {
  try {
    const body = await req.json();
    console.log(body);
    const { targetComposition, waterSource, drainSource, fertilizerType, FeFertilizerType, concentration, tankVolume, hco3 } = body;

    if (!targetComposition) {
      return NextResponse.json({ error: "목표 조성 데이터가 누락됨" }, { status: 400 });
    }

    // 1. 데이터 불러오기
    const basePath = path.join(process.cwd(), "public");
    const drainData = JSON.parse(await fs.readFile(`${basePath}/drain_solution.json`, "utf-8"));

    // 2. 목표 조성 사용 (실제 조성이 전달됨)
    const solutionData = targetComposition;

    console.log("=== API 요청 파라미터 확인 ===");
    console.log("targetComposition:", targetComposition);
    console.log("targetComposition.HCO3:", targetComposition.HCO3);

    // 3. 전달받은 목표 조성을 그대로 사용 (이미 올바르게 계산됨)
    const targetForFertilizer = solutionData;
    console.log("비료 계산용 목표 조성:", targetForFertilizer);
    console.log("목표 조성 HCO3 (중화량):", targetForFertilizer.HCO3);

          // 4. 비료량 계산
    let fertilizerResult;
    try {
      fertilizerResult = calculateFertilizers(
        targetForFertilizer,
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
