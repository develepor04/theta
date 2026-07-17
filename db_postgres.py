"""
db_postgres.py — PostgreSQL back-end replacing JSON file storage.

Drop-in replacements for the four helpers in app.py:
    read_db(path)             -> list | dict
    write_db(path, data)
    read_base_file_config()   -> dict
    write_base_file_config(data)
"""

import json
import os
import uuid
from contextlib import contextmanager
from datetime import datetime, date, timezone
from pathlib import Path

import psycopg2
import psycopg2.extras
import psycopg2.pool

psycopg2.extras.register_uuid()


# ── .env ───────────────────────────────────────────────────────────────────────

def _load_dotenv(path):
    path = Path(path)
    if not path.exists():
        return
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, _, v = line.partition('=')
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_root = Path(__file__).parent
_load_dotenv(_root / '.env')
_load_dotenv(_root / 'database' / '.env')


# ── Connection pool ────────────────────────────────────────────────────────────

_pool: psycopg2.pool.ThreadedConnectionPool | None = None


def get_pool() -> psycopg2.pool.ThreadedConnectionPool:
    global _pool
    if _pool is None:
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=2,
            maxconn=20,
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', '5432')),
            dbname=os.getenv('DB_NAME', 'deskon'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', ''),
        )
    return _pool


@contextmanager
def _conn():
    pool = get_pool()
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


# ── Type helpers ───────────────────────────────────────────────────────────────

def _coerce(val):
    """Convert psycopg2 result types to JSON-safe Python types."""
    if isinstance(val, uuid.UUID):
        return str(val)
    if isinstance(val, datetime):
        if val.tzinfo is None:
            val = val.replace(tzinfo=timezone.utc)
        return val.isoformat()
    if isinstance(val, date):
        return str(val)
    return val


def _row(cur, extra_coerce=None):
    """Fetch all rows as list of dicts with coerced types."""
    if not cur.description:
        return []
    cols = [d[0] for d in cur.description]
    result = []
    for row in cur.fetchall():
        d = {c: _coerce(v) for c, v in zip(cols, row)}
        if extra_coerce:
            extra_coerce(d)
        result.append(d)
    return result


def _j(val):
    """Wrap a Python object for JSONB insertion."""
    if val is None:
        return None
    return psycopg2.extras.Json(val)


def _uid(val):
    """Safely parse a UUID string or return None."""
    if val is None:
        return None
    try:
        return uuid.UUID(str(val))
    except (ValueError, AttributeError):
        return None


def _user_exists(cur, uid):
    if uid is None:
        return False
    cur.execute('SELECT 1 FROM users WHERE id = %s', (uid,))
    return cur.fetchone() is not None


# ── Read functions ─────────────────────────────────────────────────────────────

def _read_users(cur):
    cur.execute(
        'SELECT id, email, name, role, password, must_change_password, created_at, updated_at, '
        'company_id, status, approved_by '
        'FROM users ORDER BY created_at'
    )
    return _row(cur)


def _read_subscriptions(cur):
    cur.execute(
        'SELECT user_id, plan, uploads_today, total_uploads, last_upload_date, daily_limit, is_locked '
        'FROM subscriptions'
    )
    return _row(cur)


def _read_notifications(cur):
    cur.execute(
        'SELECT id, user_id, title, message, type, metadata, read, created_at '
        'FROM notifications ORDER BY created_at DESC'
    )
    return _row(cur)


def _read_history(cur):
    cur.execute(
        'SELECT id, user_id, company_id, filename, status, total_sheets, success_count, error_count, '
        'detected_sheets, results, processed_at '
        'FROM history ORDER BY processed_at DESC'
    )
    return _row(cur)


def _read_password_reset_tokens(cur):
    cur.execute('SELECT token, user_id, created_at, expires_at FROM password_reset_tokens')
    return _row(cur)


def _read_engage_posts(cur):
    cur.execute(
        'SELECT id, user_id, company_id, user_name, user_email, content, image_url, group_id, '
        'source, likes, comments, created_at FROM engage_posts ORDER BY created_at DESC'
    )
    return _row(cur)


def _read_engage_groups(cur):
    cur.execute('SELECT id, name, members, company_id, created_at FROM engage_groups ORDER BY created_at')
    rows = []
    if not cur.description:
        return rows
    for r in cur.fetchall():
        rows.append({
            'id': _coerce(r[0]),
            'name': r[1],
            'member_ids': r[2] if r[2] is not None else [],  # app expects 'member_ids'
            'company_id': _coerce(r[3]),
            'created_at': _coerce(r[4]),
        })
    return rows


def _read_ai_response_cache(cur):
    cur.execute(
        'SELECT cache_key, user_id, question, response, context_hash, created_at '
        'FROM ai_response_cache ORDER BY created_at DESC'
    )
    return _row(cur)


def _read_intelligence_insight_cache(cur):
    cur.execute(
        'SELECT cache_key, data_hash, section, title, insight, created_at '
        'FROM intelligence_insight_cache ORDER BY created_at'
    )
    return _row(cur)


def _read_base_file_versions(cur):
    cur.execute(
        'SELECT version_id, stage, base_filename, snapshot_rel_path, snapshot_abs_path, '
        'snapshot_size_bytes, merge_summary, context, created_at '
        'FROM base_file_versions ORDER BY created_at DESC'
    )
    return _row(cur)


def _read_update_chain(cur):
    cur.execute(
        'SELECT index, filename, source_upload, job_id, approved_by, status, created_at '
        'FROM update_chain ORDER BY index'
    )
    return _row(cur)


def _read_pending_upload_approvals(cur):
    cur.execute(
        'SELECT approval_id, job_id, upload_filename, upload_path, user_id, user_name, '
        'company_id, status, detected_changes, submitted_at '
        'FROM pending_upload_approvals ORDER BY submitted_at DESC'
    )
    return _row(cur)


def _read_whatif_claude_responses(cur):
    cur.execute(
        'SELECT id, session_id, user_id, question, response, context, created_at '
        'FROM whatif_claude_responses ORDER BY created_at DESC'
    )
    return _row(cur)


def _read_whatif_critical_dashboard(cur):
    cur.execute("SELECT data FROM whatif_critical_dashboard_data WHERE cache_key = 'default'")
    r = cur.fetchone()
    return r[0] if r and r[0] else {}


def _read_whatif_realtime(cur):
    cur.execute("SELECT data FROM whatif_realtime_data WHERE cache_key = 'default'")
    r = cur.fetchone()
    return r[0] if r and r[0] else {}


def _read_whatif_predecessor_successor(cur):
    cur.execute('SELECT cache_key, generated_at, source, dependencies FROM whatif_predecessor_successor_cache')
    result = {}
    for r in cur.fetchall():
        result[r[0]] = {'generated_at': _coerce(r[1]), 'source': r[2], 'dependencies': r[3]}
    return result


def _read_whatif_project_update_summary(cur):
    cur.execute('SELECT cache_key, generated_at, source, updates FROM whatif_project_update_summary')
    result = {}
    for r in cur.fetchall():
        result[r[0]] = {'generated_at': _coerce(r[1]), 'source': r[2], 'updates': r[3]}
    return result


def _read_pptx_slide_sections(cur):
    cur.execute('SELECT section_key, data FROM pptx_slide_sections')
    return {r[0]: r[1] for r in cur.fetchall()}


# ── Write functions ────────────────────────────────────────────────────────────

def _write_users(cur, data):
    if not isinstance(data, list):
        return
    pks = [str(r['id']) for r in data if r.get('id')]
    if pks:
        cur.execute('DELETE FROM users WHERE id::text != ALL(%s)', (pks,))
    else:
        cur.execute('DELETE FROM users')
    for u in data:
        cur.execute(
            """
            INSERT INTO users (id, email, name, role, password, must_change_password, created_at, updated_at,
                company_id, status, approved_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                email=EXCLUDED.email, name=EXCLUDED.name, role=EXCLUDED.role,
                password=EXCLUDED.password, must_change_password=EXCLUDED.must_change_password,
                updated_at=EXCLUDED.updated_at,
                company_id=EXCLUDED.company_id, status=EXCLUDED.status, approved_by=EXCLUDED.approved_by
            """,
            (
                _uid(u.get('id')), u.get('email'), u.get('name'), u.get('role', 'user'),
                u.get('password'), u.get('must_change_password', False),
                u.get('created_at'), u.get('updated_at'),
                _uid(u.get('company_id')), u.get('status', 'approved'), _uid(u.get('approved_by')),
            ),
        )


def _write_subscriptions(cur, data):
    if not isinstance(data, list):
        return
    pks = [str(r['user_id']) for r in data if r.get('user_id')]
    if pks:
        cur.execute('DELETE FROM subscriptions WHERE user_id::text != ALL(%s)', (pks,))
    else:
        cur.execute('DELETE FROM subscriptions')
    for s in data:
        uid = _uid(s.get('user_id'))
        if uid is None or not _user_exists(cur, uid):
            continue
        cur.execute(
            """
            INSERT INTO subscriptions (user_id, plan, uploads_today, total_uploads, last_upload_date, daily_limit, is_locked)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id) DO UPDATE SET
                plan=EXCLUDED.plan, uploads_today=EXCLUDED.uploads_today,
                total_uploads=EXCLUDED.total_uploads, last_upload_date=EXCLUDED.last_upload_date,
                daily_limit=EXCLUDED.daily_limit, is_locked=EXCLUDED.is_locked
            """,
            (
                uid, s.get('plan', 'free'), s.get('uploads_today', 0),
                s.get('total_uploads', 0), s.get('last_upload_date') or None,
                s.get('daily_limit', 1), s.get('is_locked', False),
            ),
        )


def _write_notifications(cur, data):
    if not isinstance(data, list):
        return
    pks = [str(r['id']) for r in data if r.get('id')]
    if pks:
        cur.execute('DELETE FROM notifications WHERE id::text != ALL(%s)', (pks,))
    else:
        cur.execute('DELETE FROM notifications')
    for n in data:
        nid = _uid(n.get('id'))
        uid = _uid(n.get('user_id'))
        if nid is None or uid is None:
            continue
        if not _user_exists(cur, uid):
            continue
        cur.execute(
            """
            INSERT INTO notifications (id, user_id, title, message, type, metadata, read, created_at)
            VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                title=EXCLUDED.title, message=EXCLUDED.message, type=EXCLUDED.type,
                metadata=EXCLUDED.metadata, read=EXCLUDED.read
            """,
            (
                nid, uid, n.get('title', ''), n.get('message', ''), n.get('type', 'info'),
                _j(n.get('metadata', {})), n.get('read', False), n.get('created_at'),
            ),
        )


