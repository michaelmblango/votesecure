# backend/database.py
# ============================================================
# Database connection manager for VoteSecure
# Provides get_connection() - called by every file that
# needs to read from or write to PostgreSQL
# ============================================================

import psycopg2
import psycopg2.extras  # Gives us dictionary-style row access
from config import settings


def get_connection():
    """
    Create and return a new PostgreSQL database connection.

    Usage:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        row = cursor.fetchone()
        cursor.close()
        conn.close()

    ALWAYS close cursor and connection when done.
    Use try/finally to guarantee this even if an error occurs.
    """
    return psycopg2.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        dbname=settings.DB_NAME,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        # cursor_factory makes rows behave like dictionaries
        # So you can write row['email'] instead of row[0]
        cursor_factory=psycopg2.extras.RealDictCursor,
    )


def test_connection():
    """
    Test that the database connection works.
    Run this once to confirm setup is correct.
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT NOW() as current_time;")
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        print(f"✅ Database connected successfully at {result['current_time']}")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


# Run this file directly to test the connection:
# python database.py
if __name__ == "__main__":
    test_connection()