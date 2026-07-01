import json
import os
import psycopg

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def esc(s):
    return str(s).replace("'", "''")

def handler(event: dict, context) -> dict:
    """Посты, лайки, реакции и уведомления: лента, публикация, лайк, реакция."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod')
    path = event.get('path', '/')

    with psycopg.connect(os.environ['DATABASE_URL']) as conn:
        with conn.cursor() as cur:

            # GET / — лента
            if method == 'GET' and path == '/':
                uid = (event.get('queryStringParameters') or {}).get('user_id', '00000000-0000-0000-0000-000000000000')

                cur.execute(f"""
                    SELECT
                        p.id, p.text, p.image,
                        to_char(p.created_at, 'DD.MM HH24:MI'),
                        u.id, u.name, u.handle, u.avatar,
                        COUNT(DISTINCT l.user_id) AS likes_count,
                        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = '{esc(uid)}'::uuid) AS liked,
                        (SELECT emoji FROM reactions WHERE post_id = p.id AND user_id = '{esc(uid)}'::uuid) AS my_reaction
                    FROM posts p
                    JOIN users u ON u.id = p.user_id
                    LEFT JOIN likes l ON l.post_id = p.id
                    GROUP BY p.id, p.text, p.image, p.created_at, u.id, u.name, u.handle, u.avatar
                    ORDER BY p.created_at DESC
                    LIMIT 50
                """)
                rows = cur.fetchall()

                post_ids = [str(r[0]) for r in rows]
                reactions_map = {}
                if post_ids:
                    ids_sql = ', '.join([f"'{pid}'" for pid in post_ids])
                    cur.execute(f"SELECT post_id, emoji, COUNT(*) FROM reactions WHERE post_id IN ({ids_sql}) GROUP BY post_id, emoji")
                    for rrow in cur.fetchall():
                        pid = str(rrow[0])
                        reactions_map.setdefault(pid, {})[rrow[1]] = rrow[2]

                posts = []
                for r in rows:
                    pid = str(r[0])
                    posts.append({
                        'id': pid,
                        'text': r[1],
                        'image': r[2],
                        'time': r[3],
                        'author': r[5],
                        'handle': r[6],
                        'avatar': r[7],
                        'likes': r[8],
                        'liked': bool(r[9]),
                        'myReaction': r[10],
                        'reactions': reactions_map.get(pid, {}),
                    })

                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(posts, default=str)}

            # POST / — создать пост
            if method == 'POST' and path == '/':
                body = json.loads(event.get('body') or '{}')
                user_id = body.get('user_id', '')
                text = body.get('text', '').strip()
                image = body.get('image')

                if not user_id or not text:
                    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Missing fields'})}

                image_sql = f"'{esc(image)}'" if image else 'NULL'
                cur.execute(f"INSERT INTO posts (user_id, text, image) VALUES ('{esc(user_id)}'::uuid, '{esc(text)}', {image_sql}) RETURNING id")
                row = cur.fetchone()
                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'id': str(row[0])})}

            # POST /like
            if method == 'POST' and path == '/like':
                body = json.loads(event.get('body') or '{}')
                uid = body.get('user_id', '')
                pid = body.get('post_id', '')

                cur.execute(f"SELECT 1 FROM likes WHERE user_id = '{esc(uid)}'::uuid AND post_id = '{esc(pid)}'::uuid")
                if cur.fetchone():
                    cur.execute(f"DELETE FROM likes WHERE user_id = '{esc(uid)}'::uuid AND post_id = '{esc(pid)}'::uuid")
                    liked = False
                else:
                    cur.execute(f"INSERT INTO likes (user_id, post_id) VALUES ('{esc(uid)}'::uuid, '{esc(pid)}'::uuid)")
                    liked = True
                    # Определяем владельца поста и создаём уведомление (не себе)
                    cur.execute(f"SELECT user_id FROM posts WHERE id = '{esc(pid)}'::uuid")
                    owner = cur.fetchone()
                    if owner and str(owner[0]) != uid:
                        cur.execute(
                            f"INSERT INTO notifications (user_id, from_user_id, post_id, type) "
                            f"VALUES ('{esc(str(owner[0]))}'::uuid, '{esc(uid)}'::uuid, '{esc(pid)}'::uuid, 'like') "
                            f"ON CONFLICT DO NOTHING"
                        )
                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'liked': liked})}

            # POST /react
            if method == 'POST' and path == '/react':
                body = json.loads(event.get('body') or '{}')
                uid = body.get('user_id', '')
                pid = body.get('post_id', '')
                emoji = body.get('emoji', '')

                cur.execute(f"SELECT emoji FROM reactions WHERE user_id = '{esc(uid)}'::uuid AND post_id = '{esc(pid)}'::uuid")
                existing = cur.fetchone()

                if existing and existing[0] == emoji:
                    cur.execute(f"DELETE FROM reactions WHERE user_id = '{esc(uid)}'::uuid AND post_id = '{esc(pid)}'::uuid")
                    my_reaction = None
                else:
                    cur.execute(
                        f"INSERT INTO reactions (user_id, post_id, emoji) VALUES ('{esc(uid)}'::uuid, '{esc(pid)}'::uuid, '{esc(emoji)}') "
                        f"ON CONFLICT (user_id, post_id) DO UPDATE SET emoji = EXCLUDED.emoji"
                    )
                    my_reaction = emoji
                    # Уведомление о реакции
                    cur.execute(f"SELECT user_id FROM posts WHERE id = '{esc(pid)}'::uuid")
                    owner = cur.fetchone()
                    if owner and str(owner[0]) != uid:
                        cur.execute(
                            f"INSERT INTO notifications (user_id, from_user_id, post_id, type) "
                            f"VALUES ('{esc(str(owner[0]))}'::uuid, '{esc(uid)}'::uuid, '{esc(pid)}'::uuid, 'reaction') "
                            f"ON CONFLICT DO NOTHING"
                        )
                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'myReaction': my_reaction})}

    return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}
