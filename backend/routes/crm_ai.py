import json

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from services.crm_agents import generate_outreach_pack, suggest_top_companies
from services.crm_tools import (
    get_latest_outreach_pack,
    get_latest_suggest_top_run,
    list_ai_runs,
)
from utils.auth_helpers import api_error_from_exception, require_admin

crm_ai_bp = Blueprint('crm_ai', __name__)


@crm_ai_bp.route('/suggest-top', methods=['POST'])
@jwt_required()
def post_suggest_top():
    user_id, err = require_admin()
    if err:
        return err
    try:
        result = suggest_top_companies(user_id)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        msg = str(e)
        if 'API key' in msg or 'nvapi-' in msg:
            return jsonify({'error': msg}), 400
        return jsonify({'error': 'AI ranking failed', 'details': msg}), 503


@crm_ai_bp.route('/suggest-top/latest', methods=['GET'])
@jwt_required()
def get_suggest_top_latest():
    user_id, err = require_admin()
    if err:
        return err
    try:
        run = get_latest_suggest_top_run()
        if not run:
            return jsonify({'items': [], 'message': 'No ranking yet'}), 200
        summary = run.get('output_summary') or {}
        if isinstance(summary, str):
            summary = json.loads(summary)
        return jsonify({
            'generated_at': run.get('created_at'),
            'model_used': run.get('model_used'),
            'run_id': run.get('id'),
            'candidates_considered': (run.get('input_summary') or {}).get('candidates'),
            'items': summary.get('items') or [],
        }), 200
    except Exception as e:
        return api_error_from_exception(e, 'get_suggest_top_latest')


@crm_ai_bp.route('/companies/<int:company_id>/outreach-pack', methods=['POST'])
@jwt_required()
def post_outreach_pack(company_id):
    user_id, err = require_admin()
    if err:
        return err
    try:
        result = generate_outreach_pack(user_id, company_id)
        return jsonify(result), 201
    except ValueError as e:
        if 'not found' in str(e).lower():
            return jsonify({'error': str(e)}), 404
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        msg = str(e)
        if 'API key' in msg or 'nvapi-' in msg:
            return jsonify({'error': msg}), 400
        return jsonify({'error': 'Outreach generation failed', 'details': msg}), 503


@crm_ai_bp.route('/companies/<int:company_id>/outreach-pack', methods=['GET'])
@jwt_required()
def get_outreach_pack(company_id):
    user_id, err = require_admin()
    if err:
        return err
    try:
        pack = get_latest_outreach_pack(company_id)
        if not pack:
            return jsonify({'pack': None}), 200
        return jsonify({
            'pack_id': pack['id'],
            'company_id': pack['company_id'],
            'email_subject': pack['email_subject'],
            'email_body': pack['email_body'],
            'proposal_markdown': pack['proposal_markdown'],
            'model_used': pack.get('model_used'),
            'created_at': pack.get('created_at'),
        }), 200
    except Exception as e:
        return api_error_from_exception(e, 'get_outreach_pack')


@crm_ai_bp.route('/runs', methods=['GET'])
@jwt_required()
def get_runs():
    user_id, err = require_admin()
    if err:
        return err
    try:
        limit = min(int(request.args.get('limit', 50)), 100)
        offset = max(int(request.args.get('offset', 0)), 0)
        rows, total = list_ai_runs(limit=limit, offset=offset)
        return jsonify({'runs': rows, 'total': total, 'limit': limit, 'offset': offset}), 200
    except Exception as e:
        return api_error_from_exception(e, 'get_runs')
