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
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Geçersiz JSON gövdesi (Invalid JSON body)' },
        { status: 400 }
      );
    }

    const { userId, newPassword } = body;

    if (!userId || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Kullanıcı ID ve yeni şifre gereklidir.' },
        { status: 400 }
      );
    }

    // Supabase Admin SDK ile kullanıcının şifresini doğrudan güncelliyoruz
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Şifre başarıyla güncellendi.',
      user: data.user,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}