import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase Service Role Key (Sunucu tarafında kullanıcı oluşturmak için yetkili anahtar)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false } }
);

export async function POST(request: Request) {
  try {
    const { email, password, fullName, role } = await request.json();

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Supabase Auth üzerinden kullanıcıyı oluşturalım
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role }
    });

    if (authError) throw authError;

    if (authUser.user) {
      // 2. Profiles tablosuna kaydını atalım
      const { error: profError } = await supabaseAdmin.from('profiles').upsert([{
        id: authUser.user.id,
        full_name: fullName || email.split('@')[0],
        role: role === 'school-admin' ? 'teacher' : role
      }]);

      if (profError) throw profError;
    }

    return NextResponse.json({ success: true, userId: authUser.user?.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}