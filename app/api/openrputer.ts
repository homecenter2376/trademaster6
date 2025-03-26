import { getServerSideConfig } from "@/app/config/server";
import { ModelProvider, OpenaiPath } from "@/app/constant";
import { prettyObject } from "@/app/utils/format";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";

const ALLOWED_PATH = new Set(Object.values(OpenaiPath));
const OPENROUTER_URL = "https://openrouter.ai/api";

export async function handle(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  console.log("[OpenRouter Route] params ", params);

  if (req.method === "OPTIONS") {
    return NextResponse.json({ body: "OK" }, { status: 200 });
  }

  const subpath = params.path.join("/");

  if (!ALLOWED_PATH.has(subpath)) {
    console.log("[OpenRouter Route] forbidden path ", subpath);
    return NextResponse.json(
      {
        error: true,
        msg: "You are not allowed to request " + subpath,
      },
      {
        status: 403,
      },
    );
  }

  const authResult = auth(req, ModelProvider.OpenRouter);
  if (authResult.error) {
    return NextResponse.json(authResult, {
      status: 401,
    });
  }

  try {
    const config = getServerSideConfig();
    const apiKey = config.openrouterApiKey;

    const url = `${OPENROUTER_URL}/${subpath}`;

    const fetchResponse = await fetch(url, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://yourapp.com", // change this to your domain
        "X-Title": "TradeMaster",
      },
      body: req.body,
    });

    return fetchResponse;
  } catch (e) {
    console.error("[OpenRouter] ", e);
    return NextResponse.json(prettyObject(e));
  }
}