def _write_history(cur, data):
    # UPSERT-only — never bulk-delete rows not in the list.
    # Callers that need to delete a single row must use pg_delete_history_entry().
    if not isinstance(data, list):
        return
    for h in data:
        hid = _uid(h.get('id'))
        if hid is None:
            continue
        uid = _uid(h.get('user_id'))
        if uid is not None and not _user_exists(cur, uid):
            uid = None
        cid = _uid(h.get('company_id'))
        cur.execute(
            """
            INSERT INTO history (id, user_id, company_id, filename, status, total_sheets, success_count,
                error_count, detected_sheets, results, processed_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s)
            ON CONFLICT (id) DO UPDATE SET
                status=EXCLUDED.status, success_count=EXCLUDED.success_count,
                error_count=EXCLUDED.error_count, detected_sheets=EXCLUDED.detected_sheets,
                results=EXCLUDED.results, company_id=EXCLUDED.company_id
            """,
            (
                hid, uid, cid, h.get('filename', ''), h.get('status', 'completed'),
                h.get('total_sheets', 0), h.get('success_count', 0), h.get('error_count', 0),
                _j(h.get('detected_sheets', [])), _j(h.get('results', [])),
                h.get('processed_at'),
            ),
        )


def _write_password_reset_tokens(cur, data):
    if not isinstance(data, list):
        return
    cur.execute('DELETE FROM password_reset_tokens')
    for t in data:
        uid = _uid(t.get('user_id'))
        token = t.get('token')
        if not token or uid is None or not _user_exists(cur, uid):
            continue
        cur.execute(
            """
            INSERT INTO password_reset_tokens (token, user_id, created_at, expires_at)
            VALUES (%s, %s, %s, %s) ON CONFLICT (token) DO NOTHING
            """,
            (token, uid, t.get('created_at'), t.get('expires_at')),
        )


def _write_engage_posts(cur, data):
    if not isinstance(data, list):
        return
    pks = [r['id'] for r in data if r.get('id')]
    if pks:
        cur.execute('DELETE FROM engage_posts WHERE id != ALL(%s)', (pks,))
    else:
        cur.execute('DELETE FROM engage_posts')
    for p in data:
        if not p.get('id'):
            continue
        uid = _uid(p.get('user_id'))
        cid = _uid(p.get('company_id'))
        cur.execute(
            """
            INSERT INTO engage_posts (id, user_id, company_id, user_name, user_email, content, image_url,
                group_id, source, likes, comments, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s)
            ON CONFLICT (id) DO UPDATE SET
                content=EXCLUDED.content, image_url=EXCLUDED.image_url,
                likes=EXCLUDED.likes, comments=EXCLUDED.comments,
                company_id=EXCLUDED.company_id
            """,
            (
                p['id'], uid, cid, p.get('user_name', ''), p.get('user_email', ''),
                p.get('content', ''), p.get('image_url', ''), p.get('group_id', ''),
                p.get('source', 'manual'), _j(p.get('likes', [])), _j(p.get('comments', [])),
                p.get('created_at'),
            ),
        )


def _write_engage_groups(cur, data):
    if not isinstance(data, list):
        return
    pks = [str(r['id']) for r in data if r.get('id')]
    if pks:
        cur.execute('DELETE FROM engage_groups WHERE id::text != ALL(%s)', (pks,))
    else:
        cur.execute('DELETE FROM engage_groups')
    for g in data:
        gid = _uid(g.get('id'))
        if gid is None:
            continue
        # app stores member list under 'member_ids', DB column is 'members'
        members = g.get('member_ids', g.get('members', []))
        cid = _uid(g.get('company_id'))
        cur.execute(
            """
            INSERT INTO engage_groups (id, name, members, company_id, created_at)
            VALUES (%s, %s, %s::jsonb, %s, %s)
            ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, members=EXCLUDED.members,
                company_id=EXCLUDED.company_id
            """,
            (gid, g.get('name', ''), _j(members), cid, g.get('created_at')),
        )


def _write_ai_response_cache(cur, data):
    if not isinstance(data, list):
        return
    pks = [r['cache_key'] for r in data if r.get('cache_key')]
    if pks:
        cur.execute('DELETE FROM ai_response_cache WHERE cache_key != ALL(%s)', (pks,))
    else:
        cur.execute('DELETE FROM ai_response_cache')
    for r in data:
        key = r.get('cache_key')
        if not key:
            continue
        uid = _uid(r.get('user_id'))
        cur.execute(
            """
            INSERT INTO ai_response_cache (cache_key, user_id, question, response, context_hash, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (cache_key) DO UPDATE SET
                question=EXCLUDED.question, response=EXCLUDED.response,
                context_hash=EXCLUDED.context_hash, created_at=EXCLUDED.created_at
            """,
            (key, uid, r.get('question', ''), r.get('response', ''), r.get('context_hash', ''), r.get('created_at')),
        )


def _write_intelligence_insight_cache(cur, data):
    if not isinstance(data, list):
        return
    pks = [r['cache_key'] for r in data if r.get('cache_key')]
    if pks:
        cur.execute('DELETE FROM intelligence_insight_cache WHERE cache_key != ALL(%s)', (pks,))
    else:
        cur.execute('DELETE FROM intelligence_insight_cache')
    for r in data:
        key = r.get('cache_key')
        if not key:
            continue
        cur.execute(
            """
            INSERT INTO intelligence_insight_cache (cache_key, data_hash, section, title, insight, created_at)
            VALUES (%s, %s, %s, %s, %s::jsonb, %s)
            ON CONFLICT (cache_key) DO UPDATE SET
                data_hash=EXCLUDED.data_hash, insight=EXCLUDED.insight
            """,
            (key, r.get('data_hash', ''), r.get('section', ''), r.get('title', ''),
             _j(r.get('insight', {})), r.get('created_at')),
        )


def _write_base_file_versions(cur, data):
    if not isinstance(data, list):
        return
    pks = [r['version_id'] for r in data if r.get('version_id')]
    if pks:
        cur.execute('DELETE FROM base_file_versions WHERE version_id != ALL(%s)', (pks,))
    else:
        cur.execute('DELETE FROM base_file_versions')
    for v in data:
        vid = v.get('version_id')
        if not vid:
            continue
        cur.execute(
            """
            INSERT INTO base_file_versions
                (version_id, stage, base_filename, snapshot_rel_path, snapshot_abs_path,
                 snapshot_size_bytes, merge_summary, context, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s)
            ON CONFLICT (version_id) DO NOTHING
            """,
            (
                vid, v.get('stage', ''), v.get('base_filename', ''),
                v.get('snapshot_rel_path', ''), v.get('snapshot_abs_path', ''),
                v.get('snapshot_size_bytes'), _j(v.get('merge_summary', {})),
                _j(v.get('context', {})), v.get('created_at'),
            ),
        )


