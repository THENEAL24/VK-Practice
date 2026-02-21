"use client";

import Image from "next/image";
import { Button } from "@vkontakte/vkui";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface LastResult {
  code: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  quizName: string;
}

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const code = (params.code as string)?.toUpperCase() || "";
  
  const [result, setResult] = useState<LastResult | null>(null);

  useEffect(() => {
    const savedResult = localStorage.getItem('vk_quiz_last_result');
    if (savedResult) {
      const parsedResult = JSON.parse(savedResult);
      setResult(parsedResult);
    }
  }, []);

  if (!result) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-zinc-50">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-xl text-gray-600">Загрузка результатов...</p>
        </div>
      </div>
    );
  }

  const percentage = Math.round((result.correctAnswers / result.totalQuestions) * 100);
  const incorrectAnswers = result.totalQuestions - result.correctAnswers;

  const getGrade = () => {
    if (percentage >= 90) return { text: "Отлично!", emoji: "🏆", color: "text-yellow-600" };
    if (percentage >= 70) return { text: "Хорошо!", emoji: "🎉", color: "text-green-600" };
    if (percentage >= 50) return { text: "Неплохо", emoji: "👍", color: "text-blue-600" };
    return { text: "Попробуйте ещё", emoji: "💪", color: "text-orange-600" };
  };

  const grade = getGrade();

  return (
    <div className="w-screen h-screen bg-linear-to-br from-blue-50 to-zinc-50">
      {/* Хедер */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <Image
            alt="VKicon"
            src="/icons/VKLogo.png"
            width={50}
            height={50}
          />
          <h1 className="text-2xl font-semibold text-gray-800">VK Quiz</h1>
        </div>

        <Button
          onClick={() => router.push('/')}
          className="bg-gray-200 hover:bg-gray-300 px-6 py-2 rounded-xl font-semibold text-gray-700 transition-all"
        >
          На главную
        </Button>
      </div>

      {/* Основной контент */}
      <div className="flex items-center justify-center p-4 h-[calc(100vh-100px)]">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            {/* Заголовок */}
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Игра завершена!
              </h2>
              <p className="text-lg text-gray-500">
                {result.quizName}
              </p>
            </div>

            {/* Основной результат */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-3">{grade.emoji}</div>
              <h3 className={`text-3xl font-bold mb-2 ${grade.color}`}>
                {grade.text}
              </h3>
              <p className="text-5xl font-bold text-gray-800">
                {result.correctAnswers}/{result.totalQuestions}
              </p>
              <p className="text-xl text-gray-500 mt-2">
                {percentage}% правильных ответов
              </p>
            </div>

            {/* Детальная статистика */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-green-50 p-4 rounded-xl text-center">
                <p className="text-2xl font-bold text-green-600 mb-1">
                  {result.correctAnswers}
                </p>
                <p className="text-sm text-gray-600">Правильно</p>
              </div>
              
              <div className="bg-red-50 p-4 rounded-xl text-center">
                <p className="text-2xl font-bold text-red-600 mb-1">
                  {incorrectAnswers}
                </p>
                <p className="text-sm text-gray-600">Неправильно</p>
              </div>
            </div>

            {/* Кнопки действий */}
            <div className="space-y-3">
              <Button
                onClick={() => router.push(`/room/${code}?host=true`)}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white 
                         rounded-xl font-semibold text-lg transition-all"
              >
                🔄 Играть снова
              </Button>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => router.push('/')}
                  className="py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 
                           rounded-xl font-semibold transition-all"
                >
                  🏠 На главную
                </Button>
                
                <Button
                  className="py-3 bg-green-100 hover:bg-green-200 text-green-700 
                           rounded-xl font-semibold transition-all"
                >
                  📊 Поделиться
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
