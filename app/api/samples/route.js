import db from '@/utils/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

const DEFAULT_SAMPLES = [
  {
    analysis: "원수(예시)",
    date: new Date().toISOString(),
    EC: 0.21,
    pH: 7.76,
    NH4: 0,
    NO3: 0.57,
    PO4: 0,
    K: 0.12,
    Ca: 0.29,
    Mg: 0.40,
    SO4: 0.35,
    Cl: 0.46,
    Na: 0,
    HCO3: 0,
    Fe: 0,
    Mn: 0,
    B: 0,
    Zn: 0,
    Cu: 0,
    Mo: 0
  }
];

export async function GET(req) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || session?.user?.email;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  let rows = db.prepare('SELECT * FROM samples WHERE userId = ?').all(userId);
  if (rows.length === 0) {
    // 기본 예시 데이터 자동 추가 (하나만)
    const stmt = db.prepare(`INSERT INTO samples (
      userId, analysis, date, EC, pH, NH4, NO3, PO4, K, Ca, Mg, SO4, Cl, Na, HCO3, Fe, Mn, B, Zn, Cu, Mo
    ) VALUES (
      @userId, @analysis, @date, @EC, @pH, @NH4, @NO3, @PO4, @K, @Ca, @Mg, @SO4, @Cl, @Na, @HCO3, @Fe, @Mn, @B, @Zn, @Cu, @Mo
    )`);
    for (const sample of DEFAULT_SAMPLES) {
      stmt.run({ userId, ...sample });
    }
    rows = db.prepare('SELECT * FROM samples WHERE userId = ?').all(userId);
  }
  return new Response(JSON.stringify(rows), { status: 200 });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || session?.user?.email;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const body = await req.json();
  const stmt = db.prepare(`INSERT INTO samples (
    userId, analysis, date, EC, pH, NH4, NO3, PO4, K, Ca, Mg, SO4, Cl, Na, HCO3, Fe, Mn, B, Zn, Cu, Mo
  ) VALUES (
    @userId, @analysis, @date, @EC, @pH, @NH4, @NO3, @PO4, @K, @Ca, @Mg, @SO4, @Cl, @Na, @HCO3, @Fe, @Mn, @B, @Zn, @Cu, @Mo
  )`);
  const info = stmt.run({ userId, ...body });
  return new Response(JSON.stringify({ id: info.lastInsertRowid }), { status: 201 });
}

export async function PUT(req) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || session?.user?.email;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const body = await req.json();
  if (!body.id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });
  }
  const stmt = db.prepare(`UPDATE samples SET
    analysis=@analysis, date=@date, EC=@EC, pH=@pH, NH4=@NH4, NO3=@NO3, PO4=@PO4, K=@K, Ca=@Ca, Mg=@Mg, SO4=@SO4, Cl=@Cl, Na=@Na, HCO3=@HCO3, Fe=@Fe, Mn=@Mn, B=@B, Zn=@Zn, Cu=@Cu, Mo=@Mo
    WHERE id=@id AND userId=@userId`);
  const info = stmt.run({ userId, ...body });
  return new Response(JSON.stringify({ changes: info.changes }), { status: 200 });
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || session?.user?.email;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const { id } = await req.json();
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });
  }
  const stmt = db.prepare('DELETE FROM samples WHERE id = ? AND userId = ?');
  const info = stmt.run(id, userId);
  return new Response(JSON.stringify({ changes: info.changes }), { status: 200 });
} 