def _write_update_chain(cur, data):
    if not isinstance(data, list):
        return
    cur.execute('DELETE FROM update_chain')
    for u in data:
        cur.execute(
            """
            INSERT INTO update_chain (filename, source_upload, job_id, approved_by, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                u.get('filename', ''), u.get('source_upload', ''), _uid(u.get('job_id')),
                u.get('approved_by', 'auto'), u.get('status', 'approved'), u.get('created_at'),
            ),
        )


def _write_pending_upload_approvals(cur, data):
    # UPSERT-only — never bulk-delete. Concurrent approvals from different companies
    # must not delete each other's rows. Use pg_delete_approval_entry() for targeted deletes.
    if not isinstance(data, list):
        return
    for a in data:
        aid = _uid(a.get('approval_id'))
        uid = _uid(a.get('user_id'))
        if aid is None or uid is None:
            continue
        cid = _uid(a.get('company_id'))
        cur.execute(
            """
            INSERT INTO pending_upload_approvals
                (approval_id, job_id, upload_filename, upload_path, user_id, user_name,
                 company_id, status, detected_changes, submitted_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
            ON CONFLICT (approval_id) DO UPDATE SET
                status=EXCLUDED.status, detected_changes=EXCLUDED.detected_changes,
                company_id=EXCLUDED.company_id
            """,
            (
                aid, _uid(a.get('job_id')), a.get('upload_filename', ''), a.get('upload_path', ''),
                uid, a.get('user_name', ''), cid, a.get('status', 'pending'),
                _j(a.get('detected_changes', [])), a.get('submitted_at'),
            ),
        )


def _write_whatif_claude_responses(cur, data):
    if not isinstance(data, list):
        return
    cur.execute('DELETE FROM whatif_claude_responses')
    for r in data:
        cur.execute(
            """
            INSERT INTO whatif_claude_responses (session_id, user_id, question, response, context, created_at)
            VALUES (%s, %s, %s, %s, %s::jsonb, %s)
            """,
            (_uid(r.get('session_id')), _uid(r.get('user_id')),
             r.get('question'), r.get('response'), _j(r.get('context', {})), r.get('created_at')),
        )


def _write_whatif_critical_dashboard(cur, data):
    cur.execute(
        """
        INSERT INTO whatif_critical_dashboard_data (cache_key, data, updated_at)
        VALUES ('default', %s::jsonb, NOW())
        ON CONFLICT (cache_key) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW()
        """,
        (_j(data),),
    )


def _write_whatif_realtime(cur, data):
    cur.execute(
        """
        INSERT INTO whatif_realtime_data (cache_key, data, updated_at)
        VALUES ('default', %s::jsonb, NOW())
        ON CONFLICT (cache_key) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW()
        """,
        (_j(data),),
    )


def _write_whatif_predecessor_successor(cur, data):
    if not isinstance(data, dict):
        return
    all_keys = list(data.keys())
    if all_keys:
        cur.execute('DELETE FROM whatif_predecessor_successor_cache WHERE cache_key != ALL(%s)', (all_keys,))
    else:
        cur.execute('DELETE FROM whatif_predecessor_successor_cache')
    for cache_key, entry in data.items():
        cur.execute(
            """
            INSERT INTO whatif_predecessor_successor_cache (cache_key, generated_at, source, dependencies)
            VALUES (%s, %s, %s::jsonb, %s::jsonb)
            ON CONFLICT (cache_key) DO UPDATE SET
                generated_at=EXCLUDED.generated_at, source=EXCLUDED.source,
                dependencies=EXCLUDED.dependencies
            """,
            (cache_key, entry.get('generated_at'), _j(entry.get('source', {})), _j(entry.get('dependencies', []))),
        )


def _write_whatif_project_update_summary(cur, data):
    if not isinstance(data, dict):
        return
    all_keys = list(data.keys())
    if all_keys:
        cur.execute('DELETE FROM whatif_project_update_summary WHERE cache_key != ALL(%s)', (all_keys,))
    else:
        cur.execute('DELETE FROM whatif_project_update_summary')
    for cache_key, entry in data.items():
        cur.execute(
            """
            INSERT INTO whatif_project_update_summary (cache_key, generated_at, source, updates)
            VALUES (%s, %s, %s::jsonb, %s::jsonb)
            ON CONFLICT (cache_key) DO UPDATE SET
                generated_at=EXCLUDED.generated_at, source=EXCLUDED.source, updates=EXCLUDED.updates
            """,
            (cache_key, entry.get('generated_at'), _j(entry.get('source', {})), _j(entry.get('updates', []))),
        )


def _write_pptx_slide_sections(cur, data):
    if not isinstance(data, dict):
        return
    all_keys = list(data.keys())
    if all_keys:
        cur.execute('DELETE FROM pptx_slide_sections WHERE section_key != ALL(%s)', (all_keys,))
    else:
        cur.execute('DELETE FROM pptx_slide_sections')
    for section_key, section_data in data.items():
        cur.execute(
            """
            INSERT INTO pptx_slide_sections (section_key, data, updated_at)
            VALUES (%s, %s::jsonb, NOW())
            ON CONFLICT (section_key) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW()
            """,
            (section_key, _j(section_data)),
        )


# ── Recovery narrative ────────────────────────────────────────────────────────

def pg_read_recovery_narrative(company_id=None) -> dict:
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute('SELECT data FROM recovery_narrative WHERE company_id = %s', (cid,))
                else:
                    cur.execute('SELECT data FROM recovery_narrative WHERE company_id IS NULL')
                row = cur.fetchone()
                return row[0] if row and row[0] else {}
    except Exception as e:
        print(f'[DB] pg_read_recovery_narrative error: {e}')
        return {}


def pg_write_recovery_narrative(data: dict, company_id=None):
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute('DELETE FROM recovery_narrative WHERE company_id = %s', (cid,))
                    cur.execute(
                        'INSERT INTO recovery_narrative (company_id, data, updated_at) VALUES (%s, %s::jsonb, NOW())',
                        (cid, _j(data)),
                    )
                else:
                    cur.execute('DELETE FROM recovery_narrative WHERE company_id IS NULL')
                    cur.execute(
                        'INSERT INTO recovery_narrative (data, updated_at) VALUES (%s::jsonb, NOW())',
                        (_j(data),),
                    )
    except Exception as e:
        print(f'[DB] pg_write_recovery_narrative error: {e}')


# ── Dispatch table ─────────────────────────────────────────────────────────────

_DISPATCH = {
    'users':                              (_read_users,                        _write_users),
    'subscriptions':                      (_read_subscriptions,                _write_subscriptions),
    'notifications':                      (_read_notifications,                _write_notifications),
    'history':                            (_read_history,                      _write_history),
    'password_reset_tokens':              (_read_password_reset_tokens,        _write_password_reset_tokens),
    'engage_posts':                       (_read_engage_posts,                 _write_engage_posts),
    'engage_groups':                      (_read_engage_groups,                _write_engage_groups),
    'ai_response_cache':                  (_read_ai_response_cache,            _write_ai_response_cache),
    'intelligence_insight_cache':         (_read_intelligence_insight_cache,   _write_intelligence_insight_cache),
    'base_file_versions':                 (_read_base_file_versions,           _write_base_file_versions),
    'update_chain':                       (_read_update_chain,                 _write_update_chain),
    'pending_upload_approvals':           (_read_pending_upload_approvals,     _write_pending_upload_approvals),
    'whatif_claude_responses':            (_read_whatif_claude_responses,      _write_whatif_claude_responses),
    'whatif_critical_dashboard_data':     (_read_whatif_critical_dashboard,    _write_whatif_critical_dashboard),
    'whatif_realtime_data':               (_read_whatif_realtime,              _write_whatif_realtime),
    'whatif_predecessor_successor_cache': (_read_whatif_predecessor_successor, _write_whatif_predecessor_successor),
    'whatif_project_update_summary':      (_read_whatif_project_update_summary, _write_whatif_project_update_summary),
    'pptx_slide_sections':                (_read_pptx_slide_sections,          _write_pptx_slide_sections),
}


# ── Single-row history helpers ─────────────────────────────────────────────────

def pg_upsert_history_entry(entry: dict):
    """Insert or update a single history row — no bulk operations."""
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                hid = _uid(entry.get('id'))
                if hid is None:
                    return
                uid = _uid(entry.get('user_id'))
                cid = _uid(entry.get('company_id'))
                cur.execute(
                    """
                    INSERT INTO history (id, user_id, company_id, filename, status, total_sheets,
                        success_count, error_count, detected_sheets, results, processed_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        status=EXCLUDED.status, success_count=EXCLUDED.success_count,
                        error_count=EXCLUDED.error_count, detected_sheets=EXCLUDED.detected_sheets,
                        results=EXCLUDED.results, company_id=EXCLUDED.company_id
                    """,
                    (
                        hid, uid, cid, entry.get('filename', ''), entry.get('status', 'processing'),
                        entry.get('total_sheets', 0), entry.get('success_count', 0),
                        entry.get('error_count', 0),
                        _j(entry.get('detected_sheets', [])), _j(entry.get('results', [])),
                        entry.get('processed_at'),
                    ),
                )
    except Exception as e:
        print(f'[DB] pg_upsert_history_entry error: {e}')
        raise


def pg_delete_history_entry(job_id: str) -> bool:
    """Delete a single history row by job_id."""
    hid = _uid(job_id)
    if not hid:
        return False
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute('DELETE FROM history WHERE id = %s', (hid,))
                return cur.rowcount > 0
    except Exception as e:
        print(f'[DB] pg_delete_history_entry error: {e}')
        return False


_HISTORY_COLS = (
    'SELECT id, user_id, company_id, filename, status, total_sheets, success_count, '
    'error_count, detected_sheets, results, processed_at FROM history'
)


def pg_get_history_entry(job_id: str, user_id: str = None) -> dict | None:
    """Fetch a single history row by job_id; optionally verify user ownership."""
    hid = _uid(job_id)
    if not hid:
        return None
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if user_id:
                    uid = _uid(user_id)
                    cur.execute(f'{_HISTORY_COLS} WHERE id = %s AND user_id = %s', (hid, uid))
                else:
                    cur.execute(f'{_HISTORY_COLS} WHERE id = %s', (hid,))
                rows = _row(cur)
                return rows[0] if rows else None
    except Exception as e:
        print(f'[DB] pg_get_history_entry error: {e}')
        return None


def pg_read_history_for_company(company_id=None, user_id=None, status: str = None, limit: int = 500) -> list:
    """Return history rows filtered at the DB level, newest first.
    company_id and user_id are ANDed when both provided."""
    cid = _uid(company_id) if company_id else None
    uid = _uid(user_id) if user_id else None
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                clauses, params = [], []
                if cid:
                    clauses.append('company_id = %s'); params.append(cid)
                if uid:
                    clauses.append('user_id = %s'); params.append(uid)
                if status:
                    clauses.append('status = %s'); params.append(status)
                where = ('WHERE ' + ' AND '.join(clauses)) if clauses else ''
                params.append(limit)
                cur.execute(f'{_HISTORY_COLS} {where} ORDER BY processed_at DESC LIMIT %s', params)
                return _row(cur)
    except Exception as e:
        print(f'[DB] pg_read_history_for_company error: {e}')
        return []


def pg_delete_approval_entry(approval_id: str) -> bool:
    """Delete a single pending_upload_approvals row by approval_id."""
    aid = _uid(approval_id)
    if not aid:
        return False
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute('DELETE FROM pending_upload_approvals WHERE approval_id = %s', (aid,))
                return cur.rowcount > 0
    except Exception as e:
        print(f'[DB] pg_delete_approval_entry error: {e}')
        return False


# ── Company-scoped engage reads ────────────────────────────────────────────────

def pg_read_engage_posts_for_company(company_id=None) -> list:
    """Return all engage posts for a specific company, ordered newest first."""
    cid = _uid(company_id) if company_id else None
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute(
                        'SELECT id, user_id, company_id, user_name, user_email, content, image_url, '
                        'group_id, source, likes, comments, created_at '
                        'FROM engage_posts WHERE company_id = %s ORDER BY created_at DESC',
                        (cid,),
                    )
                else:
                    cur.execute(
                        'SELECT id, user_id, company_id, user_name, user_email, content, image_url, '
                        'group_id, source, likes, comments, created_at '
                        'FROM engage_posts WHERE company_id IS NULL ORDER BY created_at DESC'
                    )
                return _row(cur)
    except Exception as e:
        print(f'[DB] pg_read_engage_posts_for_company error: {e}')
        return []


def pg_read_engage_groups_for_company(company_id=None) -> list:
    """Return all engage groups for a specific company."""
    cid = _uid(company_id) if company_id else None
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute(
                        'SELECT id, name, members, company_id, created_at '
                        'FROM engage_groups WHERE company_id = %s ORDER BY created_at',
                        (cid,),
                    )
                else:
                    cur.execute(
                        'SELECT id, name, members, company_id, created_at '
                        'FROM engage_groups WHERE company_id IS NULL ORDER BY created_at'
                    )
                rows = []
                if not cur.description:
                    return rows
                for r in cur.fetchall():
                    rows.append({
                        'id': _coerce(r[0]),
                        'name': r[1],
                        'member_ids': r[2] if r[2] is not None else [],
                        'company_id': _coerce(r[3]),
                        'created_at': _coerce(r[4]),
                    })
                return rows
    except Exception as e:
        print(f'[DB] pg_read_engage_groups_for_company error: {e}')
        return []


def pg_get_engage_group_by_id(group_id: str) -> dict | None:
    """Fetch a single engage group by ID."""
    gid = _uid(group_id)
    if not gid:
        return None
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT id, name, members, company_id, created_at, created_by '
                    'FROM engage_groups WHERE id = %s',
                    (gid,),
                )
                r = cur.fetchone()
                if not r:
                    return None
                cols = [d[0] for d in cur.description]
                row = dict(zip(cols, r))
                row['id'] = _coerce(row.get('id'))
                row['company_id'] = _coerce(row.get('company_id'))
                row['created_at'] = _coerce(row.get('created_at'))
                members = row.get('members') or []
                row['member_ids'] = members
                return row
    except Exception as e:
        print(f'[DB] pg_get_engage_group_by_id error: {e}')
        return None


# ── Public API ─────────────────────────────────────────────────────────────────

def read_db(db_file_path: str):
    key = os.path.basename(db_file_path).replace('.json', '')
    if key not in _DISPATCH:
        print(f'[DB] read_db: no postgres mapping for "{key}", falling back to JSON')
        try:
            with open(db_file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []
    read_fn, _ = _DISPATCH[key]
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                return read_fn(cur)
    except Exception as e:
        print(f'[DB] read_db({key}) error: {e}')
        raise


def write_db(db_file_path: str, data):
    key = os.path.basename(db_file_path).replace('.json', '')
    if key not in _DISPATCH:
        print(f'[DB] write_db: no postgres mapping for "{key}", falling back to JSON')
        try:
            with open(db_file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f'[DB] write_db JSON fallback error for "{key}": {e}')
        return
    _, write_fn = _DISPATCH[key]
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                write_fn(cur, data)
    except Exception as e:
        print(f'[DB] write_db({key}) error: {e}')
        raise


def read_base_file_config(company_id=None) -> dict:
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute(
                        'SELECT filename, sheet_name, is_active FROM base_file_config '
                        'WHERE company_id = %s ORDER BY id DESC LIMIT 1',
                        (cid,),
                    )
                else:
                    cur.execute(
                        'SELECT filename, sheet_name, is_active FROM base_file_config '
                        'WHERE company_id IS NULL ORDER BY id DESC LIMIT 1'
                    )
                r = cur.fetchone()
                if not r:
                    return {}
                return {'filename': r[0], 'sheet_name': r[1], 'is_active': r[2]}
    except Exception as e:
        print(f'[DB] read_base_file_config error: {e}')
        return {}


def write_base_file_config(data: dict, company_id=None):
    if not data:
        return
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'INSERT INTO base_file_config (filename, sheet_name, is_active, company_id, updated_at) '
                    'VALUES (%s, %s, %s, %s, NOW())',
                    (data.get('filename', ''), data.get('sheet_name', ''), data.get('is_active', True), cid),
                )
                # Keep only the most recent config row per company
                if cid:
                    cur.execute(
                        'DELETE FROM base_file_config WHERE company_id = %s '
                        'AND id NOT IN (SELECT id FROM base_file_config WHERE company_id = %s ORDER BY id DESC LIMIT 1)',
                        (cid, cid),
                    )
                else:
                    cur.execute(
                        'DELETE FROM base_file_config WHERE company_id IS NULL '
                        'AND id NOT IN (SELECT id FROM base_file_config WHERE company_id IS NULL ORDER BY id DESC LIMIT 1)'
                    )
    except Exception as e:
        print(f'[DB] write_base_file_config error: {e}')


# ── Push Subscriptions ────────────────────────────────────────────────────────

def save_push_subscription(user_id: str, endpoint: str, p256dh: str, auth: str):
    uid = _uid(user_id)
    if not uid:
        return
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (user_id, endpoint) DO UPDATE
                        SET p256dh=EXCLUDED.p256dh, auth=EXCLUDED.auth
                    """,
                    (uid, endpoint, p256dh, auth),
                )
    except Exception as e:
        print(f'[DB] save_push_subscription error: {e}')


def get_push_subscriptions(user_id: str) -> list:
    uid = _uid(user_id)
    if not uid:
        return []
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = %s',
                    (uid,),
                )
                return [{'endpoint': r[0], 'keys': {'p256dh': r[1], 'auth': r[2]}} for r in cur.fetchall()]
    except Exception as e:
        print(f'[DB] get_push_subscriptions error: {e}')
        return []


def get_all_push_subscriptions() -> list:
    """Return all subscriptions with user_id — used for admin broadcasts."""
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute('SELECT user_id, endpoint, p256dh, auth FROM push_subscriptions')
                return [
                    {'user_id': str(r[0]), 'endpoint': r[1], 'keys': {'p256dh': r[2], 'auth': r[3]}}
                    for r in cur.fetchall()
                ]
    except Exception as e:
        print(f'[DB] get_all_push_subscriptions error: {e}')
        return []


def delete_push_subscription(endpoint: str):
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute('DELETE FROM push_subscriptions WHERE endpoint = %s', (endpoint,))
    except Exception as e:
        print(f'[DB] delete_push_subscription error: {e}')


# ── Engage Monthly Summary Log ────────────────────────────────────────────────

def init_engage_monthly_log_table():
    """Create the engage_monthly_summary_log table if it doesn't exist."""
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS engage_monthly_summary_log (
                    id         SERIAL PRIMARY KEY,
                    month      TEXT NOT NULL,       -- 'YYYY-MM'
                    company_id UUID,
                    post_id    TEXT NOT NULL,
                    posted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
            # Idempotent migration: add company_id if table predates multi-tenancy
            cur.execute("""
                ALTER TABLE engage_monthly_summary_log
                    ADD COLUMN IF NOT EXISTS company_id UUID
            """)
            cur.execute("""
                ALTER TABLE engage_monthly_summary_log
                    DROP CONSTRAINT IF EXISTS engage_monthly_summary_log_month_key
            """)
            cur.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_monthly_log_month_company
                    ON engage_monthly_summary_log(month, COALESCE(company_id::text, ''))
            """)


def is_monthly_summary_posted(month_key: str, company_id=None) -> bool:
    """Return True if a summary for month_key was already posted for this company."""
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT 1 FROM engage_monthly_summary_log "
                    "WHERE month = %s AND company_id IS NOT DISTINCT FROM %s",
                    (month_key, _uid(company_id)),
                )
                return cur.fetchone() is not None
    except Exception as e:
        print(f'[DB] is_monthly_summary_posted error: {e}')
        return False


def log_monthly_summary_posted(month_key: str, post_id: str, company_id=None):
    """Record that the monthly summary was posted for month_key + company."""
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO engage_monthly_summary_log (month, company_id, post_id)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (month, COALESCE(company_id::text, ''))
                    DO UPDATE SET post_id=EXCLUDED.post_id, posted_at=NOW()
                    """,
                    (month_key, _uid(company_id), post_id),
                )
    except Exception as e:
        print(f'[DB] log_monthly_summary_posted error: {e}')


# ── Monthly Reports ───────────────────────────────────────────────────────────

def init_monthly_reports_table():
    """Create monthly_reports table if it doesn't exist, and add company_id column if missing."""
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS monthly_reports (
                    id         SERIAL PRIMARY KEY,
                    month      TEXT NOT NULL,
                    year       INTEGER NOT NULL DEFAULT 2026,
                    data       JSONB NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                    UNIQUE (month, year, company_id)
                )
            """)
            # Migrate existing tables that predate the company_id column
            cur.execute("""
                ALTER TABLE monthly_reports
                    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE
            """)
            # Drop old (month, year)-only constraint that predates multi-tenancy
            cur.execute("""
                ALTER TABLE monthly_reports
                    DROP CONSTRAINT IF EXISTS monthly_reports_month_year_key
            """)
            cur.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS monthly_reports_month_year_company_idx
                    ON monthly_reports (month, year, company_id)
            """)


