import { NextRequest } from "next/server";
import { getServerSideConfig } from "../config/server";
import { OPENROUTER_URL, ModelProvider } from "../constant";
import { auth } from "./auth";

async function handle(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  console.log("[OpenRouter Route] params ", params);

  if (req.method === "OPTIONS") {
    return new Response("", { status: 200 });
  }

  const controller = new AbortController();

  const authResult = auth(req, ModelProvider.OpenRouter);
  if (authResult.error) {
    return new Response(JSON.stringify(authResult), { status: 401 });
  }

  try {
    const config = getServerSideConfig();
    const apiKey = config.openRouterApiKey;

    const url = `${OPENROUTER_URL}/chat/completions`;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://github.com/homecenter2376/trademaster6",
      "X-Title": "TradeMaster6",
    };

    const response = await fetch(url, {
      headers,
      method: req.method,
      body: req.body,
      signal: controller.signal,
    });

    return response;
  } catch (e) {
    console.error("[OpenRouter] ", e);
    return new Response("[OpenRouter] " + e, {
      status: 500,
    });
  }
}

export const GET = handle;
export const POST = handle;
