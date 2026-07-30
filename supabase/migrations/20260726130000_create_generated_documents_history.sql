-- ============================================================================
--  NAIJALIFT: AI CV & Cover Letter Builder - Generated Documents History Table
--  Stores every document a user generates (cv + cover_letter pairs) so they
--  can re-download / view / re-edit any past version.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Owner
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- What type(s) were generated
    document_type TEXT NOT NULL CHECK (document_type IN ('cv', 'cover_letter', 'both')),

    -- Context the user provided
    target_role TEXT NOT NULL,
    company_name TEXT,
    job_title TEXT,
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,

    -- The actual generated documents (full-text, rendered by AI)
    cv_content TEXT,
    cover_letter_content TEXT,

    -- JSON snapshot of the entire form payload for easy re-runs / audits
    request_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Which LLM provider + model was used (for debugging)
    ai_provider TEXT NOT NULL DEFAULT 'groq',
    ai_model TEXT,
    tokens_used INT,

    -- Bookkeeping
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
--  Indexes (fast per-user history listing)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_generated_documents_user_id
    ON public.generated_documents (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generated_documents_opportunity_id
    ON public.generated_documents (opportunity_id);

-- ----------------------------------------------------------------------------
--  Auto-update updated_at
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_generated_documents_updated_at ON public.generated_documents;
CREATE TRIGGER set_generated_documents_updated_at
    BEFORE UPDATE ON public.generated_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.moddatetime ();

-- ----------------------------------------------------------------------------
--  Row Level Security
-- ----------------------------------------------------------------------------
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

-- Users can only SEE their own generated documents
DROP POLICY IF EXISTS generated_documents_select_own ON public.generated_documents;
CREATE POLICY generated_documents_select_own
    ON public.generated_documents FOR SELECT
    USING (auth.uid() = user_id);

-- Users can only INSERT for themselves
DROP POLICY IF EXISTS generated_documents_insert_own ON public.generated_documents;
CREATE POLICY generated_documents_insert_own
    ON public.generated_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can only UPDATE their own generated documents
DROP POLICY IF EXISTS generated_documents_update_own ON public.generated_documents;
CREATE POLICY generated_documents_update_own
    ON public.generated_documents FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can only DELETE their own generated documents
DROP POLICY IF EXISTS generated_documents_delete_own ON public.generated_documents;
CREATE POLICY generated_documents_delete_own
    ON public.generated_documents FOR DELETE
    USING (auth.uid() = user_id);

COMMIT;
