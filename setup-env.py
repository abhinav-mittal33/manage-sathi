"""
Setup helper — copies .env.example to .env.local.
Fill in the real values in .env.local before running the app.
Never commit .env.local.
"""
import shutil
import os

src = ".env.example"
dst = ".env.local"

if os.path.exists(dst):
    print(f"{dst} already exists — not overwriting. Delete it first if you want a fresh copy.")
else:
    shutil.copy(src, dst)
    print(f"Copied {src} → {dst}. Fill in your real credentials before starting the app.")
