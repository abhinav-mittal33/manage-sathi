content = (
    "DATABASE_URL=postgresql://neondb_owner:npg_f0alqeUNhj7F@ep-sweet-fire-a17adz1f.ap-southeast-1.aws.neon.tech/neondb?sslmode=require\n"
    "AUTH_SECRET=ms-pilot-secret-key-change-before-saas-2024\n"
    "R2_ACCOUNT_ID=placeholder\n"
    "R2_ACCESS_KEY_ID=placeholder\n"
    "R2_SECRET_ACCESS_KEY=placeholder\n"
    "R2_BUCKET_NAME=manage-sathi\n"
    "R2_PUBLIC_URL=https://placeholder.r2.dev\n"
    "N8N_SITE_NOTE_WEBHOOK=\n"
    "N8N_DRAWING_APPROVAL_WEBHOOK=\n"
    "N8N_INVOICE_WEBHOOK=\n"
    "N8N_WEBHOOK_SECRET=placeholder\n"
    "NEXT_PUBLIC_APP_URL=http://localhost:3000\n"
)
with open(".env.local", "w") as f:
    f.write(content)
print("done — .env.local written")
