import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Supabase Admin Client (Service Role Key ile yetkili işlem için)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: Request) {
  try {
    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'Kullanıcı ID ve yeni şifre gereklidir.' },
        { status: 400 }
      );
    }

    // Supabase Admin SDK ile kullanıcının şifresini doğrudan güncelliyoruz
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Şifre başarıyla güncellendi.',
      user: data.user,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}