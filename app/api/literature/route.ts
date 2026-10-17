import { ensureDatabase, jsonResponse, runtimeEnv } from '@/lib/database';

type Row = { id: string; token: string; student_id: string; student_name: string; data_json: string; step: number; status: string; revision: number; updated_at: number; last_seen_at: number; submitted_at: number | null };
async function database() {
  const db = await ensureDatabase();
  return db;
}
function teacher(request: Request) {
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const expected = runtimeEnv().TEACHER_KEY || '';
  if (!expected || provided.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < provided.length; i++) mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0;
}
function visible(row: Row) {
  const { token: _token, data_json, ...rest } = row;
  return { ...rest, data: JSON.parse(data_json), online: Date.now() - row.last_seen_at < 45000 };
}
function valid(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const strings = (o: Record<string, unknown>, keys: string[]) => keys.every(k => typeof o[k] === 'string' && (o[k] as string).length <= 12000);
  return strings(d, ['title','authors','year','purpose','design','population','setting','sample','inclusion','exclusion']) && Array.isArray(d.variables) && d.variables.length <= 100 && d.variables.every(x => x && typeof x === 'object' && strings(x,['name','tool','reliability','validity'])) && Array.isArray(d.results) && d.results.length <= 100 && d.results.every(x => x && typeof x === 'object' && strings(x,['type','variables','method','findings']) && ['單變項','雙變項','其他'].includes(x.type));
}
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const db = await database();
  if (id) {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const row = await db.prepare('SELECT * FROM literature_reviews WHERE id = ? AND token = ?').bind(id, token).first<Row>();
    if (!row) return jsonResponse({ error: '整理紀錄驗證失敗，請使用原瀏覽器。' }, { status: 401 });
    return jsonResponse({ review: visible(row) });
  }
  if (!teacher(request)) return jsonResponse({ error: '教師密碼錯誤。' }, { status: 401 });
  const rows = await db.prepare('SELECT * FROM literature_reviews ORDER BY updated_at DESC LIMIT 1000').all<Row>();
  return jsonResponse({ reviews: rows.results.map(visible), updatedAt: Date.now(), limit: 1000 });
}
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 500000) return jsonResponse({ error: '內容過長。' }, { status: 413 });
  let b: Record<string, unknown>;
  try { b = JSON.parse(raw); if (!b || typeof b !== 'object') throw Error(); } catch { return jsonResponse({ error: '資料格式錯誤。' }, { status: 400 }); }
  const db = await database();
  const now = Date.now();
  if (b.action === 'start') {
    const studentId = typeof b.studentId === 'string' ? b.studentId.trim() : '';
    const studentName = typeof b.studentName === 'string' ? b.studentName.trim() : '';
    if (!studentId || studentId.length > 40 || !studentName || studentName.length > 60 || !valid(b.data)) return jsonResponse({ error: '請填寫學號與姓名，並確認表單格式。' }, { status: 400 });
    const id = crypto.randomUUID(), token = crypto.randomUUID() + crypto.randomUUID();
    await db.prepare('INSERT INTO literature_reviews (id, token, student_id, student_name, data_json, updated_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, token, studentId, studentName, JSON.stringify(b.data), now, now).run();
    return jsonResponse({ id, token, studentId, studentName, revision: 0 });
  }
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (typeof b.id !== 'string') return jsonResponse({ error: '紀錄編號錯誤。' }, { status: 400 });
  const row = await db.prepare('SELECT * FROM literature_reviews WHERE id = ? AND token = ?').bind(b.id, token).first<Row>();
  if (!row) return jsonResponse({ error: '整理紀錄驗證失敗。' }, { status: 401 });
  if (b.action === 'heartbeat') {
    await db.prepare('UPDATE literature_reviews SET last_seen_at = ? WHERE id = ?').bind(now, row.id).run();
    return jsonResponse({ ok: true });
  }
  if (!['save','submit'].includes(String(b.action)) || !valid(b.data) || !Number.isInteger(b.revision) || Number(b.revision) < 0 || !Number.isInteger(b.step) || Number(b.step) < 0 || Number(b.step) > 7) return jsonResponse({ error: '表單資料格式錯誤。' }, { status: 400 });
  if (row.status === 'submitted') return jsonResponse({ error: '此紀錄已繳交，不能修改。' }, { status: 409 });
  if (b.action === 'submit') {
    const d = b.data as Record<string, unknown>;
    if (!String(d.title).trim() || !String(d.authors).trim() || !String(d.year).trim() || !String(d.purpose).trim() || !String(d.design).trim() || !(d.variables as {name:string}[]).some(v => v.name.trim()) || !(d.results as {findings:string}[]).some(v => v.findings.trim())) return jsonResponse({ error: '繳交前請完成題名、作者、年代、目的、設計，以及至少一個變項和研究結果。' }, { status: 400 });
  }
  const updated = await db.prepare('UPDATE literature_reviews SET data_json = ?, step = ?, status = ?, revision = revision + 1, updated_at = ?, last_seen_at = ?, submitted_at = ? WHERE id = ? AND revision = ? AND status = ?').bind(JSON.stringify(b.data), b.step, b.action === 'submit' ? 'submitted' : 'draft', now, now, b.action === 'submit' ? now : null, row.id, b.revision, 'draft').run();
  if (!updated.meta.changes) return jsonResponse({ error: '另一分頁已更新此紀錄。請重新整理以載入最新內容；本機草稿仍可匯出。' }, { status: 409 });
  return jsonResponse({ revision: row.revision + 1, status: b.action === 'submit' ? 'submitted' : 'draft', updatedAt: now });
}
