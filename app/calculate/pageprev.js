// app/calculate/page.js
"use client";

import { useState, useEffect, useContext } from "react";
import { DataContext } from "../context/DataContext";
import {
  compoundInfo,
  calculateSolutionInfo,
  calculateNutrient,
  calculateFertilizerAmount,
} from "./solution";

const nutrientDataPath = "/nutrient_solution.json";

export default function Calculate() {
  const { data } = useContext(DataContext); // 전역 데이터 가져오기
  const [nutrientData, setNutrientData] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState(""); // 선택된 작물
  const [selectedComposition, setSelectedComposition] = useState(""); // 선택된 조성명
  const [compositionDetails, setCompositionDetails] = useState(null); // 선택된 조성의 세부 정보
  const [selectedWater, setSelectedWater] = useState(null); // 선택된 원수 조성
  const [selectedDrain, setSelectedDrain] = useState(null); // 선택된 배액 조성
  const [selectedCaFert, setSelectedCaFert] = useState(""); // 칼슘 비료 선택 상태
  const [selectedPhosphateFert, setSelectedPhosphateFert] = useState(""); // 인산염 비료 선택 상태
  const [selectedFeFert, setSelectedFeFert] = useState(""); // 철분 비료 선택 상태
  const [selectedpHCorrection, setSelectedpHCorrection] = useState(""); // pH 보정 비료 선택 상태
  const [calculatedSolution, setCalculatedSolution] = useState(null); // 계산된 solution
  const [fertAmount, setFertAmount] = useState(null); // 계산된 solution

  useEffect(() => {
    fetch(nutrientDataPath)
      .then((response) => response.json())
      .then((data) => setNutrientData(data))
      .catch((error) => console.error("Error loading nutrient data:", error));
  }, []);

  async function solutionCalculator() {
    try {
      const solution = calculateSolutionInfo(compositionDetails); // 선택된 조성 정보를 사용해 solution 생성
      const rawWater = calculateSolutionInfo(selectedWater); // 선택된 원수 정보를 사용해 solution 생성
      const aimedSolutions = calculateNutrient(solution, selectedCaFert);
      const macrofertilizers = {
        HNO3: { nutrient: aimedSolutions.HCO3, info: compoundInfo.HNO3, isMicro: false, isHNO3: true },
        CaNO3: {
          nutrient: aimedSolutions.Ca,
          info: selectedCaFert === "4수염" ? compoundInfo.CaNO34H2O : compoundInfo.CaNO310H2O,
          isMicro: false, isHNO3: false
        },
        NH4NO3: { nutrient: aimedSolutions.NH4, info: compoundInfo.NH4NO3, isMicro: false, isHNO3: false },
        KH2PO4: { nutrient: aimedSolutions.PO4, info: compoundInfo.KH2PO4, isMicro: false, isHNO3: false },
        MgSO4: { nutrient: aimedSolutions.Mg, info: compoundInfo.MgSO4, isMicro: false, isHNO3: false },
        K2SO4: { nutrient: aimedSolutions.SO4, info: compoundInfo.K2SO4, isMicro: false, isHNO3: false },
        KNO3: { nutrient: aimedSolutions.K, info: compoundInfo.KNO3, isMicro: false, isHNO3: false },
      };

      const microFertilizers = {
        Fe: {
          nutrient: aimedSolutions.Fe,
          info: selectedFeFert === "DTPA" ? compoundInfo.FeDTPA : compoundInfo.FeEDTA,
          isMicro: true
        },
        MnSO4: { nutrient: aimedSolutions.Mn, info: compoundInfo.MnSO4, isMicro: true },
        ZnSO4: { nutrient: aimedSolutions.Zn, info: compoundInfo.ZnSO4, isMicro: true },
        Borax: { nutrient: aimedSolutions.B, info: compoundInfo.Borax, isMicro: true },
        CuSO4: { nutrient: aimedSolutions.Cu, info: compoundInfo.CuSO4, isMicro: true },
        NaMoO4: { nutrient: aimedSolutions.Mo, info: compoundInfo.NaMoO4, isMicro: true }
      };

      // 비료 투입량 계산
      let fertilizerAmounts = {};

      // 주요 비료 계산
      Object.keys(macrofertilizers).forEach((fert) => {
        fertilizerAmounts[fert] = calculateFertilizerAmount(
          macrofertilizers[fert].nutrient,
          macrofertilizers[fert].info,
          macrofertilizers[fert].isMicro,
          macrofertilizers[fert].isHNO3
        );
      });

      // 미량 원소 비료 계산
      Object.keys(microFertilizers).forEach((fert) => {
        fertilizerAmounts[fert] = calculateFertilizerAmount(
          microFertilizers[fert].nutrient,
          microFertilizers[fert].info,
          microFertilizers[fert].isMicro
        );
      });

      setCalculatedSolution(aimedSolutions); // 계산된 양액 조성 결과 상태 저장
      setFertAmount(fertilizerAmounts)

    } catch (error) {
      console.error("Error calculating the nutrient solution:", error);
      return null;
    }
  }

  // 작물 선택 eventhandler
  const handleCropChange = (event) => {
    const crop = event.target.value;
    setSelectedCrop(crop);
    setSelectedComposition(""); // 작물을 변경하면 조성명을 초기화
    setCompositionDetails(null); // 조성 상세 정보도 초기화
  };

  // 조성명 선택 eventhandler
  const handleCompositionChange = (event) => {
    const composition = event.target.value;
    setSelectedComposition(composition);

    // 선택된 작물의 해당 조성명 데이터를 세부 정보에 설정
    if (
      nutrientData &&
      selectedCrop &&
      nutrientData[selectedCrop][composition]
    ) {
      setCompositionDetails(nutrientData[selectedCrop][composition]);
    }
  };

  // 전역 데이터에서 원수 및 배액 조성 선택
  const handleWaterChange = (event) => {
    const selectedWaterData = data.find(
      (entry) => entry.analysis === event.target.value
    );
    setSelectedWater(selectedWaterData);
  };

  const handleDrainChange = (event) => {
    const selectedDrainData = data.find(
      (entry) => entry.analysis === event.target.value
    );
    setSelectedDrain(selectedDrainData);
  };

  // 비료 선택 이벤트 핸들러
  const handleCaFertChange = (event) => {
    setSelectedCaFert(event.target.value);
  };

  const handlePhosphateFertChange = (event) => {
    setSelectedPhosphateFert(event.target.value);
  };

  const handleFeFertChange = (event) => {
    setSelectedFeFert(event.target.value);
  };

  const handlepHCorrectionChange = (event) => {
    setSelectedpHCorrection(event.target.value);
  };

  return (
    <div>
      <h2>양액 조성 계산</h2>
      {/* 작물 선택 */}
      {nutrientData && (
        <>
          <div>
            <label htmlFor="crop">작물 선택: </label>
            <select id="crop" value={selectedCrop} onChange={handleCropChange}>
              <option value="">작물을 선택하세요</option>
              {Object.keys(nutrientData).map((crop) => (
                <option key={crop} value={crop}>
                  {crop}
                </option>
              ))}
            </select>
          </div>

          {/* 조성명 선택 */}
          {selectedCrop && (
            <div>
              <label htmlFor="composition">조성명 선택: </label>
              <select
                id="composition"
                value={selectedComposition}
                onChange={handleCompositionChange}
              >
                <option value="">조성명을 선택하세요</option>
                {Object.keys(nutrientData[selectedCrop]).map((composition) => (
                  <option key={composition} value={composition}>
                    {composition}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 원수 조성 선택 */}
          <div>
            <label htmlFor="water">원수 조성 선택: </label>
            <select id="water" onChange={handleWaterChange}>
              <option value="">원수 조성을 선택하세요</option>
              {data.map((entry) => (
                <option key={entry.id} value={entry.analysis}>
                  {entry.analysis}
                </option>
              ))}
            </select>
          </div>

          {/* 배액 조성 선택 */}
          <div>
            <label htmlFor="drain">배액 조성 선택: </label>
            <select id="drain" onChange={handleDrainChange}>
              <option value="">배액 조성을 선택하세요</option>
              {data.map((entry) => (
                <option key={entry.id} value={entry.analysis}>
                  {entry.analysis}
                </option>
              ))}
            </select>
          </div>

          {/* 선택된 조성의 상세 정보 */}
          {compositionDetails && (
            <div style={{ marginTop: "20px" }}>
              <h3>선택 조성 정보 (단위: 다량원소(mmol/L), 미량원소(µmol/L))</h3>
              <table border="1" cellPadding="10">
                <thead>
                  <tr>
                    {Object.keys(compositionDetails).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {Object.values(compositionDetails).map((value, index) => (
                      <td key={index}>{value}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <h2>양액 기본 정보 선택</h2>

          {/* 칼슘 비료 선택 */}
          <div>
            <label htmlFor="caFert">칼슘 비료 선택:</label>
            <select
              id="caFert"
              value={selectedCaFert}
              onChange={handleCaFertChange}
            >
              <option value="">비료를 선택하세요</option>
              <option value="4수염">질산칼슘 (CaNO3·4H2O)</option>
              <option value="10수염">질산칼슘 (CaNO3·10H2O)</option>
            </select>
          </div>

          {/* 인산염 비료 선택 */}
          <div>
            <label htmlFor="phosphateFert">인산염 비료 선택:</label>
            <select
              id="phosphateFert"
              value={selectedPhosphateFert}
              onChange={handlePhosphateFertChange}
            >
              <option value="">비료를 선택하세요</option>
              <option value="인산칼륨">인산칼륨 (KH2PO4)</option>
              <option value="제1인산암모늄">제1인산암모늄 (NH4H2PO4)</option>
            </select>
          </div>

          {/* 철분 비료 선택 */}
          <div>
            <label htmlFor="feFert">철분 비료 선택:</label>
            <select
              id="feFert"
              value={selectedFeFert}
              onChange={handleFeFertChange}
            >
              <option value="">비료를 선택하세요</option>
              <option value="DTPA">Fe-DTPA 6%</option>
              <option value="EDTA">Fe-EDTA 13%</option>
            </select>
          </div>

          {/* pH 보정 비료 선택 */}
          <div>
            <label htmlFor="pHCorrection">pH 보정 비료:</label>
            <select
              id="pHCorrection"
              value={selectedpHCorrection}
              onChange={handlepHCorrectionChange}
            >
              <option value="">비료를 선택하세요</option>
              <option value="HNO3">질산 (HNO3)</option>
              <option value="H2SO4">황산 (H2SO4)</option>
            </select>
          </div>

          {/* 계산 버튼 */}
          <div style={{ marginTop: "20px" }}>
            <button onClick={solutionCalculator}>계산하기</button>
          </div>

          {/* 계산된 양액 조성 결과 출력 */}
          {calculatedSolution && (
            <div style={{ marginTop: "20px" }}>
              <h3>계산된 양액 조성 결과</h3>
              <table border="1" cellPadding="10">
                <thead>
                  <tr>
                    {Object.keys(calculatedSolution).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {Object.values(calculatedSolution).map((value, index) => (
                      <td key={index}>
                        {typeof value === "object" && value !== null
                          ? JSON.stringify(value)
                          : value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 계산된 비료 투입량 출력 */}
          {fertAmount && (
            <div style={{ marginTop: "20px" }}>
              <h3>계산된 비료 투입량 결과</h3>
              <table border="1" cellPadding="10">
                <thead>
                  <tr>
                    {Object.keys(fertAmount).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {Object.values(fertAmount).map((value, index) => (
                      <td key={index}>
                        {typeof value === "object" && value !== null ? JSON.stringify(value) : value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 선택된 원수 조성 정보 */}
          {selectedWater && (
            <div style={{ marginTop: "20px" }}>
              <h3>선택된 원수 조성</h3>
              <table border="1" cellPadding="10">
                <thead>
                  <tr>
                    {Object.keys(selectedWater).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {Object.values(selectedWater).map((value, index) => (
                      <td key={index}>
                        {typeof value === "object" && value !== null
                          ? JSON.stringify(value) // 만약 value가 객체라면 문자열로 변환해서 표시
                          : value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 선택된 배액 조성 정보 */}
          {selectedDrain && (
            <div style={{ marginTop: "20px" }}>
              <h3>선택된 배액 조성</h3>
              <table border="1" cellPadding="10">
                <thead>
                  <tr>
                    {Object.keys(selectedDrain).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {Object.values(selectedDrain).map((value, index) => (
                      <td key={index}>
                        {typeof value === "object" && value !== null
                          ? JSON.stringify(value)
                          : value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
