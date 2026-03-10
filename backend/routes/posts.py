from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import get_connection
import uuid
from datetime import datetime
from psycopg2.extras import RealDictCursor
import traceback
import os
from pathlib import Path
from google import genai
from google.genai import types
from google.genai.errors import ClientError
from dotenv import load_dotenv

# Load .env from project root so GEMINI_API_KEY is found when running from backend/
_env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(_env_path)

posts_bp = Blueprint('posts', __name__)


def _get_gemini_api_key():
    """Read and normalize Gemini API key from environment."""
    key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
    if not key:
        return None
    key = key.strip().strip('"').strip("'")
    return key if key else None


# Configure Gemini API (read at import; use _get_gemini_api_key() for runtime check)
GEMINI_API_KEY = _get_gemini_api_key()

def generate_post_variations(theme, description, platform, tonality, language, target_audience):
    """Generate social media post variations using Gemini AI"""
    try:
        api_key = _get_gemini_api_key()
        if not api_key:
            raise ValueError(
                "Gemini API key not configured. Set GEMINI_API_KEY in the project root .env file. "
                "Get a key from https://aistudio.google.com/app/apikey"
            )

        # Initialize Gemini client
        client = genai.Client(api_key=api_key)
        
        system_instruction = """You are an expert Social Media Post Generator specialized in Gaming, 3D, Design, AR/VR, and engaging copywriting.
        
You generate engaging, platform-specific social media posts that match the specified tonality and target audience."""
        
        prompt = f"""Generate 3 variations of a social media post with the following specifications:

Theme: {theme}
Description: {description}
Platform: {platform}
Tonality: {tonality}
Language: {language}
Target Audience: {target_audience}

Requirements:
- Generate exactly 3 different variations
- Each variation should be engaging and tailored to the platform
- Match the specified tonality
- Write in {language}
- Consider the target audience: {target_audience}
- Make posts engaging and shareable

Format your response as a JSON array with exactly 3 objects, each with a "text" field:
[
  {{"text": "First variation text here"}},
  {{"text": "Second variation text here"}},
  {{"text": "Third variation text here"}}
]

Return ONLY the JSON array, no additional text or explanation."""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            config=types.GenerateContentConfig(
                system_instruction=system_instruction
            ),
            contents=prompt
        )
        
        # Parse the response
        import json
        import re
        
        # Extract JSON from response - handle different response structures
        # The response object from google-genai has a 'text' property
        if hasattr(response, 'text'):
            text = response.text.strip()
        elif hasattr(response, 'candidates') and response.candidates:
            # Fallback for different response structure
            if hasattr(response.candidates[0], 'content'):
                if hasattr(response.candidates[0].content, 'parts'):
                    text = response.candidates[0].content.parts[0].text.strip()
                else:
                    text = str(response.candidates[0].content).strip()
            else:
                text = str(response.candidates[0]).strip()
        else:
            # Try to get text from response object
            text = str(response).strip()
        
        # Remove markdown code blocks if present
        text = re.sub(r'```json\n?', '', text)
        text = re.sub(r'```\n?', '', text)
        text = text.strip()
        
        # Try to find JSON array in the text
        json_match = re.search(r'\[.*\]', text, re.DOTALL)
        if json_match:
            text = json_match.group(0)
        
        try:
            variations = json.loads(text)
        except json.JSONDecodeError:
            # If JSON parsing fails, try to extract text from the response
            # Fallback: split by common patterns and take first 3
            lines = [line.strip() for line in text.split('\n') if line.strip()]
            if len(lines) >= 3:
                variations = [{'text': line} for line in lines[:3]]
            else:
                raise ValueError("Could not parse response from Gemini API")
        
        if not isinstance(variations, list):
            raise ValueError("Invalid response format from Gemini: expected a list")
        
        # Ensure we have exactly 3 variations
        if len(variations) < 3:
            # If we have fewer, pad with empty strings
            while len(variations) < 3:
                variations.append({'text': ''})
        elif len(variations) > 3:
            # If we have more, take only the first 3
            variations = variations[:3]
        
        # Extract text from each variation
        result = []
        for v in variations:
            if isinstance(v, dict):
                result.append(v.get('text', v.get('variation', str(v))))
            elif isinstance(v, str):
                result.append(v)
            else:
                result.append(str(v))
        
        return result

    except ClientError as e:
        msg = str(e)
        if "API" in msg and "key" in msg.lower():
            raise ValueError(
                "Invalid or expired Gemini API key. Check GEMINI_API_KEY in the project root .env, "
                "ensure the key is valid at https://aistudio.google.com/app/apikey and that the "
                "Generative Language API is enabled for your project."
            ) from e
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
                # Check if preferences exist
                cur.execute(
                    "SELECT * FROM user_post_preferences WHERE user_id = %s",
                    (user_id,)
                )
                prefs = cur.fetchone()
                
                if prefs:
                    # Update existing preferences
                    import json
                    platforms = prefs['preferred_platforms'] or []
                    tonalities = prefs['preferred_tonalities'] or []
                    languages = prefs['preferred_languages'] or []
                    themes = prefs['common_themes'] or []
                    
                    # Add new preferences (simple frequency tracking)
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
                    # Create new preferences
                    import json
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
        # Don't fail the request if preferences update fails

@posts_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate_posts():
    """Generate social media post variations"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Handle None values - .get() returns None if key exists with None value
        theme = (data.get('theme') or '').strip()
        description = (data.get('description') or '').strip()
        platform = (data.get('platform') or '').strip()
        tonality = (data.get('tonality') or '').strip()
        language = (data.get('language') or 'en').strip()
        target_audience = (data.get('target_audience') or '').strip()
        
        if not all([theme, platform, tonality]):
            return jsonify({'error': 'Theme, platform, and tonality are required'}), 400
        
        # Generate variations
        variations = generate_post_variations(
            theme, description, platform, tonality, language, target_audience
        )
        
        return jsonify({
            'variations': variations,
            'theme': theme,
            'description': description,
            'platform': platform,
            'tonality': tonality,
            'language': language,
            'target_audience': target_audience
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except ClientError as e:
        print(f"Gemini API error in generate_posts: {e}")
        return jsonify({
            'error': (
                'Gemini API key is invalid or not accepted. Check GEMINI_API_KEY in the project root .env, '
                'get a valid key from https://aistudio.google.com/app/apikey and ensure the Generative Language API is enabled.'
            )
        }), 503
    except Exception as e:
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
        
        # Handle None values - .get() returns None if key exists with None value
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
        
        if not selected_variation:
            return jsonify({'error': 'Selected variation is required'}), 400
        
        import json
        post_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """INSERT INTO social_posts 
                    (id, user_id, theme, description, platform, tonality, language, 
                     target_audience, generated_variations, selected_variation, 
                     media_url, media_type, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *""",
                    (post_id, user_id, theme, description, platform, tonality, language,
                     target_audience, json.dumps(generated_variations), selected_variation,
                     media_url, media_type, now, now)
                )
                post = cur.fetchone()
                conn.commit()
        
        # Update user preferences
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
                       sp.media_url, sp.media_type, sp.created_at, sp.updated_at,
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

