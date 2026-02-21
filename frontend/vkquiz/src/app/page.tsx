"use client";

import Image from "next/image";
import { Button } from "@vkontakte/vkui";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [code, setCode] = useState("");
  const router = useRouter();

  const formatCode = (value: string) => {
    const clean = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const sliced = clean.slice(0, 8);
    if (sliced.length <= 4) {
      return sliced;
    }

    return `${sliced.slice(0, 4)}-${sliced.slice(4)}`;
  };

  const handleJoinRoom = () => {
    if (code.length === 9) {
      // Удаляем дефис для маршрута
      const cleanCode = code.replace('-', '');
      router.push(`/room/${cleanCode}`);
    }
  };

  return (
    <div className="w-screen h-screen bg-linear-to-br from-blue-50 to-zinc-50">
      {/* Хедер */}
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

        <Button className="bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded-xl font-semibold text-white transition-all">
          Войти
        </Button>
      </div>

      <div className="flex flex-col items-center justify-center w-full h-[calc(100vh-100px)]">
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

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-400">
              Нет кода? <span 
                onClick={() => router.push('/create')}
                className="text-blue-500 cursor-pointer hover:underline"
              >
                Создать свою игру
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
