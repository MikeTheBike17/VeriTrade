import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

function simulateVerification() {
  const matchPercentage = Math.floor(Math.random() * (98 - 60 + 1)) + 60;
  const idSelfieScore = Number(((matchPercentage / 100) * 40).toFixed(1));
  const totalScore = Number(idSelfieScore.toFixed(1));
  const status = matchPercentage >= 75 ? "verified" : "review";

  return {
    match_percentage: matchPercentage,
    id_selfie_score: idSelfieScore,
    total_score: totalScore,
    status
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method not allowed"
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }

  return new Response(JSON.stringify(simulateVerification()), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
});
