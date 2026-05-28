"use client";

import Image from "next/image";
import { Button } from "@vkontakte/vkui";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerAccount } from "@/utils/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }
    setLoading(true);
    try {
      const resp = await registerAccount({
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        email: email.trim(),
        password,
      });
      router.push(
        `/verify-email?userId=${encodeURIComponent(resp.userId)}&email=${encodeURIComponent(resp.email)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось зарегистрироваться");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    name.trim().length > 0 &&
    email.includes("@") &&
    password.length >= 6 &&
    confirm.length >= 6 &&
    !loading;

  return (
    <div className="w-screen min-h-screen bg-linear-to-br from-blue-50 to-zinc-50 flex flex-col">
      <div className="sticky top-0 z-50 flex items-center justify-between px-8 py-6
                border-b border-gray-400/20 bg-white/70 backdrop-blur-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/")}>
          <Image alt="VKicon" src="/icons/VKLogo.png" width={50} height={50} />
          <h1 className="text-2xl font-semibold text-gray-800">VK Quiz</h1>
        </div>
        <Button
          onClick={() => router.push("/login")}
          className="bg-white hover:bg-gray-50 border border-gray-200 px-5 py-2 rounded-xl font-semibold text-gray-700 transition-all"
        >
          Уже есть аккаунт
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
          <h2 className="text-3xl font-semibold text-gray-800 mb-2">Регистрация</h2>
          <p className="text-gray-500 mb-6">
            Создайте аккаунт — код подтверждения отправится на ваш email
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Имя</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван"
                maxLength={100}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl
                           focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                           transition-all duration-200 text-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Никнейм <span className="text-gray-400 text-xs">(необязательно)</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.replace(/\s+/g, "_"))}
                placeholder="ivan_quiz (автогенерация если пусто)"
                maxLength={50}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl
                           focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                           transition-all duration-200 text-gray-800"
              />
            </div>

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Повторите пароль</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl
                           focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                           transition-all duration-200 text-gray-800"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl text-sm bg-red-50 text-red-700">{error}</div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300
                         text-white rounded-xl font-semibold transition-all disabled:cursor-not-allowed"
            >
              {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
            </Button>

            <p className="text-center text-sm text-gray-500 mt-4">
              Уже зарегистрированы?{" "}
              <span
                className="text-blue-600 hover:underline cursor-pointer"
                onClick={() => router.push("/login")}
              >
                Войти
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
