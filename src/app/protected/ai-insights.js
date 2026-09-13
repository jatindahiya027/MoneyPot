"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { getToken } from "@/libs/clientToken";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AiInsights() {
  const [status, setStatus] = useState("idle");
  const [content, setContent] = useState("");

  const loadInsights = async () => {
    const token = getToken();
    if (!token) return;

    setStatus("loading");
    try {
      const response = await fetch("/api/ai", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch { data = text; }

      if (!response.ok || (typeof data === "object" && data?.error)) {
        throw new Error(data?.error || `Analysis failed (${response.status})`);
      }
      if (typeof data !== "string" || !data.trim()) {
        throw new Error("Ollama returned an empty response.");
      }

      setContent(data);
      setStatus("success");
    } catch (error) {
      setContent(error?.message || "Could not reach your local Ollama service.");
      setStatus("error");
    }
  };

  return (
    <section className="dashboard-ai-section" aria-labelledby="dashboard-ai-title">
      <p className="dash-section-title">Local Intelligence</p>
      <Card className="dashboard-ai">
        <CardHeader className="dashboard-ai-header">
          <div className="dashboard-ai-heading">
            <span className="dashboard-ai-icon"><Sparkles aria-hidden="true" /></span>
            <div>
              <CardTitle id="dashboard-ai-title">AI Insights</CardTitle>
              <CardDescription>Analysis from recent transactions using your configured Ollama model.</CardDescription>
            </div>
          </div>
          <Button size="sm" variant={status === "success" ? "outline" : "default"} onClick={loadInsights} disabled={status === "loading"}>
            {status === "loading" ? <Loader2 className="animate-spin" aria-hidden="true" /> : status === "success" ? <RefreshCw aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
            {status === "loading" ? "Analysing" : status === "success" ? "Refresh" : "Run analysis"}
          </Button>
        </CardHeader>
        <CardContent className="dashboard-ai-body">
          {status === "idle" && (
            <div className="dashboard-ai-empty">
              <strong>Turn transactions into a short financial brief.</strong>
              <span>Data is sent only to the Ollama origin allowed by this installation. Configure it in Settings → AI / Ollama.</span>
            </div>
          )}
          {status === "loading" && (
            <div className="dashboard-ai-loading"><Loader2 className="animate-spin" aria-hidden="true" /><span>Reviewing income, expenses, investments, and patterns…</span></div>
          )}
          {status === "error" && (
            <div className="dashboard-ai-error"><strong>Analysis unavailable</strong><span>{content} Check Settings → AI / Ollama and try again.</span></div>
          )}
          {status === "success" && <div className="dashboard-ai-markdown"><ReactMarkdown>{content}</ReactMarkdown></div>}
        </CardContent>
      </Card>
    </section>
  );
}
