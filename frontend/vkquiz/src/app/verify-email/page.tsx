"use client";

import Image from "next/image";
import { Button } from "@vkontakte/vkui";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyEmail, resendCode } from "@/utils/api";
import { applySession } from "@/utils/storage";

function VerifyEmailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const userId = params.get("userId") || "";
  const email = params.get("email") || "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const resp = await verifyEmail(userId, code.trim());
      if (resp.token && resp.user) {
        applySession(resp.token, resp.user);
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось подтвердить код");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError("Email не указан — повторите регистрацию");
      return;
    }
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      await resendCode(email);
      setInfo("Новый код отправлен. Проверьте логи бэкенда.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить код заново");
    } finally {
      setResending(false);
    }
  };

  const canSubmit = code.trim().length >= 4 && userId !== "" && !loading;

  return (
    <div className="w-screen min-h-screen bg-linear-to-br from-blue-50 to-zinc-50 flex flex-col">
      <div className="sticky top-0 z-50 flex items-center justify-between px-8 py-6
                border-b border-gray-400/20 bg-white/70 backdrop-blur-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/")}>
          <Image alt="VKicon" src="/icons/VKLogo.png" width={50} height={50} />
          <h1 className="text-2xl font-semibold text-gray-800">VK Quiz</h1>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📬</div>
            <h2 className="text-3xl font-semibold text-gray-800 mb-2">Подтверждение почты</h2>
            <p className="text-gray-500">
              Мы отправили 6-значный код на{" "}
              <span className="font-semibold text-gray-700">{email || "ваш email"}</span>
            </p>
            <p className="text-xs text-gray-400 mt-2">
              В dev-режиме код печатается в логи бэкенда: <code>docker compose logs api</code> или{" "}
              <code>make logs</code>
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              className="w-full px-6 py-4 text-3xl font-bold text-center tracking-widest
                         bg-white border-2 border-gray-200 rounded-2xl text-gray-800
                         focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                         transition-all duration-200"
            />

            {error && (
              <div className="p-3 rounded-xl text-sm bg-red-50 text-red-700">{error}</div>
            )}
            {info && (
              <div className="p-3 rounded-xl text-sm bg-blue-50 text-blue-700">{info}</div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300
                         text-white rounded-xl font-semibold transition-all disabled:cursor-not-allowed"
            >
              {loading ? "Проверяем..." : "Подтвердить"}
            </Button>

            <div className="text-center">
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-sm text-blue-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resending ? "Отправка..." : "Отправить код повторно"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="w-screen min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-zinc-50">
          <p className="text-xl text-gray-600">Загрузка…</p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
