import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { documentId, question } = await req.json();

    console.log("Analyzing document:", documentId, "Question:", question);

    // Fetch document
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      throw new Error("Document not found");
    }

    // Perform semantic search on chunks
    const chunks = document.chunks as Array<{ text: string; index: number }>;
    
    // Simple keyword matching (in production, use proper embeddings)
    const questionLower = question.toLowerCase();
    const relevantChunks = chunks
      .map((chunk) => ({
        ...chunk,
        score: chunk.text.toLowerCase().includes(questionLower) ? 1 : 0,
      }))
      .filter((chunk) => chunk.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const context = relevantChunks.map((c) => c.text).join("\n\n");

    // Call Lovable AI for analysis
    const systemPrompt = `You are a policy analysis assistant. Based on the context provided, answer the user's question.
Provide:
1. A clear and concise answer
2. Supporting evidence (quote relevant document lines)
3. Confidence score (0-100%)
4. Explanation of reasoning

Format your response as JSON with these fields:
{
  "answer": "your answer here",
  "evidence": ["quote 1", "quote 2"],
  "confidence_score": 85,
  "reasoning": "explanation here"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Context from document:\n${context}\n\nQuestion: ${question}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    const aiData = await response.json();
    const aiResponse = aiData.choices[0].message.content;

    let result;
    try {
      result = JSON.parse(aiResponse);
    } catch (e) {
      // If AI doesn't return JSON, create a structured response
      result = {
        answer: aiResponse,
        evidence: relevantChunks.map((c) => c.text.substring(0, 200) + "..."),
        confidence_score: 75,
        reasoning: "Analysis based on document context",
      };
    }

    // Store query in database
    await supabase.from("queries").insert({
      document_id: documentId,
      user_id: user.id,
      question: question,
      answer: result.answer,
      evidence: result.evidence,
      confidence_score: result.confidence_score,
      reasoning: result.reasoning,
    });

    console.log("Analysis complete");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error analyzing document:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
