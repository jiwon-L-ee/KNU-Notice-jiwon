from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

# .env 파일 로드 (DB_PASSWORD 등을 가져오기 위함)
load_dotenv()

app = Flask(__name__)
CORS(app) # React와 통신하기 위해 필수!

# 1. DB 연결 함수 (정의되지 않았다는 에러 해결)
def get_db_connection():
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "postgres"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "hsm0710**"), # .env 비번 사용
        port=os.getenv("DB_PORT", "5432")
    )
    return conn

# 2. 공지사항 가져오기 API
@app.route('/api/notices', methods=['GET'])
def get_notices():
    conn = None
    try:
        conn = get_db_connection()
        # RealDictCursor를 사용하면 DB 데이터를 파이썬 딕셔너리 형태로 편하게 가져옵니다.
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        query = "SELECT source as dept, title, link, post_date as date FROM knu_notices ORDER BY post_date DESC, id DESC"
        cur.execute(query)
        notices = cur.fetchall()
        
        return jsonify(notices)
    except Exception as e:
        print(f"공지사항 조회 에러: {e}")
        return jsonify([])
    finally:
        if conn:
            conn.close()

# 3. 로그인 API
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
            # 비밀번호는 보안상 제외하고 보냄
            del user['password']
            return jsonify({"success": True, "user": user})
        else:
            return jsonify({"success": False, "message": "학번 또는 비밀번호가 틀렸습니다."})
    finally:
        conn.close()

# 4. 회원가입 API
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
        # 중복 체크
        cur.execute("SELECT student_id FROM users WHERE student_id = %s", (sid,))
        if cur.fetchone():
            return jsonify({"success": False, "message": "이미 존재하는 학번입니다."})

        # 가입 진행
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

if __name__ == '__main__':
    app.run(debug=True, port=5000)

@app.route('/api/reset-password',methods=['POST'])
def reset_password():
    data=request.get_json()
    sid=data.get('student_id')
    new_pw=data.get('new_password')

    conn=get_db_connection()
    cur=conn.cursor()

    cur.execute("UPDATE users SET password = %s WHERE student_id=%s",(new_pw,sid))

    if cur.rowcount>0:
        conn.commit()
        success=True
        message="비밀번호가 성공적으로 변경되었습니다."
    else:
        success=False
        message="존재하지 않는 학번입니다."

    cur.close()
    conn.close()
    return jsonify({"success":success, "message":message})


