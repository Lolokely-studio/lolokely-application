from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db import get_connection
from psycopg2.extras import RealDictCursor
from marshmallow import ValidationError
from utils.auth_helpers import require_admin, api_error_from_exception
from schemas.company_schema import (
    COMPANY_STATUSES,
    CompanyCreateSchema,
    CompanyUpdateSchema,
    CompanyStatusPatchSchema,
)

companies_bp = Blueprint('companies', __name__)

company_create_schema = CompanyCreateSchema()
company_update_schema = CompanyUpdateSchema()
company_status_patch_schema = CompanyStatusPatchSchema()

SORT_COLUMNS = {
    'company_name': 'company_name',
    'status': 'status',
    'updated_at': 'updated_at',
}

# dedup_key is `GENERATED ALWAYS AS (...) STORED` in Postgres — Postgres rejects
# any INSERT/UPDATE that targets it, even NULL, so it must never be written.
GENERATED_COLUMNS = {'dedup_key'}


def _writable(data):
    return {k: v for k, v in data.items() if k not in GENERATED_COLUMNS}


def _serialize_company(row):
    if row is None:
        return None
    data = dict(row)
    for key in ('created_at', 'updated_at'):
        if data.get(key) is not None:
            data[key] = data[key].isoformat()
    return data


def _company_list_filters(request):
    """Build WHERE clauses for q, country, company_type (not status)."""
    where_clauses = []
    params = []

    q = request.args.get('q')
    country = request.args.get('country')
    company_type = request.args.get('company_type')

    if q:
        where_clauses.append(
            "(company_name ILIKE %s OR domain ILIKE %s OR city ILIKE %s OR country ILIKE %s)"
        )
        like = f"%{q}%"
        params.extend([like, like, like, like])
    if country:
        where_clauses.append("country ILIKE %s")
        params.append(country)
    if company_type:
        where_clauses.append("company_type ILIKE %s")
        params.append(company_type)

    return where_clauses, params


@companies_bp.route('/', methods=['GET'])
@jwt_required()
def get_companies():
    _, err = require_admin()
    if err:
        return err
    try:
        status = request.args.get('status')

        try:
            page = int(request.args.get('page', 1))
        except (TypeError, ValueError):
            page = 1
        try:
            per_page = int(request.args.get('per_page', 20))
        except (TypeError, ValueError):
            per_page = 20
        page = max(page, 1)
        per_page = max(min(per_page, 100), 1)
        offset = (page - 1) * per_page

        where_clauses, params = _company_list_filters(request)
        if status:
            if status not in COMPANY_STATUSES:
                return jsonify({'error': 'Invalid status filter'}), 400
            where_clauses.append("status = %s")
            params.append(status)

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        sort = request.args.get('sort', 'updated_at')
        order = request.args.get('order', 'desc').lower()
        sort_col = SORT_COLUMNS.get(sort, 'updated_at')
        sort_dir = 'ASC' if order == 'asc' else 'DESC'

        with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f"SELECT COUNT(*) AS total FROM companies {where_sql}", params)
            total = cur.fetchone()['total']

            cur.execute(
                f"""
                SELECT * FROM companies
                {where_sql}
                ORDER BY {sort_col} {sort_dir} NULLS LAST, created_at DESC
                LIMIT %s OFFSET %s
                """,
                params + [per_page, offset],
            )
            rows = cur.fetchall()

        return jsonify({
            'companies': [_serialize_company(r) for r in rows],
            'total': total,
            'page': page,
            'per_page': per_page,
        }), 200

    except Exception as e:
        return api_error_from_exception(e, 'get_companies')


@companies_bp.route('/status-counts', methods=['GET'])
@jwt_required()
def get_company_status_counts():
    _, err = require_admin()
    if err:
        return err
    try:
        where_clauses, params = _company_list_filters(request)
        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"SELECT status, COUNT(*) AS count FROM companies {where_sql} GROUP BY status",
                params,
            )
            rows = cur.fetchall()

        counts = {s: 0 for s in COMPANY_STATUSES}
        for row in rows:
            if row['status'] in counts:
                counts[row['status']] = row['count']
        total = sum(counts.values())

        return jsonify({'total': total, 'counts': counts}), 200

    except Exception as e:
        return api_error_from_exception(e, 'get_company_status_counts')


