"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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

function MetaDataForm({ newEntry, handleMetaChange, handleDateChange }) {
  return (
    <Grid container spacing={2} alignItems="center" style={{ marginBottom: 16 }}>
      <Grid item xs={3}>
        <TextField
          label="샘플명"
          name="analysis"
          value={newEntry.analysis}
          onChange={handleMetaChange}
          required
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
      const cleanedEntry = sanitizeEntry(newEntry);
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
        <h2>양액 조성 입력 및 데이터 관리</h2>
        <MetaDataForm
          newEntry={newEntry}
          handleMetaChange={handleMetaChange}
          handleDateChange={handleDateChange}
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
        <div style={{ display: "flex", justifyContent: "flex-end", margin: "16px 0" }}>
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
