"use client";

import Image from "next/image";
import { Button } from "@vkontakte/vkui";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAccount, ApiError } from "@/utils/api";
import { applySession } from "@/utils/storage";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await loginAccount(email.trim(), password);
      if (resp.token && resp.user) {
        applySession(resp.token, resp.user);
        router.push("/");
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && err.body.requiresVerification) {
        // need to verify first
        const userId = err.body.userId || "";
        router.push(`/verify-email?userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(err.body.email || email)}`);
        return;
      }
      setError(err instanceof Error ? err.message : "Не удалось войти");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = email.includes("@") && password.length >= 6 && !loading;

  return (
    <div className="w-screen min-h-screen bg-linear-to-br from-blue-50 to-zinc-50 flex flex-col">
      <div className="sticky top-0 z-50 flex items-center justify-between px-8 py-6
                border-b border-gray-400/20 bg-white/70 backdrop-blur-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/")}>
          <Image alt="VKicon" src="/icons/VKLogo.png" width={50} height={50} />
          <h1 className="text-2xl font-semibold text-gray-800">VK Quiz</h1>
        </div>
        <Button
          onClick={() => router.push("/register")}
          className="bg-blue-100 hover:bg-blue-200 px-5 py-2 rounded-xl font-semibold text-blue-700 transition-all"
        >
          Регистрация
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
          <h2 className="text-3xl font-semibold text-gray-800 mb-2">Вход</h2>
          <p className="text-gray-500 mb-6">Войдите, чтобы хранить историю игр и квизы</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl
                           focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                           transition-all duration-200 text-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl
                           focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                           transition-all duration-200 text-gray-800"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl text-sm bg-red-50 text-red-700">{error}</div>
            )}

            <Button
              onClick={handleLogin}
              disabled={!canSubmit}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300
                         text-white rounded-xl font-semibold transition-all disabled:cursor-not-allowed"
            >
              {loading ? "Входим..." : "Войти"}
            </Button>

            <p className="text-center text-sm text-gray-500 mt-6">
              Нет аккаунта?{" "}
              <span
                className="text-blue-600 hover:underline cursor-pointer"
                onClick={() => router.push("/register")}
              >
                Зарегистрироваться
              </span>
            </p>
            <p className="text-center text-sm text-gray-400">
              <span
                className="hover:underline cursor-pointer"
                onClick={() => router.push("/")}
              >
                Продолжить как гость
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
