"use client";

import { useState, useEffect, useContext } from "react";
import { DataContext } from "../context/DataContext";
import {
  Grid,
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
import { Solution, Adjustment } from "@/utils/calculation";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const nutrientDataPath = "/nutrient_solution.json";

const CustomTooltip = styled(({ className, ...props }) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .MuiTooltip-tooltip`]: {
    fontSize: "0.8rem",
    lineHeight: "1.5",
    whiteSpace: "pre-wrap",
    padding: theme.spacing(1),
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    boxShadow: theme.shadows[3],
  },
}));

export default function SelectPage() {
  const {
    data,
    selectedCrop, setSelectedCrop,
    selectedSubstrate, setSelectedSubstrate,
    selectedComposition, setSelectedComposition,
    selectedWaterSource, setSelectedWaterSource,
    selectedDrainSource, setSelectedDrainSource,
  } = useContext(DataContext);

  const [nutrientData, setNutrientData] = useState(null);
  const [compositionDetails, setCompositionDetails] = useState(null);
  const [waterSourceDetails, setWaterSourceDetails] = useState(null);
  const [drainSourceDetails, setDrainSourceDetails] = useState(null);
  const [targetIons, setTargetIons] = useState(null);
  const [recirculationMode, setRecirculationMode] = useState("비순환식");

  useEffect(() => {
    fetch(nutrientDataPath)
      .then((res) => res.json())
      .then((data) => setNutrientData(data))
      .catch((err) => console.error("데이터 로드 실패:", err));
  }, []);

  // ✅ out-of-range 방지
  useEffect(() => {
    if (nutrientData) {
      if (!nutrientData[selectedCrop]) {
        setSelectedCrop("");
        setSelectedSubstrate("");
        setSelectedComposition("");
      } else if (!nutrientData[selectedCrop]?.[selectedSubstrate]) {
        setSelectedSubstrate("");
        setSelectedComposition("");
      } else if (!nutrientData[selectedCrop]?.[selectedSubstrate]?.[selectedComposition]) {
        setSelectedComposition("");
      }
    }
  }, [nutrientData, selectedCrop, selectedSubstrate, selectedComposition]);

  useEffect(() => {
    if (nutrientData && selectedCrop && selectedSubstrate && selectedComposition) {
      const comp = nutrientData[selectedCrop]?.[selectedSubstrate]?.[selectedComposition];
      setCompositionDetails(comp || null);
    }
  }, [nutrientData, selectedCrop, selectedSubstrate, selectedComposition]);

  useEffect(() => {
    if (data) {
      const water = data.find((d) => d.analysis === selectedWaterSource);
      const drain = data.find((d) => d.analysis === selectedDrainSource);
      setWaterSourceDetails(water || null);
      setDrainSourceDetails(drain || null);
    }
  }, [data, selectedWaterSource, selectedDrainSource]);

  useEffect(() => {
    if (compositionDetails && waterSourceDetails) {
      const target = Adjustment.calculateOpenLoop(
        new Solution(compositionDetails),
        new Solution(waterSourceDetails)
      );
      setTargetIons(target);
    }
  }, [compositionDetails, waterSourceDetails]);

  const handleRecirculationModeChange = (_, mode) => {
    if (mode) {
      setRecirculationMode(mode);
      if (mode === "비순환식") {
        setSelectedDrainSource("");
        setDrainSourceDetails(null);
      }
    }
  };

  return (
    <Grid container spacing={2} sx={{ p: 2 }}>
      <Grid item xs={12}>
        <Typography variant="h5" sx={{ fontWeight: "bold", color: "grey" }}>
          양액 조성 선택
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <ToggleButtonGroup
          value={recirculationMode}
          exclusive
          onChange={handleRecirculationModeChange}
        >
          <ToggleButton value="비순환식">비순환식</ToggleButton>
          <ToggleButton value="순환식">순환식</ToggleButton>
        </ToggleButtonGroup>
        <CustomTooltip
          title={
            <>
              <strong>비순환식:</strong> 배액을 배출하는 방식입니다.{"\n"}
              <strong>순환식:</strong> 배액을 재활용하는 방식입니다.
            </>
          }
          arrow
        >
          <IconButton sx={{ ml: 2 }}>
            <InfoOutlinedIcon color="primary" />
          </IconButton>
        </CustomTooltip>
      </Grid>

      {/* 작물 선택 */}
      <Grid item xs={4}>
        <FormControl fullWidth>
          <InputLabel id="crop-label">작물 선택</InputLabel>
          <Select
            labelId="crop-label"
            value={selectedCrop}
            onChange={(e) => {
              setSelectedCrop(e.target.value);
              setSelectedSubstrate("");
              setSelectedComposition("");
              setCompositionDetails(null);
            }}
            label="작물 선택"
          >
            <MenuItem value=""><em>작물을 선택하세요</em></MenuItem>
            {nutrientData &&
              Object.keys(nutrientData).map((crop) => (
                <MenuItem key={crop} value={crop}>{crop}</MenuItem>
              ))}
          </Select>
        </FormControl>
      </Grid>

      {/* 배지 선택 */}
      <Grid item xs={4}>
        <FormControl fullWidth>
          <InputLabel id="substrate-label">배지 선택</InputLabel>
          <Select
            labelId="substrate-label"
            value={selectedSubstrate}
            onChange={(e) => {
              setSelectedSubstrate(e.target.value);
              setSelectedComposition("");
              setCompositionDetails(null);
            }}
            disabled={!selectedCrop}
            label="배지 선택"
          >
            <MenuItem value=""><em>배지를 선택하세요</em></MenuItem>
            {nutrientData && selectedCrop &&
              Object.keys(nutrientData[selectedCrop]).map((substrate) => (
                <MenuItem key={substrate} value={substrate}>{substrate}</MenuItem>
              ))}
          </Select>
        </FormControl>
      </Grid>

      {/* 조성 선택 */}
      <Grid item xs={4}>
        <FormControl fullWidth>
          <InputLabel id="composition-label">표준 양액 조성</InputLabel>
          <Select
            labelId="composition-label"
            value={selectedComposition}
            onChange={(e) => setSelectedComposition(e.target.value)}
            disabled={!selectedSubstrate}
            label="표준 양액 조성"
          >
            <MenuItem value=""><em>조성을 선택하세요</em></MenuItem>
            {nutrientData && selectedCrop && selectedSubstrate &&
              Object.keys(nutrientData[selectedCrop][selectedSubstrate]).map((comp) => (
                <MenuItem key={comp} value={comp}>{comp}</MenuItem>
              ))}
          </Select>
        </FormControl>
      </Grid>

      {/* 원수 / 배액 */}
      {compositionDetails && (
        <>
          <Grid item xs={4}>
            <FormControl fullWidth>
              <InputLabel id="water-label">원수 조성</InputLabel>
              <Select
                labelId="water-label"
                value={selectedWaterSource}
                onChange={(e) => setSelectedWaterSource(e.target.value)}
                label="원수 조성"
              >
                <MenuItem value=""><em>선택</em></MenuItem>
                {data?.map((entry) => (
                  <MenuItem key={entry.id} value={entry.analysis}>{entry.analysis}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={4}>
            <FormControl fullWidth disabled={recirculationMode === "비순환식"}>
              <InputLabel id="drain-label">배액 조성</InputLabel>
              <Select
                labelId="drain-label"
                value={selectedDrainSource}
                onChange={(e) => setSelectedDrainSource(e.target.value)}
                label="배액 조성"
              >
                <MenuItem value=""><em>선택</em></MenuItem>
                {data?.map((entry) => (
                  <MenuItem key={entry.id} value={entry.analysis}>{entry.analysis}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </>
      )}

      {/* 조성 테이블 */}
      {compositionDetails && (
        <Grid item xs={12}>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>구분</TableCell>
                  {Object.keys(compositionDetails).map((key) => (
                    <TableCell key={key} align="center" sx={{ fontWeight: "bold" }}>{key}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell align="center">표준 조성</TableCell>
                  {Object.values(compositionDetails).map((val, i) => (
                    <TableCell key={i} align="center">{val}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell align="center">원수 조성</TableCell>
                  {Object.keys(compositionDetails).map((key, i) => (
                    <TableCell key={i} align="center">
                      {waterSourceDetails?.[key] ?? "-"}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell align="center">배액 조성</TableCell>
                  {Object.keys(compositionDetails).map((key, i) => (
                    <TableCell key={i} align="center">
                      {drainSourceDetails?.[key] ?? "-"}
                    </TableCell>
                  ))}
                </TableRow>
                {targetIons && (
                  <TableRow>
                    <TableCell align="center">목표 조성</TableCell>
                    {Object.keys(compositionDetails).map((key, i) => (
                      <TableCell key={i} align="center">
                        {targetIons[key] !== undefined ? targetIons[key].toFixed(2) : "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      )}
    </Grid>
  );
}
