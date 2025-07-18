"use client";

import { useState, useEffect, useContext } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  IconButton,
  Box,
  Input,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import "./styles/inputdata.css";
import { fetchWithAuth } from "@/utils/apiClient";
import * as XLSX from 'xlsx';
import { DataContext } from "../context/DataContext";

const INITIAL_ENTRY = {
  id: null,
  analysis: "",
  date: null,
  EC: "",
  pH: "",
  NH4: "",
  NO3: "",
  PO4: "",
  K: "",
  Ca: "",
  Mg: "",
  SO4: "",
  Cl: "",
  Na: "",
  HCO3: "",
  Fe: "",
  Mn: "",
  B: "",
  Zn: "",
  Cu: "",
  Mo: "",
};

function MetaDataForm({ newEntry, handleMetaChange, handleDateChange, todayString }) {
  return (
    <Grid container spacing={2} alignItems="center" style={{ marginBottom: 16 }}>
      <Grid item xs={3}>
        <TextField
          label="샘플명"
          name="analysis"
          value={newEntry.analysis}
          onChange={handleMetaChange}
          placeholder={`예: ${todayString}`}
          fullWidth
        />
      </Grid>
      <Grid item xs={3}>
        <DatePicker
          label="샘플날짜"
          value={newEntry.date}
          onChange={handleDateChange}
          slots={{ textField: TextField }}
          slotProps={{
            textField: {
              fullWidth: true,
              required: true,
            },
          }}
        />
      </Grid>
    </Grid>
  );
}

