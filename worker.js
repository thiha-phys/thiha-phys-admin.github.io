const allowedMethods = new Set(["GET", "POST"]);

function corsHeaders(origin, allowedOrigin) {
  const allowOrigin = allowedOrigin === "*" || origin === allowedOrigin ? origin || "*" : allowedOrigin;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store"
  };
}

function jsonResponse(body, status, origin, allowedOrigin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin, allowedOrigin),
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "*";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin, allowedOrigin) });
    }
    if (!allowedMethods.has(request.method)) {
      return jsonResponse({ error: "Method not allowed" }, 405, origin, allowedOrigin);
    }
    if (allowedOrigin !== "*" && origin !== allowedOrigin) {
      return jsonResponse({ error: "Origin not allowed" }, 403, origin, allowedOrigin);
    }
    if (!env.FIREBASE_DATABASE_URL) {
      return jsonResponse({ error: "FIREBASE_DATABASE_URL is not configured" }, 500, origin, allowedOrigin);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+|\/+$/g, "");
    if (path !== "bookOrders") {
      return jsonResponse({ error: "Not found" }, 404, origin, allowedOrigin);
    }

    const firebaseUrl = `${env.FIREBASE_DATABASE_URL.replace(/\/+$/, "")}/${path}.json`;
    const firebaseResponse = await fetch(firebaseUrl, {
      method: request.method,
      headers: request.method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: request.method === "POST" ? await request.text() : undefined
    });
    const body = await firebaseResponse.text();

    return new Response(body, {
      status: firebaseResponse.status,
      headers: {
        ...corsHeaders(origin, allowedOrigin),
        "Content-Type": firebaseResponse.headers.get("Content-Type") || "application/json"
      }
    });
  }
};
