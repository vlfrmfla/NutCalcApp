"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, TextField, Grid, IconButton } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker'; 
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'; 
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import "./styles/inputdata.css";

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
  const [data, setData] = useState([]);
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

  // 데이터 불러오기
  const fetchData = async () => {
    const res = await fetch("/api/samples");
    if (res.ok) {
      const rows = await res.json();
      if (rows.length === 0) {
        // 예시 데이터가 추가된 직후라면 한 번 더 fetch
        const res2 = await fetch("/api/samples");
        if (res2.ok) {
          const rows2 = await res2.json();
          setData(rows2);
        }
      } else {
        setData(rows);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editMode) {
      // 수정
      await fetch("/api/samples", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEntry),
      });
      setEditMode(false);
    } else {
      // 추가
      await fetch("/api/samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEntry),
      });
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
    fetchData();
  };

  // 데이터 삭제 핸들러
  const handleDelete = async (id) => {
    await fetch("/api/samples", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchData();
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
        <div style={{ marginBottom: '20px' }}>
          <MetaDataForm 
            newEntry={newEntry}
            handleMetaChange={handleMetaChange}
            handleDateChange={handleDateChange}
          />
        </div>
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
        <Grid item xs={12} style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <Button variant="contained" type="submit" color="primary" onClick={handleSubmit}>
            {editMode ? "수정 완료" : "데이터 추가"}
          </Button>
        </Grid>
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
