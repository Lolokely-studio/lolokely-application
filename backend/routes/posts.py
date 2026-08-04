from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import get_connection
import uuid
from datetime import datetime
from psycopg2.extras import RealDictCursor
import traceback
import json
import re

from services.nvidia_llm import describe_image, generate_text

posts_bp = Blueprint('posts', __name__)


def generate_post_variations(
    theme,
    description,
    platform,
    tonality,
    language,
    target_audience,
    media_url=None,
    media_type=None,
):
    """Generate social media post variations using NVIDIA via LangChain."""
    try:
        image_analysis = None
        image_model = None
        if media_type == "image" and media_url:
            image_analysis, image_model = describe_image(media_url)

        system_instruction = """You are an expert Social Media Post Generator specialized in Gaming, 3D, Design, AR/VR, and engaging copywriting.

You generate engaging, platform-specific social media posts that match the specified tonality and target audience."""

        image_block = ""
        if image_analysis:
            image_block = (
                f"\nImage analysis (use this to align the post with the visual):\n"
                f"{image_analysis}\n"
            )

        prompt = f"""Generate 3 variations of a social media post with the following specifications:

Theme: {theme}
Description: {description}
Platform: {platform}
Tonality: {tonality}
Language: {language}
Target Audience: {target_audience}
{image_block}
Requirements:
- Generate exactly 3 different variations
- Each variation should be engaging and tailored to the platform
- Match the specified tonality
- Write in {language}
- Consider the target audience: {target_audience}
- If image analysis is provided, make the copy coherent with what is visible in the image
- Make posts engaging and shareable

Format your response as a JSON array with exactly 3 objects, each with a "text" field:
[
  {{"text": "First variation text here"}},
  {{"text": "Second variation text here"}},
  {{"text": "Third variation text here"}}
]

Return ONLY the JSON array, no additional text or explanation."""

        text, model_used = generate_text(system_instruction, prompt)

        text = re.sub(r"```json\n?", "", text)
        text = re.sub(r"```\n?", "", text)
        text = text.strip()

        json_match = re.search(r"\[.*\]", text, re.DOTALL)
        if json_match:
            text = json_match.group(0)

        try:
            variations = json.loads(text)
        except json.JSONDecodeError:
            lines = [line.strip() for line in text.split("\n") if line.strip()]
            if len(lines) >= 3:
                variations = [{"text": line} for line in lines[:3]]
            else:
                raise ValueError("Could not parse response from NVIDIA API")

        if not isinstance(variations, list):
            raise ValueError("Invalid response format from NVIDIA: expected a list")

        if len(variations) < 3:
            while len(variations) < 3:
                variations.append({"text": ""})
        elif len(variations) > 3:
            variations = variations[:3]

        result = []
        for v in variations:
            if isinstance(v, dict):
                result.append(v.get("text", v.get("variation", str(v))))
            elif isinstance(v, str):
                result.append(v)
            else:
                result.append(str(v))

        return {
            "variations": result,
            "model_used": model_used,
            "image_analysis": image_analysis,
            "image_model": image_model,
        }

    except ValueError:
        raise
    except Exception as e:
        print(f"Error generating post: {str(e)}")
        traceback.print_exc()
        raise


