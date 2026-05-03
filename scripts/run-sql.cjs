#!/usr/bin/env node
// Supabase Management API SQL 실행 헬퍼 — 트랙 77 후속 U11
//
// 용법:
//   node scripts/run-sql.cjs <SQL 파일 경로>     # 파일 실행
//   node scripts/run-sql.cjs --query "SELECT 1"  # 인라인 쿼리
//
// 인증: .mcp.json의 SUPABASE_ACCESS_TOKEN + project-ref 자동 로드
//   → postgres superuser 권한 (RLS 우회 + DDL 가능)
//
// 향후 마이그레이션 자동화: 본 스크립트로 모든 SQL 직접 실행 가능.
//   사용자가 Supabase 대시보드 손실행 불필요.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MCP_CFG = path.join(ROOT, '.mcp.json');

function loadMcp() {
  const raw = fs.readFileSync(MCP_CFG, 'utf-8');
  const cfg = JSON.parse(raw);
  const sup = cfg.mcpServers?.supabase;
  if (!sup) throw new Error('.mcp.json에 supabase 항목 없음');
  const token = sup.env?.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN 부재');
  const refArg = (sup.args || []).find((a) => a.startsWith('--project-ref='));
  if (!refArg) throw new Error('--project-ref 부재');
  const ref = refArg.split('=')[1];
  return { token, ref };
}

async function runQuery(query) {
  const { token, ref } = loadMcp();
  const url = `https://api.supabase.com/v1/projects/${ref}/database/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/run-sql.cjs <file> | --query "SQL"');
    process.exit(1);
  }

  let query;
  if (args[0] === '--query') {
    query = args.slice(1).join(' ');
  } else {
    query = fs.readFileSync(args[0], 'utf-8');
  }

  try {
    const result = await runQuery(query);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}

main();
