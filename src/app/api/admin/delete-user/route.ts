'use client';

import React, { useState } from 'react';

export default function AdminMembersManagement({ initialMembers = [] }: { initialMembers?: any[] }) {
  const [members, setMembers] = useState(initialMembers);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // GÜVENLİ KULLANICI SİLME FONKSİYONU
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Bu kullanıcıyı sistemden tamamen silmek istediğinize emin misiniz?')) return;

    setLoadingId(userId);

    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      // HTML veya bozuk yanıt gelme ihtimaline karşı önce text olarak alıyoruz
      const textResponse = await res.text();
      
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch {
        // Eğer sunucu hata verip HTML döndürürse uygulama çökmek yerine buraya düşer
        console.error("Sunucu HTML döndürdü:", textResponse);
        alert("Hata: Sunucu beklenmeyen bir yanıt (HTML) döndürdü. Lütfen Vercel ortam değişkenlerini kontrol edin.");
        setLoadingId(null);
        return;
      }

      if (!res.ok || !data.success) {
        alert('Kullanıcı silinemedi: ' + (data.error || 'Bilinmeyen hata'));
        setLoadingId(null);
        return;
      }

      // Başarılı olursa listeden kaldıralım
      setMembers(prev => prev.filter(m => m.user_id !== userId && m.id !== userId));
      alert('Kullanıcı başarıyla silindi.');
    } catch (err: any) {
      alert('Bağlantı hatası: ' + err.message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border space-y-4">
      <h2 className="text-lg font-bold text-slate-900">Sistem Üyeleri Yönetimi</h2>
      
      <div className="divide-y divide-slate-100">
        {members.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">Gösterilecek üye bulunamadı.</p>
        ) : (
          members.map(member => (
            <div key={member.user_id || member.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-slate-800">{member.full_name || member.email}</p>
                <p className="text-xs text-slate-500">{member.email}</p>
              </div>

              <button
                onClick={() => handleDeleteUser(member.user_id || member.id)}
                disabled={loadingId === (member.user_id || member.id)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {loadingId === (member.user_id || member.id) ? 'Siliniyor...' : 'Üyeyi Sil'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}