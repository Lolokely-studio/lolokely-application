from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db import get_connection
from psycopg2.extras import RealDictCursor
from marshmallow import ValidationError
from utils.auth_helpers import require_admin, api_error_from_exception
from schemas.company_schema import CompanyCreateSchema, CompanyUpdateSchema

companies_bp = Blueprint('companies', __name__)

company_create_schema = CompanyCreateSchema()
company_update_schema = CompanyUpdateSchema()

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


@companies_bp.route('/', methods=['GET'])
@jwt_required()
def get_companies():
    _, err = require_admin()
    if err:
        return err
    try:
        q = request.args.get('q')
        status = request.args.get('status')
        country = request.args.get('country')
        company_type = request.args.get('company_type')

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

        where_clauses = []
        params = []

        if q:
            where_clauses.append(
                "(company_name ILIKE %s OR domain ILIKE %s OR city ILIKE %s OR country ILIKE %s)"
            )
            like = f"%{q}%"
            params.extend([like, like, like, like])
        if status:
            where_clauses.append("status ILIKE %s")
            params.append(status)
        if country:
            where_clauses.append("country ILIKE %s")
            params.append(country)
        if company_type:
            where_clauses.append("company_type ILIKE %s")
            params.append(company_type)

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f"SELECT COUNT(*) AS total FROM companies {where_sql}", params)
            total = cur.fetchone()['total']

            cur.execute(
                f"""
                SELECT * FROM companies
                {where_sql}
                ORDER BY updated_at DESC NULLS LAST, created_at DESC
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
