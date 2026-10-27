"use client";
import { useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DataContext } from "../context/DataContext";
import { useSupplyPlan } from "../hooks/useSupplyPlan";
import { supabase } from "@/utils/supabaseClient";
import WeatherCard from "./WeatherCard";
import styles from "../page.module.css";

const LINKS = [
  { href: "/select", title: "양액 조성 선택", desc: "작물·배지·생육 단계 표준 조성과 원수·배액 분석 선택" },
  { href: "/calculate", title: "양액 조성 계산", desc: "급액 EC에 맞춘 A/B 탱크 비료 투입량" },
  { href: "/datamanagement", title: "데이터 관리", desc: "원수·배액 분석값 입력과 수정" },
  { href: "/dashboard", title: "대시보드", desc: "컴파트먼트별 급배액 일일 기록" },
  { href: "/display", title: "급배액 관리", desc: "배액 EC·pH와 급배액량 추이 차트" },
  { href: "/info", title: "사용방법", desc: "계산 방식과 참고 자료 안내" },
];

const fmt = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "-");

// 컴파트먼트의 가장 최근 일일 기록
function latestRecord(records) {
  if (!Array.isArray(records) || records.length === 0) return null;
  return [...records].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
}

export default function HomeOverview() {
  const {
    data, nutrientData, selectedCrop, selectedSubstrate, selectedComposition,
    compositionDetails, waterSource, drainSource, settings,
  } = useContext(DataContext);
  const plan = useSupplyPlan();
  const [session, setSession] = useState(null);
  const [compartments, setCompartments] = useState([]);

  // 로그인 상태와 컴파트먼트 요약 (대시보드와 같은 테이블)
  useEffect(() => {
    let active = true;
    const load = async (s) => {
      if (!s) {
        if (active) { setSession(null); setCompartments([]); }
        return;
      }
      if (active) setSession(s);
      const { data: rows, error } = await supabase
        .from("compartments")
        .select("id, name, crop, daily_records")
        .eq("user_id", s.user.id)
        .order("created_at", { ascending: true });
      if (!active) return;
      if (error) {
        console.error("컴파트먼트 요약 로드 실패:", error.message);
        setCompartments([]);
        return;
      }
      setCompartments(rows || []);
    };
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "SIGNED_OUT") load(s);
    });
    return () => {
      active = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  const crops = useMemo(() => {
    if (!nutrientData) return [];
    return Object.entries(nutrientData).map(([crop, substrates]) => ({
      crop,
      substrates: Object.keys(substrates).length,
      compositions: Object.values(substrates).reduce((n, comps) => n + Object.keys(comps).length, 0),
    }));
  }, [nutrientData]);

  const hasSelection = Boolean(compositionDetails);
  const recentSamples = Array.isArray(data) ? data.slice(-3).reverse() : [];
  const warningCount = plan ? plan.warnings.filter((w) => w.level !== "info").length : 0;

  return (
    <>
      <section className={styles.welcomeSection}>
        <h2 className={styles.title}>양액 조성 계산기</h2>
        <p className={styles.subtitle}>작물별 표준 양액 조성과 원수 분석으로 비료 투입량을 계산합니다</p>
        <p className={styles.description}>
          표준 조성은 Nutrient Solutions for Greenhouse Crops(2020)와 Bemestings Adviesbasis Substraten(1999)을 따르고,
          배액(근권) 분석값으로 조성을 단계 보정할 수 있습니다.
        </p>
      </section>

      <div className={styles.contentGrid}>
        <WeatherCard />

        <div className={styles.quickAccessCard}>
          <h3>현재 계산 상태</h3>
          {hasSelection ? (
            <div className={styles.statList}>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>표준 조성</span>
                <span className={styles.statValue}>{selectedCrop} / {selectedSubstrate} / {selectedComposition}</span>
              </div>
              {compositionDetails._source && (
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>출처</span>
                  <span className={`${styles.statValue} ${styles.muted}`}>{compositionDetails._source}</span>
                </div>
              )}
              <div className={styles.statRow}>
                <span className={styles.statLabel}>원수</span>
                <span className={styles.statValue}>{waterSource ? waterSource.analysis : "선택 안 됨"}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>배액 분석</span>
                <span className={styles.statValue}>
                  {drainSource ? drainSource.analysis : "선택 안 함"}
                  {drainSource && settings.applyDrainCorrection ? " (보정 적용)" : ""}
                </span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>급액 방식</span>
                <span className={styles.statValue}>
                  {settings.recirculationMode}
                  {settings.recirculationMode === "순환식" ? ` (배액 ${Math.round(settings.drainMixRatio)}%)` : ""}
                </span>
              </div>
              {plan && (
                <>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>급액 EC</span>
                    <span className={styles.statValue}>{fmt(plan.supplyEC)} dS/m (기준수 {fmt(plan.baseEC)})</span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>최종 급액</span>
                    <span className={styles.statValue}>
                      NO₃ {fmt(plan.final.NO3, 1)} · K {fmt(plan.final.K, 1)} · Ca {fmt(plan.final.Ca, 1)} · Mg {fmt(plan.final.Mg, 1)} mmol/L
                    </span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>원액 탱크</span>
                    <span className={styles.statValue}>
                      A {fmt(plan.recipe.tanks.massA, 1)} kg · B {fmt(plan.recipe.tanks.massB, 1)} kg ({settings.concentration}배, {settings.tankVolume} L)
                    </span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>경고</span>
                    <span className={styles.statValue}>{warningCount > 0 ? `${warningCount}건 (계산 탭에서 확인)` : "없음"}</span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className={styles.muted}>아직 표준 조성을 선택하지 않았습니다. 작물과 배지, 생육 단계를 고르고 원수 분석을 선택하면 여기에 요약이 표시됩니다.</p>
          )}
          <div className={styles.quickAccessButtons} style={{ marginTop: 16 }}>
            <Link href="/select" className={styles.quickButton}>조성 선택으로 이동</Link>
            {plan && <Link href="/calculate" className={styles.quickButton}>계산 결과 보기</Link>}
          </div>
        </div>

        <div className={styles.quickAccessCard}>
          <h3>바로가기</h3>
          <div className={styles.quickAccessButtons}>
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={styles.quickButton}>
                <span>
                  <strong>{l.title}</strong>
                  <span className={styles.linkDesc}>{l.desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className={styles.quickAccessCard}>
          <h3>내 데이터</h3>
          {session ? (
            <div className={styles.statList}>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>분석 데이터</span>
                <span className={styles.statValue}>{Array.isArray(data) ? `${data.length}건` : "-"}</span>
              </div>
              {recentSamples.map((s) => (
                <div key={s.id} className={styles.statRow}>
                  <span className={`${styles.statLabel} ${styles.muted}`}>최근</span>
                  <span className={styles.statValue}>
                    {s.analysis}
                    {Number(s.EC) > 0 ? ` · EC ${fmt(Number(s.EC))}` : ""}
                    {Number(s.pH) > 0 ? ` · pH ${fmt(Number(s.pH), 1)}` : ""}
                  </span>
                </div>
              ))}
              <div className={styles.statRow}>
                <span className={styles.statLabel}>컴파트먼트</span>
                <span className={styles.statValue}>{compartments.length}개</span>
              </div>
              {compartments.map((c) => {
                const r = latestRecord(c.daily_records);
                return (
                  <div key={c.id} className={styles.statRow}>
                    <span className={`${styles.statLabel} ${styles.muted}`}>{c.name}{c.crop ? ` (${c.crop})` : ""}</span>
                    <span className={styles.statValue}>
                      {r ? `${r.date} · 배액 EC ${fmt(Number(r.drain_ec), 1)} · pH ${fmt(Number(r.drain_ph), 1)}` : "기록 없음"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={styles.muted}>로그인하면 저장된 원수·배액 분석과 컴파트먼트 기록 요약이 표시됩니다. 로그인 전에는 예시 데이터로 계산할 수 있습니다.</p>
          )}
        </div>

        <div className={styles.quickAccessCard}>
          <h3>수록 작물</h3>
          {crops.length === 0 ? (
            <p className={styles.muted}>표준 조성을 불러오는 중입니다.</p>
          ) : (
            <div className={styles.cropList}>
              {crops.map((c) => (
                <Link key={c.crop} href="/select" className={styles.cropChip} title={`${c.substrates}개 배지, ${c.compositions}개 조성`}>
                  {c.crop} <span className={styles.muted}>{c.compositions}</span>
                </Link>
              ))}
            </div>
          )}
          <p className={styles.muted} style={{ marginTop: 12, fontSize: "0.85rem" }}>
            숫자는 배지와 생육 단계를 합한 조성 수입니다. 배액 보정표는 토마토, 파프리카, 오이, 가지, 장미, 거베라에 들어 있습니다.
          </p>
        </div>
      </div>
    </>
  );
}
