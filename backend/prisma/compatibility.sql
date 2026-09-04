/*
===========================================================
SHRAMSAATHI BACKEND COMPATIBILITY MIGRATION
===========================================================

This migration is ADDITIVE.

It does not delete existing tables/data.

It adds:
- skill slugs
- structured customer address
- structured worker address
- worker working days
- worker working hours
- identity proof document type
- address proof document type
===========================================================
*/


/*
-----------------------------------------------------------
1. SKILL SLUG
-----------------------------------------------------------
*/

ALTER TABLE public.skills
ADD COLUMN IF NOT EXISTS slug TEXT;


/*
Generate slugs for existing skills.
*/
UPDATE public.skills
SET slug =
  trim(
    both '-'
    FROM regexp_replace(
      lower(
        regexp_replace(
          name,
          '&',
          'and',
          'g'
        )
      ),
      '[^a-z0-9]+',
      '-',
      'g'
    )
  )
WHERE slug IS NULL
   OR slug = '';


/*
Make sure slug is unique.

If you already have duplicate generated slugs,
this query will show them.
*/
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO duplicate_count
  FROM (
    SELECT slug
    FROM public.skills
    GROUP BY slug
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION
      'Duplicate skill slugs found. Fix duplicate skill names/slugs before continuing.';
  END IF;
END $$;


CREATE UNIQUE INDEX IF NOT EXISTS
skills_slug_unique_idx
ON public.skills(slug);


/*
-----------------------------------------------------------
2. CUSTOMER STRUCTURED ADDRESS
-----------------------------------------------------------
*/

ALTER TABLE public.customer_profiles
ADD COLUMN IF NOT EXISTS address_details JSONB
DEFAULT '{}'::jsonb;


/*
-----------------------------------------------------------
3. WORKER STRUCTURED SERVICE ADDRESS
-----------------------------------------------------------
*/

ALTER TABLE public.worker_profiles
ADD COLUMN IF NOT EXISTS service_address JSONB
DEFAULT '{}'::jsonb;


/*
-----------------------------------------------------------
4. WORKER WORKING DAYS
-----------------------------------------------------------
*/

ALTER TABLE public.worker_profiles
ADD COLUMN IF NOT EXISTS working_days TEXT[]
DEFAULT ARRAY[]::text[];


/*
-----------------------------------------------------------
5. WORKER WORKING HOURS
-----------------------------------------------------------
*/

ALTER TABLE public.worker_profiles
ADD COLUMN IF NOT EXISTS working_hours TEXT[]
DEFAULT ARRAY[]::text[];


/*
-----------------------------------------------------------
6. DOCUMENT TYPES
-----------------------------------------------------------
*/

ALTER TYPE public.storage_file_type
ADD VALUE IF NOT EXISTS 'identity_proof';

ALTER TYPE public.storage_file_type
ADD VALUE IF NOT EXISTS 'address_proof';


/*
-----------------------------------------------------------
7. Helpful indexes
-----------------------------------------------------------
*/

CREATE INDEX IF NOT EXISTS
idx_worker_skills_skill_id
ON public.worker_skills(skill_id);

CREATE INDEX IF NOT EXISTS
idx_bookings_skill_status
ON public.bookings(skill_id, status);


/*
-----------------------------------------------------------
DONE
-----------------------------------------------------------
*/