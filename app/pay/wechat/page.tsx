'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

type QrResponse = {
  reference: string;
  qrcode: string;
  originalAmount?: number;
  originalCurrency?: string;
  amount?: number;
  currency?: string;
  expires_at?: string;
};

type StatusResponse = { status: 'pending' | 'completed' };

const CNY_AMOUNTS = [399, 799, 1299] as const;

export default function WechatPayPage() {
  const router = useRouter();
  const [selectedAmount, setSelectedAmount] = useState<number>(CNY_AMOUNTS[1]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [order, setOrder] = useState<QrResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'completed'>('idle');
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasActiveOrder = !!order;
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [nowTs, setNowTs] = useState<number>(Date.now());
  const [refreshCount, setRefreshCount] = useState<number>(0);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);
  const REFRESH_COOLDOWN_MS = 3 * 60 * 1000;

  // 汇率展示（可选）：从本域接口获取微信汇率
  const [rate, setRate] = useState<number | null>(null);

  const remainingSec = useMemo(() => {
    if (!expiresAt) return null;
    const diff = Math.max(0, Math.floor((expiresAt - nowTs) / 1000));
    return diff;
  }, [expiresAt, nowTs]);

  const canRefresh = useMemo(() => {
    if (!hasActiveOrder || status === 'completed') return false;
    if (refreshCount >= 3) return false;
    if (lastRefreshAt == null) return true;
    return Date.now() - lastRefreshAt >= REFRESH_COOLDOWN_MS;
  }, [hasActiveOrder, status, refreshCount, lastRefreshAt, REFRESH_COOLDOWN_MS]);

  const refreshRemainSec = useMemo(() => {
    if (lastRefreshAt == null) return 0;
    const end = lastRefreshAt + REFRESH_COOLDOWN_MS;
    return Math.max(0, Math.floor((end - nowTs) / 1000));
  }, [lastRefreshAt, nowTs, REFRESH_COOLDOWN_MS]);

  // 拉取汇率（仅用于前端展示，非强依赖）
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch('/api/vendor/wechat/rate', { cache: 'no-store' });
        if (!res.ok) return;
        const j = await res.json();
        if (!aborted && typeof j.rate === 'number' && j.rate > 0) {
          setRate(j.rate);
        }
      } catch {
        // 忽略汇率获取异常
      }
    })();
    return () => { aborted = true; };
  }, []);

  // 计算“实际支付约合 RMB”（按微信汇率，仅供参考）
  const approxCny = useMemo(() => {
    if (!order) return null;
    const base = typeof order.originalAmount === 'number' ? order.originalAmount : null; // USD
    if (!base || !rate) return null;
    const v = base * rate;
    return Number.isFinite(v) ? v : null;
  }, [order, rate]);

  const clearPoll = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearPoll();
  }, []);

  // 恢复倒计时定时器，使 remainingSec/refreshRemainSec 正常刷新
  useEffect(() => {
    if (!hasActiveOrder || status === 'completed') return;
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [hasActiveOrder, status]);

  const startPolling = useCallback((reference: string, amountCny?: number) => {
    clearPoll();
    setStatus('pending');
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/pay/status?reference=${encodeURIComponent(reference)}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data: StatusResponse = await res.json();
        if (data.status === 'completed') {
          setStatus('completed');
          clearPoll();
          const code = reference.replace(/[^0-9A-Za-z]/g, '').slice(-6);
          const query = new URLSearchParams({ code: code || '******' });
          if (typeof amountCny === 'number') query.set('amt', amountCny.toFixed(2));
          router.push(`/pay/success?${query.toString()}`);
        }
      } catch {
        // ignore polling error
      }
    }, 2000);
  }, [router]);

  const handleGenerate = useCallback(async () => {
    if (hasActiveOrder) return; // 已有订单时禁止再次生成
    setLoading(true);
    setError('');
    setOrder(null);
    setQrDataUrl('');
    setStatus('idle');
    try {
      const payload = {
        amount: selectedAmount,
        currency: 'CNY',
        vendor: 'wechatpay',
        plan:
          selectedAmount === 399
            ? 'support-399'
            : selectedAmount === 799
            ? 'support-799'
            : 'support-1299',
        duration: 'oneoff',
      };
      const res = await fetch('/api/pay/wechat-qrcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError('二维码生成失败，请稍后再试');
        return;
      }
      const data: QrResponse = await res.json();
      if (!data.qrcode || !data.reference) {
        setError('二维码数据缺失');
        return;
      }
      setOrder(data);
      const url = await QRCode.toDataURL(String(data.qrcode), { margin: 1, width: 280 });
      setQrDataUrl(url);
      startPolling(data.reference, typeof data.amount === 'number' ? data.amount : undefined);
      const exp = data.expires_at ? Date.parse(data.expires_at) : Date.now() + 10 * 60 * 1000;
      setExpiresAt(Number.isFinite(exp) ? exp : Date.now() + 10 * 60 * 1000);
      setLastRefreshAt(null); // 刚生成允许立即刷新
      setRefreshCount(0);
    } catch {
      setError('请求异常，请检查网络');
    } finally {
      setLoading(false);
    }
  }, [selectedAmount, startPolling, hasActiveOrder]);

  const handleCancel = useCallback(() => {
    clearPoll();
    setOrder(null);
    setQrDataUrl('');
    setStatus('idle');
    setError('');
    setExpiresAt(null);
    setRefreshCount(0);
    setLastRefreshAt(null);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!canRefresh || !order) return;
    setLoading(true);
    setError('');
    try {
      const payload = {
        amount: selectedAmount,
        currency: 'CNY',
        vendor: 'wechatpay',
        plan:
          selectedAmount === 399
            ? 'support-399'
            : selectedAmount === 799
            ? 'support-799'
            : 'support-1299',
        duration: 'oneoff',
      };
      const res = await fetch('/api/pay/wechat-qrcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError('刷新失败，请稍后重试');
        return;
      }
      const data: QrResponse = await res.json();
      if (!data.qrcode || !data.reference) {
        setError('刷新返回数据异常');
        return;
      }
      setOrder(data);
      const url = await QRCode.toDataURL(String(data.qrcode), { margin: 1, width: 280 });
      setQrDataUrl(url);
      startPolling(data.reference, typeof data.amount === 'number' ? data.amount : undefined);
      const exp = data.expires_at ? Date.parse(data.expires_at) : Date.now() + 10 * 60 * 1000;
      setExpiresAt(Number.isFinite(exp) ? exp : Date.now() + 10 * 60 * 1000);
      setRefreshCount((c) => c + 1);
      setLastRefreshAt(Date.now());
    } catch {
      setError('刷新异常，请检查网络');
    } finally {
      setLoading(false);
    }
  }, [canRefresh, order, selectedAmount, startPolling]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="max-w-[720px] mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-emerald-700">微信支付</h1>
          <p className="mt-1 text-sm text-neutral-500">请选择金额并生成二维码进行支付</p>
        </div>

        <div className="mb-6">
          <div className="mb-2 text-sm text-neutral-500">选择支持金额（CNY）</div>
          <div className="flex gap-2">
            {CNY_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => setSelectedAmount(amt)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  selectedAmount === amt
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white border-neutral-200 hover:bg-emerald-50'
                }`}
                disabled={loading || hasActiveOrder}
              >
                {amt}
              </button>
            ))}
          </div>
          {hasActiveOrder && (
            <div className="mt-2 text-xs text-neutral-500">已锁定金额，如需更改请先取消当前订单。</div>
          )}
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || hasActiveOrder}
          className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 shadow-sm"
        >
          {loading ? '生成中…' : '生成二维码'}
        </button>

        {hasActiveOrder && status !== 'completed' && (
          <button
            onClick={handleCancel}
            className="ml-3 px-5 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-neutral-700 shadow-sm"
          >
            取消订单
          </button>
        )}
        {hasActiveOrder && status !== 'completed' && (
          <button
            onClick={handleRefresh}
            disabled={!canRefresh || loading}
            className="ml-3 px-5 py-2 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 shadow-sm"
          >
            {canRefresh ? '刷新二维码' : `刷新冷却 ${Math.floor(refreshRemainSec / 60).toString().padStart(2, '0')}:${(refreshRemainSec % 60).toString().padStart(2, '0')}`} {refreshCount > 0 ? `(${refreshCount}/3)` : ''}
          </button>
        )}

        {error && (
          <div className="mt-4 text-red-600 text-sm">{error}</div>
        )}

        {order && (
          <div className="mt-6 p-5 border rounded-lg bg-white border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-medium">请使用微信扫码支付</div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">WeChat Pay</span>
            </div>
            <div className="flex items-center justify-center">
              {qrDataUrl ? (
                // Data URL 本地渲染，不外链
                <Image src={qrDataUrl} alt="WeChat QR" width={280} height={280} unoptimized className="rounded-lg border border-neutral-200 shadow" />
              ) : (
                <div className="w-[280px] h-[280px] bg-neutral-100 animate-pulse rounded-lg" />
              )}
            </div>

            <div className="mt-4 text-base space-y-1">
              <div className="text-neutral-600 text-sm">选择支付金额：<span className="font-semibold">CNY {selectedAmount}</span></div>
              {typeof order.amount === 'number' && order.amount !== selectedAmount && (
                <div className="text-neutral-600 text-sm">实际支付金额：<span className="font-semibold">CNY {order.amount.toFixed(2)}</span></div>
              )}
              {approxCny !== null && (
                <div className="text-neutral-600 text-xs">实际支付约合 RMB：
                  <span className="font-medium"> CNY {approxCny.toFixed(2)}</span>
                  <span className="ml-1 text-neutral-400">（汇率仅供参考）</span>
                </div>
              )}
            </div>

            {remainingSec !== null && (
              <div className="mt-3 text-sm text-neutral-500">
                二维码有效期：{Math.floor(remainingSec / 60).toString().padStart(2, '0')}:{(remainingSec % 60).toString().padStart(2, '0')}
              </div>
            )}

            <div className="mt-2">
              {status === 'pending' && (
                <div className="text-emerald-700 text-sm">您当前的支付受到安全保护</div>
              )}
              {status === 'completed' && (
                <div className="text-green-600 font-medium">支付成功，感谢支持！</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


