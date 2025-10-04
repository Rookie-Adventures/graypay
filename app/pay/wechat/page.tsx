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

const CNY_AMOUNTS = [399, 799] as const;

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
        plan: selectedAmount === 399 ? 'support-399' : 'support-799',
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
        plan: selectedAmount === 399 ? 'support-399' : 'support-799',
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
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white relative overflow-hidden">
      {/* 卡车加载动画背景 */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center" style={{ zIndex: 0, backgroundColor: '#e8e8e8' }}>
        <style jsx>{`
          .loader {
            width: fit-content;
            height: fit-content;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .truckWrapper {
            width: 200px;
            height: 100px;
            display: flex;
            flex-direction: column;
            position: relative;
            align-items: center;
            justify-content: flex-end;
            overflow-x: hidden;
          }

          /* truck upper body */
          .truckBody {
            width: 130px;
            height: fit-content;
            margin-bottom: 6px;
            animation: motion 1s linear infinite;
          }

          /* truck suspension animation */
          @keyframes motion {
            0% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(3px);
            }
            100% {
              transform: translateY(0px);
            }
          }

          /* truck's tires */
          .truckTires {
            width: 130px;
            height: fit-content;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0px 10px 0px 15px;
            position: absolute;
            bottom: 0;
          }

          .truckTires svg {
            width: 24px;
          }

          .road {
            width: 100%;
            height: 1.5px;
            background-color: #282828;
            position: relative;
            bottom: 0;
            align-self: flex-end;
            border-radius: 3px;
          }

          .road::before {
            content: "";
            position: absolute;
            width: 20px;
            height: 100%;
            background-color: #282828;
            right: -50%;
            border-radius: 3px;
            animation: roadAnimation 1.4s linear infinite;
            border-left: 10px solid white;
          }

          .road::after {
            content: "";
            position: absolute;
            width: 10px;
            height: 100%;
            background-color: #282828;
            right: -65%;
            border-radius: 3px;
            animation: roadAnimation 1.4s linear infinite;
            border-left: 4px solid white;
          }

          .lampPost {
            position: absolute;
            bottom: 0;
            right: -90%;
            height: 90px;
            animation: roadAnimation 1.4s linear infinite;
          }

          @keyframes roadAnimation {
            0% {
              transform: translateX(0px);
            }
            100% {
              transform: translateX(-350px);
            }
          }
        `}</style>

        {/* 卡车加载动画 */}
        <div className="loader">
          <div className="truckWrapper">
            <div className="truckBody">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 198 93"
                className="trucksvg"
              >
                <path
                  strokeWidth="3"
                  stroke="#282828"
                  fill="#F83D3D"
                  d="M135 22.5H177.264C178.295 22.5 179.22 23.133 179.594 24.0939L192.33 56.8443C192.442 57.1332 192.5 57.4404 192.5 57.7504V89C192.5 90.3807 191.381 91.5 190 91.5H135C133.619 91.5 132.5 90.3807 132.5 89V25C132.5 23.6193 133.619 22.5 135 22.5Z"
                ></path>
                <path
                  strokeWidth="3"
                  stroke="#282828"
                  fill="#7D7C7C"
                  d="M146 33.5H181.741C182.779 33.5 183.709 34.1415 184.078 35.112L190.538 52.112C191.16 53.748 189.951 55.5 188.201 55.5H146C144.619 55.5 143.5 54.3807 143.5 53V36C143.5 34.6193 144.619 33.5 146 33.5Z"
                ></path>
                <path
                  strokeWidth="2"
                  stroke="#282828"
                  fill="#282828"
                  d="M150 65C150 65.39 149.763 65.8656 149.127 66.2893C148.499 66.7083 147.573 67 146.5 67C145.427 67 144.501 66.7083 143.873 66.2893C143.237 65.8656 143 65.39 143 65C143 64.61 143.237 64.1344 143.873 63.7107C144.501 63.2917 145.427 63 146.5 63C147.573 63 148.499 63.2917 149.127 63.7107C149.763 64.1344 150 64.61 150 65Z"
                ></path>
                <rect
                  strokeWidth="2"
                  stroke="#282828"
                  fill="#FFFCAB"
                  rx="1"
                  height="7"
                  width="5"
                  y="63"
                  x="187"
                ></rect>
                <rect
                  strokeWidth="2"
                  stroke="#282828"
                  fill="#282828"
                  rx="1"
                  height="11"
                  width="4"
                  y="81"
                  x="193"
                ></rect>
                <rect
                  strokeWidth="3"
                  stroke="#282828"
                  fill="#DFDFDF"
                  rx="2.5"
                  height="90"
                  width="121"
                  y="1.5"
                  x="6.5"
                ></rect>
                <rect
                  strokeWidth="2"
                  stroke="#282828"
                  fill="#DFDFDF"
                  rx="2"
                  height="4"
                  width="6"
                  y="84"
                  x="1"
                ></rect>
              </svg>
            </div>
            <div className="truckTires">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 30 30"
                className="tiresvg"
              >
                <circle
                  strokeWidth="3"
                  stroke="#282828"
                  fill="#282828"
                  r="13.5"
                  cy="15"
                  cx="15"
                ></circle>
                <circle fill="#DFDFDF" r="7" cy="15" cx="15"></circle>
              </svg>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 30 30"
                className="tiresvg"
              >
                <circle
                  strokeWidth="3"
                  stroke="#282828"
                  fill="#282828"
                  r="13.5"
                  cy="15"
                  cx="15"
                ></circle>
                <circle fill="#DFDFDF" r="7" cy="15" cx="15"></circle>
              </svg>
            </div>
            <div className="road"></div>

            <svg
              xmlSpace="preserve"
              viewBox="0 0 453.459 453.459"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              xmlns="http://www.w3.org/2000/svg"
              id="Capa_1"
              version="1.1"
              fill="#000000"
              className="lampPost"
            >
              <path
                d="M252.882,0c-37.781,0-68.686,29.953-70.245,67.358h-6.917v8.954c-26.109,2.163-45.463,10.011-45.463,19.366h9.993
c-1.65,5.146-2.507,10.54-2.507,16.017c0,28.956,23.558,52.514,52.514,52.514c28.956,0,52.514-23.558,52.514-52.514
c0-5.478-0.856-10.872-2.506-16.017h9.992c0-9.354-19.352-17.204-45.463-19.366v-8.954h-6.149C200.189,38.779,223.924,16,252.882,16
c29.952,0,54.32,24.368,54.32,54.32c0,28.774-11.078,37.009-25.105,47.437c-17.444,12.968-37.216,27.667-37.216,78.884v113.914
h-0.797c-5.068,0-9.174,4.108-9.174,9.177c0,2.844,1.293,5.383,3.321,7.066c-3.432,27.933-26.851,95.744-8.226,115.459v11.202h45.75
v-11.202c18.625-19.715-4.794-87.527-8.227-115.459c2.029-1.683,3.322-4.223,3.322-7.066c0-5.068-4.107-9.177-9.176-9.177h-0.795
V196.641c0-43.174,14.942-54.283,30.762-66.043c14.793-10.997,31.559-23.461,31.559-60.277C323.202,31.545,291.656,0,252.882,0z
M232.77,111.694c0,23.442-19.071,42.514-42.514,42.514c-23.442,0-42.514-19.072-42.514-42.514c0-5.531,1.078-10.957,3.141-16.017
h78.747C231.693,100.736,232.77,106.162,232.77,111.694z"
              ></path>
            </svg>
          </div>
        </div>
      </div>

      <div className="max-w-[720px] mx-auto px-4 py-10 relative" style={{ zIndex: 1 }}>
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


