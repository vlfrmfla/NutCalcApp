"use client";

import { useState, useContext } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, TextField, Grid, IconButton } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker'; 
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'; 
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import EditIcon from '@mui/icons-material/Edit'; // 수정 아이콘
import DeleteIcon from '@mui/icons-material/Delete'; // 삭제 아이콘
import { DataContext } from "../context/DataContext";

import "./styles/inputdata.css"; // CSS 파일 임포트

// 메타데이터 폼 컴포넌트
function MetaDataForm({ newEntry, handleMetaChange, handleDateChange }) {
  return (
    <Grid container spacing={0.5} alignItems="center">
      <Grid item xs={2}>
        <TextField
          label="샘플명"
          name="analysis"
          value={newEntry.analysis}
          onChange={handleMetaChange}
          required
          fullWidth
        />
      </Grid>
      <Grid item xs={2}>
        <DatePicker
          label="샘플 날짜"
          value={newEntry.date}
          onChange={handleDateChange}
          slots={{ textField: TextField }} // TextField를 커스터마이징
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

// 양액 조성 데이터 폼 컴포넌트
function MacroCompositionDataForm({ newEntry, handleChange }) {
  const compositionFields = [
    { label: <>EC</>, name: "EC", dataRequired: "required" },
    { label: <>pH</>, name: "pH", dataRequired: "" },
    { label: <>NH<sub>4</sub></>, name: "NH4", dataRequired: "" },
    { label: <>NO<sub>3</sub></>, name: "NO3", dataRequired: "required" },
    { label: <>PO<sub>4</sub></>, name: "PO4", dataRequired: "required" },
    { label: <>K</>, name: "K", dataRequired: "required" },
    { label: <>Ca</>, name: "Ca", dataRequired: "required" },
    { label: <>Mg</>, name: "Mg", dataRequired: "required" },
    { label: <>SO<sub>4</sub></>, name: "SO4", dataRequired: "required" },
    { label: <>Cl</>, name: "Cl", dataRequired: "" },
    { label: <>Na</>, name: "Na", dataRequired: "required" },
    { label: <>HCO<sub>3</sub></>, name: "HCO3", dataRequired: "" },
  ];

  return (
    <Grid container spacing={0.05} alignItems="center">
      {compositionFields.map((field) => (
        <Grid item xs={0.8} key={field.name}>
          <TextField
            label={field.label}
            name={field.name}
            value={newEntry[field.name]}
            onChange={handleChange}
            required={field.dataRequired === "required"}  
            fullWidth
          />
        </Grid>
      ))}
    </Grid>
  );
}

function MicroCompositionDataForm({ newEntry, handleChange }) {
  const compositionFields = [
    { label: <>Fe</>, name: "Fe", dataRequired: "" },
    { label: <>Mn</>, name: "Mn", dataRequired: "" },
    { label: <>B</>, name: "B", dataRequired: "" },
    { label: <>Zn</>, name: "Zn", dataRequired: "" },
    { label: <>Cu</>, name: "Cu", dataRequired: "" },
    { label: <>Mo</>, name: "Mo", dataRequired: "" },
  ];

  return (
    <Grid container spacing={0.05} alignItems="center">
      {compositionFields.map((field) => (
        <Grid item xs={0.8} key={field.name}>
          <TextField
            label={field.label}
            name={field.name}
            value={newEntry[field.name]}
            onChange={handleChange}
            required={field.dataRequired === "required"}  
            fullWidth
          />
        </Grid>
      ))}
    </Grid>
  );
}


export default function InputData() {
  const { data, addData, deleteData } = useContext(DataContext); // 전역 데이터 사용
  const [newEntry, setNewEntry] = useState({
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
  });
  const [editMode, setEditMode] = useState(false);

  const handleMetaChange = (e) => {
    setNewEntry({
      ...newEntry,
      [e.target.name]: e.target.value,
    });
  };

  const handleChange = (e) => {
    setNewEntry({
      ...newEntry,
      [e.target.name]: e.target.value,
    });
  };

  const handleDateChange = (date) => {
    setNewEntry({
      ...newEntry,
      date: date,
    });
  };

  // 데이터 추가 및 수정 핸들러
  const handleSubmit = (e) => {
    e.preventDefault();
    if (editMode) {
      // 수정 모드에서는 deleteData를 호출 후 새로운 데이터를 추가하는 방식으로 처리
      deleteData(newEntry.id);
      addData(newEntry); // 수정된 데이터를 추가
      setEditMode(false);
    } else {
      // 새 데이터를 추가할 때 addData를 사용합니다.
      addData({ ...newEntry, id: Date.now() });
    }
    setNewEntry({
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
    });
  };

  // 데이터 삭제 핸들러
  const handleDelete = (id) => {
    deleteData(id);
  };

  // 데이터 수정 핸들러
  const handleEdit = (item) => {
    setNewEntry(item);
    setEditMode(true);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div>
        <h2>양액 조성 입력 및 데이터 관리</h2>

        {/* 메타데이터 입력 폼 */}
        <div style={{ marginBottom: '20px' }}>
          <MetaDataForm 
            newEntry={newEntry}
            handleMetaChange={handleMetaChange}
            handleDateChange={handleDateChange}
          />
        </div>

        {/* 양액 조성 데이터 입력 폼 */}
        <div style={{ marginBottom: '20px' }}>
          <MacroCompositionDataForm
            newEntry={newEntry}
            handleChange={handleChange}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <MicroCompositionDataForm
            newEntry={newEntry}
            handleChange={handleChange}
          />
        </div>        

        {/* 데이터 추가/수정 버튼 */}
        <Grid item xs={12} style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <Button variant="contained" type="submit" color="primary" onClick={handleSubmit}>
            {editMode ? "수정 완료" : "데이터 추가"}
          </Button>
        </Grid>

        {/* 데이터 테이블 */}
        <TableContainer component={Paper} style={{ marginTop: '20px' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>샘플명</TableCell>
                <TableCell>분석날짜</TableCell>
                <TableCell align="right">EC</TableCell>
                <TableCell align="right">pH</TableCell>
                <TableCell align="right">NH4</TableCell>
                <TableCell align="right">NO3</TableCell>
                <TableCell align="right">PO4</TableCell>
                <TableCell align="right">K</TableCell>
                <TableCell align="right">Ca</TableCell>
                <TableCell align="right">Mg</TableCell>
                <TableCell align="right">SO4</TableCell>
                <TableCell align="right">Cl</TableCell>
                <TableCell align="right">Na</TableCell>
                <TableCell align="right">HCO3</TableCell>
                <TableCell align="right">Fe</TableCell>
                <TableCell align="right">Mn</TableCell>
                <TableCell align="right">B</TableCell>
                <TableCell align="right">Zn</TableCell>
                <TableCell align="right">Cu</TableCell>
                <TableCell align="right">Mo</TableCell>
                <TableCell align="center">수정</TableCell>
                <TableCell align="center">삭제</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.analysis}</TableCell>
                  <TableCell>{entry.date ? new Date(entry.date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : ""}</TableCell>
                  <TableCell align="right">{entry.EC}</TableCell>
                  <TableCell align="right">{entry.pH}</TableCell>
                  <TableCell align="right">{entry.NH4}</TableCell>
                  <TableCell align="right">{entry.NO3}</TableCell>
                  <TableCell align="right">{entry.PO4}</TableCell>
                  <TableCell align="right">{entry.K}</TableCell>
                  <TableCell align="right">{entry.Ca}</TableCell>
                  <TableCell align="right">{entry.Mg}</TableCell>
                  <TableCell align="right">{entry.SO4}</TableCell>
                  <TableCell align="right">{entry.Cl}</TableCell>
                  <TableCell align="right">{entry.Na}</TableCell>
                  <TableCell align="right">{entry.HCO3}</TableCell>
                  <TableCell align="right">{entry.Fe}</TableCell>
                  <TableCell align="right">{entry.Mn}</TableCell>
                  <TableCell align="right">{entry.B}</TableCell>
                  <TableCell align="right">{entry.Zn}</TableCell>
                  <TableCell align="right">{entry.Cu}</TableCell>
                  <TableCell align="right">{entry.Mo}</TableCell>
                  <TableCell align="center">
                    <IconButton color="primary" onClick={() => handleEdit(entry)}>
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton color="secondary" onClick={() => handleDelete(entry.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </LocalizationProvider>
  );
}
