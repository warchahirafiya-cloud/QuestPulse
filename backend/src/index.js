const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=60, stale-while-revalidate=300",
  "x-content-type-options": "nosniff"
};

const ALLOWED_STATUSES = new Set(["verified", "under_review", "unverified", "paused", "expired"]);
const ALLOWED_TYPES = new Set(["airdrop", "telegram", "clicktime", "tasks", "referral", "project", "app", "website"]);

function json(data, status = 200, origin = "*", extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...JSON_HEADERS,
      "access-control-allow-origin": origin,
      "vary": "Origin",
      ...extraHeaders
    }
  });
}

function corsOrigin(request, env) {
  const configured = env.ALLOWED_ORIGIN;
  const requestOrigin = request.headers.get("Origin");
  if (!configured) return "*";
  return requestOrigin === configured ? configured : configured;
}

function withCors(response, origin) {
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", origin);
  headers.set("access-control-allow-methods", "GET, OPTIONS");
  headers.set("access-control-allow-headers", "content-type");
  headers.set("access-control-max-age", "86400");
  headers.set("vary", "Origin");
  return new Response(response.body, { status: response.status, headers });
}

function safeRecord(row) {
  try {
    const record = JSON.parse(row.payload);
    // The API is informational: never return private/editorial fields if they are
    // added to storage in a future version.
    return {
      id: record.id,
      type: record.type,
      status: record.status,
      availability: record.availability,
      officialUrl: record.officialUrl ?? null,
      reviewedAt: record.reviewedAt ?? null,
      verificationSources: Array.isArray(record.verificationSources) ? record.verificationSources : [],
      paymentEvidence: Array.isArray(record.paymentEvidence) ? record.paymentEvidence : [],
      riskLevel: record.riskLevel ?? "unrated",
      notes: record.notes ?? null,
      withdrawalTerms: record.withdrawalTerms ?? null,
      resetInterval: record.resetInterval ?? null,
      paymentEvidenceSummary: record.paymentEvidenceSummary ?? null,
      riskNotes: record.riskNotes ?? null,
      statusHistory: Array.isArray(record.statusHistory) ? record.statusHistory : []
    };
  } catch {
    return null;
  }
}

export async function handleRequest(request, env) {
  const origin = corsOrigin(request, env);
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return withCors(new Response(null, { status: 204 }), origin);
  }

  if (request.method !== "GET") {
    return withCors(json({ error: "method_not_allowed", message: "This API is read-only." }, 405, origin, { allow: "GET, OPTIONS" }), origin);
  }

  if (url.pathname === "/api/health") {
    return withCors(json({ status: "ok", service: "questpulse-api", mode: "read-only" }, 200, origin, { "cache-control": "no-store" }), origin);
  }

  if (!url.pathname.startsWith("/api/opportunities")) {
    return withCors(json({ error: "not_found" }, 404, origin), origin);
  }

  if (!env.DB) {
    return withCors(json({ error: "service_unavailable", message: "The opportunity database is not configured." }, 503, origin), origin);
  }

  try {
    const suffix = url.pathname.slice("/api/opportunities".length);
    if (suffix && suffix !== "/" && !/^\/[a-z0-9-]{1,80}$/i.test(suffix)) {
      return withCors(json({ error: "invalid_id" }, 400, origin), origin);
    }

    if (suffix && suffix !== "/") {
      const id = suffix.slice(1);
      const row = await env.DB.prepare(
        "SELECT payload FROM opportunities WHERE id = ?1 LIMIT 1"
      ).bind(id).first();
      const record = row ? safeRecord(row) : null;
      return withCors(record
        ? json({ data: record }, 200, origin)
        : json({ error: "not_found" }, 404, origin), origin);
    }

    const type = url.searchParams.get("type");
    const status = url.searchParams.get("status");
    if (type && !ALLOWED_TYPES.has(type)) return withCors(json({ error: "invalid_type" }, 400, origin), origin);
    if (status && !ALLOWED_STATUSES.has(status)) return withCors(json({ error: "invalid_status" }, 400, origin), origin);

    const requestedLimit = Number.parseInt(url.searchParams.get("limit") || "50", 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 50;
    const requestedOffset = Number.parseInt(url.searchParams.get("offset") || "0", 10);
    const offset = Number.isFinite(requestedOffset) ? Math.max(0, requestedOffset) : 0;

    let sql = "SELECT payload FROM opportunities WHERE 1 = 1";
    const bindings = [];
    if (type) { sql += " AND type = ?"; bindings.push(type); }
    if (status) { sql += " AND status = ?"; bindings.push(status); }
    sql += " ORDER BY id LIMIT ? OFFSET ?";
    bindings.push(limit, offset);

    const statement = env.DB.prepare(sql).bind(...bindings);
    const result = await statement.all();
    const data = (result.results || []).map(safeRecord).filter(Boolean);
    return withCors(json({
      data,
      pagination: { limit, offset, returned: data.length },
      readOnly: true
    }, 200, origin), origin);
  } catch {
    return withCors(json({ error: "internal_error", message: "The request could not be completed." }, 500, origin, { "cache-control": "no-store" }), origin);
  }
}

export default {
  fetch: handleRequest
};