@companies_bp.route('/<int:company_id>/status', methods=['PATCH'])
@jwt_required()
def patch_company_status(company_id):
    _, err = require_admin()
    if err:
        return err
    try:
        try:
            data = company_status_patch_schema.load(request.get_json() or {})
        except ValidationError as ve:
            return jsonify({'error': 'Validation error', 'details': ve.messages}), 400

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    UPDATE companies
                    SET status = %s, updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                    """,
                    (data['status'], company_id),
                )
                company = cur.fetchone()
                if not company:
                    conn.rollback()
                    return jsonify({'error': 'Company not found'}), 404
                conn.commit()

        return jsonify({'company': _serialize_company(company)}), 200

    except Exception as e:
        return api_error_from_exception(e, 'patch_company_status')


@companies_bp.route('/<int:company_id>', methods=['GET'])
@jwt_required()
def get_company(company_id):
    _, err = require_admin()
    if err:
        return err
    try:
        with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT c.*,
                  (SELECT COUNT(*) FROM prospects WHERE company_id = c.id) AS prospects_count,
                  (SELECT COUNT(*) FROM company_emails WHERE company_id = c.id) AS emails_count,
                  (SELECT COUNT(*) FROM company_financials WHERE company_id = c.id) AS financials_count
                FROM companies c
                WHERE c.id = %s
                """,
                (company_id,),
            )
            company = cur.fetchone()

        if not company:
            return jsonify({'error': 'Company not found'}), 404

        return jsonify({'company': _serialize_company(company)}), 200

    except Exception as e:
        return api_error_from_exception(e, 'get_company')


@companies_bp.route('/', methods=['POST'])
@jwt_required()
def create_company():
    _, err = require_admin()
    if err:
        return err
    try:
        try:
            data = company_create_schema.load(request.get_json() or {})
        except ValidationError as ve:
            return jsonify({'error': 'Validation error', 'details': ve.messages}), 400

        data = _writable(data)
        columns = list(data.keys())
        values = [data[c] for c in columns]
        placeholders = ', '.join(['%s'] * len(columns))
        column_sql = ', '.join(columns)

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"""
                    INSERT INTO companies ({column_sql})
                    VALUES ({placeholders})
                    RETURNING *
                    """,
                    values,
                )
                company = cur.fetchone()
                conn.commit()

        return jsonify({'company': _serialize_company(company)}), 201

    except Exception as e:
        return api_error_from_exception(e, 'create_company')


@companies_bp.route('/<int:company_id>', methods=['PUT'])
@jwt_required()
def update_company(company_id):
    _, err = require_admin()
    if err:
        return err
    try:
        raw = request.get_json() or {}
        try:
            validated = company_update_schema.load(raw)
        except ValidationError as ve:
            return jsonify({'error': 'Validation error', 'details': ve.messages}), 400

        # Every field on CompanyUpdateSchema has load_default=None, so .load() backfills
        # unset fields with None. Only keep keys the client actually sent, otherwise a
        # partial update would null out untouched columns (and violate domain NOT NULL).
        data = {k: v for k, v in validated.items() if k in raw}
        data = _writable(data)
        if not data:
            return jsonify({'error': 'No fields provided to update'}), 400

        set_clauses = [f"{col} = %s" for col in data.keys()]
        values = list(data.values())
        set_sql = ', '.join(set_clauses + ['updated_at = NOW()'])

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"""
                    UPDATE companies
                    SET {set_sql}
                    WHERE id = %s
                    RETURNING *
                    """,
                    values + [company_id],
                )
                company = cur.fetchone()
                if not company:
                    conn.rollback()
                    return jsonify({'error': 'Company not found'}), 404
                conn.commit()

        return jsonify({'company': _serialize_company(company)}), 200

    except Exception as e:
        return api_error_from_exception(e, 'update_company')


@companies_bp.route('/<int:company_id>', methods=['DELETE'])
@jwt_required()
def delete_company(company_id):
    _, err = require_admin()
    if err:
        return err
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT id FROM companies WHERE id = %s", (company_id,))
                if not cur.fetchone():
                    return jsonify({'error': 'Company not found'}), 404

                cur.execute(
                    """
                    SELECT
                      (SELECT COUNT(*) FROM prospects WHERE company_id = %s) AS p,
                      (SELECT COUNT(*) FROM company_emails WHERE company_id = %s) AS e,
                      (SELECT COUNT(*) FROM company_financials WHERE company_id = %s) AS f
                    """,
                    (company_id, company_id, company_id),
                )
                counts = cur.fetchone()

                if counts['p'] > 0 or counts['e'] > 0 or counts['f'] > 0:
                    return jsonify({
                        'error': 'Cannot delete company with related prospects, emails, or financials. Remove them first.'
                    }), 409

                cur.execute("DELETE FROM companies WHERE id = %s", (company_id,))
                conn.commit()

        return jsonify({'message': 'Company deleted'}), 200

    except Exception as e:
        return api_error_from_exception(e, 'delete_company')
