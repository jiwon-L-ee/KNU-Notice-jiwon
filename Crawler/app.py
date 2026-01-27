from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
# CORS 설정을 더 확실하게 잡아줍니다.
CORS(app, resources={r"/api/*": {"origins": "*"}})

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "postgres"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "hsm0710**"),
        port=os.getenv("DB_PORT", "5432")
    )

@app.route('/api/notices', methods=['GET'])
def get_notices():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        query = "SELECT source as dept, title, link, post_date as date FROM knu_notices ORDER BY post_date DESC, id DESC"
        cur.execute(query)
        notices = cur.fetchall()
        return jsonify(notices)
    except Exception as e:
        print(f"공지사항 조회 에러: {e}")
        return jsonify([])
    finally:
        if conn: conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    sid = data.get('student_id')
    pw = data.get('password')
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT * FROM users WHERE student_id = %s AND password = %s", (sid, pw))
        user = cur.fetchone()
        if user:
            if 'password' in user: del user['password']
            return jsonify({"success": True, "user": user})
        else:
            return jsonify({"success": False, "message": "학번 또는 비밀번호가 틀렸습니다."})
    finally:
        conn.close()

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    sid = data.get('student_id')
    pw = data.get('password')
    name = data.get('name')
    grade = data.get('grade')
    dept = data.get('department')
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT student_id FROM users WHERE student_id = %s", (sid,))
        if cur.fetchone():
            return jsonify({"success": False, "message": "이미 존재하는 학번입니다."})
        cur.execute(
            "INSERT INTO users (student_id, password, name, grade, department) VALUES (%s, %s, %s, %s, %s)",
            (sid, pw, name, grade, dept)
        )
        conn.commit()
        return jsonify({"success": True, "message": "회원가입 성공!"})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)})
    finally:
        conn.close()

@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    sid = data.get('student_id')
    new_pw = data.get('new_password')
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE users SET password = %s WHERE student_id=%s", (new_pw, sid))
        if cur.rowcount > 0:
            conn.commit()
            return jsonify({"success": True, "message": "비밀번호가 성공적으로 변경되었습니다."})
        else:
            return jsonify({"success": False, "message": "존재하지 않는 학번입니다."})
    finally:
        cur.close()
        conn.close()

@app.route('/api/update-keywords', methods=['POST'])
def update_keywords():
    data = request.json
    sid = data.get('student_id')
    keywords = data.get('keywords') 
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # DB의 keywords 컬럼이 TEXT[] 타입인지 꼭 확인하세요!
        cur.execute("UPDATE users SET keywords = %s WHERE student_id = %s", (keywords, sid))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        print(f"키워드 업데이트 에러: {e}")
        return jsonify({"success": False, "message": str(e)})
    finally:
        cur.close()
        conn.close()

# ✅ 메인 실행 코드는 항상 맨 마지막에!
if __name__ == '__main__':
    app.run(debug=True, port=5000)