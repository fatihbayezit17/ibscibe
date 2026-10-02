import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// RLS kurallarını ve izin engellerini tamamen bypass eden Admin Yetkilisi
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(req: Request) {
  try {
    const { joinCode, studentId } = await req.json();

    if (!joinCode || !studentId) {
      return NextResponse.json({ error: 'Eksik parametre.' }, { status: 400 });
    }

    const cleanInputCode = String(joinCode).trim().toUpperCase();

    // Tüm sınıfları admin yetkisiyle çekip kodları hafızada eşleştirelim (Büyük/küçük harf ve boşluk sorununu tamamen bitirir)
    const { data: allClasses, error: fetchErr } = await supabaseAdmin
      .from('classes')
      .select('id, class_name, join_code');

    if (fetchErr) {
      return NextResponse.json({ error: 'Veritabanı hatası: ' + fetchErr.message }, { status: 500 });
    }

    if (!allClasses || allClasses.length === 0) {
      return NextResponse.json({ error: 'Sistemde kayıtlı sınıf bulunamadı.' }, { status: 404 });
    }

    const classObj = allClasses.find(c => {
      if (!c.join_code) return false;
      return String(c.join_code).trim().toUpperCase() === cleanInputCode;
    });

    if (!classObj) {
      return NextResponse.json({ error: `Geçersiz sınıf kodu ("${cleanInputCode}").` }, { status: 404 });
    }

    // Sınıf üyelik kaydını yapalım
    const { error: joinErr } = await supabaseAdmin.from('class_members').upsert([
      { class_id: classObj.id, student_id: studentId }
    ], { onConflict: 'class_id,student_id' });

    if (joinErr) {
      return NextResponse.json({ error: 'Kayıt hatası: ' + joinErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, className: classObj.class_name });
  } catch (err: any) {
    return NextResponse.json({ error: 'Sunucu hatası: ' + err.message }, { status: 500 });
  }
}