from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db import get_connection
from psycopg2.extras import RealDictCursor
from marshmallow import ValidationError
from utils.auth_helpers import require_admin, api_error_from_exception
from schemas.prospect_schema import ProspectCreateSchema, ProspectUpdateSchema
import traceback

prospects_bp = Blueprint('prospects', __name__)

prospect_create_schema = ProspectCreateSchema()
prospect_update_schema = ProspectUpdateSchema()


def _serialize_prospect(row):
    if row is None:
        return None
    data = dict(row)
    for key in ('created_at', 'updated_at', 'sent_at'):
        if data.get(key) is not None:
            data[key] = data[key].isoformat()
    for key in ('contract_signed_at',):
        if data.get(key) is not None:
            data[key] = data[key].isoformat()
    if data.get('contract_value') is not None:
        data['contract_value'] = str(data['contract_value'])
    return data


@prospects_bp.route('/', methods=['GET'])
@jwt_required()
def get_prospects():
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
                SELECT * FROM prospects
                {where_sql}
                ORDER BY updated_at DESC NULLS LAST, created_at DESC
                """,
                params,
            )
            rows = cur.fetchall()

        return jsonify({
            'prospects': [_serialize_prospect(r) for r in rows],
        }), 200

    except Exception as e:
        return api_error_from_exception(e, 'get_prospects')


@prospects_bp.route('/<int:prospect_id>', methods=['GET'])
@jwt_required()
def get_prospect(prospect_id):
    _, err = require_admin()
    if err:
        return err
    try:
        with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM prospects WHERE id = %s", (prospect_id,))
            prospect = cur.fetchone()

        if not prospect:
            return jsonify({'error': 'Prospect not found'}), 404

        return jsonify({'prospect': _serialize_prospect(prospect)}), 200

    except Exception as e:
        return api_error_from_exception(e, 'get_prospect')


@prospects_bp.route('/', methods=['POST'])
@jwt_required()
def create_prospect():
    _, err = require_admin()
    if err:
        return err
    try:
        try:
            data = prospect_create_schema.load(request.get_json() or {})
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
                    INSERT INTO prospects ({column_sql})
                    VALUES ({placeholders})
                    RETURNING *
                    """,
                    values,
                )
                prospect = cur.fetchone()
                conn.commit()

        return jsonify({'prospect': _serialize_prospect(prospect)}), 201

    except Exception as e:
        return api_error_from_exception(e, 'create_prospect')


@prospects_bp.route('/<int:prospect_id>', methods=['PUT'])
@jwt_required()
def update_prospect(prospect_id):
    _, err = require_admin()
    if err:
        return err
    try:
        raw = request.get_json() or {}
        try:
            validated = prospect_update_schema.load(raw)
        except ValidationError as ve:
            return jsonify({'error': 'Validation error', 'details': ve.messages}), 400

        # Every field on ProspectUpdateSchema has load_default=None, so .load() backfills
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
        set_sql = ', '.join(set_clauses + ['updated_at = NOW()'])

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"""
                    UPDATE prospects
                    SET {set_sql}
                    WHERE id = %s
                    RETURNING *
                    """,
                    values + [prospect_id],
                )
                prospect = cur.fetchone()
                if not prospect:
                    conn.rollback()
                    return jsonify({'error': 'Prospect not found'}), 404
                conn.commit()

        return jsonify({'prospect': _serialize_prospect(prospect)}), 200

    except Exception as e:
        return api_error_from_exception(e, 'update_prospect')


@prospects_bp.route('/<int:prospect_id>', methods=['DELETE'])
@jwt_required()
def delete_prospect(prospect_id):
    _, err = require_admin()
    if err:
        return err
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT id FROM prospects WHERE id = %s", (prospect_id,))
                if not cur.fetchone():
                    return jsonify({'error': 'Prospect not found'}), 404

                cur.execute("DELETE FROM prospects WHERE id = %s", (prospect_id,))
                conn.commit()

        return jsonify({'message': 'Prospect deleted'}), 200

    except Exception as e:
        return api_error_from_exception(e, 'delete_prospect')
