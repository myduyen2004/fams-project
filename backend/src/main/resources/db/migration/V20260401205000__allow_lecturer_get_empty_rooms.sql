UPDATE ai_tools
SET allowed_roles = CASE
    WHEN allowed_roles IS NULL OR allowed_roles = '' THEN 'ACADEMIC_STAFF,LECTURER'
    WHEN POSITION('LECTURER' IN allowed_roles) > 0 THEN allowed_roles
    ELSE allowed_roles || ',LECTURER'
END
WHERE name = 'get_empty_rooms';