function CompositionDataForm({ newEntry, handleChange, fields, unitMode, molarMasses, macroElements, microElements, convertUnits }) {
  // 단위 표시 함수
  const getUnit = (fieldName) => {
    if (fieldName === 'EC') return 'dS/m';
    if (fieldName === 'pH') return ''; // pH는 단위 없음
    
    if (unitMode === 'mass') return 'mg/L';
    
    // 몰 단위일 때
    if (macroElements.includes(fieldName)) return 'mmol/L';
    if (microElements.includes(fieldName)) return 'μmol/L';
    return '';
  };

  // 표시할 값 계산 (저장된 molar 값을 현재 단위 모드에 맞게 변환)
  const getDisplayValue = (fieldName, storedValue) => {
    if (!storedValue || fieldName === 'EC' || fieldName === 'pH') {
      return storedValue || '';
    }
    
    if (unitMode === 'mass' && molarMasses[fieldName]) {
      const convertedValue = convertUnits(parseFloat(storedValue), fieldName, 'molar', 'mass');
      return convertedValue.toFixed(2);
    }
    
    return storedValue;
  };

  return (
    <Grid container spacing={1} alignItems="center" style={{ marginBottom: 8 }}>
      {fields.map((field) => (
        <Grid item xs={1} key={field.name} style={{ minWidth: 80, maxWidth: 120, display: 'flex', alignItems: 'center' }}>
          <TextField
            label={getUnit(field.name) ? `${field.label} (${getUnit(field.name)})` : field.label}
            name={field.name}
            value={getDisplayValue(field.name, newEntry[field.name])}
            onChange={handleChange}
            fullWidth
            InputProps={{ style: { textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center' } }}
          />
        </Grid>
      ))}
    </Grid>
  );
}

export default function DataManagement() {
  // DataContext에서 데이터 가져오기
  const { data, setData } = useContext(DataContext);
  
  const [newEntry, setNewEntry] = useState(INITIAL_ENTRY);
  const [editingId, setEditingId] = useState(null);
  const [showRowActions, setShowRowActions] = useState(false);

  // Excel 업로드 관련 상태
  const [uploading, setUploading] = useState(false);
  
  // 단위 변환 관련 상태
  const [unitMode, setUnitMode] = useState('molar'); // 'molar' 또는 'mass'

  // 분자량 정보 (g/mol) - 분석성적서 기준
  const molarMasses = {
    NH4: 14.01,  // NH4-N (질소 기준)
    NO3: 14.01,  // NO3-N (질소 기준)
    K: 39.10,    // K+ (칼륨 기준)
    Ca: 40.08,   // Ca2+ (칼슘 기준)
    Mg: 24.31,   // Mg2+ (마그네슘 기준)
    Na: 22.99,   // Na+ (나트륨 기준)
    Cl: 35.45,   // Cl- (염소 기준)
    SO4: 32.06,  // S (황 기준)
    PO4: 30.97,  // P (인 기준)
    HCO3: 61.02, // HCO3- (이온 전체)
    Fe: 55.85,   // Fe (철 기준)
    Mn: 54.94,   // Mn (망간 기준)
    Zn: 65.38,   // Zn (아연 기준)
    B: 10.81,    // B (붕소 기준)
    Cu: 63.55,   // Cu (구리 기준)
    Mo: 95.96    // Mo (몰리브덴 기준)
  };

  // 다량원소와 미량원소 구분
  const macroElements = ['NH4', 'NO3', 'K', 'Ca', 'Mg', 'Na', 'Cl', 'SO4', 'PO4', 'HCO3'];
  const microElements = ['Fe', 'Mn', 'Zn', 'B', 'Cu', 'Mo'];

  // Excel 파일에서 데이터 추출하는 함수
  const extractDataFromExcel = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // 첫 번째 시트 사용
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // 시트를 JSON으로 변환
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      console.log('Excel 데이터:', jsonData);
      return jsonData;
    } catch (error) {
      console.error('Excel 파일 읽기 실패:', error);
      throw error;
    }
  };

  // 단위 변환 함수
  const convertUnits = (value, element, fromUnit, toUnit) => {
    if (!value || !molarMasses[element]) return value;
    
    const molarMass = molarMasses[element];
    const isMicro = microElements.includes(element);
    
    // mg/L에서 몰 단위로 변환
    if (fromUnit === 'mass' && toUnit === 'molar') {
      if (isMicro) {
        return (value / molarMass) * 1000; // mg/L → μmol/L
      } else {
        return value / molarMass; // mg/L → mmol/L
      }
    }
    
    // 몰 단위에서 mg/L로 변환 (표시용)
    if (fromUnit === 'molar' && toUnit === 'mass') {
      if (isMicro) {
        return (value / 1000) * molarMass; // μmol/L → mg/L
      } else {
        return value * molarMass; // mmol/L → mg/L
      }
    }
    
    return value;
  };

  // Excel 데이터에서 분석 데이터 파싱하는 함수
  const parseExcelData = (excelData) => {
    const data = { ...INITIAL_ENTRY };
    
    try {
      console.log('Excel 원본 데이터:', excelData);

      // 시료명 찾기 - 더 구체적인 패턴 매칭
      let sampleName = '';
      for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];
        for (let j = 0; j < row.length; j++) {
          const cell = String(row[j] || '').trim();
          if (cell.includes('시료명') && row[j + 1]) {
            sampleName = String(row[j + 1]).trim();
            console.log('시료명 발견:', sampleName);
            break;
          }
        }
        if (sampleName) break;
      }
      
      // 시료명이 없으면 기본값 설정
      if (!sampleName) {
        sampleName = '미래덴한_' + new Date().toISOString().split('T')[0];
      }
      data.analysis = sampleName;

      // 날짜 찾기 - 현재 날짜를 기본값으로 설정
      data.date = new Date();
      for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];
        for (let j = 0; j < row.length; j++) {
          const cell = String(row[j] || '').trim();
          if ((cell.includes('접수일자') || cell.includes('분석일자') || cell.includes('접수년월일')) && row[j + 1]) {
            const dateStr = String(row[j + 1]);
            const dateMatch = dateStr.match(/(\d{4})년?\s*(\d{1,2})월?\s*(\d{1,2})일?/);
            if (dateMatch) {
              const [, year, month, day] = dateMatch;
              data.date = new Date(year, month - 1, day);
              console.log('날짜 발견:', data.date);
              break;
            }
          }
        }
      }

      // 분석 항목별 값 찾기 - 부등호 처리 포함
      const findValueByName = (names) => {
        for (const name of names) {
          for (let i = 0; i < excelData.length; i++) {
            const row = excelData[i];
            for (let j = 0; j < row.length; j++) {
              const cell = String(row[j] || '').trim();
              if (cell.includes(name)) {
                // 같은 행에서 숫자 값 찾기 (첫 번째 숫자 값)
                for (let k = j + 1; k < row.length; k++) {
                  let cellValue = String(row[k] || '').trim();
                  
                  // 부등호 및 기타 기호 제거 (<, >, ≤, ≥, ~, ±, 등)
                  cellValue = cellValue.replace(/[<>≤≥~±]/g, '');
                  
                  // 추가 텍스트 정리 (괄호, 문자 등 제거)
                  cellValue = cellValue.replace(/[()]/g, '');
                  cellValue = cellValue.replace(/[a-zA-Z가-힣]/g, '');
                  
                  const value = parseFloat(cellValue);
                  if (!isNaN(value) && value >= 0) {
                    console.log(`${name} 값 발견:`, cellValue, '→', value);
                    return value;
                  }
                }
              }
            }
          }
        }
        return "";
      };

      // 각 성분별 값 추출 - 정확한 한글명 매칭
      data.pH = findValueByName(['pH']);
      data.EC = findValueByName(['전기전도도(EC)', '전기전도도', 'EC']);
      
      // 이온별 추출 (괄호 포함 정확한 매칭)
      data.NO3 = findValueByName(['질산이온(NO3)', '질산이온', 'NO3']);
      data.Cl = findValueByName(['염소이온(Cl)', '염소이온', 'Cl']);
      data.SO4 = findValueByName(['황(S)', '황', 'S']);
      data.HCO3 = findValueByName(['중탄산이온(HCO3)', '중탄산이온', 'HCO3']);
      data.PO4 = findValueByName(['인(P)', '인', 'P']);
      data.NH4 = findValueByName(['암모늄이온(NH4)', '암모늄이온', 'NH4']);
      data.K = findValueByName(['칼륨(K)', '칼륨', 'K']);
      data.Na = findValueByName(['나트륨(Na)', '나트륨', 'Na']);
      data.Ca = findValueByName(['칼슘(Ca)', '칼슘', 'Ca']);
      data.Mg = findValueByName(['마그네슘(Mg)', '마그네슘', 'Mg']);
      
      // 미량원소 추출
      data.Fe = findValueByName(['철(Fe)', '철', 'Fe']);
      data.Mn = findValueByName(['망간(Mn)', '망간', 'Mn']);
      data.Zn = findValueByName(['아연(Zn)', '아연', 'Zn']);
      data.B = findValueByName(['붕소(B)', '붕소', 'B']);
      data.Cu = findValueByName(['구리(Cu)', '구리', 'Cu']);
      data.Mo = findValueByName(['몰리브덴(Mo)', '몰리브덴', 'Mo']);

      console.log('파싱된 데이터:', data);
      return data;
      
    } catch (error) {
      console.error('Excel 데이터 파싱 실패:', error);
      throw error;
    }
  };

  // Excel 파일 업로드 핸들러
  const handleExcelUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      alert('Excel 파일만 업로드 가능합니다. (.xls, .xlsx)');
      return;
    }

    setUploading(true);
    try {
      console.log('Excel 처리 시작:', file.name);
      const excelData = await extractDataFromExcel(file);
      const parsedData = parseExcelData(excelData);
      
      // 파싱된 데이터를 폼에 자동 입력
      setNewEntry(parsedData);
      
      // 성공적으로 추출된 데이터 개수 확인
      const extractedFields = Object.entries(parsedData)
        .filter(([key, value]) => key !== 'id' && value !== "" && value !== null)
        .length;
      
      alert(`Excel 데이터가 성공적으로 추출되었습니다!\n추출된 필드: ${extractedFields}개\n확인 후 저장해주세요.`);
      
    } catch (error) {
      console.error('Excel 처리 실패:', error);
      alert(`Excel 처리 중 오류가 발생했습니다.\n오류: ${error.message}\n수동으로 입력해주세요.`);
    } finally {
      setUploading(false);
      // 파일 입력 초기화
      event.target.value = '';
    }
  };

  // 오늘 날짜를 YYYY-MM-DD 형식으로 반환하는 함수
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // DataContext에서 데이터를 관리하므로 별도 fetch 불필요

  const handleMetaChange = (e) => {
    setNewEntry({ ...newEntry, [e.target.name]: e.target.value });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    // 단위 변환 처리 (mass 단위로 입력된 경우 molar 단위로 변환하여 저장)
    if (unitMode === 'mass' && value !== '' && !isNaN(value) && name !== 'EC' && name !== 'pH') {
      if (molarMasses[name]) {
        processedValue = convertUnits(parseFloat(value), name, 'mass', 'molar');
        console.log(`${name}: ${value} mg/L → ${processedValue} ${microElements.includes(name) ? 'μmol/L' : 'mmol/L'}`);
      }
    }
    
    setNewEntry({ ...newEntry, [name]: processedValue });
  };

  const handleDateChange = (date) => {
    setNewEntry({ ...newEntry, date });
  };

  const sanitizeEntry = (entry) => {
    const sanitized = {};
    for (const [key, value] of Object.entries(entry)) {
      if (key === "date" && value) {
        sanitized[key] = new Date(value).toISOString();
      } else if (key !== "id" && key !== "analysis" && key !== "date") {
        sanitized[key] = value === "" ? 0 : Number(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 샘플명이 비어있을 때 기본값 설정 로직
      let defaultSampleName = "";
      if (newEntry.analysis.trim() === "") {
        if (newEntry.date) {
          // 사용자가 선택한 샘플 날짜가 있으면 그 날짜 사용
          const selectedDate = new Date(newEntry.date);
          defaultSampleName = selectedDate.toISOString().split('T')[0];
        } else {
          // 샘플 날짜도 없으면 오늘 날짜 사용
          defaultSampleName = getTodayString();
        }
      }
      
      const entryWithDefaultName = {
        ...newEntry,
        analysis: newEntry.analysis.trim() === "" ? defaultSampleName : newEntry.analysis
      };
      
      const cleanedEntry = sanitizeEntry(entryWithDefaultName);
      
      if (editingId) {
        // 편집 모드: PUT 요청
        await fetchWithAuth("/api/samples", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanedEntry),
        });
      } else {
        // 새로 추가: POST 요청
        const { id, userId, ...entryWithoutIdAndUser } = cleanedEntry;
        await fetchWithAuth("/api/samples", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entryWithoutIdAndUser),
        });
      }
      
      setEditingId(null);
      setNewEntry(INITIAL_ENTRY);
      
      // DataContext 업데이트 - 새로운 데이터 로드
      const rows = await fetchWithAuth("/api/samples");
      setData(rows);
    } catch (err) {
      console.error("저장 실패:", err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetchWithAuth("/api/samples", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      
      // DataContext 업데이트 - 새로운 데이터 로드
      const rows = await fetchWithAuth("/api/samples");
      setData(rows);
    } catch (err) {
      console.error("삭제 실패:", err.message);
    }
  };

  const handleEdit = (item) => {
    setNewEntry(item);
    setEditingId(item.id);
  };

  // CSV 다운로드 함수
  const downloadCSV = () => {
    if (data.length === 0) {
      alert("다운로드할 데이터가 없습니다.");
      return;
    }

    // CSV 헤더 (한글 필드명)
    const headers = [
      "샘플명",
      "샘플날짜", 
      "EC",
      "pH",
      "NH4",
      "NO3", 
      "PO4",
      "K",
      "Ca",
      "Mg",
      "SO4",
      "Cl",
      "Na",
      "HCO3",
      "Fe",
      "Mn",
      "B",
      "Zn",
      "Cu",
      "Mo"
    ];

    // 데이터 필드 순서 (데이터베이스 필드명)
    const fields = [
      "analysis",
      "date",
      "EC",
      "pH", 
      "NH4",
      "NO3",
      "PO4",
      "K",
      "Ca",
      "Mg",
      "SO4",
      "Cl",
      "Na",
      "HCO3",
      "Fe",
      "Mn",
      "B",
      "Zn",
      "Cu",
      "Mo"
    ];

    // CSV 데이터 생성
    const csvContent = [
      headers.join(","), // 헤더 행
      ...data.map(row => 
        fields.map(field => {
          if (field === "date" && row[field]) {
            // 날짜 포맷팅
            return new Date(row[field]).toLocaleDateString("ko-KR");
          }
          return row[field] || ""; // null/undefined 값 처리
        }).join(",")
      )
    ].join("\n");

    // BOM 추가로 한글 깨짐 방지
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    
    // 파일 다운로드
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    
    // 파일명에 현재 날짜 추가
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `양액조성데이터_${today}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const macroFields = [
    { label: "EC", name: "EC" },
    { label: "pH", name: "pH" },
    { label: "NH₄", name: "NH4" },
    { label: "NO₃", name: "NO3" },
    { label: "PO₄", name: "PO4" },
    { label: "K", name: "K" },
    { label: "Ca", name: "Ca" },
    { label: "Mg", name: "Mg" },
    { label: "SO₄", name: "SO4" },
    { label: "Cl", name: "Cl" },
    { label: "Na", name: "Na" },
    { label: "HCO₃", name: "HCO3" },
  ];

  const microFields = [
    { label: "Fe", name: "Fe" },
    { label: "Mn", name: "Mn" },
    { label: "B", name: "B" },
    { label: "Zn", name: "Zn" },
    { label: "Cu", name: "Cu" },
    { label: "Mo", name: "Mo" },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div style={{ padding: "24px" }}>
        <h2 style={{ color: "grey", margin: "0 0 8px 0" }}>양액 조성 입력 및 데이터 관리</h2>
        <Typography
          variant="caption"
          sx={{
            color: "#b0b0b0",
            display: "block",
            marginTop: "0.8rem",
            marginBottom: "0.8rem",
            fontSize: "0.75rem",
            lineHeight: 1.2,
          }}
        >
          Disclaimer : 데이터관리 탭에서는 원수나 배액 조성을 입력할 수 있습니다. 입력된 데이터는 양액조성선택 탭에서 원수나 배액 조성으로 선택할 수 있게 됩니다. 따라서 해당 데이터를 입력해놓으면 양액조성선택 탭에서 불러와서 사용할 수 있습니다. 단위는 기본적으로 몰 단위를 사용합니다.
          만약 mg/L 단위로 입력하고 싶다면 입력 후 mol 단위로 변환(몰 단위 버튼 클릭)하여 데이터 추가버튼을 눌러주시면 됩니다.
        </Typography>
        
        {/* Excel 업로드 버튼 */}
        <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <input
            accept=".xls,.xlsx"
            style={{ display: 'none' }}
            id="excel-upload-button"
            type="file"
            onChange={handleExcelUpload}
          />
          <label htmlFor="excel-upload-button">
            <Button
              variant="outlined"
              component="span"
              startIcon={<CloudUploadIcon />}
              disabled={uploading}
              sx={{ 
                borderColor: '#4caf50',
                color: '#4caf50',
                '&:hover': {
                  borderColor: '#388e3c',
                  backgroundColor: 'rgba(76, 175, 80, 0.04)'
                }
              }}
            >
              {uploading ? 'Excel 처리 중...' : 'Excel 분석성적서 업로드'}
            </Button>
          </label>
          <Typography variant="caption" color="textSecondary">
            Excel 형태의 양액 분석성적서를 업로드하면 자동으로 데이터가 입력됩니다.
          </Typography>
        </Box>

        {/* 단위 선택 버튼 */}
        <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            입력 단위:
          </Typography>
          <Button
            variant={unitMode === 'molar' ? 'contained' : 'outlined'}
            onClick={() => setUnitMode('molar')}
            size="small"
            sx={{ minWidth: 120 }}
          >
            몰 단위 
          </Button>
          <Button
            variant={unitMode === 'mass' ? 'contained' : 'outlined'}
            onClick={() => setUnitMode('mass')}
            size="small"
            sx={{ minWidth: 120 }}
          >
            질량 단위 
          </Button>
          <Typography variant="caption" color="textSecondary">
            기본: 다량원소 mmol/L, 미량원소 μmol/L
          </Typography>
        </Box>
        <MetaDataForm
          newEntry={newEntry}
          handleMetaChange={handleMetaChange}
          handleDateChange={handleDateChange}
          todayString={getTodayString()}
        />
        {/* 다량원소 한 줄 */}
        <CompositionDataForm
          newEntry={newEntry}
          handleChange={handleChange}
          fields={macroFields}
          unitMode={unitMode}
          molarMasses={molarMasses}
          macroElements={macroElements}
          microElements={microElements}
          convertUnits={convertUnits}
        />
        {/* 미량원소 한 줄 */}
        <CompositionDataForm
          newEntry={newEntry}
          handleChange={handleChange}
          fields={microFields}
          unitMode={unitMode}
          molarMasses={molarMasses}
          macroElements={macroElements}
          microElements={microElements}
          convertUnits={convertUnits}
        />
        <Grid item xs={12} style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
          <Button variant="contained" type="submit" color="primary" onClick={handleSubmit}>
            {editingId ? "수정 완료" : "데이터 추가"}
          </Button>
        </Grid>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", margin: "10px 0" }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={downloadCSV}
            disabled={data.length === 0}
          >
            CSV 파일로 다운로드
          </Button>
          <Button
            variant={showRowActions ? "outlined" : "contained"}
            color="secondary"
            onClick={() => setShowRowActions((prev) => !prev)}
          >
            {showRowActions ? "수정/삭제 모드 해제" : "수정/삭제 모드"}
          </Button>
        </div>
        <TableContainer component={Paper} style={{ marginTop: "20px" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>샘플명</TableCell>
                <TableCell>샘플날짜</TableCell>
                {macroFields.concat(microFields).map((field) => (
                                  <TableCell key={field.name} align="right">
                  {field.label}
                  {field.name === 'EC' && ' (dS/m)'}
                  {field.name !== 'EC' && field.name !== 'pH' && (
                    microElements.includes(field.name) ? ' (μmol/L)' : ' (mmol/L)'
                  )}
                </TableCell>
                ))}
                {showRowActions && <TableCell align="center">수정</TableCell>}
                {showRowActions && <TableCell align="center">삭제</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.analysis}</TableCell>
                  <TableCell>{entry.date ? new Date(entry.date).toLocaleDateString("ko-KR") : ""}</TableCell>
                  {macroFields.concat(microFields).map((field) => {
                    let displayValue = entry[field.name];
                    
                    // 저장된 값을 그대로 표시 (항상 molar 단위로 저장됨)
                    if (displayValue && !isNaN(displayValue)) {
                      displayValue = parseFloat(displayValue).toFixed(3);
                    }
                    
                    return (
                      <TableCell key={field.name} align="right">{displayValue}</TableCell>
                    );
                  })}
                  {showRowActions && (
                    <TableCell align="center">
                      <IconButton color="primary" onClick={() => handleEdit(entry)}>
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  )}
                  {showRowActions && (
                    <TableCell align="center">
                      <IconButton color="secondary" onClick={() => handleDelete(entry.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </LocalizationProvider>
  );
}
