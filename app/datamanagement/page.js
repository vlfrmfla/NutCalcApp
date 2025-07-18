"use client";

import { useState, useEffect } from "react";
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
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import "./styles/inputdata.css";
import { fetchWithAuth } from "@/utils/apiClient";

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

function CompositionDataForm({ newEntry, handleChange, fields }) {
  return (
    <Grid container spacing={1} alignItems="center" style={{ marginBottom: 8 }}>
      {fields.map((field) => (
        <Grid item xs={1} key={field.name} style={{ minWidth: 80, maxWidth: 120, display: 'flex', alignItems: 'center' }}>
          <TextField
            label={field.label}
            name={field.name}
            value={newEntry[field.name]}
            onChange={handleChange}
            fullWidth
            // size="small" // 높이 줄이지 않음
            // inputProps={{ style: { textAlign: 'right', padding: 4 } }} // padding 제거
            InputProps={{ style: { textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center' } }}
          />
        </Grid>
      ))}
    </Grid>
  );
}

export default function InputData() {
  const [data, setData] = useState([]);
  const [newEntry, setNewEntry] = useState(INITIAL_ENTRY);
  const [editMode, setEditMode] = useState(false);
  const [showRowActions, setShowRowActions] = useState(false); // 토글 상태
  
  // 오늘 날짜를 YYYY-MM-DD 형식으로 반환하는 함수
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const fetchData = async () => {
    try {
      const rows = await fetchWithAuth("/api/samples");
      setData(rows);
    } catch (err) {
      console.error("데이터 로드 실패:", err.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMetaChange = (e) => {
    setNewEntry({ ...newEntry, [e.target.name]: e.target.value });
  };

  const handleChange = (e) => {
    setNewEntry({ ...newEntry, [e.target.name]: e.target.value });
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
      const { id, userId, ...entryWithoutIdAndUser } = cleanedEntry;
      await fetchWithAuth("/api/samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entryWithoutIdAndUser),
      });
      setEditMode(false);
      setNewEntry(INITIAL_ENTRY);
      fetchData();
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
      fetchData();
    } catch (err) {
      console.error("삭제 실패:", err.message);
    }
  };

  const handleEdit = (item) => {
    setNewEntry(item);
    setEditMode(true);
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
    { label: <>EC</>, name: "EC" },
    { label: <>pH</>, name: "pH" },
    { label: <>NH<sub>4</sub></>, name: "NH4" },
    { label: <>NO<sub>3</sub></>, name: "NO3" },
    { label: <>PO<sub>4</sub></>, name: "PO4" },
    { label: <>K</>, name: "K" },
    { label: <>Ca</>, name: "Ca" },
    { label: <>Mg</>, name: "Mg" },
    { label: <>SO<sub>4</sub></>, name: "SO4" },
    { label: <>Cl</>, name: "Cl" },
    { label: <>Na</>, name: "Na" },
    { label: <>HCO<sub>3</sub></>, name: "HCO3" },
  ];

  const microFields = [
    { label: <>Fe</>, name: "Fe" },
    { label: <>Mn</>, name: "Mn" },
    { label: <>B</>, name: "B" },
    { label: <>Zn</>, name: "Zn" },
    { label: <>Cu</>, name: "Cu" },
    { label: <>Mo</>, name: "Mo" },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div>
        <h2 style={{ color: "grey" }}>양액 조성 입력 및 데이터 관리</h2>
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
          Disclaimer : 양액조성입력 및 데이터 관리 탭에서는 개별 농가에서 측정한 원수, 배액 등의 분석일자와 샘플명을 입력하고, 양액선택 탭에서 사용할 수 있도록 되어있습니다. 그리고 이 데이터를 기반으로, 배지 조성 변화 탭에서 근권부 EC, pH 변화를 확인할 수 있습니다.
          샘플명을 입력하지 않아도 오늘 날짜로 자동으로 입력되며, 샘플링 날짜를 입력하면 해당 날짜로 샘플명이 입력됩니다. 편의상 설정한 내용이고, 개별입력하여도 문제없이 사용할 수 있습니다. 데이터는 파일 다운로드 버튼을 통해서 csv파일로 다운로드 할 수 있습니다.
        </Typography>
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
        />
        {/* 미량원소 한 줄 */}
        <CompositionDataForm
          newEntry={newEntry}
          handleChange={handleChange}
          fields={microFields}
        />
        <Grid item xs={12} style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
          <Button variant="contained" type="submit" color="primary" onClick={handleSubmit}>
            {editMode ? "수정 완료" : "데이터 추가"}
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
                  <TableCell key={field.name} align="right">{field.label}</TableCell>
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
                  {macroFields.concat(microFields).map((field) => (
                    <TableCell key={field.name} align="right">{entry[field.name]}</TableCell>
                  ))}
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
