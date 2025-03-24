import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { Solution, Adjustment, calculateFertilizers } from "@/utils/calculation";

export async function POST(req) {
  try {
    const body = await req.json();
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
    const waterSourceData = drainData?.[waterSource] || {};
    const drainSourceData = drainData?.[drainSource] || {};

    const solution = new Solution(solutionData);
    const rawWater = new Solution(waterSourceData);
    const drain = new Solution(drainSourceData);

    // 3. 목표 조성 계산 (비순환 기준)
    const targetIons = Adjustment.calculateOpenLoop(solution, rawWater);

    // 4. 비료량 계산
    const fertilizerResult = calculateFertilizers(
      targetIons,
      fertilizerType,
      FeFertilizerType,
      { tankVolume, concentration }
    );

    // 5. 응답
    return NextResponse.json({
      solution: solution,                // 전체 이온 정보 포함됨
      targetIons,                        // 목표 이온 농도
      fertilizers: fertilizerResult.fertilizers,
      gramsPerLiter: fertilizerResult.gramsPerLiter,
      kgPerStock: fertilizerResult.kgPerStock,
      ions: fertilizerResult.ions,
    });

  } catch (error) {
    console.error("❌ API /api/calculate 에러:", error);  // 여기 추가
    return NextResponse.json({ error: "서버 내부 오류" }, { status: 500 });
  }
}