def get_monthly_reports(year: int = 2026, company_id=None) -> list:
    """Return all monthly reports for a given year scoped to company, ordered chronologically."""
    _ORDER = ["January","February","March","April","May","June",
               "July","August","September","October","November","December"]
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute(
                        "SELECT month, year, data, updated_at FROM monthly_reports WHERE year = %s AND company_id = %s",
                        (year, cid),
                    )
                else:
                    cur.execute(
                        "SELECT month, year, data, updated_at FROM monthly_reports WHERE year = %s AND company_id IS NULL",
                        (year,),
                    )
                rows = cur.fetchall()
        results = []
        for month, yr, data, updated_at in rows:
            results.append({
                "month": month,
                "year": yr,
                "data": data,
                "updated_at": _coerce(updated_at),
            })
        results.sort(key=lambda r: _ORDER.index(r["month"]) if r["month"] in _ORDER else 99)
        return results
    except Exception as e:
        print(f"[DB] get_monthly_reports error: {e}")
        return []


def upsert_monthly_report(month: str, year: int, data: dict, company_id=None) -> bool:
    """Insert or replace a monthly report scoped to company. Returns True on success."""
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute(
                        """
                        INSERT INTO monthly_reports (month, year, data, company_id, updated_at)
                        VALUES (%s, %s, %s::jsonb, %s, NOW())
                        ON CONFLICT (month, year, company_id) DO UPDATE
                            SET data = EXCLUDED.data, updated_at = NOW()
                        """,
                        (month, year, _j(data), cid),
                    )
                else:
                    cur.execute(
                        """
                        INSERT INTO monthly_reports (month, year, data, updated_at)
                        VALUES (%s, %s, %s::jsonb, NOW())
                        ON CONFLICT (month, year, company_id) DO UPDATE
                            SET data = EXCLUDED.data, updated_at = NOW()
                        """,
                        (month, year, _j(data)),
                    )
        return True
    except Exception as e:
        print(f"[DB] upsert_monthly_report error: {e}")
        return False


# ── Chat History ───────────────────────────────────────────────────────────────

def init_chat_history_table():
    """Create chat_history table if it doesn't exist."""
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS chat_history (
                    id           SERIAL PRIMARY KEY,
                    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    user_name    TEXT NOT NULL DEFAULT '',
                    user_role    TEXT NOT NULL DEFAULT 'user',
                    route        TEXT NOT NULL DEFAULT '/api/chat',
                    message      TEXT NOT NULL,
                    response     TEXT NOT NULL,
                    model        TEXT NOT NULL DEFAULT '',
                    context_info TEXT NOT NULL DEFAULT '',
                    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id)"
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_chat_history_created ON chat_history(created_at DESC)"
            )


def log_chat(user_id: str, user_name: str, user_role: str,
             route: str, message: str, response: str,
             model: str = '', context_info: str = '') -> int:
    """
    Persist one AI chat exchange.  Returns the new row id.
    Silently returns -1 on error so a logging failure never breaks a chat response.
    """
    uid = _uid(user_id)
    if uid is None:
        return -1
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO chat_history
                        (user_id, user_name, user_role, route, message, response, model, context_info)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (uid, user_name, user_role, route, message, response, model, context_info),
                )
                return cur.fetchone()[0]
    except Exception as e:
        print(f'[DB] log_chat error: {e}')
        return -1


def get_chat_history(user_id: str | None = None,
                     user_ids: list | None = None,
                     limit: int = 100,
                     offset: int = 0,
                     route: str | None = None) -> list:
    """
    Retrieve chat history rows as a list of dicts, newest first.

    user_id=None   → return all users (admin view)
    user_id=<id>   → return that user's history only
    user_ids=[...] → restrict to this set of user UUIDs (company scoping)
    route          → optional filter by '/api/chat' or '/api/ai/chat'
    """
    clauses, params = [], []
    if user_id is not None:
        uid = _uid(user_id)
        if uid:
            clauses.append("user_id = %s")
            params.append(uid)
    elif user_ids is not None:
        valid_ids = [_uid(u) for u in user_ids if _uid(u)]
        if not valid_ids:
            return []
        placeholders = ','.join(['%s'] * len(valid_ids))
        clauses.append(f"user_id IN ({placeholders})")
        params.extend(valid_ids)
    if route:
        clauses.append("route = %s")
        params.append(route)

    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    params += [int(limit), int(offset)]

    sql = f"""
        SELECT id, user_id, user_name, user_role, route, message, response,
               model, context_info, created_at
        FROM chat_history
        {where}
        ORDER BY created_at DESC
        LIMIT %s OFFSET %s
    """
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                return _row(cur)
    except Exception as e:
        print(f'[DB] get_chat_history error: {e}')
        return []


