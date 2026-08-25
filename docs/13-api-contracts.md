# 13 · API Contracts (web ⇄ agents service)
## Mastery Engine

Base: `POST /sessions/{sessionId}/run` for graph runs · `WS /ws/{sessionId}` for streaming events.

## REST Endpoints

### Start a run
```
POST /sessions/{id}/run
{ "action": "upload_material"|"next_question"|"chat_question"|"review_due",
  "payload": { ...per-action } }
→ 202 { "runId": "..." }
```

### Submit an attempt
```
POST /attempts
{ "sessionId","quizItemId","responseText" }
→ 200 { "grade": {...}, "remediation?": { "step": 1, "strategy": "analogy", "messageMd": "..."} }
```

### Chat (streaming via WS or SSE fallback)
```
POST /chat { "sessionId","materialScope","question" }
→ text/event-stream markdown chunks + final { "sources": [...] }
```

## WebSocket Event Schema (`/ws/{sessionId}`)
```jsonc
{ "event": "node_start|node_end|token|asset_ready|error",
  "node": "ingestion_agent",          // on node_*
  "latencyMs": 4230,                  // on node_end
  "data": { ... },                    // asset payloads / tokens
  "seq": 12 }
```
UI `AgentPipelineIndicator` consumes `node_start/node_end`; chat streams consume `token`.

## Error Envelope
```json
{ "error": { "code": "AGENT_TIMEOUT|SCHEMA_INVALID|UPSTREAM_DOWN",
             "message": "human-readable", "retryable": true } }
```

## Conventions
- All request bodies JSON; all responses JSON except chat streams
- Auth: Supabase JWT in `Authorization: Bearer` — agents service validates and enforces user scoping before any DB/tool call
- Idempotency: `runId` + client `requestId` header for safe retries
