"use client";

import Image from "next/image";
import { Button } from "@vkontakte/vkui";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureProfile, LocalProfile, signOut } from "@/utils/storage";

export default function Home() {
  const [code, setCode] = useState("");
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const router = useRouter();

  useEffect(() => {
    ensureProfile()
      .then(setProfile)
      .catch((err) => {
        console.error("Не удалось загрузить профиль:", err);
      });
  }, []);

  const formatCode = (value: string) => {
    const clean = value.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const sliced = clean.slice(0, 8);
    if (sliced.length <= 4) {
      return sliced;
    }
    return `${sliced.slice(0, 4)}-${sliced.slice(4)}`;
  };

  const handleJoinRoom = () => {
    if (code.length === 9) {
      const cleanCode = code.replace("-", "");
      router.push(`/room/${cleanCode}`);
    }
  };

  const handleLogout = async () => {
    await signOut();
    const p = await ensureProfile();
    setProfile(p);
  };

  return (
    <div className="w-screen min-h-screen bg-linear-to-br from-blue-50 to-zinc-50">
      <div className="sticky top-0 z-50 flex items-center justify-between px-8 py-6
                border-b border-gray-400/20
                bg-white/70 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Image
            alt="VKicon"
            src="/icons/VKLogo.png"
            width={50}
            height={50}
          />
          <h1 className="text-2xl font-semibold text-gray-800">Quiz</h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.push("/quizzes")}
            className="bg-blue-100 hover:bg-blue-200 px-5 py-2 rounded-xl font-semibold text-blue-700 transition-all"
          >
            Каталог
          </Button>

          {profile?.isAuthenticated ? (
            <>
              <Button
                onClick={() => router.push("/profile")}
                className="bg-white hover:bg-gray-50 border border-gray-200 px-5 py-2 rounded-xl font-semibold text-gray-700 transition-all"
              >
                @{profile.nickname}
              </Button>
              <Button
                onClick={handleLogout}
                className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl font-semibold text-gray-600 transition-all"
              >
                Выйти
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => router.push("/profile")}
                className="bg-white hover:bg-gray-50 border border-gray-200 px-5 py-2 rounded-xl font-semibold text-gray-700 transition-all"
              >
                {profile ? `@${profile.nickname}` : "Профиль"}
              </Button>
              <Button
                onClick={() => router.push("/login")}
                className="bg-blue-500 hover:bg-blue-600 px-5 py-2 rounded-xl font-semibold text-white transition-all"
              >
                Войти
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center w-full min-h-[calc(100vh-100px)]">
        <div className="flex flex-col items-center gap-4 p-8">
          <p className="text-lg text-gray-500">
            Введите код комнаты
          </p>
          <div className="flex flex-col gap-4 w-full max-w-md">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(formatCode(e.target.value))}
              placeholder="XXXX-XXXX"
              maxLength={9}
              className="w-full px-6 py-4 text-2xl font-medium text-center tracking-widest
                 bg-white border-2 border-gray-200 rounded-2xl text-black hover:border-blue-500
                 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                 transition-all duration-200 placeholder:text-gray-300"
            />

            <Button
              onClick={handleJoinRoom}
              disabled={code.length !== 9}
              className="w-full py-4 text-xl font-semibold text-white
                 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300
                 rounded-2xl transition-all duration-200
                 disabled:cursor-not-allowed"
            >
              Присоединиться к комнате
            </Button>
          </div>

          <div className="w-full max-w-md mt-6">
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <span className="relative px-4 text-sm text-gray-400 bg-linear-to-br from-blue-50 to-zinc-50">
                или начните с нуля
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => router.push("/create")}
                className="w-full py-4 text-lg font-semibold text-white
                   bg-green-500 hover:bg-green-600
                   rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg"
              >
                ✨ Создать свою игру
              </Button>

              <Button
                onClick={() => router.push("/quizzes")}
                className="w-full py-3 text-base font-semibold
                   bg-white hover:bg-gray-50 text-gray-700
                   border-2 border-gray-200 hover:border-blue-300
                   rounded-2xl transition-all duration-200"
              >
                📚 Выбрать из каталога
              </Button>
            </div>

            {!profile?.isAuthenticated && (
              <p className="text-center text-sm text-gray-400 mt-6">
                <span
                  onClick={() => router.push("/register")}
                  className="text-blue-500 cursor-pointer hover:underline"
                >
                  Зарегистрироваться
                </span>{" "}
                — сохраняем историю и квизы
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
