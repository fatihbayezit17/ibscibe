import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, fullName, role } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required fields.' },
        { status: 400 }
      );
    }

    // Supabase Admin Client (Service Role Key ile yetkilendirme)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Supabase environment variables are missing on the server.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // 1. Supabase Auth üzerinde kullanıcıyı oluşturalım
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password.trim(),
      email_confirm: true,
      user_metadata: { full_name: fullName || 'User', role: role || 'student' }
    });

    if (authErr) {
      return NextResponse.json(
        { success: false, error: authErr.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      userId: authData.user.id,
      message: 'User successfully created.' 
    });

  } catch (error: any) {
    console.error('API Server Error in create-user:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}