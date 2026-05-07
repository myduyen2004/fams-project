# Plagiarism Vector Migration - Implementation Checklist

Last updated: 2026-04-13
Owner: Backend + AI Service
Status: In progress

## Tracking Rules
- Check an item only when code is merged and verified in test/dev.
- If partially complete, leave unchecked and add note under "Progress Notes".
- Keep this file updated at the end of each work session.

## Phase 0 - Kickoff and Guardrails
- [x] Create implementation checklist file.
- [ ] Confirm branch strategy and assign owners (Backend / AI-service / DevOps).
- [ ] Freeze old heuristic plagiarism logic scope for replacement (no new logic added there).
- [ ] Define rollback path (feature flag or safe fallback response).

## Phase 1 - Database and Schema (pgvector)
- [ ] Add Flyway migration to enable `vector` extension.
- [ ] Add table `assignment_submission_vector_index` with:
  - [ ] `submission_id`, `course_id`, `status`, `error_message`, `indexed_at`, `attempt_count`, timestamps.
- [ ] Add table `assignment_text_embeddings` with metadata + `vector` column.
- [ ] Add table `assignment_image_embeddings` with metadata + `vector` column.
- [ ] Add B-Tree indexes on `course_id`, `submission_id` for both embedding tables.
- [ ] Add vector indexes (HNSW/IVFFlat based on pgvector support in environment).
- [ ] Add JPA entities + repositories for new tables.
- [ ] Add idempotent cleanup strategy for re-submit (delete or stale-mark existing vectors by `submission_id`).

## Phase 2 - Backend Submit -> Async Index Job
- [ ] Add service for vector indexing orchestration from backend.
- [ ] In `submitAssignment(...)`, set/create index status `PENDING` after save.
- [ ] Trigger async worker to call AI-service `/api/v1/plagiarism/index-submission`.
- [ ] Update index status transitions: `PENDING -> PROCESSING -> INDEXED|FAILED`.
- [ ] Persist errors (`error_message`) and increment `attempt_count`.
- [ ] Ensure submit API is non-blocking even when AI-service fails.
- [ ] Add re-submit behavior: clear old vectors, re-index current submission.

## Phase 3 - AI-service Embedding Pipeline
- [ ] Add endpoint `POST /api/v1/plagiarism/index-submission`.
- [ ] Add endpoint `POST /api/v1/plagiarism/generate-comments`.
- [ ] Implement file download from submission URLs.
- [ ] Implement parse for `.pdf/.docx/.doc` content.
- [ ] Implement image extraction from submitted docs/files.
- [ ] Implement text chunking strategy (fixed v1 window + overlap).
- [ ] Integrate Cohere text embedding with env-configured model.
- [ ] Integrate Jina image embedding with env-configured model.
- [ ] Validate embedding dimensions and fail-fast on mismatch.
- [ ] Return embedding payload (vectors + metadata) for backend upsert.

## Phase 4 - Backend Vector Upsert and Retrieval
- [ ] Upsert text/image embeddings into pgvector tables.
- [ ] Store evidence metadata (`file_name`, `page_or_chunk`, `content_preview`).
- [ ] Implement retrieval by `course_id` excluding target `submission_id`.
- [ ] Implement KNN search for target text vectors vs text index.
- [ ] Implement KNN search for target image vectors vs image index.
- [ ] Aggregate by `compared_submission_id` and compute:
  - [ ] `textScore`
  - [ ] `imageScore`
  - [ ] `finalSimilarity`
  - [ ] `probability`, `plagiarismPercent`, `plagiarized`
- [ ] Keep top 5 matches with evidence snippets.

## Phase 5 - Replace Plagiarism Check Engine
- [ ] Replace old heuristic logic inside `checkSubmissionPlagiarism(...)`.
- [ ] Keep endpoint contract compatible for existing fields.
- [ ] Add new response fields:
  - [ ] `overallComment`
  - [ ] `topMatches[].matchComment`
  - [ ] `indexCoverage`
  - [ ] `pendingIndexedSubmissionCount`
  - [ ] `coverageNote`
- [ ] Call AI-service `generate-comments` for:
  - [ ] Overall conclusion comment
  - [ ] Per-match comment
- [ ] If pending indexes exist, return result with warning (not blocked).

## Phase 6 - Config and Environment
- [ ] Add backend env/config for plagiarism vector module (feature flag, timeouts, thresholds).
- [ ] Add AI-service env/config:
  - [ ] Cohere API key + model
  - [ ] Jina API key + model
  - [ ] Expected dimensions (text/image)
- [ ] Update `docker-compose.yml` and `.env.example` with required variables.
- [ ] Add operational defaults for retry/backoff and request timeout.

## Phase 7 - Testing
- [ ] Unit test: submit creates index job status.
- [ ] Unit test: re-submit replaces stale vectors.
- [ ] Unit test: retrieval stays inside same `courseId`.
- [ ] Unit test: target submission excluded from comparison.
- [ ] Unit test: pending coverage fields populated correctly.
- [ ] Integration test: submit -> async index success -> check plagiarism success.
- [ ] Integration test: AI-service embedding timeout -> submit still success + status `FAILED`.
- [ ] Integration test: comments returned (overall + per match).

## Phase 8 - Acceptance and Release
- [ ] Validate with real sample submissions (doc/docx/pdf, with/without images).
- [ ] Confirm no fallback to old heuristic engine in normal flow.
- [ ] Verify lecturer UI receives old + new fields without breaking.
- [ ] Add runbook for monitoring failed index jobs.
- [ ] Release notes and migration notes prepared.

## Progress Notes
- 2026-04-13: Checklist initialized from approved migration plan.