def get_chat_stats() -> dict:
    """Aggregate stats for the admin dashboard."""
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                        COUNT(*)                                             AS total_messages,
                        COUNT(DISTINCT user_id)                             AS unique_users,
                        COUNT(*) FILTER (WHERE route = '/api/chat')         AS main_chat_count,
                        COUNT(*) FILTER (WHERE route = '/api/ai/chat')      AS ai_chat_count,
                        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS last_24h,
                        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')  AS last_7d
                    FROM chat_history
                """)
                row = cur.fetchone()
                if not row:
                    return {}
                cols = [d[0] for d in cur.description]
                return {c: (int(v) if v is not None else 0) for c, v in zip(cols, row)}
    except Exception as e:
        print(f'[DB] get_chat_stats error: {e}')
        return {}


# ── Direct notification helpers (no read-all / write-all) ─────────────────────

def pg_get_user_notifications(user_id: str) -> list:
    uid = _uid(user_id)
    if not uid:
        return []
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, user_id, title, message, type, metadata, read, created_at "
                "FROM notifications WHERE user_id = %s ORDER BY created_at DESC",
                (uid,),
            )
            return _row(cur)


def pg_create_notification(user_id: str, title: str, message: str,
                            ntype: str = 'info', metadata: dict = None) -> str | None:
    uid = _uid(user_id)
    if not uid:
        return None
    nid = uuid.uuid4()
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if not _user_exists(cur, uid):
                    return None
                cur.execute(
                    """
                    INSERT INTO notifications (id, user_id, title, message, type, metadata, read)
                    VALUES (%s, %s, %s, %s, %s, %s::jsonb, FALSE)
                    """,
                    (nid, uid, title, message, ntype, _j(metadata or {})),
                )
        return str(nid)
    except Exception as e:
        print(f'[DB] pg_create_notification error: {e}')
        return None


def pg_mark_notification_read(notification_id: str, user_id: str) -> bool:
    nid = _uid(notification_id)
    uid = _uid(user_id)
    if not nid or not uid:
        return False
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE notifications SET read = TRUE WHERE id = %s AND user_id = %s",
                (nid, uid),
            )
            return cur.rowcount > 0


def pg_mark_all_read(user_id: str) -> int:
    uid = _uid(user_id)
    if not uid:
        return 0
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE notifications SET read = TRUE WHERE user_id = %s AND read = FALSE",
                (uid,),
            )
            return cur.rowcount


def pg_delete_notification(notification_id: str, user_id: str) -> bool:
    nid = _uid(notification_id)
    uid = _uid(user_id)
    if not nid or not uid:
        return False
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM notifications WHERE id = %s AND user_id = %s",
                (nid, uid),
            )
            return cur.rowcount > 0


def pg_delete_read_notifications(user_id: str) -> int:
    uid = _uid(user_id)
    if not uid:
        return 0
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM notifications WHERE user_id = %s AND read = TRUE",
                (uid,),
            )
            return cur.rowcount


def pg_delete_all_notifications(user_id: str) -> int:
    uid = _uid(user_id)
    if not uid:
        return 0
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM notifications WHERE user_id = %s", (uid,))
            return cur.rowcount


def pg_unread_count(user_id: str) -> int:
    uid = _uid(user_id)
    if not uid:
        return 0
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM notifications WHERE user_id = %s AND read = FALSE",
                (uid,),
            )
            return cur.fetchone()[0]


def pg_exists_unread_deviation_reminder(deviation_id) -> bool:
    """True if any unread reminder for this deviation already exists (any user)."""
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1 FROM notifications
                WHERE read = FALSE
                  AND title = 'Action Required: Pending Activity Delay'
                  AND (metadata->>'deviation_id')::text = %s
                LIMIT 1
                """,
                (str(deviation_id),),
            )
            return cur.fetchone() is not None


def pg_purge_old_read(days: int = 30) -> int:
    """Delete read notifications older than N days."""
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM notifications "
                "WHERE read = TRUE AND created_at < NOW() - (%s || ' days')::INTERVAL",
                (str(days),),
            )
            return cur.rowcount


# ── Company Management ────────────────────────────────────────────────────────

def get_companies() -> list:
    """Return all companies ordered by name."""
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT id, name, slug, created_at, '
                    'COALESCE(is_suspended, FALSE) AS is_suspended, '
                    'COALESCE(features, \'{}\'::jsonb) AS features '
                    'FROM companies ORDER BY name'
                )
                return _row(cur)
    except Exception as e:
        print(f'[DB] get_companies error: {e}')
        return []


def get_company_by_id(company_id: str) -> dict | None:
    cid = _uid(company_id)
    if not cid:
        return None
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT id, name, slug, created_at, '
                    'COALESCE(is_suspended, FALSE) AS is_suspended, '
                    'COALESCE(features, \'{}\'::jsonb) AS features '
                    'FROM companies WHERE id = %s',
                    (cid,),
                )
                rows = _row(cur)
                return rows[0] if rows else None
    except Exception as e:
        print(f'[DB] get_company_by_id error: {e}')
        return None


def suspend_company(company_id: str, suspended: bool) -> bool:
    """Toggle suspended state for a company. Returns True on success."""
    cid = _uid(company_id)
    if not cid:
        return False
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'UPDATE companies SET is_suspended = %s WHERE id = %s',
                    (bool(suspended), cid),
                )
                return cur.rowcount > 0
    except Exception as e:
        print(f'[DB] suspend_company error: {e}')
        return False


def create_company(name: str, slug: str) -> dict:
    """Create a new company. Returns the created record."""
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'INSERT INTO companies (name, slug) VALUES (%s, %s) RETURNING id, name, slug, created_at',
                    (name, slug),
                )
                row = cur.fetchone()
                cols = [d[0] for d in cur.description]
                return {c: _coerce(v) for c, v in zip(cols, row)}
    except Exception as e:
        print(f'[DB] create_company error: {e}')
        raise


def get_users_by_company(company_id: str, status_filter: str | None = None) -> list:
    """Return users belonging to a company, optionally filtered by status."""
    cid = _uid(company_id)
    if not cid:
        return []
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if status_filter:
                    cur.execute(
                        '''SELECT u.id, u.email, u.name, u.role, u.must_change_password, u.created_at,
                                  u.company_id, u.status, u.approved_by,
                                  c.name AS company_name, c.slug AS company_slug
                           FROM users u
                           LEFT JOIN companies c ON u.company_id = c.id
                           WHERE u.company_id = %s AND u.status = %s
                           ORDER BY u.created_at DESC''',
                        (cid, status_filter),
                    )
                else:
                    cur.execute(
                        '''SELECT u.id, u.email, u.name, u.role, u.must_change_password, u.created_at,
                                  u.company_id, u.status, u.approved_by,
                                  c.name AS company_name, c.slug AS company_slug
                           FROM users u
                           LEFT JOIN companies c ON u.company_id = c.id
                           WHERE u.company_id = %s
                           ORDER BY u.created_at DESC''',
                        (cid,),
                    )
                return _row(cur)
    except Exception as e:
        print(f'[DB] get_users_by_company error: {e}')
        return []


def get_all_users_with_company() -> list:
    """Return all users with their company name (for super_admin view)."""
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    '''
                    SELECT u.id, u.email, u.name, u.role, u.must_change_password, u.created_at,
                           u.company_id, u.status, u.approved_by, c.name AS company_name, c.slug AS company_slug
                    FROM users u
                    LEFT JOIN companies c ON u.company_id = c.id
                    ORDER BY u.created_at DESC
                    '''
                )
                return _row(cur)
    except Exception as e:
        print(f'[DB] get_all_users_with_company error: {e}')
        return []


def set_user_status(user_id: str, status: str, approved_by_id: str | None = None) -> bool:
    """Approve or reject a user registration. Returns True on success."""
    uid = _uid(user_id)
    approver = _uid(approved_by_id) if approved_by_id else None
    if not uid:
        return False
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'UPDATE users SET status = %s, approved_by = %s, updated_at = NOW() WHERE id = %s',
                    (status, approver, uid),
                )
                return cur.rowcount > 0
    except Exception as e:
        print(f'[DB] set_user_status error: {e}')
        return False


def create_user_direct(user_id: str, email: str, name: str, role: str, password_hash: str,
                        company_id: str | None, status: str = 'pending',
                        auth_type: str | None = None, ms_id: str | None = None) -> dict:
    """Insert a single user row directly (used by signup and SSO provisioning)."""
    uid = _uid(user_id) or uuid.uuid4()
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    '''
                    INSERT INTO users (id, email, name, role, password, must_change_password,
                                       company_id, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    RETURNING id, email, name, role, must_change_password, created_at, company_id, status
                    ''',
                    (uid, email, name, role, password_hash, True, cid, status),
                )
                row = cur.fetchone()
                cols = [d[0] for d in cur.description]
                return {c: _coerce(v) for c, v in zip(cols, row)}
    except Exception as e:
        print(f'[DB] create_user_direct error: {e}')
        raise


def get_user_by_id(user_id: str) -> dict | None:
    uid = _uid(user_id)
    if not uid:
        return None
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT id, email, name, role, password, must_change_password, created_at, '
                    'updated_at, company_id, status, approved_by FROM users WHERE id = %s',
                    (uid,),
                )
                rows = _row(cur)
                return rows[0] if rows else None
    except Exception as e:
        print(f'[DB] get_user_by_id error: {e}')
        return None


def get_user_by_email(email: str) -> dict | None:
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT id, email, name, role, password, must_change_password, created_at, '
                    'updated_at, company_id, status, approved_by FROM users WHERE LOWER(email) = LOWER(%s)',
                    (email,),
                )
                rows = _row(cur)
                return rows[0] if rows else None
    except Exception as e:
        print(f'[DB] get_user_by_email error for {email}: {e}')
        raise


def pg_update_user_password(user_id: str, hashed_password: str) -> bool:
    """Set a user's password and clear the must_change_password flag."""
    uid = _uid(user_id)
    if not uid:
        return False
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'UPDATE users SET password = %s, must_change_password = FALSE, '
                    'updated_at = NOW() WHERE id = %s',
                    (hashed_password, uid),
                )
                return cur.rowcount > 0
    except Exception as e:
        print(f'[DB] pg_update_user_password error: {e}')
        return False


def pg_update_user_name(user_id: str, name: str) -> bool:
    """Update a user's display name."""
    uid = _uid(user_id)
    if not uid:
        return False
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'UPDATE users SET name = %s, updated_at = NOW() WHERE id = %s',
                    (name, uid),
                )
                return cur.rowcount > 0
    except Exception as e:
        print(f'[DB] pg_update_user_name error: {e}')
        return False


def pg_update_user_role(user_id: str, role: str) -> bool:
    """Update a user's role."""
    uid = _uid(user_id)
    if not uid:
        return False
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'UPDATE users SET role = %s, updated_at = NOW() WHERE id = %s',
                    (role, uid),
                )
                return cur.rowcount > 0
    except Exception as e:
        print(f'[DB] pg_update_user_role error: {e}')
        return False


