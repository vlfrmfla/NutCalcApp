# nut-app — 수경재배 양액 조성 계산기

작물별 표준 양액 조성과 원수(또는 배액 혼합수) 분석값으로 A/B 탱크 비료 투입량을 계산하는 Next.js 앱입니다.
로그인(Supabase, 구글/카카오)하면 원수·배액 분석 데이터와 재배 구역별 급배액 기록을 저장할 수 있습니다.

## 실행

```bash
npm install
cp .env.example .env.local   # 값 채우기
npm run dev                  # http://localhost:3000
npm test                     # 계산 라이브러리 테스트 (node --test)
npm run validate:data        # 표준 조성·목표 배액 데이터 검증
```

## 구조

```
app/
  select/        양액 조성 선택 (작물·조성·원수·배액, 순환식 설정)
  calculate/     비료 투입량 계산 (A/B 탱크)
  datamanagement/ 원수·배액 분석 데이터 입력 (수동, Excel 업로드)
  dashboard/     재배 구역(컴파트먼트)별 급배액 기록
  display/       급배액 차트(급액·배액 EC/pH, 급배액량)와 기록 추가
  context/DataContext.js   선택값·설정·샘플 데이터 전역 상태 (localStorage 복원)
  hooks/useSupplyPlan.js   선택값과 설정으로 급액 계획 계산
  components/nutrient/     조성 표, 탱크 표, 경고 목록
  api/samples    원수·배액 샘플 CRUD (Supabase service role, JWT 검증)
  api/weather, api/geocoding  기상청·카카오 API 프록시 (키는 서버 전용)
lib/nutrient/    계산 라이브러리 (순수 함수, UI 의존 없음)
public/nutrient_solution.json  작물·배지·생육 단계별 표준 조성 (21작물: 2020 자료 전 작물 + 1999 PBG 표준 + 기존 국내·일본 조성)
public/target_drain.json       작물별 배액(근권) 분석 보정표 (1999 Bemestings Adviesbasis, 토마토·파프리카)
tests/           node:test 기반 테스트
scripts/         데이터 검증 스크립트
```

## 계산 흐름 (`lib/nutrient`)

1. **기준수**: 비순환식은 원수. 순환식은 `mixWater()`로 배액 × 혼합비 + 원수 × (1 − 혼합비).
2. **배액(근권) 분석 보정** (선택, 두 방식 모두): `adviseDrainCorrection()`이 1999 Bemestings Adviesbasis의 A.V.W. 방식을 따른다.
   배액 EC에서 Na/Cl 몫을 뺀 EC(v)를 작물 기준 EC(c)로 환산(K, Ca, Mg, NO₃, SO₄, P만)하고, 환산값의 등급(1~5)에 따라 표준 조성을 보정한다.
   미량원소는 환산 없이 판정해 표준 대비 ±25/50%, NH₄는 배액 pH·NH₄·HCO₃ 조합표로 추가량과 pH 조치를 정한다.
   K, Ca가 모두 정상 등급이면 K/Ca 비율을 검사하고, 마지막에 K:Ca:Mg와 NO₃:SO₄ 비율을 유지한 채 이온합을 표준 조성과 같게 되돌린다.
   비순환식은 자유배액(vrije drainage) 표, 순환식은 폐쇄계(gesloten teeltsysteem) 표를 쓴다.
3. **추가 필요량**: `computeAdditions()` = 표준 − 기준수. 음수는 0으로 막고 경고. 기준수 HCO₃ − 남길 HCO₃ = 산 중화량.
4. **EC 연동**: `scaleToEC()`가 NH₄를 제외한 추가량을 급액 EC에 맞춰 비례 조정한다.
5. **비료 처방**: `solveRecipe()`가 양이온과 PO₄, SO₄를 정확히 맞추고 NO₃는 균형 이온으로 둔다. 비료량은 음수가 되지 않는다.
   - SO₄ < Mg → 남는 Mg는 질산마그네슘
   - K 부족 → 황산칼륨을 줄이고 SO₄ 부족 경고
   - 10수염은 Ca 5몰당 NH₄ 1몰이 따라오므로 NH₄ 초과 시 경고
   - 인산 중화는 제일인산칼륨을 그만큼 줄이고, 제일인산암모늄은 NH₄ 한도까지만 사용
   - 표준 조성의 Cl은 기본적으로 공급하지 않고 NO₃로 상계하며, 설정에서 염화칼슘 공급을 켤 수 있다
6. **탱크 구성**: 질산칼륨을 A/B 질량이 비슷해지도록 나눈다. 산은 B 탱크.

`computeSupplyPlan()`이 위 단계를 한 번에 실행하며 UI는 이 결과만 표시한다.