def update_user_preferences(user_id, platform, tonality, language, theme):
    """Update user preferences based on their choices"""
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM user_post_preferences WHERE user_id = %s",
                    (user_id,)
                )
                prefs = cur.fetchone()

                if prefs:
                    platforms = prefs['preferred_platforms'] or []
                    tonalities = prefs['preferred_tonalities'] or []
                    languages = prefs['preferred_languages'] or []
                    themes = prefs['common_themes'] or []

                    if platform not in platforms:
                        platforms.append(platform)
                    if tonality not in tonalities:
                        tonalities.append(tonality)
                    if language not in languages:
                        languages.append(language)
                    if theme not in themes:
                        themes.append(theme)

                    cur.execute(
                        """UPDATE user_post_preferences
                        SET preferred_platforms = %s, preferred_tonalities = %s,
                            preferred_languages = %s, common_themes = %s, updated_at = %s
                        WHERE user_id = %s""",
                        (json.dumps(platforms), json.dumps(tonalities),
                         json.dumps(languages), json.dumps(themes), datetime.utcnow(), user_id)
                    )
                else:
                    cur.execute(
                        """INSERT INTO user_post_preferences
                        (id, user_id, preferred_platforms, preferred_tonalities,
                         preferred_languages, common_themes, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                        (str(uuid.uuid4()), user_id,
                         json.dumps([platform]), json.dumps([tonality]),
                         json.dumps([language]), json.dumps([theme]),
                         datetime.utcnow(), datetime.utcnow())
                    )
                conn.commit()
    except Exception as e:
        print(f"Error updating user preferences: {str(e)}")


@posts_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate_posts():
    """Generate social media post variations"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400

        theme = (data.get('theme') or '').strip()
        description = (data.get('description') or '').strip()
        platform = (data.get('platform') or '').strip()
        tonality = (data.get('tonality') or '').strip()
        language = (data.get('language') or 'en').strip()
        target_audience = (data.get('target_audience') or '').strip()
        media_url = (data.get('media_url') or '').strip() or None
        media_type = (data.get('media_type') or '').strip() or None

        if not all([theme, platform, tonality]):
            return jsonify({'error': 'Theme, platform, and tonality are required'}), 400

        result = generate_post_variations(
            theme, description, platform, tonality, language, target_audience,
            media_url=media_url, media_type=media_type,
        )

        return jsonify({
            'variations': result['variations'],
            'theme': theme,
            'description': description,
            'platform': platform,
            'tonality': tonality,
            'language': language,
            'target_audience': target_audience,
            'model_used': result['model_used'],
            'image_analysis': result['image_analysis'],
            'image_model': result['image_model'],
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except RuntimeError as e:
        print(f"NVIDIA generation exhausted models: {e}")
        return jsonify({'error': str(e)}), 503
    except Exception as e:
        err = str(e).lower()
        if 'api' in err and 'key' in err:
            return jsonify({
                'error': (
                    'NVIDIA API key is invalid or not accepted. Check NVIDIA_API_KEY in the '
                    'project root .env and ensure the key is valid at https://build.nvidia.com/'
                )
            }), 503
        print(f"Error in generate_posts: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@posts_bp.route('/save', methods=['POST'])
@jwt_required()
def save_post():
    """Save a social media post"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400

        theme = (data.get('theme') or '').strip()
        description = (data.get('description') or '').strip()
        platform = (data.get('platform') or '').strip()
        tonality = (data.get('tonality') or '').strip()
        language = (data.get('language') or 'en').strip()
        target_audience = (data.get('target_audience') or '').strip()
        generated_variations = data.get('generated_variations') or []
        selected_variation = (data.get('selected_variation') or '').strip()
        media_url = (data.get('media_url') or '').strip()
        media_type = (data.get('media_type') or '').strip()
        image_analysis = (data.get('image_analysis') or '').strip() or None
        generation_model = (
            data.get('generation_model') or data.get('model_used') or ''
        ).strip() or None
        image_model = (data.get('image_model') or '').strip() or None

        if not selected_variation:
            return jsonify({'error': 'Selected variation is required'}), 400

        post_id = str(uuid.uuid4())
        now = datetime.utcnow()

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """INSERT INTO social_posts
                    (id, user_id, theme, description, platform, tonality, language,
                     target_audience, generated_variations, selected_variation,
                     media_url, media_type, image_analysis, generation_model, image_model,
                     created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *""",
                    (post_id, user_id, theme, description, platform, tonality, language,
                     target_audience, json.dumps(generated_variations), selected_variation,
                     media_url, media_type, image_analysis, generation_model, image_model,
                     now, now)
                )
                post = cur.fetchone()
                conn.commit()

        update_user_preferences(user_id, platform, tonality, language, theme)

        return jsonify({
            'message': 'Post saved successfully',
            'post': {
                'id': post['id'],
                'theme': post['theme'],
                'platform': post['platform'],
                'selected_variation': post['selected_variation'],
                'created_at': post['created_at'].isoformat() if post['created_at'] else None
            }
        }), 201

    except Exception as e:
        print(f"Error in save_post: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@posts_bp.route('/', methods=['GET'])
@jwt_required()
def get_posts():
    """Get all posts from all users"""
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """SELECT sp.id, sp.theme, sp.description, sp.platform, sp.tonality, sp.language,
                       sp.target_audience, sp.generated_variations, sp.selected_variation,
                       sp.media_url, sp.media_type, sp.image_analysis, sp.generation_model,
                       sp.image_model, sp.created_at, sp.updated_at,
                       sp.user_id, u.first_name, u.last_name, u.email
                       FROM social_posts sp
                       INNER JOIN users u ON sp.user_id = u.id
                       ORDER BY sp.created_at DESC"""
                )
                posts = cur.fetchall()

        return jsonify({
            'posts': [{
                'id': p['id'],
                'theme': p['theme'],
                'description': p['description'],
                'platform': p['platform'],
                'tonality': p['tonality'],
                'language': p['language'],
                'target_audience': p['target_audience'],
                'generated_variations': p['generated_variations'],
                'selected_variation': p['selected_variation'],
                'media_url': p['media_url'],
                'media_type': p['media_type'],
                'image_analysis': p['image_analysis'],
                'generation_model': p['generation_model'],
                'image_model': p['image_model'],
                'created_at': p['created_at'].isoformat() if p['created_at'] else None,
                'updated_at': p['updated_at'].isoformat() if p['updated_at'] else None,
                'user': {
                    'id': p['user_id'],
                    'first_name': p['first_name'],
                    'last_name': p['last_name'],
                    'email': p['email']
                }
            } for p in posts]
        }), 200

    except Exception as e:
        print(f"Error in get_posts: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@posts_bp.route('/preferences', methods=['GET'])
@jwt_required()
def get_preferences():
    """Get user post preferences"""
    try:
        user_id = get_jwt_identity()

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM user_post_preferences WHERE user_id = %s",
                    (user_id,)
                )
                prefs = cur.fetchone()

        if not prefs:
            return jsonify({
                'preferences': {
                    'preferred_platforms': [],
                    'preferred_tonalities': [],
                    'preferred_languages': [],
                    'common_themes': []
                }
            }), 200

        return jsonify({
            'preferences': {
                'preferred_platforms': prefs['preferred_platforms'] or [],
                'preferred_tonalities': prefs['preferred_tonalities'] or [],
                'preferred_languages': prefs['preferred_languages'] or [],
                'common_themes': prefs['common_themes'] or []
            }
        }), 200

    except Exception as e:
        print(f"Error in get_preferences: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
