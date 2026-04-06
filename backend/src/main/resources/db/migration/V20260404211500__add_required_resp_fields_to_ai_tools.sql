-- Migration to add required_resp_fields to ai_tools table for contract-based validation
ALTER TABLE ai_tools ADD COLUMN IF NOT EXISTS required_resp_fields TEXT;
