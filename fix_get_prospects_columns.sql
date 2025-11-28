-- FIX: Use correct column names from prospector table
CREATE OR REPLACE FUNCTION get_prospects_for_user(p_username TEXT)
RETURNS TABLE(
    website TEXT,
    business_name TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    email TEXT,
    contact TEXT,
    phone TEXT,
    google_reviews NUMERIC,
    google_places_id TEXT,
    homepage_screenshot_url TEXT,
    intelligence_status TEXT,
    ai_grade TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.website,
        p.business_name,
        p.city,
        p.state,
        p.zip,
        p.email,
        p.contact,
        p.phone,
        p.google_reviews,  -- PLURAL, not singular!
        p.google_places_id,
        p.homepage_screenshot_url,
        p.intelligence_status,
        p.ai_grade
    FROM state_xref a
    JOIN prospector p ON a.state_code = p.state
    WHERE LOWER(a.assigned_staff) = LOWER(p_username)
      AND p.homepage_screenshot_url IS NOT NULL
      AND p.homepage_screenshot_url != ''
    ORDER BY p.website;
END;
$$;

GRANT EXECUTE ON FUNCTION get_prospects_for_user(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_prospects_for_user(TEXT) TO anon;