def pg_create_reset_token(token_hash: str, user_id: str, expires_at: str) -> bool:
    """Insert a single password reset token — no bulk operations."""
    uid = _uid(user_id)
    if not uid or not token_hash:
        return False
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO password_reset_tokens (token, user_id, created_at, expires_at)
                    VALUES (%s, %s, NOW(), %s)
                    ON CONFLICT (token) DO NOTHING
                    """,
                    (token_hash, uid, expires_at),
                )
                return True
    except Exception as e:
        print(f'[DB] pg_create_reset_token error: {e}')
        return False


def pg_get_valid_reset_token(token_hash: str) -> dict | None:
    """Return an unexpired reset token row, or None."""
    if not token_hash:
        return None
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT token, user_id, created_at, expires_at '
                    'FROM password_reset_tokens '
                    'WHERE token = %s AND expires_at > NOW()',
                    (token_hash,),
                )
                rows = _row(cur)
                return rows[0] if rows else None
    except Exception as e:
        print(f'[DB] pg_get_valid_reset_token error: {e}')
        return None


def pg_consume_reset_tokens_for_user(user_id: str) -> None:
    """Delete all reset tokens for a user after successful password reset."""
    uid = _uid(user_id)
    if not uid:
        return
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute('DELETE FROM password_reset_tokens WHERE user_id = %s', (uid,))
    except Exception as e:
        print(f'[DB] pg_consume_reset_tokens_for_user error: {e}')


def pg_update_subscription_daily_reset(user_id: str, is_locked: bool, last_upload_date: str) -> None:
    """Reset daily upload counter to 0."""
    uid = _uid(user_id)
    if not uid:
        return
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'UPDATE subscriptions SET uploads_today = 0, last_upload_date = %s, '
                    'is_locked = %s WHERE user_id = %s',
                    (last_upload_date, is_locked, uid),
                )
    except Exception as e:
        print(f'[DB] pg_update_subscription_daily_reset error: {e}')


def pg_update_subscription_plan(user_id: str, plan: str) -> bool:
    """Upgrade a user's subscription plan."""
    uid = _uid(user_id)
    if not uid:
        return False
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'UPDATE subscriptions SET plan = %s, daily_limit = 9999, is_locked = FALSE '
                    'WHERE user_id = %s',
                    (plan, uid),
                )
                return cur.rowcount > 0
    except Exception as e:
        print(f'[DB] pg_update_subscription_plan error: {e}')
        return False


def pg_get_subscription(user_id: str) -> dict | None:
    """Fetch a user's subscription row."""
    uid = _uid(user_id)
    if not uid:
        return None
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT user_id, plan, uploads_today, total_uploads, last_upload_date, '
                    'daily_limit, is_locked FROM subscriptions WHERE user_id = %s',
                    (uid,),
                )
                rows = _row(cur)
                return rows[0] if rows else None
    except Exception as e:
        print(f'[DB] pg_get_subscription error: {e}')
        return None


