-- ============================================================
-- Migration: 20260524000003_enhance_comments.sql
-- Purpose:   Add parent_id (threading) and comment_type to
--            case_comments. Fully additive — no existing data
--            or logic is affected.
-- Rollback:  ALTER TABLE public.case_comments DROP COLUMN IF EXISTS parent_id;
--            ALTER TABLE public.case_comments DROP COLUMN IF EXISTS comment_type;
--            DROP INDEX IF EXISTS idx_case_comments_parent;
--            DROP INDEX IF EXISTS idx_case_comments_type;
-- ============================================================

-- Add parent_id for threaded replies
ALTER TABLE public.case_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.case_comments(id) ON DELETE CASCADE;

-- Add comment_type for semantic categorization
ALTER TABLE public.case_comments
  ADD COLUMN IF NOT EXISTS comment_type TEXT NOT NULL DEFAULT 'note';

-- Add constraint safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'case_comments' AND constraint_name = 'case_comments_comment_type_check'
  ) THEN
    ALTER TABLE public.case_comments
      ADD CONSTRAINT case_comments_comment_type_check
      CHECK (comment_type IN ('note', 'handoff', 'issue', 'update'));
  END IF;
END;
$$;

-- Indexes for efficient threaded queries
CREATE INDEX IF NOT EXISTS idx_case_comments_parent
  ON public.case_comments (parent_id);

CREATE INDEX IF NOT EXISTS idx_case_comments_type
  ON public.case_comments (comment_type, created_at DESC);
