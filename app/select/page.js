"use client";
import { useState, useEffect, useContext } from "react";
import { DataContext } from "../context/DataContext";
import {
  Grid2,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  IconButton,
  styled,
} from "@mui/material";

import "./calculate.css";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const nutrientDataPath = "/nutrient_solution.json";

// Tooltip 스타일 커스터마이징
const CustomTooltip = styled(({ className, ...props }) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .MuiTooltip-tooltip`]: {
    fontSize: "0.8rem", // 폰트 크기 설정
    lineHeight: "1.5", // 줄 간격 설정
    whiteSpace: "pre-wrap", // 줄바꿈 제어
    padding: theme.spacing(1), // 내부 여백 설정
    backgroundColor: theme.palette.background.paper, // 배경색
    color: theme.palette.text.primary, // 텍스트 색상
    boxShadow: theme.shadows[3], // 그림자 효과
  },
}));

export default function Calculate() {
  const { data } = useContext(DataContext); // 전역 데이터 가져오기
  const [nutrientData, setNutrientData] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState(""); // 선택된 작물
  const [selectedSubstrate, setSelectedSubstrate] = useState(""); // 선택된 배지
  const [selectedComposition, setSelectedComposition] = useState(""); // 선택된 조성명
  const [compositionDetails, setCompositionDetails] = useState(null); // 선택된 조성 세부 정보
  const [selectedWaterSource, setSelectedWaterSource] = useState(""); // 원수 조성 선택
  const [selectedDrainSource, setSelectedDrainSource] = useState(""); // 배액 조성 선택
  const [waterSourceDetails, setWaterSourceDetails] = useState(null); // 원수 조성 세부 정보
  const [drainSourceDetails, setDrainSourceDetails] = useState(null); // 배액 조성 세부 정보
  const [recirculationMode, setRecirculationMode] = useState("비순환식"); // 순환식/비순환식 선택 상태

  useEffect(() => {
    fetch(nutrientDataPath)
      .then((response) => response.json())
      .then((data) => setNutrientData(data))
      .catch((error) => console.error("Error loading nutrient data:", error));
  }, []);

  // 작물 선택 eventhandler
  const handleCropChange = (event) => {
    const crop = event.target.value;
    setSelectedCrop(crop);
    setSelectedSubstrate(""); // 작물 변경 시 배지 초기화
    setSelectedComposition(""); // 배지 변경 시 조성 초기화
    setCompositionDetails(null); // 조성 세부 정보 초기화
  };

  // 배지 선택 eventhandler
  const handleSubstrateChange = (event) => {
    const substrate = event.target.value;
    setSelectedSubstrate(substrate);
    setSelectedComposition(""); // 배지 변경 시 조성 초기화
    setCompositionDetails(null); // 조성 세부 정보 초기화
  };

  // 조성 선택 eventhandler
  const handleCompositionChange = (event) => {
    const composition = event.target.value;
    setSelectedComposition(composition);

    // 선택된 작물, 배지, 조성 데이터를 기반으로 세부 정보 설정
    if (
      nutrientData &&
      selectedCrop &&
      selectedSubstrate &&
      nutrientData[selectedCrop][selectedSubstrate][composition]
    ) {
      setCompositionDetails(
        nutrientData[selectedCrop][selectedSubstrate][composition]
      );
    }
  };

  // 원수 조성 선택 eventhandler
  const handleWaterSourceChange = (event) => {
    const waterSource = event.target.value;
    setSelectedWaterSource(waterSource);

    // 데이터 컨텍스트에서 원수 조성을 찾음
    if (data) {
      const details = data.find((entry) => entry.analysis === waterSource);
      setWaterSourceDetails(details);
    }
  };

  // 배액 조성 선택 eventhandler
  const handleDrainSourceChange = (event) => {
    const drainSource = event.target.value;
    setSelectedDrainSource(drainSource);

    // 데이터 컨텍스트에서 배액 조성을 찾음
    if (data) {
      const details = data.find((entry) => entry.analysis === drainSource);
      setDrainSourceDetails(details);
    }
  };

  // 순환식/비순환식 모드 변경 핸들러
  const handleRecirculationModeChange = (event, newMode) => {
    if (newMode) {
      setRecirculationMode(newMode);

      // 비순환식을 선택하면 배액 조성 초기화
      if (newMode === "비순환식") {
        setSelectedDrainSource("");
        setDrainSourceDetails(null);
      }
    }
  };

  return (
    <Grid2 container spacing={2} sx={{ padding: "20px" }}>
      <Grid2 size={12}>
        <Typography variant="h5" sx={{ fontWeight: "bold", color: "grey" }}>
          양액 조성 선택
        </Typography>
      </Grid2>

      {/* 순환식/비순환식 선택 버튼 */}
      <Grid2 size={12}>
        <ToggleButtonGroup
          value={recirculationMode}
          exclusive
          onChange={handleRecirculationModeChange}
          aria-label="recirculation mode"
        >
          <ToggleButton value="비순환식" aria-label="openloop">
            비순환식
          </ToggleButton>
          <ToggleButton value="순환식" aria-label="recirculation">
            순환식
          </ToggleButton>
        </ToggleButtonGroup>

        {/* 정보 아이콘 */}
        <CustomTooltip
          title={
            <>
              <strong>비순환식:</strong> 배액을 배출하는 경우(배액 조성 선택
              비활성화).
              {"\n"}
              <strong>순환식:</strong> 배액을 재활용하는 경우(배액 조성 선택).
            </>
          }
          arrow
          placement="right"
        >
          <IconButton sx={{ ml: 2 }}>
            <InfoOutlinedIcon color="primary" />
          </IconButton>
        </CustomTooltip>
      </Grid2>

      {/* 작물 선택 */}
      <Grid2 size={4}>
        <FormControl fullWidth>
          {/* InputLabel과 Select의 연계 */}
          <InputLabel id="crop-label">작물 선택</InputLabel>
          <Select
            labelId="crop-label" // InputLabel과 연계
            id="crop"
            value={selectedCrop}
            onChange={handleCropChange}
            label="작물 선택" // 추가: Select와 InputLabel 연결
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
      </Grid2>

      {/* 배지 선택 */}
      <Grid2 size={4}>
        <FormControl fullWidth>
          <InputLabel id="substrate-label">배지 선택</InputLabel>
          <Select
            labelId="substrate-label"
            id="substrate"
            value={selectedSubstrate}
            onChange={handleSubstrateChange}
            disabled={!selectedCrop}
            label="배지 선택"
          >
            <MenuItem value="">
              <em>배지를 선택하세요</em>
            </MenuItem>
            {nutrientData &&
              selectedCrop &&
              Object.keys(nutrientData[selectedCrop]).map((substrate) => (
                <MenuItem key={substrate} value={substrate}>
                  {substrate}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      </Grid2>

      {/* 조성 선택 */}
      <Grid2 size={4}>
        <FormControl fullWidth>
          <InputLabel id="composition-label">표준 양액 조성</InputLabel>
          <Select
            labelId="composition-label"
            id="composition"
            value={selectedComposition}
            onChange={handleCompositionChange}
            disabled={!selectedSubstrate}
            label="표준 양액 조성"
          >
            <MenuItem value="">
              <em>조성을 선택하세요</em>
            </MenuItem>
            {nutrientData &&
              selectedCrop &&
              selectedSubstrate &&
              Object.keys(nutrientData[selectedCrop][selectedSubstrate]).map(
                (composition) => (
                  <MenuItem key={composition} value={composition}>
                    {composition}
                  </MenuItem>
                )
              )}
          </Select>
        </FormControl>
      </Grid2>

      {/* 원수 조성 선택 */}
      {compositionDetails && (
        <Grid2 size={4}>
          <FormControl fullWidth>
            <InputLabel id="water-source-label">원수 조성 선택</InputLabel>
            <Select
              labelId="water-source-label"
              id="water-source"
              value={selectedWaterSource}
              onChange={handleWaterSourceChange}
              label="원수 조성 선택"
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
        </Grid2>
      )}

      {/* 배액 조성 선택 */}
      {compositionDetails && (
        <Grid2 size={4}>
          <FormControl fullWidth>
            <InputLabel id="drain-source-label">배액 조성 선택</InputLabel>
            <Select
              labelId="drain-source-label"
              id="drain-source"
              value={selectedDrainSource}
              onChange={handleDrainSourceChange}
              disabled={recirculationMode === "비순환식"} // 비순환식이면 비활성화
              label="배액 조성 선택"
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
        </Grid2>
      )}

      {/* 선택된 조성 데이터 출력 */}
      {compositionDetails && (
        <Grid2 size={12}>
          <Typography variant="h6">선택된 표준 양액 조성</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  {/* 첫 번째 Column: 레이블 */}
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    선택된 조성
                  </TableCell>
                  {/* 나머지 Column: 조성의 키 */}
                  {Object.keys(compositionDetails).map((key) => (
                    <TableCell key={key} align="center">
                      {key}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {/* 첫 번째 Row: 표준 양액 조성 */}
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    표준 양액 조성
                  </TableCell>
                  {Object.values(compositionDetails).map((value, index) => (
                    <TableCell key={index} align="center">
                      {value}
                    </TableCell>
                  ))}
                </TableRow>

                {/* 두 번째 Row: 원수 조성 (초기값은 비어있음) */}
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    원수 조성
                  </TableCell>
                  {Object.keys(compositionDetails).map((key, index) => (
                    <TableCell key={index} align="center">
                      {waterSourceDetails
                        ? waterSourceDetails[key] || "-"
                        : "-"}
                    </TableCell>
                  ))}
                </TableRow>

                {/* 세 번째 Row: 배액 조성 (초기값은 비어있음) */}
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    배액 조성
                  </TableCell>
                  {Object.keys(compositionDetails).map((key, index) => (
                    <TableCell key={index} align="center">
                      {drainSourceDetails
                        ? drainSourceDetails[key] || "-"
                        : "-"}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Grid2>
      )}
    </Grid2>
  );
}
