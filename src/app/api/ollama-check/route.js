import { authenticateRequest } from "@/libs/auth";
import { findOllamaModels, getOllamaModel, getOllamaOrigin, selectOllamaModel } from "@/libs/ollama";

export async function GET(req) {
  const payload = await authenticateRequest(req);
  if (!payload) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  let url;
  let preferred;
  try {
    url = getOllamaOrigin(req);
    preferred = getOllamaModel(req);
  }
  catch (error) { return Response.json({ ok: false, error: error.message }, { status: 400 }); }
  try {
    const found = selectOllamaModel(await findOllamaModels(url), preferred);
    return Response.json({
      ok: true,
      models: found.models.map(model => model.name),
      modelDetails: found.models,
      recommended: found.recommended,
      selected: found.selected,
      preferredAvailable: found.preferredAvailable,
    });
  } catch (error) {
    return Response.json({ ok: false, error: `${error.message}. Cannot connect to Ollama at ${url}.` }, { status: 503 });
  }
}
