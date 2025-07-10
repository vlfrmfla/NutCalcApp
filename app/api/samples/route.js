import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // ✅ 절대 클라이언트에 노출 X
);

const DEFAULT_SAMPLE = {
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
  Mo: 0,
};

async function getUserIdFromRequest(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

export async function GET(req) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let { data: rows, error } = await supabase
    .from('samples')
    .select('*')
    .eq('userId', userId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!rows || rows.length === 0) {
    await supabase.from('samples').insert([{ ...DEFAULT_SAMPLE, userId }]);
    ({ data: rows, error } = await supabase
      .from('samples')
      .select('*')
      .eq('userId', userId));
  }

  return new Response(JSON.stringify(rows), { status: 200 });
}

export async function POST(req) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const body = await req.json();
  const { error } = await supabase
    .from('samples')
    .insert([{ ...body, userId }]);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ message: 'Added successfully' }), { status: 200 });
}

export async function PUT(req) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const body = await req.json();
  const { id, ...updates } = body;

  const { error } = await supabase
    .from('samples')
    .update(updates)
    .eq('id', id)
    .eq('userId', userId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ message: 'Updated successfully' }), { status: 200 });
}

export async function DELETE(req) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const body = await req.json();
  const { id } = body;

  const { error } = await supabase
    .from('samples')
    .delete()
    .eq('id', id)
    .eq('userId', userId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ message: 'Deleted successfully' }), { status: 200 });
}
