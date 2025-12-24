import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString();

    console.log(`Cleaning up opportunities with deadline before: ${cutoffDate}`);

    // Delete opportunities where deadline is more than 7 days old
    const { data: deletedOpportunities, error } = await supabase
      .from("opportunities")
      .delete()
      .lt("deadline", cutoffDate)
      .select("id, title, deadline");

    if (error) {
      console.error("Error deleting expired opportunities:", error);
      throw error;
    }

    const deletedCount = deletedOpportunities?.length || 0;
    console.log(`Successfully deleted ${deletedCount} expired opportunities`);

    if (deletedOpportunities && deletedOpportunities.length > 0) {
      console.log("Deleted opportunities:", deletedOpportunities.map(o => ({ id: o.id, title: o.title })));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deleted ${deletedCount} expired opportunities`,
        deletedCount,
        deletedOpportunities: deletedOpportunities?.map(o => ({ id: o.id, title: o.title })) || [],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Cleanup function error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
