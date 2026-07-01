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
    """Управление пользователями: регистрация и получение профиля."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod')
    path = event.get('path', '/')

    with psycopg.connect(os.environ['DATABASE_URL']) as conn:
        with conn.cursor() as cur:

            if method == 'POST' and path == '/':
                body = json.loads(event.get('body') or '{}')
                name = body.get('name', '').strip()
                handle = body.get('handle', '').strip()
                avatar = body.get('avatar', '').strip()

                if not name or not handle or not avatar:
                    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Missing fields'})}

                cur.execute(
                    f"INSERT INTO users (name, handle, avatar) VALUES ('{esc(name)}', '{esc(handle)}', '{esc(avatar)}') "
                    f"ON CONFLICT (handle) DO UPDATE SET name = EXCLUDED.name, avatar = EXCLUDED.avatar "
                    f"RETURNING id, name, handle, avatar"
                )
                row = cur.fetchone()
                conn.commit()
                user = {'id': str(row[0]), 'name': row[1], 'handle': row[2], 'avatar': row[3]}
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(user)}

            if method == 'GET' and path == '/':
                handle = (event.get('queryStringParameters') or {}).get('handle', '')
                cur.execute(f"SELECT id, name, handle, avatar FROM users WHERE handle = '{esc(handle)}'")
                row = cur.fetchone()
                if not row:
                    return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}
                user = {'id': str(row[0]), 'name': row[1], 'handle': row[2], 'avatar': row[3]}
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(user)}

    return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}
