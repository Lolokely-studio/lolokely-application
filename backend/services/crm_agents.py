import json
import re
import time
from datetime import datetime, timezone

from services.crm_tools import (
    fetch_company_context,
    fetch_new_company_candidates,
    insert_ai_run,
    insert_outreach_pack,
)
from services.nvidia_llm import generate_text

CANDIDATE_LIMIT = 80


def _extract_json(text: str) -> dict:
    text = (text or '').strip()
    if text.startswith('```'):
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
    return json.loads(text)


def suggest_top_companies(user_id: str) -> dict:
    started = time.monotonic()
    candidates = fetch_new_company_candidates(CANDIDATE_LIMIT)
    if not candidates:
        run_id = insert_ai_run(
            user_id=user_id,
            run_type='suggest_top',
            company_id=None,
            model_used=None,
            duration_ms=int((time.monotonic() - started) * 1000),
            status='success',
            input_summary={'candidates': 0},
            output_summary={'items': []},
        )
        return {
            'generated_at': None,
            'model_used': None,
            'run_id': run_id,
            'candidates_considered': 0,
            'message': 'Aucune société en statut new.',
            'items': [],
        }

    compact = []
    for c in candidates:
        compact.append({
            'id': c['id'],
            'company_name': c.get('company_name'),
            'domain': c.get('domain'),
            'country': c.get('country'),
            'city': c.get('city'),
            'company_type': c.get('company_type'),
            'source': c.get('source'),
            'notes': (c.get('notes') or '')[:800],
            'emails_count': c.get('emails_count'),
            'financials_count': c.get('financials_count'),
            'prospects_count': c.get('prospects_count'),
            'financials_preview': c.get('financials_preview'),
        })

    system = (
        "Tu es un assistant CRM B2B. Tu scores des sociétés à contacter en PRIORITÉ. "
        "Réponds UNIQUEMENT en JSON valide (pas de markdown). "
        'Schema: {"items":[{"company_id":number,"score":number,"reasons":[string]}]}. '
        "score entre 0 et 1. Max 10 items. Trie score décroissant. "
        "Ne choisis QUE parmi les IDs fournis. Raisons en français, 2 à 4 bullets."
    )
    user_prompt = (
        "Voici des sociétés status=new. Sélectionne les 10 meilleures à contacter "
        f"maintenant:\n{json.dumps(compact, ensure_ascii=False)}"
    )

    model_used = None
    try:
        raw, model_used = generate_text(system, user_prompt)
        parsed = _extract_json(raw)
        allowed = {c['id'] for c in candidates}
        by_id = {c['id']: c for c in candidates}
        items = []
        for row in parsed.get('items') or []:
            cid = int(row['company_id'])
            if cid not in allowed:
                continue
            company = by_id[cid]
            items.append({
                'company_id': cid,
                'rank': len(items) + 1,
                'score': float(row.get('score', 0)),
                'reasons': list(row.get('reasons') or [])[:4],
                'company': {
                    'id': company['id'],
                    'name': company.get('company_name'),
                    'company_name': company.get('company_name'),
                    'status': company.get('status'),
                    'domain': company.get('domain'),
                },
            })
            if len(items) >= 10:
                break
        for i, it in enumerate(items, start=1):
            it['rank'] = i

        duration_ms = int((time.monotonic() - started) * 1000)
        run_id = insert_ai_run(
            user_id=user_id,
            run_type='suggest_top',
            company_id=None,
            model_used=model_used,
            duration_ms=duration_ms,
            status='success',
            input_summary={'candidates': len(candidates)},
            output_summary={'items': items, 'model_used': model_used},
        )
        return {
            'generated_at': datetime.now(timezone.utc).isoformat(),
            'model_used': model_used,
            'run_id': run_id,
            'candidates_considered': len(candidates),
            'items': items,
        }
    except Exception as e:
        duration_ms = int((time.monotonic() - started) * 1000)
        insert_ai_run(
            user_id=user_id,
            run_type='suggest_top',
            company_id=None,
            model_used=model_used,
            duration_ms=duration_ms,
            status='error',
            input_summary={'candidates': len(candidates)},
            output_summary={},
            error_message=str(e)[:1000],
        )
        raise


def generate_outreach_pack(user_id: str, company_id: int) -> dict:
    started = time.monotonic()
    ctx = fetch_company_context(company_id)
    if not ctx:
        raise ValueError('Company not found')

    model_used = None
    try:
        email_system = (
            "Tu rédiges un email d'outreach B2B en français. "
            'Réponds UNIQUEMENT en JSON: {"subject":string,"body":string}. '
            "Ton professionnel, personnalisé, concis. Pas de placeholders du type [Nom]."
        )
        email_user = (
            "Contexte société (JSON):\n"
            f"{json.dumps(ctx, ensure_ascii=False)}\n"
            "Rédige un email de premier contact proposant un échange."
        )
        email_raw, model_used = generate_text(email_system, email_user)
        email = _extract_json(email_raw)
        subject = (email.get('subject') or '').strip()
        body = (email.get('body') or '').strip()
        if not subject or not body:
            raise ValueError('Invalid email JSON from model')

        proposal_system = (
            "Tu rédiges un document de prestation / proposition commerciale en français, "
            "au format Markdown. Sections: Contexte, Besoins perçus, Périmètre proposé, "
            "Livrables, Modalités & next steps. Pricing indicatif seulement si les données "
            "le permettent — n'invente pas de contrat signé."
        )
        proposal_user = (
            "Contexte société:\n"
            f"{json.dumps(ctx, ensure_ascii=False)}\n"
            f"Email prévu (pour cohérence):\nSujet: {subject}\n\n{body}"
        )
        proposal_md, model2 = generate_text(proposal_system, proposal_user)
        if model2:
            model_used = model2
        proposal_md = (proposal_md or '').strip()
        if not proposal_md:
            raise ValueError('Empty proposal from model')

        pack_id = insert_outreach_pack(
            company_id=company_id,
            user_id=user_id,
            email_subject=subject,
            email_body=body,
            proposal_markdown=proposal_md,
            model_used=model_used,
        )
        duration_ms = int((time.monotonic() - started) * 1000)
        run_id = insert_ai_run(
            user_id=user_id,
            run_type='outreach_pack',
            company_id=company_id,
            model_used=model_used,
            duration_ms=duration_ms,
            status='success',
            input_summary={'company_id': company_id},
            output_summary={'pack_id': pack_id},
        )
        return {
            'pack_id': pack_id,
            'company_id': company_id,
            'email_subject': subject,
            'email_body': body,
            'proposal_markdown': proposal_md,
            'model_used': model_used,
            'run_id': run_id,
            'created_at': datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        duration_ms = int((time.monotonic() - started) * 1000)
        insert_ai_run(
            user_id=user_id,
            run_type='outreach_pack',
            company_id=company_id,
            model_used=model_used,
            duration_ms=duration_ms,
            status='error',
            input_summary={'company_id': company_id},
            output_summary={},
            error_message=str(e)[:1000],
        )
        raise
