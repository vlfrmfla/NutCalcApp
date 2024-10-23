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

import {
  Grid,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

import "./calculate.css";
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
        HNO3: {
          nutrient: aimedSolutions.HCO3,
          info: compoundInfo.HNO3,
          isMicro: false,
          isHNO3: true,
        },
        CaNO3: {
          nutrient: aimedSolutions.Ca,
          info:
            selectedCaFert === "4수염"
              ? compoundInfo.CaNO34H2O
              : compoundInfo.CaNO310H2O,
          isMicro: false,
          isHNO3: false,
        },
        NH4NO3: {
          nutrient: aimedSolutions.NH4,
          info: compoundInfo.NH4NO3,
          isMicro: false,
          isHNO3: false,
        },
        KH2PO4: {
          nutrient: aimedSolutions.PO4,
          info: compoundInfo.KH2PO4,
          isMicro: false,
          isHNO3: false,
        },
        MgSO4: {
          nutrient: aimedSolutions.Mg,
          info: compoundInfo.MgSO4,
          isMicro: false,
          isHNO3: false,
        },
        K2SO4: {
          nutrient: aimedSolutions.SO4,
          info: compoundInfo.K2SO4,
          isMicro: false,
          isHNO3: false,
        },
        KNO3: {
          nutrient: aimedSolutions.K,
          info: compoundInfo.KNO3,
          isMicro: false,
          isHNO3: false,
        },
      };

      const microFertilizers = {
        Fe: {
          nutrient: aimedSolutions.Fe,
          info:
            selectedFeFert === "DTPA"
              ? compoundInfo.FeDTPA
              : compoundInfo.FeEDTA,
          isMicro: true,
        },
        MnSO4: {
          nutrient: aimedSolutions.Mn,
          info: compoundInfo.MnSO4,
          isMicro: true,
        },
        ZnSO4: {
          nutrient: aimedSolutions.Zn,
          info: compoundInfo.ZnSO4,
          isMicro: true,
        },
        Borax: {
          nutrient: aimedSolutions.B,
          info: compoundInfo.Borax,
          isMicro: true,
        },
        CuSO4: {
          nutrient: aimedSolutions.Cu,
          info: compoundInfo.CuSO4,
          isMicro: true,
        },
        NaMoO4: {
          nutrient: aimedSolutions.Mo,
          info: compoundInfo.NaMoO4,
          isMicro: true,
        },
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
      setFertAmount(fertilizerAmounts);
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
    <Grid container spacing={2} style={{ padding: "20px" }}>
      <Grid item xs={12}>
        <Typography variant="h5">양액 조성 선택</Typography>
      </Grid>

      <Grid item xs={6}>
        <FormControl fullWidth>
          <InputLabel
            id="crop-label"
            shrink={!!selectedCrop}
            className={`custom-input-label ${selectedCrop ? "shrink" : ""}`}
          >
            작물 선택
          </InputLabel>
          <Select
            labelId="crop-label"
            id="crop"
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
            label="작물 선택"
          >
            <MenuItem value="">
              <em>작물을 선택하세요</em>
            </MenuItem>
            {nutrientData &&
              Object.keys(nutrientData).map((crop) => (
                <MenuItem key={crop} value={crop}>
                  {crop}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      </Grid>

      {/* 조성 종류 선택 */}
      <Grid item xs={6}>
        <FormControl fullWidth>
          <InputLabel
            id="composition-label"
            shrink={!!selectedComposition}
            className={`custom-input-label ${
              selectedComposition ? "shrink" : ""
            }`}
          >
            조성 종류 선택
          </InputLabel>
          <Select
            labelId="composition-label"
            id="composition"
            value={selectedComposition}
            onChange={(e) => setSelectedComposition(e.target.value)}
          >
            <MenuItem value="">
              <em>조성명을 선택하세요</em>
            </MenuItem>
            {nutrientData &&
              selectedCrop &&
              Object.keys(nutrientData[selectedCrop]).map((composition) => (
                <MenuItem key={composition} value={composition}>
                  {composition}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      </Grid>

      {/* 원수 조성 선택 */}
      <Grid item xs={6}>
        <FormControl fullWidth>
          <InputLabel
            id="water-label"
            shrink={!!selectedWater}
            className={`custom-input-label ${selectedWater ? "shrink" : ""}`}
          >
            원수 조성 선택
          </InputLabel>
          <Select
            labelId="water-label"
            id="water"
            value={selectedWater?.analysis || ""}
            onChange={(e) => setSelectedWater(e.target.value)}
          >
            <MenuItem value="">
              <em>원수 조성을 선택하세요</em>
            </MenuItem>
            {data &&
              data.map((entry) => (
                <MenuItem key={entry.id} value={entry.analysis}>
                  {entry.analysis}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      </Grid>

      {/* 배액 조성 선택 */}
      <Grid item xs={6}>
        <FormControl fullWidth>
          <InputLabel
            id="drain-label"
            shrink={!!selectedDrain}
            className={`custom-input-label ${selectedDrain ? "shrink" : ""}`}
          >
            배액 조성 선택
          </InputLabel>
          <Select
            labelId="drain-label"
            id="drain"
            value={selectedDrain?.analysis || ""}
            onChange={(e) => setSelectedDrain(e.target.value)}
          >
            <MenuItem value="">
              <em>배액 조성을 선택하세요</em>
            </MenuItem>
            {data &&
              data.map((entry) => (
                <MenuItem key={entry.id} value={entry.analysis}>
                  {entry.analysis}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12}>
        <Typography variant="h5">양액 기본 정보 선택</Typography>
      </Grid>

      {/* 칼슘 비료 선택 */}
      <Grid item xs={6}>
        <FormControl fullWidth>
          <InputLabel
            id="caFert-label"
            shrink={!!selectedCaFert}
            className={`custom-input-label ${selectedCaFert ? "shrink" : ""}`}
          >
            칼슘 비료 선택
          </InputLabel>
          <Select
            labelId="caFert-label"
            id="caFert"
            value={selectedCaFert}
            onChange={(e) => setSelectedCaFert(e.target.value)}
          >
            <MenuItem value="">
              <em>비료를 선택하세요</em>
            </MenuItem>
            <MenuItem value="4수염">질산칼슘 (CaNO3·4H2O)</MenuItem>
            <MenuItem value="10수염">질산칼슘 (CaNO3·10H2O)</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* 인산염 비료 선택 */}
      <Grid item xs={6}>
        <FormControl fullWidth>
          <InputLabel
            id="phosphateFert-label"
            shrink={!!selectedPhosphateFert}
            className={`custom-input-label ${selectedPhosphateFert ? "shrink" : ""}`}
          >
            인산염 비료 선택
          </InputLabel>
          <Select
            labelId="phosphateFert-label"
            id="phosphateFert"
            value={selectedPhosphateFert}
            onChange={(e) => setSelectedPhosphateFert(e.target.value)}
          >
            <MenuItem value="">
              <em>비료를 선택하세요</em>
            </MenuItem>
            <MenuItem value="인산칼륨">인산칼륨 (KH2PO4)</MenuItem>
            <MenuItem value="제1인산암모늄">제1인산암모늄 (NH4H2PO4)</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* 철분 비료 선택 */}
      <Grid item xs={6}>
        <FormControl fullWidth>
          <InputLabel
            id="feFert-label"
            shrink={!!selectedFeFert}
            className={`custom-input-label ${selectedFeFert ? "shrink" : ""}`}
          >
            철분 비료 선택
          </InputLabel>
          <Select
            labelId="feFert-label"
            id="feFert"
            value={selectedFeFert}
            onChange={handleFeFertChange}
          >
            <MenuItem value="">
              <em>비료를 선택하세요</em>
            </MenuItem>
            <MenuItem value="DTPA">Fe-DTPA 6%</MenuItem>
            <MenuItem value="EDTA">Fe-EDTA 13%</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* pH 보정 비료 선택 */}
      <Grid item xs={6}>
        <FormControl fullWidth>
          <InputLabel
            id="pHCorrection-label"
            shrink={!!selectedpHCorrection}
            className={`custom-input-label ${selectedpHCorrection ? "shrink" : ""}`}
          >
            pH 보정 비료 선택
          </InputLabel>
          <Select
            labelId="pHCorrection-label"
            id="pHCorrection"
            value={selectedpHCorrection}
            onChange={handlepHCorrectionChange}
          >
            <MenuItem value="">
              <em>비료를 선택하세요</em>
            </MenuItem>
            <MenuItem value="HNO3">질산 (HNO3)</MenuItem>
            <MenuItem value="H2SO4">황산 (H2SO4)</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12}>
        <Button
          variant="contained"
          color="primary"
          onClick={solutionCalculator}
        >
          계산하기
        </Button>
      </Grid>
      
      {/* 계산된 양액 조성 결과 출력 */}
      {calculatedSolution && (
        <Grid item xs={12}>
          <Typography variant="h6">계산된 양액 조성 결과</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  {Object.keys(calculatedSolution).map((key) => (
                    <TableCell key={key}>{key}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  {Object.values(calculatedSolution).map((value, index) => (
                    <TableCell key={index}>
                      {typeof value === "object" && value !== null
                        ? JSON.stringify(value)
                        : value}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      )}

      {/* 계산된 비료 투입량 출력 */}
      {fertAmount && (
        <Grid item xs={12}>
          <Typography variant="h6">계산된 비료 투입량 결과</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  {Object.keys(fertAmount).map((key) => (
                    <TableCell key={key}>{key}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  {Object.values(fertAmount).map((value, index) => (
                    <TableCell key={index}>
                      {typeof value === "object" && value !== null
                        ? JSON.stringify(value)
                        : value}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      )}
    </Grid>
  );
}
