'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function SuccessInner() {
  const params = useSearchParams();
  const router = useRouter();
  const code = useMemo(() => (params.get('code') || '').slice(-6), [params]);
  const amount = params.get('amt');

  return (
    <div className="max-w-[640px] mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-emerald-700">支付成功</h1>
      <p className="mt-3 text-neutral-600">感谢支持！以下为您的支付信息：</p>
      <div className="mt-6 inline-flex items-center justify-center px-4 py-3 rounded-lg border border-neutral-200 bg-white text-2xl font-mono tracking-widest">
        {code || '******'}
      </div>
      {amount && (
        <div className="mt-3 text-neutral-700">支付金额：<span className="font-semibold">CNY {amount}</span></div>
      )}
      <div className="mt-8">
        <button
          className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          onClick={() => router.push('/pay/wechat')}
        >
          返回支付页
        </button>
      </div>
    </div>
  );
}

export default function PaySuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <Suspense fallback={<div className="max-w-[640px] mx-auto px-4 py-16 text-center">加载中…</div>}>
        <SuccessInner />
      </Suspense>
    </div>
  );
}


