import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { schoolName, contactName, email, phone } = await request.json();

    const { error } = await supabase.from('school_inquiries').insert([{
      school_name: schoolName,
      contact_name: contactName,
      email: email,
      phone: phone,
      status: 'pending'
    }]);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Inquiry saved successfully' });
  } catch (error: any) {
    console.error('Inquiry save error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}