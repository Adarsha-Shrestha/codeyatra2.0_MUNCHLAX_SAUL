# Legal Intelligence System - API Documentation

**Base URL:** `http://localhost:8000/api`

**Version:** 2.0

---

## Table of Contents

1. [Client APIs](#client-apis)
2. [Case APIs](#case-apis)
3. [Case File APIs](#case-file-apis)
4. [Past Case APIs](#past-case-apis)
5. [Law APIs](#law-apis)
6. [Unified File Upload API](#unified-file-upload-api)
7. [RAG Query API](#rag-query-api)
8. [Legacy APIs](#legacy-apis)
9. [Error Responses](#error-responses)

---

## Client APIs

### List All Clients

Returns all clients for frontend dropdown/selection.

| Property | Value |
|----------|-------|
| **Endpoint** | `/clients` |
| **Method** | `GET` |
| **Auth Required** | No |

#### Request Parameters

None

#### Response

```json
[
  {
    "client_id": 1,
    "client_name": "John Doe",
    "phone": "9876543210",
    "address": "123 Main St, Delhi",
    "created_at": "2026-02-23T05:20:00.000000",
    "case_count": 2
  }
]
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `client_id` | integer | Unique client identifier |
| `client_name` | string | Full name of the client |
| `phone` | string | Contact phone number (optional) |
| `address` | string | Client address (optional) |
| `created_at` | datetime | When the client was created |
| `case_count` | integer | Number of cases linked to client |

---

### Create Client

Create a new client record.

| Property | Value |
|----------|-------|
| **Endpoint** | `/clients` |
| **Method** | `POST` |
| **Content-Type** | `application/json` |

#### Request Body

```json
{
  "client_name": "John Doe",
  "phone": "9876543210",
  "address": "123 Main St, Delhi"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `client_name` | string | ✅ Yes | Full name of the client |
| `phone` | string | No | Contact phone number |
| `address` | string | No | Client address |

#### Response

```json
{
  "client_id": 1,
  "client_name": "John Doe",
  "phone": "9876543210",
  "address": "123 Main St, Delhi",
  "created_at": "2026-02-23T05:20:00.000000",
  "case_count": 0
}
```

---

### Get Single Client

Get details of a specific client by ID.

| Property | Value |
|----------|-------|
| **Endpoint** | `/clients/{client_id}` |
| **Method** | `GET` |

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `client_id` | integer | ✅ Yes | The client's unique ID |

#### Response

```json
{
  "client_id": 1,
  "client_name": "John Doe",
  "phone": "9876543210",
  "address": "123 Main St, Delhi",
  "created_at": "2026-02-23T05:20:00.000000",
  "case_count": 2
}
```

#### Error Responses

| Status | Description |
|--------|-------------|
| `404` | Client not found |

---

## Case APIs

### List Cases for Client

Returns all cases for a specific client.

| Property | Value |
|----------|-------|
| **Endpoint** | `/clients/{client_id}/cases` |
| **Method** | `GET` |

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `client_id` | integer | ✅ Yes | The client's unique ID |

#### Response

```json
[
  {
    "case_id": 1,
    "client_id": 1,
    "description": "Property dispute in Delhi NCR",
    "created_at": "2026-02-23T05:28:04.323604",
    "updated_at": "2026-02-23T05:28:04.323604",
    "file_count": 3
  }
]
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `case_id` | integer | Unique case identifier |
| `client_id` | integer | Parent client ID (FK) |
| `description` | string | Case description |
| `created_at` | datetime | When the case was created |
| `updated_at` | datetime | Last update timestamp |
| `file_count` | integer | Number of files in this case |

---

### Create Case for Client

Create a new case for a specific client.

| Property | Value |
|----------|-------|
| **Endpoint** | `/clients/{client_id}/cases` |
| **Method** | `POST` |
| **Content-Type** | `application/json` |

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `client_id` | integer | ✅ Yes | The client's unique ID |

#### Request Body

```json
{
  "client_id": 1,
  "description": "Property dispute in Delhi NCR"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `client_id` | integer | ✅ Yes | Client ID (must match path) |
| `description` | string | No | Case description |

#### Response

```json
{
  "case_id": 1,
  "client_id": 1,
  "description": "Property dispute in Delhi NCR",
  "created_at": "2026-02-23T05:28:04.323604",
  "updated_at": "2026-02-23T05:28:04.323604",
  "file_count": 0
}
```

---

### Get Single Case

Get details of a specific case by ID.

| Property | Value |
|----------|-------|
| **Endpoint** | `/cases-new/{case_id}` |
| **Method** | `GET` |

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `case_id` | integer | ✅ Yes | The case's unique ID |

#### Response

```json
{
  "case_id": 1,
  "client_id": 1,
  "description": "Property dispute in Delhi NCR",
  "created_at": "2026-02-23T05:28:04.323604",
  "updated_at": "2026-02-23T05:28:04.323604",
  "file_count": 3
}
```

#### Error Responses

| Status | Description |
|--------|-------------|
| `404` | Case not found |

---

## Case File APIs

### List Files for Case

Returns all files associated with a specific case.

| Property | Value |
|----------|-------|
| **Endpoint** | `/cases-new/{case_id}/files` |
| **Method** | `GET` |

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `case_id` | integer | ✅ Yes | The case's unique ID |

#### Response

```json
[
  {
    "file_id": 1,
    "case_id": 1,
    "filename": "evidence.pdf",
    "extension": ".pdf",
    "mime_type": "application/pdf",
    "file_size_bytes": 102400,
    "status": "success",
    "chunk_count": 15,
    "error_message": null,
    "uploaded_at": "2026-02-23T05:30:00.000000",
    "ingested_at": "2026-02-23T05:30:05.000000"
  }
]
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `file_id` | integer | Unique file identifier |
| `case_id` | integer | Parent case ID (FK) |
| `filename` | string | Original filename |
| `extension` | string | File extension (e.g., ".pdf") |
| `mime_type` | string | MIME type |
| `file_size_bytes` | integer | File size in bytes |
| `status` | string | `pending`, `processing`, `success`, `failed` |
| `chunk_count` | integer | Number of chunks created (if ingested) |
| `error_message` | string | Error message if ingestion failed |
| `uploaded_at` | datetime | Upload timestamp |
| `ingested_at` | datetime | Ingestion completion timestamp |

---

### Download Case File

Download the original file binary from database.

| Property | Value |
|----------|-------|
| **Endpoint** | `/case-files/{file_id}/download` |
| **Method** | `GET` |

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file_id` | integer | ✅ Yes | The file's unique ID |

#### Response

Binary file with headers:
- `Content-Type`: The file's MIME type
- `Content-Disposition`: `attachment; filename="<original_filename>"`
- `Content-Length`: File size in bytes

#### Error Responses

| Status | Description |
|--------|-------------|
| `404` | File not found or no binary data |

---

## Past Case APIs

### List All Past Cases

Returns all historical/reference case documents.

| Property | Value |
|----------|-------|
| **Endpoint** | `/past-cases` |
| **Method** | `GET` |

#### Request Parameters

None

#### Response

```json
[
  {
    "past_case_id": 1,
    "case_name": "Historical Case ABC vs XYZ 2020",
    "filename": "case_document.pdf",
    "extension": ".pdf",
    "file_size_bytes": 204800,
    "uploaded_at": "2026-02-23T05:35:00.000000"
  }
]
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `past_case_id` | integer | Unique identifier |
| `case_name` | string | Name/title of the past case |
| `filename` | string | Original filename |
| `extension` | string | File extension |
| `file_size_bytes` | integer | File size in bytes |
| `uploaded_at` | datetime | Upload timestamp |

---

### Download Past Case File

Download the original past case file binary.

| Property | Value |
|----------|-------|
| **Endpoint** | `/past-cases/{past_case_id}/download` |
| **Method** | `GET` |

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `past_case_id` | integer | ✅ Yes | The past case's unique ID |

#### Response

Binary file with headers:
- `Content-Type`: The file's MIME type
- `Content-Disposition`: `attachment; filename="<original_filename>"`

#### Error Responses

| Status | Description |
|--------|-------------|
| `404` | Past case not found or no binary data |

---

## Law APIs

### List All Law Documents

Returns all law/constitution reference documents.

| Property | Value |
|----------|-------|
| **Endpoint** | `/laws` |
| **Method** | `GET` |

#### Request Parameters

None

#### Response

```json
[
  {
    "id": 1,
    "law_of_country": "India",
    "filename": "constitution.pdf",
    "extension": ".pdf",
    "file_size_bytes": 512000,
    "uploaded_at": "2026-02-23T05:40:00.000000"
  }
]
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique identifier |
| `law_of_country` | string | Country/jurisdiction name |
| `filename` | string | Original filename |
| `extension` | string | File extension |
| `file_size_bytes` | integer | File size in bytes |
| `uploaded_at` | datetime | Upload timestamp |

---

### Download Law Document

Download the original law/constitution file binary.

| Property | Value |
|----------|-------|
| **Endpoint** | `/laws/{law_id}/download` |
| **Method** | `GET` |

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `law_id` | integer | ✅ Yes | The law document's unique ID |

#### Response

Binary file with headers:
- `Content-Type`: The file's MIME type
- `Content-Disposition`: `attachment; filename="<original_filename>"`

#### Error Responses

| Status | Description |
|--------|-------------|
| `404` | Law document not found or no binary data |

---

## Unified File Upload API

### Upload File with Type-Specific Handling

**This is the main file upload endpoint.** It handles three different file types with different processing pipelines.

| Property | Value |
|----------|-------|
| **Endpoint** | `/upload-file` |
| **Method** | `POST` |
| **Content-Type** | `multipart/form-data` |

#### Form Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | File | ✅ Yes | The file to upload (.pdf, .docx, .doc, .txt) |
| `file_type` | string | ✅ Yes | One of: `case_file`, `past_case`, `law` |
| `case_id` | integer | When `file_type=case_file` | The case ID to attach this file to |
| `case_name` | string | When `file_type=past_case` | Name/title for the past case |
| `law_of_country` | string | When `file_type=law` | Country/jurisdiction name |

#### Processing by file_type

| file_type | Storage Table | Ingestion (ChromaDB) |
|-----------|---------------|----------------------|
| `case_file` | `case_file_table` | ✅ Yes - Full pipeline |
| `past_case` | `past_case_table` | ❌ No - Storage only |
| `law` | `law_table` | ❌ No - Storage only |

#### Response (case_file - Success)

```json
{
  "status": "success",
  "file_type": "case_file",
  "file_id": 1,
  "filename": "evidence.pdf",
  "chunks": 15,
  "message": "File stored and ingested into ChromaDB"
}
```

#### Response (case_file - Partial)

```json
{
  "status": "partial",
  "file_type": "case_file",
  "file_id": 1,
  "filename": "evidence.pdf",
  "message": "File stored but ingestion failed: <error_message>"
}
```

#### Response (past_case - Success)

```json
{
  "status": "success",
  "file_type": "past_case",
  "past_case_id": 1,
  "filename": "historical_case.pdf",
  "message": "Past case file stored (no ingestion performed)"
}
```

#### Response (law - Success)

```json
{
  "status": "success",
  "file_type": "law",
  "law_id": 1,
  "filename": "constitution.pdf",
  "message": "Law document stored (no ingestion performed)"
}
```

#### Error Responses

| Status | Condition | Response |
|--------|-----------|----------|
| `400` | Invalid `file_type` | `{"detail": "file_type must be one of ['case_file', 'past_case', 'law']"}` |
| `400` | Missing `case_id` for case_file | `{"detail": "case_id is required when file_type='case_file'"}` |
| `400` | Missing `case_name` for past_case | `{"detail": "case_name is required when file_type='past_case'"}` |
| `400` | Missing `law_of_country` for law | `{"detail": "law_of_country is required when file_type='law'"}` |
| `404` | Case not found | `{"detail": "Case with case_id=X not found."}` |
| `415` | Unsupported file type | `{"detail": "Unsupported file type '.xyz'. Allowed: {'.pdf', '.docx', '.doc', '.txt'}"}` |

#### cURL Examples

**Upload Case File:**
```bash
curl -X POST http://localhost:8000/api/upload-file \
  -F "file=@evidence.pdf" \
  -F "file_type=case_file" \
  -F "case_id=1"
```

**Upload Past Case:**
```bash
curl -X POST http://localhost:8000/api/upload-file \
  -F "file=@historical_case.pdf" \
  -F "file_type=past_case" \
  -F "case_name=ABC vs XYZ 2020"
```

**Upload Law Document:**
```bash
curl -X POST http://localhost:8000/api/upload-file \
  -F "file=@constitution.pdf" \
  -F "file_type=law" \
  -F "law_of_country=India"
```

---

## RAG Query API

### Query the RAG System

Submit a natural language query to search across legal documents.

| Property | Value |
|----------|-------|
| **Endpoint** | `/query` |
| **Method** | `POST` |
| **Content-Type** | `application/json` |

#### Request Body

```json
{
  "query": "What are the fundamental rights in India?",
  "databases": ["law_reference_db", "case_history_db"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | ✅ Yes | Natural language query |
| `databases` | array | No | List of databases to search (default: law + cases) |

#### Response

```json
{
  "answer": "The fundamental rights in India include...",
  "confidence": "high",
  "sources": [
    {
      "source_file": "constitution.pdf",
      "chunk_text": "Article 14: Right to Equality...",
      "relevance_score": 0.92
    }
  ],
  "evaluation_metrics": {
    "score": 0.85,
    "is_helpful": true
  }
}
```

---

## Legacy APIs

### List Ingested Files

List files from the legacy `ingested_files` table.

| Property | Value |
|----------|-------|
| **Endpoint** | `/files` |
| **Method** | `GET` |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter: `pending`, `processing`, `success`, `failed` |
| `db_target` | string | No | Filter: `law`, `cases`, `client` |
| `case_id` | string | No | Filter by case ID |
| `limit` | integer | No | Max results (default: 50, max: 200) |
| `offset` | integer | No | Pagination offset (default: 0) |

---

### Get Query Logs

Get recent RAG query logs for analytics.

| Property | Value |
|----------|-------|
| **Endpoint** | `/query-logs` |
| **Method** | `GET` |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | integer | No | Max results (default: 20, max: 100) |

#### Response

```json
[
  {
    "id": 1,
    "query": "What is Article 21?",
    "databases": "law_reference_db,case_history_db",
    "confidence": "high",
    "eval_score": 0.92,
    "is_helpful": true,
    "num_sources": 3,
    "queried_at": "2026-02-23T06:00:00.000000"
  }
]
```

---

## Error Responses

All API errors follow this format:

```json
{
  "detail": "Error message describing the issue"
}
```

### Common HTTP Status Codes

| Status | Meaning |
|--------|---------|
| `200` | Success |
| `400` | Bad Request - Invalid input parameters |
| `404` | Not Found - Resource doesn't exist |
| `415` | Unsupported Media Type - Invalid file format |
| `500` | Internal Server Error |

---

## Database Schema Reference

### client_table
| Column | Type | Description |
|--------|------|-------------|
| `client_id` | INTEGER (PK) | Auto-increment |
| `client_name` | VARCHAR(256) | Required |
| `phone` | VARCHAR(32) | Optional |
| `address` | TEXT | Optional |
| `photo` | BYTEA | Optional (binary) |
| `created_at` | DATETIME | Auto-set |
| `updated_at` | DATETIME | Auto-update |

### case_table
| Column | Type | Description |
|--------|------|-------------|
| `case_id` | INTEGER (PK) | Auto-increment |
| `client_id` | INTEGER (FK) | References client_table |
| `description` | TEXT | Optional |
| `created_at` | DATETIME | Auto-set |
| `updated_at` | DATETIME | Auto-update |

### case_file_table
| Column | Type | Description |
|--------|------|-------------|
| `file_id` | INTEGER (PK) | Auto-increment |
| `case_id` | INTEGER (FK) | References case_table |
| `filename` | VARCHAR(512) | Required |
| `extension` | VARCHAR(16) | e.g., ".pdf" |
| `file` | BYTEA | File binary |
| `mime_type` | VARCHAR(128) | MIME type |
| `file_size_bytes` | INTEGER | File size |
| `status` | ENUM | pending/processing/success/failed |
| `chunk_count` | INTEGER | After ingestion |
| `error_message` | TEXT | If failed |
| `uploaded_at` | DATETIME | Auto-set |
| `ingested_at` | DATETIME | On success |

### past_case_table
| Column | Type | Description |
|--------|------|-------------|
| `past_case_id` | INTEGER (PK) | Auto-increment |
| `case_name` | VARCHAR(512) | Required |
| `case_file` | BYTEA | File binary |
| `filename` | VARCHAR(512) | Original name |
| `extension` | VARCHAR(16) | e.g., ".pdf" |
| `mime_type` | VARCHAR(128) | MIME type |
| `file_size_bytes` | INTEGER | File size |
| `uploaded_at` | DATETIME | Auto-set |

### law_table
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-increment |
| `law_of_country` | VARCHAR(256) | Required |
| `constitution_file` | BYTEA | File binary |
| `filename` | VARCHAR(512) | Original name |
| `extension` | VARCHAR(16) | e.g., ".pdf" |
| `mime_type` | VARCHAR(128) | MIME type |
| `file_size_bytes` | INTEGER | File size |
| `uploaded_at` | DATETIME | Auto-set |

---

## Supported File Types

| Extension | MIME Type |
|-----------|-----------|
| `.pdf` | `application/pdf` |
| `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| `.doc` | `application/msword` |
| `.txt` | `text/plain` |
