// Environment variables must be set before route/lib modules are imported,
// since several modules capture config at import time.
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.NEXT_PUBLIC_APP_URL = 'https://test.resumari.it'
process.env.YOUTUBE_API_KEY = 'test-youtube-key'
process.env.GROQ_API_KEY = ''
process.env.OPENAI_API_KEY = ''
process.env.STRIPE_SECRET_KEY = ''
process.env.STRIPE_WEBHOOK_SECRET = ''