## 비료 제품 가정 (`lib/nutrient/fertilizers.js`)

| 제품 | 가정 |
|---|---|
| 질산 | 60% w/w, 밀도 1.37 kg/L |
| 인산 | 85% w/w, 밀도 1.685 kg/L |
| 질산암모늄 | 액상 N 18% (NH₄NO₃ 51.4%), 밀도 1.24 kg/L |
| Fe-DTPA | Fe 6% 액상, 밀도 1.32 kg/L |
| Fe-EDTA | Fe 13% 고형 |
| Fe-EDDHA | Fe 6% 고형 |
| 붕사 | Na₂B₄O₇·10H₂O, B 4몰/몰 |
| 염화칼슘 | CaCl₂ 무수, Cl 공급을 켰을 때만 |

실제 쓰는 제품 규격이 다르면 이 파일의 `purity`, `content`, `density`를 바꾸면 된다.

## 참고 자료

- Van der Lugt, G. et al. (2020). *Nutrient Solutions for Greenhouse Crops*, version 4. Nouryon, Eurofins Agro, SQM, Yara. 표준 조성과 A/B 탱크 처방(1000 L, 100배)의 기준. 테스트가 토마토 불활성 배지 처방을 재현한다.
- Kipp, J.A. (red.) (1999). *Bemestings Adviesbasis Substraten*. PBG Naaldwijk. 배액(근권) 분석 보정표(3장: 토마토, 파프리카, 오이, 가지, 장미, 거베라)와 폐쇄계 계산 예제(부록)의 기준. 테스트가 부록 Tabel 1 예제를 재현한다.

### nutrient_solution.json 구성

`{ 작물: { 배지: { 조성 이름: { EC, pH, 이온…, _source } } } }`. 배지 키는 `암면배지`(2020 자료 Inert substrate), `코이어배지`(Organic material: 과채·베리·절화), `유기배지(피트)`(분화·화단·관엽), `순수수경`(Water/aqua)이다.
2020 자료의 조정(Start, Fruit set, High water, End season, Flowering, Winter, Flower base)은 표준에 보정량을 더한 조성으로 들어 있고 이름에 영문 조정명을 붙였다(정식초기(Start), 착과기(Fruit set) 등). 조정 조성의 EC는 이온합 비율로 표준 EC를 비례 조정한 값이다.
토마토의 1·3·5·10·12화방개화는 1999 자료 3.2.2 A(자유배액)의 생육단계 코드 2/4/5/6/7 보정량(K, Ca, Mg, NO₃)을 2020 표준에 적용한 값이다.
오이·가지·장미·거베라·파프리카의 `네덜란드PBG(비순환식/순환식)`은 1999 자료의 A(자유배액)/B(폐쇄계) 표준양액이다.
`_source`는 출처 문자열이며 계산에는 쓰이지 않는다. `npm run validate:data`가 전하 균형을 검사한다.

### target_drain.json 형식

```
{ "토마토": { "naMax": 8,
    "비순환식": { "source", "ecRef", "targets": {...}, "macro": { "K": { "upper": [5.0, 6.4, 10.0, 13.0], "steps": [3.0, 1.5, 0, -1.5, -3.0] }, ... },
                 "micro": { "Fe": { "upper": [...], "steps": [50, 25, 0, -25, -50] }, ... }, "kCa": { "factor", "deltaK", "deltaCa" }, "nh4Extra": [a, b, c] },
    "순환식": { ... } } }
```

`upper`는 등급 경계이며 첫 값은 "미만", 나머지는 "이하"다. `steps`는 등급별 보정량(다량원소 mmol/L, 미량원소 %)이고 0이 정상 등급이다. P의 `lowPhStep`은 배액 pH가 6.5 미만일 때 "2+" 단계에 쓰는 값이다.

## 단위

저장 단위는 다량원소 mmol/L, 미량원소 µmol/L. 데이터 관리 탭의 질량 단위(mg/L)는 N, P, S 원소 기준(NO₃·NH₄는 N, PO₄는 P, SO₄는 S)으로 환산한다.
EC는 (양이온 meq + 음이온 meq) / 20 으로 추정한다.

## 환경변수

`.env.example` 참고. `SUPABASE_SERVICE_ROLE_KEY`, `KMA_SERVICE_KEY`, `KAKAO_REST_API_KEY`는 서버 라우트에서만 쓰며 브라우저에 노출되지 않는다.

## Supabase 테이블

- `samples`: 원수·배액 분석 샘플 (`userId`, `analysis`, `date`, 이온 컬럼)
- `compartments`: 재배 구역과 `daily_records`(JSONB). `supabase/migrations/` 참고
- `user_profiles`, `nickname_history`: 프로필
