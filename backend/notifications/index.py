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
    """Уведомления: получить список и пометить как прочитанные."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod')
    path = event.get('path', '/')

    with psycopg.connect(os.environ['DATABASE_URL']) as conn:
        with conn.cursor() as cur:

            # GET / — список уведомлений для пользователя
            if method == 'GET' and path == '/':
                uid = (event.get('queryStringParameters') or {}).get('user_id', '')
                if not uid:
                    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Missing user_id'})}

                cur.execute(f"""
                    SELECT
                        n.id, n.type, n.read, to_char(n.created_at, 'DD.MM HH24:MI'),
                        fu.name, fu.avatar, fu.handle,
                        p.text
                    FROM notifications n
                    JOIN users fu ON fu.id = n.from_user_id
                    JOIN posts p ON p.id = n.post_id
                    WHERE n.user_id = '{esc(uid)}'::uuid
                    ORDER BY n.created_at DESC
                    LIMIT 30
                """)
                rows = cur.fetchall()
                notifs = [
                    {
                        'id': str(r[0]),
                        'type': r[1],
                        'read': r[2],
                        'time': r[3],
                        'fromName': r[4],
                        'fromAvatar': r[5],
                        'fromHandle': r[6],
                        'postText': r[7][:60] + ('...' if len(r[7]) > 60 else ''),
                    }
                    for r in rows
                ]
                unread = sum(1 for n in notifs if not n['read'])
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'notifications': notifs, 'unread': unread})}

            # POST /read — пометить все как прочитанные
            if method == 'POST' and path == '/read':
                body = json.loads(event.get('body') or '{}')
                uid = body.get('user_id', '')
                cur.execute(f"UPDATE notifications SET read = TRUE WHERE user_id = '{esc(uid)}'::uuid AND read = FALSE")
                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}
