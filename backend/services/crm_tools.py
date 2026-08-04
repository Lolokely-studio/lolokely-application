import json
from uuid import UUID

from psycopg2.extras import RealDictCursor

from db import get_connection

_DECIMAL_FIELDS = (
    'contract_value',
    'market_cap',
    'total_revenue',
    'net_income',
    'gross_profit',
)


def _serialize_row(row):
    if row is None:
        return None
    out = dict(row)
    for k, v in list(out.items()):
        if hasattr(v, 'isoformat'):
            out[k] = v.isoformat()
        elif isinstance(v, UUID):
            out[k] = str(v)
        elif hasattr(v, '__float__') and k in _DECIMAL_FIELDS:
            out[k] = str(v)
    return out


def fetch_new_company_candidates(limit: int = 80) -> list[dict]:
    """Only status='new'. Pre-order by signal richness, cap at limit."""
    sql = """
      SELECT c.id, c.company_name, c.domain, c.country, c.city, c.region,
             c.company_type, c.source, c.notes, c.status, c.website,
             COALESCE(length(c.notes), 0) AS notes_len,
             (SELECT COUNT(*) FROM company_emails e WHERE e.company_id = c.id) AS emails_count,
             (SELECT COUNT(*) FROM company_financials f WHERE f.company_id = c.id) AS financials_count,
             (SELECT COUNT(*) FROM prospects p WHERE p.company_id = c.id) AS prospects_count,
             (
               SELECT json_agg(json_build_object(
                 'sector', f.sector, 'industry', f.industry,
                 'total_revenue', f.total_revenue::text,
                 'market_cap', f.market_cap::text,
                 'employees', f.employees
               ))
               FROM company_financials f WHERE f.company_id = c.id
             ) AS financials_preview
      FROM companies c
      WHERE c.status = 'new'
      ORDER BY
        (CASE WHEN c.notes IS NOT NULL AND length(trim(c.notes)) > 0 THEN 1 ELSE 0 END
         + (SELECT COUNT(*) FROM company_financials f WHERE f.company_id = c.id)
         + (SELECT COUNT(*) FROM company_emails e WHERE e.company_id = c.id)
         + (SELECT COUNT(*) FROM prospects p WHERE p.company_id = c.id)
        ) DESC,
        c.updated_at DESC NULLS LAST,
        c.id DESC
      LIMIT %s
    """
    with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, (limit,))
        return [_serialize_row(r) for r in cur.fetchall()]


def fetch_company_context(company_id: int) -> dict | None:
    with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM companies WHERE id = %s", (company_id,))
        company = cur.fetchone()
        if not company:
            return None
        cur.execute(
            "SELECT * FROM company_emails WHERE company_id = %s ORDER BY id DESC LIMIT 20",
            (company_id,),
        )
        emails = cur.fetchall()
        cur.execute(
            "SELECT * FROM company_financials WHERE company_id = %s ORDER BY id DESC LIMIT 10",
            (company_id,),
        )
        financials = cur.fetchall()
        cur.execute(
            "SELECT * FROM prospects WHERE company_id = %s ORDER BY id DESC LIMIT 20",
            (company_id,),
        )
        prospects = cur.fetchall()
        return {
            'company': _serialize_row(company),
            'emails': [_serialize_row(r) for r in emails],
            'financials': [_serialize_row(r) for r in financials],
            'prospects': [_serialize_row(r) for r in prospects],
        }


def insert_ai_run(
    *,
    user_id: str,
    run_type: str,
    company_id: int | None,
    model_used: str | None,
    duration_ms: int | None,
    status: str,
    input_summary: dict,
    output_summary: dict,
    error_message: str | None = None,
) -> str:
    with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO ai_runs (
              user_id, run_type, company_id, model_used, duration_ms,
              status, input_summary, output_summary, error_message
            ) VALUES (%s,%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb,%s)
            RETURNING id
            """,
            (
                user_id,
                run_type,
                company_id,
                model_used,
                duration_ms,
                status,
                json.dumps(input_summary),
                json.dumps(output_summary),
                error_message,
            ),
        )
        row = cur.fetchone()
        conn.commit()
        return str(row['id'])


def insert_outreach_pack(
    *,
    company_id: int,
    user_id: str,
    email_subject: str,
    email_body: str,
    proposal_markdown: str,
    model_used: str | None,
) -> str:
    with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO outreach_packs (
              company_id, user_id, email_subject, email_body,
              proposal_markdown, model_used
            ) VALUES (%s,%s,%s,%s,%s,%s)
            RETURNING id
            """,
            (
                company_id,
                user_id,
                email_subject,
                email_body,
                proposal_markdown,
                model_used,
            ),
        )
        row = cur.fetchone()
        conn.commit()
        return str(row['id'])


def get_latest_outreach_pack(company_id: int) -> dict | None:
    with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT * FROM outreach_packs
            WHERE company_id = %s
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (company_id,),
        )
        return _serialize_row(cur.fetchone())


def get_latest_suggest_top_run() -> dict | None:
    with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT * FROM ai_runs
            WHERE run_type = 'suggest_top' AND status = 'success'
            ORDER BY created_at DESC
            LIMIT 1
            """
        )
        return _serialize_row(cur.fetchone())


def list_ai_runs(limit: int = 50, offset: int = 0) -> tuple[list[dict], int]:
    with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT COUNT(*) AS total FROM ai_runs")
        total = int(cur.fetchone()['total'])
        cur.execute(
            """
            SELECT r.*, c.company_name
            FROM ai_runs r
            LEFT JOIN companies c ON c.id = r.company_id
            ORDER BY r.created_at DESC
            LIMIT %s OFFSET %s
            """,
            (limit, offset),
        )
        return [_serialize_row(r) for r in cur.fetchall()], total
