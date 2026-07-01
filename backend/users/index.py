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
    """Управление пользователями: регистрация и получение профиля."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod')
    path = event.get('path', '/')
    conn = get_conn()

    try:
        if method == 'POST' and path == '/':
            body = json.loads(event.get('body') or '{}')
            name = body.get('name', '').strip()
            handle = body.get('handle', '').strip()
            avatar = body.get('avatar', '').strip()

            if not name or not handle or not avatar:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Missing fields'})}

            rows = conn.run(
                "INSERT INTO users (name, handle, avatar) VALUES (:name, :handle, :avatar) "
                "ON CONFLICT (handle) DO UPDATE SET name = EXCLUDED.name, avatar = EXCLUDED.avatar "
                "RETURNING id, name, handle, avatar",
                name=name, handle=handle, avatar=avatar
            )
            row = rows[0]
            user = {'id': str(row[0]), 'name': row[1], 'handle': row[2], 'avatar': row[3]}
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(user)}

        if method == 'GET' and path == '/':
            handle = (event.get('queryStringParameters') or {}).get('handle')
            if handle:
                rows = conn.run('SELECT id, name, handle, avatar FROM users WHERE handle = :handle', handle=handle)
                if not rows:
                    return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}
                row = rows[0]
                user = {'id': str(row[0]), 'name': row[1], 'handle': row[2], 'avatar': row[3]}
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(user)}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}

    finally:
        conn.close()
