import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      { auth: { persistSession: false } }
    );

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Geçersiz JSON gövdesi' }, { status: 400 });
    }

    const { userId } = body;
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Kullanıcı ID gerekli' }, { status: 400 });
    }

    await supabaseAdmin.from('school_memberships').delete().eq('user_id', userId);
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
}