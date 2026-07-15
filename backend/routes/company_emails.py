from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db import get_connection
from psycopg2.extras import RealDictCursor
from marshmallow import ValidationError
from utils.auth_helpers import require_admin, api_error_from_exception
from schemas.company_email_schema import CompanyEmailCreateSchema, CompanyEmailUpdateSchema

company_emails_bp = Blueprint('company_emails', __name__)

company_email_create_schema = CompanyEmailCreateSchema()
company_email_update_schema = CompanyEmailUpdateSchema()


def _serialize_company_email(row):
    if row is None:
        return None
    data = dict(row)
    if data.get('scraped_at') is not None:
        data['scraped_at'] = data['scraped_at'].isoformat()
    return data


@company_emails_bp.route('/', methods=['GET'])
@jwt_required()
def get_company_emails():
    _, err = require_admin()
    if err:
        return err
    try:
        company_id = request.args.get('company_id')

        where_clauses = []
        params = []

        if company_id:
            try:
                company_id = int(company_id)
            except (TypeError, ValueError):
                return jsonify({'error': 'company_id must be an integer'}), 400
            where_clauses.append("company_id = %s")
            params.append(company_id)

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT * FROM company_emails
                {where_sql}
                ORDER BY scraped_at DESC NULLS LAST, id DESC
                """,
                params,
            )
            rows = cur.fetchall()

        return jsonify({
            'company_emails': [_serialize_company_email(r) for r in rows],
        }), 200

    except Exception as e:
        return api_error_from_exception(e, 'get_company_emails')


@company_emails_bp.route('/<int:email_id>', methods=['GET'])
@jwt_required()
def get_company_email(email_id):
    _, err = require_admin()
    if err:
        return err
    try:
        with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM company_emails WHERE id = %s", (email_id,))
            company_email = cur.fetchone()

        if not company_email:
            return jsonify({'error': 'Company email not found'}), 404

        return jsonify({'company_email': _serialize_company_email(company_email)}), 200

    except Exception as e:
        return api_error_from_exception(e, 'get_company_email')


@company_emails_bp.route('/', methods=['POST'])
@jwt_required()
def create_company_email():
    _, err = require_admin()
    if err:
        return err
    try:
        try:
            data = company_email_create_schema.load(request.get_json() or {})
        except ValidationError as ve:
            return jsonify({'error': 'Validation error', 'details': ve.messages}), 400

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT id FROM companies WHERE id = %s", (data['company_id'],))
                if not cur.fetchone():
                    return jsonify({'error': 'Company not found'}), 404

                columns = list(data.keys())
                values = [data[c] for c in columns]
                placeholders = ', '.join(['%s'] * len(columns))
                column_sql = ', '.join(columns)

                cur.execute(
                    f"""
                    INSERT INTO company_emails ({column_sql})
                    VALUES ({placeholders})
                    RETURNING *
                    """,
                    values,
                )
                company_email = cur.fetchone()
                conn.commit()

        return jsonify({'company_email': _serialize_company_email(company_email)}), 201

    except Exception as e:
        return api_error_from_exception(e, 'create_company_email')


@company_emails_bp.route('/<int:email_id>', methods=['PUT'])
@jwt_required()
def update_company_email(email_id):
    _, err = require_admin()
    if err:
        return err
    try:
        raw = request.get_json() or {}
        try:
            validated = company_email_update_schema.load(raw)
        except ValidationError as ve:
            return jsonify({'error': 'Validation error', 'details': ve.messages}), 400

        # Every field on CompanyEmailUpdateSchema has load_default=None, so .load() backfills
        # unset fields with None. Only keep keys the client actually sent, otherwise a
        # partial update would null out untouched columns.
        data = {k: v for k, v in validated.items() if k in raw}
        if not data:
            return jsonify({'error': 'No fields provided to update'}), 400

        if 'company_id' in data:
            with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT id FROM companies WHERE id = %s", (data['company_id'],))
                if not cur.fetchone():
                    return jsonify({'error': 'Company not found'}), 404

        set_clauses = [f"{col} = %s" for col in data.keys()]
        values = list(data.values())
        set_sql = ', '.join(set_clauses)

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"""
                    UPDATE company_emails
                    SET {set_sql}
                    WHERE id = %s
                    RETURNING *
                    """,
                    values + [email_id],
                )
                company_email = cur.fetchone()
                if not company_email:
                    conn.rollback()
                    return jsonify({'error': 'Company email not found'}), 404
                conn.commit()

        return jsonify({'company_email': _serialize_company_email(company_email)}), 200

    except Exception as e:
        return api_error_from_exception(e, 'update_company_email')


@company_emails_bp.route('/<int:email_id>', methods=['DELETE'])
@jwt_required()
def delete_company_email(email_id):
    _, err = require_admin()
    if err:
        return err
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT id FROM company_emails WHERE id = %s", (email_id,))
                if not cur.fetchone():
                    return jsonify({'error': 'Company email not found'}), 404

                cur.execute("DELETE FROM company_emails WHERE id = %s", (email_id,))
                conn.commit()

        return jsonify({'message': 'Company email deleted'}), 200

    except Exception as e:
        return api_error_from_exception(e, 'delete_company_email')
