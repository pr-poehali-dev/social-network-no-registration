import json
import os
import pg8000.native

def get_conn():
    url = os.environ['DATABASE_URL'].replace('postgresql://', '').replace('postgres://', '')
    user_pass, rest = url.split('@', 1)
    user, password = user_pass.split(':', 1)
    host_port, dbname = rest.split('/', 1)
    host, port = (host_port.split(':', 1) if ':' in host_port else (host_port, '5432'))
    return pg8000.native.Connection(user=user, password=password, host=host, port=int(port), database=dbname)

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def handler(event: dict, context) -> dict:
    """Посты, лайки и реакции: лента, публикация, лайк, реакция."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod')
    path = event.get('path', '/')
    conn = get_conn()

    try:
        # GET / — лента
        if method == 'GET' and path == '/':
            user_id = (event.get('queryStringParameters') or {}).get('user_id')

            rows = conn.run("""
                SELECT
                    p.id, p.text, p.image,
                    to_char(p.created_at, 'DD.MM HH24:MI'),
                    u.id, u.name, u.handle, u.avatar,
                    COUNT(DISTINCT l.user_id) AS likes_count,
                    EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = :uid::uuid) AS liked,
                    (SELECT emoji FROM reactions WHERE post_id = p.id AND user_id = :uid::uuid) AS my_reaction
                FROM posts p
                JOIN users u ON u.id = p.user_id
                LEFT JOIN likes l ON l.post_id = p.id
                GROUP BY p.id, p.text, p.image, p.created_at, u.id, u.name, u.handle, u.avatar
                ORDER BY p.created_at DESC
                LIMIT 50
            """, uid=user_id or '00000000-0000-0000-0000-000000000000')

            post_ids = [row[0] for row in rows]
            reactions_map = {}
            if post_ids:
                placeholders = ', '.join([f':id{i}' for i in range(len(post_ids))])
                params = {f'id{i}': pid for i, pid in enumerate(post_ids)}
                rrows = conn.run(
                    f"SELECT post_id, emoji, COUNT(*) FROM reactions WHERE post_id IN ({placeholders}) GROUP BY post_id, emoji",
                    **params
                )
                for rrow in rrows:
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
            user_id = body.get('user_id')
            text = body.get('text', '').strip()
            image = body.get('image')

            if not user_id or not text:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Missing fields'})}

            rows = conn.run(
                'INSERT INTO posts (user_id, text, image) VALUES (:uid::uuid, :text, :image) RETURNING id',
                uid=user_id, text=text, image=image
            )
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'id': str(rows[0][0])})}

        # POST /like
        if method == 'POST' and path == '/like':
            body = json.loads(event.get('body') or '{}')
            user_id = body.get('user_id')
            post_id = body.get('post_id')

            existing = conn.run(
                'SELECT 1 FROM likes WHERE user_id = :uid::uuid AND post_id = :pid::uuid',
                uid=user_id, pid=post_id
            )
            if existing:
                conn.run('DELETE FROM likes WHERE user_id = :uid::uuid AND post_id = :pid::uuid', uid=user_id, pid=post_id)
                liked = False
            else:
                conn.run('INSERT INTO likes (user_id, post_id) VALUES (:uid::uuid, :pid::uuid)', uid=user_id, pid=post_id)
                liked = True
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'liked': liked})}

        # POST /react
        if method == 'POST' and path == '/react':
            body = json.loads(event.get('body') or '{}')
            user_id = body.get('user_id')
            post_id = body.get('post_id')
            emoji = body.get('emoji')

            existing = conn.run(
                'SELECT emoji FROM reactions WHERE user_id = :uid::uuid AND post_id = :pid::uuid',
                uid=user_id, pid=post_id
            )
            if existing and existing[0][0] == emoji:
                conn.run('DELETE FROM reactions WHERE user_id = :uid::uuid AND post_id = :pid::uuid', uid=user_id, pid=post_id)
                my_reaction = None
            else:
                conn.run(
                    'INSERT INTO reactions (user_id, post_id, emoji) VALUES (:uid::uuid, :pid::uuid, :emoji) '
                    'ON CONFLICT (user_id, post_id) DO UPDATE SET emoji = EXCLUDED.emoji',
                    uid=user_id, pid=post_id, emoji=emoji
                )
                my_reaction = emoji
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'myReaction': my_reaction})}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}

    finally:
        conn.close()
