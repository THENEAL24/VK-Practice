"use client";

import Image from "next/image";
import { Button } from "@vkontakte/vkui";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getLeaderboard, GameResultResponse } from "@/utils/api";
import { getPlayerId, getProfile } from "@/utils/storage";

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const code = (params.code as string)?.toUpperCase() || "";

  const [quizName, setQuizName] = useState<string>("");
  const [entries, setEntries] = useState<GameResultResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>("");
  const [myUserId, setMyUserId] = useState<string>("");

  const fetchLeaderboard = async () => {
    try {
      const board = await getLeaderboard(code);
      setEntries(board.entries || []);
      setQuizName(board.quizName);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка загрузки";
      setError(msg);
      const local = localStorage.getItem("vk_quiz_last_result");
      if (local) {
        try {
          const parsed = JSON.parse(local);
          setEntries([
            {
              code,
              playerId: getPlayerId(),
              playerName: parsed.playerName || "Вы",
              score: parsed.score,
              correctAnswers: parsed.correctAnswers,
              totalQuestions: parsed.totalQuestions,
              quizName: parsed.quizName,
              quizCode: parsed.quizCode || code,
              finishedAt: new Date().toISOString(),
            },
          ]);
          setQuizName(parsed.quizName);
        } catch {
          // ignore
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMyPlayerId(getPlayerId());
    const p = getProfile();
    if (p) setMyUserId(p.id);

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const myEntry = entries.find(
    (e) =>
      (myPlayerId && e.playerId === myPlayerId) ||
      (myUserId && e.userId === myUserId)
  );

  const getMedal = (idx: number) => {
    if (idx === 0) return "🥇";
    if (idx === 1) return "🥈";
    if (idx === 2) return "🥉";
    return `${idx + 1}`;
  };

  const myPercentage = myEntry && myEntry.totalQuestions > 0
    ? Math.round((myEntry.correctAnswers / myEntry.totalQuestions) * 100)
    : 0;

  const getGrade = (p: number) => {
    if (p >= 90) return { text: "Отлично!", emoji: "🏆", color: "text-yellow-600" };
    if (p >= 70) return { text: "Хорошо!", emoji: "🎉", color: "text-green-600" };
    if (p >= 50) return { text: "Неплохо", emoji: "👍", color: "text-blue-600" };
    return { text: "Попробуйте ещё", emoji: "💪", color: "text-orange-600" };
  };

  const grade = myEntry ? getGrade(myPercentage) : null;

  return (
    <div className="w-screen min-h-screen bg-linear-to-br from-blue-50 to-zinc-50">
      <div className="sticky top-0 z-50 flex items-center justify-between px-8 py-6
                border-b border-gray-400/20
                bg-white/70 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Image alt="VKicon" src="/icons/VKLogo.png" width={50} height={50} />
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Результаты</h1>
            {quizName && <p className="text-sm text-gray-500">{quizName}</p>}
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => router.push("/profile")}
            className="bg-blue-100 hover:bg-blue-200 px-5 py-2 rounded-xl font-semibold text-blue-700 transition-all"
          >
            Профиль
          </Button>
          <Button
            onClick={() => router.push("/quizzes")}
            className="bg-blue-100 hover:bg-blue-200 px-5 py-2 rounded-xl font-semibold text-blue-700 transition-all"
          >
            Каталог
          </Button>
          <Button
            onClick={() => router.push("/")}
            className="bg-gray-200 hover:bg-gray-300 px-6 py-2 rounded-xl font-semibold text-gray-700 transition-all"
          >
            На главную
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-24">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-xl text-gray-600">Загрузка результатов...</p>
          </div>
        ) : (
          <>
            {error && entries.length === 0 && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl">{error}</div>
            )}

            {myEntry && grade && (
              <div className="bg-white rounded-3xl shadow-xl p-8 mb-6">
                <div className="text-center">
                  <div className="text-6xl mb-3">{grade.emoji}</div>
                  <h2 className={`text-3xl font-bold mb-1 ${grade.color}`}>{grade.text}</h2>
                  <p className="text-gray-500 mb-4">Ваш результат</p>
                  <p className="text-5xl font-bold text-gray-800">
                    {myEntry.correctAnswers}/{myEntry.totalQuestions}
                  </p>
                  <p className="text-xl text-gray-500 mt-2">
                    {myPercentage}% правильных • {myEntry.score} очков
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">🏅 Лидерборд</h2>
                <span className="text-sm text-gray-500">
                  Игроков: <span className="font-semibold">{entries.length}</span>
                </span>
              </div>

              {entries.length === 0 ? (
                <p className="text-center text-gray-500 py-12">
                  Пока никто не завершил квиз. Подождите...
                </p>
              ) : (
                <div className="space-y-2">
                  {entries.map((entry, idx) => {
                    const isMe =
                      (myPlayerId && entry.playerId === myPlayerId) ||
                      (myUserId && entry.userId === myUserId);
                    const percentage = entry.totalQuestions > 0
                      ? Math.round((entry.correctAnswers / entry.totalQuestions) * 100)
                      : 0;
                    return (
                      <div
                        key={`${entry.playerId}-${idx}`}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                          isMe
                            ? "border-blue-400 bg-blue-50"
                            : idx < 3
                            ? "border-yellow-200 bg-yellow-50"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                            idx === 0
                              ? "bg-yellow-400 text-white"
                              : idx === 1
                              ? "bg-gray-300 text-white"
                              : idx === 2
                              ? "bg-orange-400 text-white"
                              : "bg-white text-gray-600 border border-gray-200"
                          }`}
                        >
                          {getMedal(idx)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate">
                            {entry.playerName || "Игрок"}
                            {isMe && (
                              <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                                Вы
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {entry.correctAnswers}/{entry.totalQuestions} правильных • {percentage}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-800">{entry.score}</p>
                          <p className="text-xs text-gray-500">очков</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                onClick={() => router.push("/quizzes")}
                className="py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-all"
              >
                🎮 Сыграть ещё
              </Button>
              <Button
                onClick={() => router.push("/profile")}
                className="py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-semibold transition-all"
              >
                📖 История игр
              </Button>
              <Button
                onClick={() => {
                  if (!myEntry) return;
                  const text = `Я прошёл квиз "${myEntry.quizName}" — ${myEntry.correctAnswers}/${myEntry.totalQuestions} (${myPercentage}%), ${myEntry.score} очков!`;
                  navigator.clipboard.writeText(text);
                }}
                disabled={!myEntry}
                className="py-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-xl font-semibold transition-all"
              >
                📤 Поделиться
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