def pg_increment_subscription_uploads(user_id: str) -> None:
    """Atomically increment upload counters and lock free plan if at limit."""
    uid = _uid(user_id)
    if not uid:
        return
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE subscriptions
                    SET uploads_today  = uploads_today + 1,
                        total_uploads  = total_uploads + 1,
                        last_upload_date = CURRENT_DATE::text,
                        is_locked      = CASE
                            WHEN plan = 'free' AND total_uploads + 1 >= 3 THEN TRUE
                            ELSE is_locked
                        END
                    WHERE user_id = %s
                    """,
                    (uid,),
                )
    except Exception as e:
        print(f'[DB] pg_increment_subscription_uploads error: {e}')


def pg_get_admins_for_company(company_id: str) -> list:
    """Return approved admin/manager users scoped to a company."""
    cid = _uid(company_id)
    if not cid:
        return []
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, email, name, role FROM users "
                    "WHERE company_id = %s AND role IN ('admin', 'manager', 'company_admin') "
                    "AND status = 'approved'",
                    (cid,),
                )
                return _row(cur)
    except Exception as e:
        print(f'[DB] pg_get_admins_for_company error: {e}')
        return []


def create_subscription_direct(user_id: str):
    """Create a default free subscription for a newly created user."""
    uid = _uid(user_id)
    if not uid:
        return
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    '''
                    INSERT INTO subscriptions (user_id, plan, uploads_today, total_uploads, daily_limit, is_locked)
                    VALUES (%s, 'free', 0, 0, 9999, FALSE)
                    ON CONFLICT (user_id) DO NOTHING
                    ''',
                    (uid,),
                )
    except Exception as e:
        print(f'[DB] create_subscription_direct error: {e}')


def update_company(company_id: str, name: str | None = None, slug: str | None = None) -> dict | None:
    cid = _uid(company_id)
    if not cid:
        return None
    sets, params = [], []
    if name is not None:
        sets.append('name = %s'); params.append(name)
    if slug is not None:
        sets.append('slug = %s'); params.append(slug)
    if not sets:
        return get_company_by_id(company_id)
    params.append(cid)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f'UPDATE companies SET {", ".join(sets)} WHERE id = %s RETURNING id, name, slug, created_at',
                    params,
                )
                row = cur.fetchone()
                if not row:
                    return None
                cols = [d[0] for d in cur.description]
                return {c: _coerce(v) for c, v in zip(cols, row)}
    except Exception as e:
        print(f'[DB] update_company error: {e}')
        raise


def set_company_features(company_id: str, features: dict) -> dict | None:
    import json as _json
    cid = _uid(company_id)
    if not cid:
        return None
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'UPDATE companies SET features = %s::jsonb WHERE id = %s '
                    'RETURNING id, name, slug, COALESCE(is_suspended, FALSE) AS is_suspended, features',
                    (_json.dumps(features), cid),
                )
                row = cur.fetchone()
                if not row:
                    return None
                cols = [d[0] for d in cur.description]
                return {c: _coerce(v) for c, v in zip(cols, row)}
    except Exception as e:
        print(f'[DB] set_company_features error: {e}')
        raise


# ── Report Builder ────────────────────────────────────────────────────────────

def init_report_builder_tables():
    """Create report_builder_catalog and report_builder_config tables."""
    import json as _json
    SUGGESTED_ITEMS = [
        {'label': 'Total Activities',      'description': 'Total number of project activities tracked this month', 'type': 'kpi_card',  'data_key': 'totalActivities',    'unit': '',  'is_suggested': True,  'sort_order': 0},
        {'label': 'On-Time Activities',    'description': 'Activities completed or progressing on schedule',       'type': 'kpi_card',  'data_key': 'onTime',             'unit': '',  'is_suggested': True,  'sort_order': 1},
        {'label': 'Late Activities',       'description': 'Activities running behind planned schedule',            'type': 'kpi_card',  'data_key': 'onLate',             'unit': '',  'is_suggested': True,  'sort_order': 2},
        {'label': 'Milestones Achieved',   'description': 'Milestones marked as achieved this period',            'type': 'kpi_card',  'data_key': 'milestoneAchieved',  'unit': '',  'is_suggested': True,  'sort_order': 3},
        {'label': 'Not Started',           'description': 'Activities not yet started',                           'type': 'kpi_card',  'data_key': 'notStarted',         'unit': '',  'is_suggested': False, 'sort_order': 4},
        {'label': 'Early Activities',      'description': 'Activities that started ahead of schedule',            'type': 'kpi_card',  'data_key': 'onEarly',            'unit': '',  'is_suggested': False, 'sort_order': 5},
        {'label': 'Avg Planned Duration',  'description': 'Average planned duration across all activities',       'type': 'kpi_card',  'data_key': 'avgPlannedDuration', 'unit': 'd', 'is_suggested': False, 'sort_order': 6},
        {'label': 'Max Planned Duration',  'description': 'Longest single planned activity duration',             'type': 'kpi_card',  'data_key': 'maxPlannedDuration', 'unit': 'd', 'is_suggested': False, 'sort_order': 7},
        {'label': 'S-Curve Overview',      'description': 'Planned vs actual progress by discipline (bar chart)', 'type': 'bar_chart', 'data_key': 'scurves',            'unit': '%', 'is_suggested': True,  'sort_order': 8},
        {'label': 'In Progress',           'description': 'Activities currently in progress',                     'type': 'kpi_card',  'data_key': 'inProgress',         'unit': '',  'is_suggested': False, 'sort_order': 9},
        {'label': 'On Plan (Duration)',    'description': 'Activities whose actual duration matches plan',         'type': 'kpi_card',  'data_key': 'onPlan',             'unit': '',  'is_suggested': False, 'sort_order': 10},
    ]
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS report_builder_catalog (
                    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    label       TEXT NOT NULL,
                    description TEXT NOT NULL DEFAULT '',
                    type        TEXT NOT NULL DEFAULT 'kpi_card',
                    data_key    TEXT NOT NULL,
                    unit        TEXT NOT NULL DEFAULT '',
                    is_suggested BOOLEAN NOT NULL DEFAULT FALSE,
                    sort_order  INTEGER NOT NULL DEFAULT 0,
                    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS report_builder_config (
                    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    company_id UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
                    layout     JSONB NOT NULL DEFAULT '[]',
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
            # Seed suggested items once (skip if catalog already has rows)
            cur.execute('SELECT COUNT(*) FROM report_builder_catalog')
            if cur.fetchone()[0] == 0:
                for item in SUGGESTED_ITEMS:
                    cur.execute(
                        'INSERT INTO report_builder_catalog (label, description, type, data_key, unit, is_suggested, sort_order) '
                        'VALUES (%s, %s, %s, %s, %s, %s, %s)',
                        (item['label'], item['description'], item['type'],
                         item['data_key'], item['unit'], item['is_suggested'], item['sort_order']),
                    )


def get_report_catalog() -> list:
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute('SELECT id, label, description, type, data_key, unit, is_suggested, sort_order, created_at FROM report_builder_catalog ORDER BY sort_order, created_at')
                cols = [d[0] for d in cur.description]
                return [{c: _coerce(v) for c, v in zip(cols, row)} for row in cur.fetchall()]
    except Exception as e:
        print(f'[DB] get_report_catalog error: {e}')
        return []


def create_catalog_item(label: str, description: str, type_: str, data_key: str, unit: str, is_suggested: bool, sort_order: int) -> dict:
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                'INSERT INTO report_builder_catalog (label, description, type, data_key, unit, is_suggested, sort_order) '
                'VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, label, description, type, data_key, unit, is_suggested, sort_order, created_at',
                (label, description, type_, data_key, unit, is_suggested, sort_order),
            )
            cols = [d[0] for d in cur.description]
            return {c: _coerce(v) for c, v in zip(cols, cur.fetchone())}


def update_catalog_item(item_id: str, **fields) -> dict | None:
    allowed = {'label', 'description', 'type', 'data_key', 'unit', 'is_suggested', 'sort_order'}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return None
    sets = ', '.join(f'{k} = %s' for k in updates)
    vals = list(updates.values()) + [item_id]
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f'UPDATE report_builder_catalog SET {sets} WHERE id = %s '
                'RETURNING id, label, description, type, data_key, unit, is_suggested, sort_order, created_at',
                vals,
            )
            row = cur.fetchone()
            if not row:
                return None
            cols = [d[0] for d in cur.description]
            return {c: _coerce(v) for c, v in zip(cols, row)}


def delete_catalog_item(item_id: str) -> bool:
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute('DELETE FROM report_builder_catalog WHERE id = %s RETURNING id', (item_id,))
            return cur.fetchone() is not None


def get_report_builder_config(company_id: str) -> list:
    cid = _uid(company_id)
    if not cid:
        return []
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute('SELECT layout FROM report_builder_config WHERE company_id = %s', (cid,))
                row = cur.fetchone()
                return row[0] if row else []
    except Exception as e:
        print(f'[DB] get_report_builder_config error: {e}')
        return []


def save_report_builder_config(company_id: str, layout: list) -> bool:
    import json as _json
    cid = _uid(company_id)
    if not cid:
        return False
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'INSERT INTO report_builder_config (company_id, layout) VALUES (%s, %s::jsonb) '
                    'ON CONFLICT (company_id) DO UPDATE SET layout = EXCLUDED.layout, updated_at = NOW()',
                    (cid, _json.dumps(layout)),
                )
        return True
    except Exception as e:
        print(f'[DB] save_report_builder_config error: {e}')
        return False


def get_company_features(company_id: str) -> dict:
    cid = _uid(company_id)
    if not cid:
        return {}
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute('SELECT COALESCE(features, \'{}\'::jsonb) FROM companies WHERE id = %s', (cid,))
                row = cur.fetchone()
                return row[0] if row else {}
    except Exception as e:
        print(f'[DB] get_company_features error: {e}')
        return {}


# ── Company-scoped data access functions ──────────────────────────────────────
# These replace read_db/write_db for tables that are per-company.
# Pass company_id=None only for super_admin contexts that need all companies.

def pg_read_base_file_versions(company_id=None) -> list:
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute(
                        'SELECT version_id, stage, base_filename, snapshot_rel_path, snapshot_abs_path, '
                        'snapshot_size_bytes, merge_summary, context, company_id, created_at '
                        'FROM base_file_versions WHERE company_id = %s ORDER BY created_at DESC',
                        (cid,),
                    )
                else:
                    cur.execute(
                        'SELECT version_id, stage, base_filename, snapshot_rel_path, snapshot_abs_path, '
                        'snapshot_size_bytes, merge_summary, context, company_id, created_at '
                        'FROM base_file_versions WHERE company_id IS NULL ORDER BY created_at DESC'
                    )
                return _row(cur)
    except Exception as e:
        print(f'[DB] pg_read_base_file_versions error: {e}')
        return []


def pg_write_base_file_versions(data: list, company_id=None):
    if not isinstance(data, list):
        return
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                pks = [r['version_id'] for r in data if r.get('version_id')]
                if cid:
                    if pks:
                        cur.execute(
                            'DELETE FROM base_file_versions WHERE company_id = %s AND version_id != ALL(%s)',
                            (cid, pks),
                        )
                    else:
                        cur.execute('DELETE FROM base_file_versions WHERE company_id = %s', (cid,))
                else:
                    if pks:
                        cur.execute('DELETE FROM base_file_versions WHERE company_id IS NULL AND version_id != ALL(%s)', (pks,))
                    else:
                        cur.execute('DELETE FROM base_file_versions WHERE company_id IS NULL')
                for v in data:
                    vid = v.get('version_id')
                    if not vid:
                        continue
                    cur.execute(
                        '''
                        INSERT INTO base_file_versions
                            (version_id, stage, base_filename, snapshot_rel_path, snapshot_abs_path,
                             snapshot_size_bytes, merge_summary, context, company_id, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s)
                        ON CONFLICT (version_id) DO UPDATE SET
                            stage=EXCLUDED.stage, company_id=EXCLUDED.company_id
                        ''',
                        (
                            vid, v.get('stage', ''), v.get('base_filename', ''),
                            v.get('snapshot_rel_path', ''), v.get('snapshot_abs_path', ''),
                            v.get('snapshot_size_bytes'), _j(v.get('merge_summary', {})),
                            _j(v.get('context', {})), cid, v.get('created_at'),
                        ),
                    )
    except Exception as e:
        print(f'[DB] pg_write_base_file_versions error: {e}')


def pg_read_update_chain(company_id=None) -> list:
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute(
                        'SELECT index, filename, source_upload, job_id, approved_by, status, company_id, created_at '
                        'FROM update_chain WHERE company_id = %s ORDER BY index',
                        (cid,),
                    )
                else:
                    cur.execute(
                        'SELECT index, filename, source_upload, job_id, approved_by, status, company_id, created_at '
                        'FROM update_chain WHERE company_id IS NULL ORDER BY index'
                    )
                return _row(cur)
    except Exception as e:
        print(f'[DB] pg_read_update_chain error: {e}')
        return []


def pg_write_update_chain(data: list, company_id=None):
    if not isinstance(data, list):
        return
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute('DELETE FROM update_chain WHERE company_id = %s', (cid,))
                else:
                    cur.execute('DELETE FROM update_chain WHERE company_id IS NULL')
                for u in data:
                    cur.execute(
                        '''
                        INSERT INTO update_chain (filename, source_upload, job_id, approved_by, status, company_id, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ''',
                        (
                            u.get('filename', ''), u.get('source_upload', ''), _uid(u.get('job_id')),
                            u.get('approved_by', 'auto'), u.get('status', 'approved'), cid, u.get('created_at'),
                        ),
                    )
    except Exception as e:
        print(f'[DB] pg_write_update_chain error: {e}')


def pg_read_ai_cache(company_id=None) -> list:
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute(
                        'SELECT cache_key, user_id, company_id, question, response, context_hash, created_at '
                        'FROM ai_response_cache WHERE company_id = %s ORDER BY created_at DESC',
                        (cid,),
                    )
                else:
                    cur.execute(
                        'SELECT cache_key, user_id, company_id, question, response, context_hash, created_at '
                        'FROM ai_response_cache WHERE company_id IS NULL ORDER BY created_at DESC'
                    )
                return _row(cur)
    except Exception as e:
        print(f'[DB] pg_read_ai_cache error: {e}')
        return []


def pg_write_ai_cache(data: list, company_id=None):
    if not isinstance(data, list):
        return
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                pks = [r['cache_key'] for r in data if r.get('cache_key')]
                if cid:
                    if pks:
                        cur.execute(
                            'DELETE FROM ai_response_cache WHERE company_id = %s AND cache_key != ALL(%s)',
                            (cid, pks),
                        )
                    else:
                        cur.execute('DELETE FROM ai_response_cache WHERE company_id = %s', (cid,))
                else:
                    if pks:
                        cur.execute('DELETE FROM ai_response_cache WHERE company_id IS NULL AND cache_key != ALL(%s)', (pks,))
                    else:
                        cur.execute('DELETE FROM ai_response_cache WHERE company_id IS NULL')
                for r in data:
                    key = r.get('cache_key')
                    if not key:
                        continue
                    uid = _uid(r.get('user_id'))
                    cur.execute(
                        '''
                        INSERT INTO ai_response_cache (cache_key, user_id, company_id, question, response, context_hash, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT DO NOTHING
                        ''',
                        (key, uid, cid, r.get('question', ''), r.get('response', ''),
                         r.get('context_hash', ''), r.get('created_at')),
                    )
    except Exception as e:
        print(f'[DB] pg_write_ai_cache error: {e}')


def pg_read_insight_cache(company_id=None) -> list:
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute(
                        'SELECT cache_key, company_id, data_hash, section, title, insight, created_at '
                        'FROM intelligence_insight_cache WHERE company_id = %s ORDER BY created_at',
                        (cid,),
                    )
                else:
                    cur.execute(
                        'SELECT cache_key, company_id, data_hash, section, title, insight, created_at '
                        'FROM intelligence_insight_cache WHERE company_id IS NULL ORDER BY created_at'
                    )
                return _row(cur)
    except Exception as e:
        print(f'[DB] pg_read_insight_cache error: {e}')
        return []


def pg_write_insight_cache(data: list, company_id=None):
    if not isinstance(data, list):
        return
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                pks = [r['cache_key'] for r in data if r.get('cache_key')]
                if cid:
                    if pks:
                        cur.execute(
                            'DELETE FROM intelligence_insight_cache WHERE company_id = %s AND cache_key != ALL(%s)',
                            (cid, pks),
                        )
                    else:
                        cur.execute('DELETE FROM intelligence_insight_cache WHERE company_id = %s', (cid,))
                else:
                    if pks:
                        cur.execute('DELETE FROM intelligence_insight_cache WHERE company_id IS NULL AND cache_key != ALL(%s)', (pks,))
                    else:
                        cur.execute('DELETE FROM intelligence_insight_cache WHERE company_id IS NULL')
                for r in data:
                    key = r.get('cache_key')
                    if not key:
                        continue
                    cur.execute(
                        '''
                        INSERT INTO intelligence_insight_cache (cache_key, company_id, data_hash, section, title, insight, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s)
                        ON CONFLICT DO NOTHING
                        ''',
                        (key, cid, r.get('data_hash', ''), r.get('section', ''), r.get('title', ''),
                         _j(r.get('insight', {})), r.get('created_at')),
                    )
    except Exception as e:
        print(f'[DB] pg_write_insight_cache error: {e}')


def pg_read_whatif_realtime(company_id=None) -> dict:
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute('SELECT data FROM whatif_realtime_data WHERE company_id = %s', (cid,))
                else:
                    cur.execute("SELECT data FROM whatif_realtime_data WHERE company_id IS NULL")
                r = cur.fetchone()
                return r[0] if r and r[0] else {}
    except Exception as e:
        print(f'[DB] pg_read_whatif_realtime error: {e}')
        return {}


def pg_write_whatif_realtime(data: dict, company_id=None):
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute('DELETE FROM whatif_realtime_data WHERE company_id = %s', (cid,))
                    cur.execute(
                        "INSERT INTO whatif_realtime_data (cache_key, company_id, data, updated_at) VALUES ('default', %s, %s::jsonb, NOW())",
                        (cid, _j(data)),
                    )
                else:
                    cur.execute('DELETE FROM whatif_realtime_data WHERE company_id IS NULL')
                    cur.execute(
                        "INSERT INTO whatif_realtime_data (cache_key, data, updated_at) VALUES ('default', %s::jsonb, NOW())",
                        (_j(data),),
                    )
    except Exception as e:
        print(f'[DB] pg_write_whatif_realtime error: {e}')


def pg_read_whatif_critical(company_id=None) -> dict:
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute('SELECT data FROM whatif_critical_dashboard_data WHERE company_id = %s', (cid,))
                else:
                    cur.execute("SELECT data FROM whatif_critical_dashboard_data WHERE company_id IS NULL")
                r = cur.fetchone()
                return r[0] if r and r[0] else {}
    except Exception as e:
        print(f'[DB] pg_read_whatif_critical error: {e}')
        return {}


def pg_write_whatif_critical(data: dict, company_id=None):
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute('DELETE FROM whatif_critical_dashboard_data WHERE company_id = %s', (cid,))
                    cur.execute(
                        "INSERT INTO whatif_critical_dashboard_data (cache_key, company_id, data, updated_at) VALUES ('default', %s, %s::jsonb, NOW())",
                        (cid, _j(data)),
                    )
                else:
                    cur.execute('DELETE FROM whatif_critical_dashboard_data WHERE company_id IS NULL')
                    cur.execute(
                        "INSERT INTO whatif_critical_dashboard_data (cache_key, data, updated_at) VALUES ('default', %s::jsonb, NOW())",
                        (_j(data),),
                    )
    except Exception as e:
        print(f'[DB] pg_write_whatif_critical error: {e}')


def pg_read_whatif_pred_succ(company_id=None) -> dict:
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute(
                        'SELECT cache_key, generated_at, source, dependencies '
                        'FROM whatif_predecessor_successor_cache WHERE company_id = %s',
                        (cid,),
                    )
                else:
                    cur.execute(
                        'SELECT cache_key, generated_at, source, dependencies '
                        'FROM whatif_predecessor_successor_cache WHERE company_id IS NULL'
                    )
                result = {}
                for r in cur.fetchall():
                    result[r[0]] = {'generated_at': _coerce(r[1]), 'source': r[2], 'dependencies': r[3]}
                return result
    except Exception as e:
        print(f'[DB] pg_read_whatif_pred_succ error: {e}')
        return {}


def pg_write_whatif_pred_succ(data: dict, company_id=None):
    if not isinstance(data, dict):
        return
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute('DELETE FROM whatif_predecessor_successor_cache WHERE company_id = %s', (cid,))
                else:
                    cur.execute('DELETE FROM whatif_predecessor_successor_cache WHERE company_id IS NULL')
                for cache_key, entry in data.items():
                    cur.execute(
                        '''
                        INSERT INTO whatif_predecessor_successor_cache (cache_key, company_id, generated_at, source, dependencies)
                        VALUES (%s, %s, %s, %s::jsonb, %s::jsonb)
                        ''',
                        (cache_key, cid, entry.get('generated_at'), _j(entry.get('source', {})), _j(entry.get('dependencies', []))),
                    )
    except Exception as e:
        print(f'[DB] pg_write_whatif_pred_succ error: {e}')


def pg_read_whatif_proj_summary(company_id=None) -> dict:
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute(
                        'SELECT cache_key, generated_at, source, updates '
                        'FROM whatif_project_update_summary WHERE company_id = %s',
                        (cid,),
                    )
                else:
                    cur.execute(
                        'SELECT cache_key, generated_at, source, updates '
                        'FROM whatif_project_update_summary WHERE company_id IS NULL'
                    )
                result = {}
                for r in cur.fetchall():
                    result[r[0]] = {'generated_at': _coerce(r[1]), 'source': r[2], 'updates': r[3]}
                return result
    except Exception as e:
        print(f'[DB] pg_read_whatif_proj_summary error: {e}')
        return {}


def pg_write_whatif_proj_summary(data: dict, company_id=None):
    if not isinstance(data, dict):
        return
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute('DELETE FROM whatif_project_update_summary WHERE company_id = %s', (cid,))
                else:
                    cur.execute('DELETE FROM whatif_project_update_summary WHERE company_id IS NULL')
                for cache_key, entry in data.items():
                    cur.execute(
                        '''
                        INSERT INTO whatif_project_update_summary (cache_key, company_id, generated_at, source, updates)
                        VALUES (%s, %s, %s, %s::jsonb, %s::jsonb)
                        ''',
                        (cache_key, cid, entry.get('generated_at'), _j(entry.get('source', {})), _j(entry.get('updates', []))),
                    )
    except Exception as e:
        print(f'[DB] pg_write_whatif_proj_summary error: {e}')


def pg_read_whatif_claude(company_id=None) -> list:
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute(
                        'SELECT id, session_id, user_id, company_id, question, response, context, created_at '
                        'FROM whatif_claude_responses WHERE company_id = %s ORDER BY created_at DESC',
                        (cid,),
                    )
                else:
                    cur.execute(
                        'SELECT id, session_id, user_id, company_id, question, response, context, created_at '
                        'FROM whatif_claude_responses WHERE company_id IS NULL ORDER BY created_at DESC'
                    )
                return _row(cur)
    except Exception as e:
        print(f'[DB] pg_read_whatif_claude error: {e}')
        return []


def pg_write_whatif_claude(data: list, company_id=None):
    if not isinstance(data, list):
        return
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute('DELETE FROM whatif_claude_responses WHERE company_id = %s', (cid,))
                else:
                    cur.execute('DELETE FROM whatif_claude_responses WHERE company_id IS NULL')
                for r in data:
                    cur.execute(
                        '''
                        INSERT INTO whatif_claude_responses (session_id, user_id, company_id, question, response, context, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s)
                        ''',
                        (_uid(r.get('session_id')), _uid(r.get('user_id')), cid,
                         r.get('question'), r.get('response'), _j(r.get('context', {})), r.get('created_at')),
                    )
    except Exception as e:
        print(f'[DB] pg_write_whatif_claude error: {e}')


def pg_read_pptx_sections(company_id=None) -> dict:
    """Returns the cached pptx payload stored under 'default' section_key."""
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute(
                        "SELECT data FROM pptx_slide_sections WHERE company_id = %s AND section_key = 'default'",
                        (cid,),
                    )
                else:
                    cur.execute(
                        "SELECT data FROM pptx_slide_sections WHERE company_id IS NULL AND section_key = 'default'"
                    )
                r = cur.fetchone()
                return r[0] if r and r[0] else {}
    except Exception as e:
        print(f'[DB] pg_read_pptx_sections error: {e}')
        return {}


def pg_write_pptx_sections(data: dict, company_id=None):
    """Persists the entire pptx payload as a single 'default' row (per company)."""
    cid = _uid(company_id)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                if cid:
                    cur.execute('DELETE FROM pptx_slide_sections WHERE company_id = %s', (cid,))
                    cur.execute(
                        "INSERT INTO pptx_slide_sections (section_key, company_id, data, updated_at) VALUES ('default', %s, %s::jsonb, NOW())",
                        (cid, _j(data)),
                    )
                else:
                    cur.execute("DELETE FROM pptx_slide_sections WHERE company_id IS NULL")
                    cur.execute(
                        "INSERT INTO pptx_slide_sections (section_key, data, updated_at) VALUES ('default', %s::jsonb, NOW())",
                        (_j(data),),
                    )
    except Exception as e:
        print(f'[DB] pg_write_pptx_sections error: {e}')


def pg_insert_engage_post(post: dict):
    """Insert a single new engage post (no full-table replace)."""
    cid = _uid(post.get('company_id'))
    uid = _uid(post.get('user_id'))
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO engage_posts
                        (id, user_id, company_id, user_name, user_email, content, image_url,
                         group_id, source, likes, comments, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    (
                        post['id'], uid, cid,
                        post.get('user_name', ''), post.get('user_email', ''),
                        post.get('content', ''), post.get('image_url', ''),
                        post.get('group_id', ''), post.get('source', 'manual'),
                        _j(post.get('likes', [])), _j(post.get('comments', [])),
                        post.get('created_at'),
                    ),
                )
    except Exception as e:
        print(f'[DB] pg_insert_engage_post error: {e}')
        raise


def pg_get_engage_post(post_id: str) -> dict | None:
    """Fetch a single engage post by ID."""
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT id, user_id, company_id, user_name, user_email, content, image_url, '
                    'group_id, source, likes, comments, created_at '
                    'FROM engage_posts WHERE id = %s',
                    (post_id,),
                )
                rows = _row(cur)
                return rows[0] if rows else None
    except Exception as e:
        print(f'[DB] pg_get_engage_post error: {e}')
        return None


def pg_delete_engage_post(post_id: str) -> bool:
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute('DELETE FROM engage_posts WHERE id = %s', (post_id,))
                return cur.rowcount > 0
    except Exception as e:
        print(f'[DB] pg_delete_engage_post error: {e}')
        return False


def pg_update_engage_post_likes(post_id: str, likes: list) -> bool:
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'UPDATE engage_posts SET likes = %s::jsonb WHERE id = %s',
                    (_j(likes), post_id),
                )
                return cur.rowcount > 0
    except Exception as e:
        print(f'[DB] pg_update_engage_post_likes error: {e}')
        return False


def pg_update_engage_post_comments(post_id: str, comments: list) -> bool:
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'UPDATE engage_posts SET comments = %s::jsonb WHERE id = %s',
                    (_j(comments), post_id),
                )
                return cur.rowcount > 0
    except Exception as e:
        print(f'[DB] pg_update_engage_post_comments error: {e}')
        return False


def pg_insert_engage_group(group: dict):
    """Insert a single new engage group (no full-table replace)."""
    gid = _uid(group.get('id'))
    if not gid:
        return
    cid = _uid(group.get('company_id'))
    members = group.get('member_ids', group.get('members', []))
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO engage_groups (id, name, members, company_id, created_at)
                    VALUES (%s, %s, %s::jsonb, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    (gid, group.get('name', ''), _j(members), cid, group.get('created_at')),
                )
    except Exception as e:
        print(f'[DB] pg_insert_engage_group error: {e}')
        raise


def pg_delete_engage_group(group_id: str) -> bool:
    gid = _uid(group_id)
    if not gid:
        return False
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute('DELETE FROM engage_groups WHERE id = %s', (gid,))
                return cur.rowcount > 0
    except Exception as e:
        print(f'[DB] pg_delete_engage_group error: {e}')
        return False


def delete_company(company_id: str) -> bool:
    cid = _uid(company_id)
    if not cid:
        return False
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute('UPDATE users SET company_id = NULL WHERE company_id = %s', (cid,))
                cur.execute('DELETE FROM companies WHERE id = %s', (cid,))
                return cur.rowcount > 0
    except Exception as e:
        print(f'[DB] delete_company error: {e}')
        raise


def update_user_full(user_id: str, **fields) -> bool:
    """Super admin: update role, status, company_id, or approved_by on any user."""
    uid = _uid(user_id)
    if not uid:
        return False
    allowed = {'role', 'status', 'company_id', 'approved_by', 'name', 'email'}
    sets, params = [], []
    for key, val in fields.items():
        if key not in allowed:
            continue
        sets.append(f'{key} = %s')
        if key in ('company_id', 'approved_by') and val:
            params.append(_uid(val))
        else:
            params.append(val)
    if not sets:
        return False
    sets.append('updated_at = NOW()')
    params.append(uid)
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(f'UPDATE users SET {", ".join(sets)} WHERE id = %s', params)
                return cur.rowcount > 0
    except Exception as e:
        print(f'[DB] update_user_full error: {e}')
        raise


def delete_user(user_id: str) -> bool:
    uid = _uid(user_id)
    if not uid:
        return False
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute('DELETE FROM users WHERE id = %s', (uid,))
                return cur.rowcount > 0
    except Exception as e:
        print(f'[DB] delete_user error: {e}')
        raise


def count_approved_super_admins() -> int:
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT COUNT(*) FROM users WHERE role = 'super_admin' AND status = 'approved'"
                )
                row = cur.fetchone()
                return row['count'] if row else 0
    except Exception as e:
        print(f'[DB] count_approved_super_admins error: {e}')
        return 0

