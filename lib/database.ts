import {env} from 'cloudflare:workers';
type RuntimeEnv = {DB:D1Database; TEACHER_KEY?: string};
let ready: Promise<D1Database> | null = null;
export function runtimeEnv() { return env as unknown as RuntimeEnv; }
export async function ensureDatabase(): Promise<D1Database> {
 if(!ready)ready=(async()=>{
  const db=runtimeEnv().DB;
  await db.batch([
   db.prepare("CREATE TABLE IF NOT EXISTS literature_reviews (\n id TEXT PRIMARY KEY NOT NULL,\n token TEXT NOT NULL UNIQUE,\n student_id TEXT NOT NULL,\n student_name TEXT NOT NULL,\n data_json TEXT NOT NULL DEFAULT '{}',\n step INTEGER NOT NULL DEFAULT 0,\n status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted')),\n revision INTEGER NOT NULL DEFAULT 0,\n updated_at INTEGER NOT NULL,\n last_seen_at INTEGER NOT NULL,\n submitted_at INTEGER\n)"),
   db.prepare("CREATE INDEX IF NOT EXISTS idx_literature_reviews_updated ON literature_reviews(updated_at)"),
   db.prepare("CREATE TABLE IF NOT EXISTS systematic_reviews (\n id TEXT PRIMARY KEY NOT NULL,\n token TEXT NOT NULL UNIQUE,\n student_id TEXT NOT NULL,\n student_name TEXT NOT NULL,\n data_json TEXT NOT NULL DEFAULT '{}',\n step INTEGER NOT NULL DEFAULT 0,\n status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted')),\n revision INTEGER NOT NULL DEFAULT 0,\n updated_at INTEGER NOT NULL,\n last_seen_at INTEGER NOT NULL,\n submitted_at INTEGER\n)"),
   db.prepare("CREATE INDEX IF NOT EXISTS idx_systematic_reviews_updated ON systematic_reviews(updated_at)")
  ]);
  return db;
 })();
 try { return await ready; } catch(error) {ready=null;throw error;}
}
export function jsonResponse(body:unknown, init:ResponseInit={}) {
 const headers=new Headers(init.headers);headers.set('content-type','application/json; charset=utf-8');headers.set('cache-control','no-store');
 return new Response(JSON.stringify(body),{...init,headers});
}
