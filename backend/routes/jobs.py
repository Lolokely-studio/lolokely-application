from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from db import get_connection
from psycopg2.extras import RealDictCursor

jobs_bp = Blueprint('jobs', __name__)

@jobs_bp.route('/', methods=['GET'])
@jwt_required()
def get_jobs():
    try:
        with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(""" SELECT id, source, job_id, url, title, description, budget_min, budget_max,
                        skills, client_info->>'job_type' AS job_type,
                        client_info->>'company_name' AS company_name,
                        client_info->>'location' AS location,
                        client_info->>'company_logo' AS company_logo,
                        posted_date, deadline, remote, experience_level, fetched_at, inserted_at 
                        FROM jobs ORDER BY posted_date DESC NULLS LAST, inserted_at DESC""")
            jobs = cur.fetchall()
        return jsonify({'jobs': [{
            'id': j['id'],
            'source': j['source'],
            'job_id': j['job_id'],
            'url': j['url'],
            'title': j['title'],
            'description': j['description'],
            'budget_min': j['budget_min'],
            'budget_max': j['budget_max'],
            'skills': j['skills'],
            'job_type': j['job_type'],
            'company_name': j['company_name'],
            'location': j['location'],
            'company_logo': j['company_logo'],
            'posted_at': j['posted_date'].isoformat() if j['posted_date'] else None,
            'deadline': j['deadline'].isoformat() if j['deadline'] else None,
            'remote': j['remote'],
            'experience_level': j['experience_level'],
        } for j in jobs]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@jobs_bp.route('/<job_id>', methods=['GET'])
@jwt_required()
def get_job(job_id):
    try:
        with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""SELECT id, source, job_id, url, title, description, budget_min, budget_max,
                        skills, client_info->>'job_type' AS job_type,
                        client_info->>'company_name' AS company_name,
                        client_info->>'location' AS location,
                        client_info->>'company_logo' AS company_logo,
                        posted_date, deadline, remote, experience_level, fetched_at, inserted_at 
                        FROM jobs WHERE id = %s""", (job_id,))
            job = cur.fetchone()
        if not job:
            return jsonify({'error': 'Job not found'}), 404
        return jsonify({'job': {
            'id': job['id'],
            'source': job['source'],
            'job_id': job['job_id'],
            'url': job['url'],
            'title': job['title'],
            'description': job['description'],
            'budget_min': job['budget_min'],
            'budget_max': job['budget_max'],
            'skills': job['skills'],
            'job_type': job['job_type'],
            'company_name': job['company_name'],
            'location': job['location'],
            'company_logo': job['company_logo'],
            'posted_at': job['posted_date'].isoformat() if job['posted_date'] else None,
            'deadline': job['deadline'].isoformat() if job['deadline'] else None,
            'remote': job['remote'],
            'experience_level': job['experience_level'],
        }}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500