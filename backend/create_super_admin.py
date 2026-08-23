# backend/create_super_admin.py
# ============================================================
# One-off script to create (or reset) a super admin account.
# Run manually on the server:
#   cd /var/www/votesecure/backend && source venv/bin/activate
#   python create_super_admin.py
#
# Prompts for username + password interactively (password input
# is hidden). Nothing is passed as a command-line argument or
# printed back, so it never ends up in shell history or logs.
# ============================================================

import getpass
from database import get_connection
from services.auth_service import hash_password


def main():
    username = input("Super admin username: ").strip()
    if not username:
        print("Username cannot be empty.")
        return

    password = getpass.getpass("Super admin password: ")
    confirm  = getpass.getpass("Confirm password: ")
    if password != confirm:
        print("Passwords do not match.")
        return
    if len(password) < 8:
        print("Password must be at least 8 characters.")
        return

    password_hash = hash_password(password)

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT super_admin_id FROM super_admins WHERE username = %s", (username,))
        existing = cursor.fetchone()

        if existing:
            confirm_reset = input(f"'{username}' already exists. Reset their password? (yes/no): ").strip().lower()
            if confirm_reset != "yes":
                print("Cancelled.")
                return
            cursor.execute(
                "UPDATE super_admins SET password_hash = %s, is_active = TRUE WHERE username = %s",
                (password_hash, username),
            )
            conn.commit()
            print(f"Password reset for '{username}'.")
        else:
            cursor.execute(
                "INSERT INTO super_admins (username, password_hash) VALUES (%s, %s)",
                (username, password_hash),
            )
            conn.commit()
            print(f"Super admin '{username}' created.")
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
