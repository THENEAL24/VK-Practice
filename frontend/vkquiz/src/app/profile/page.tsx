"use client";

import Image from "next/image";
import { Button } from "@vkontakte/vkui";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureProfile, updateProfile, LocalProfile, formatRoomCode } from "@/utils/storage";
import { getUserHistory, GameResultResponse } from "@/utils/api";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [history, setHistory] = useState<GameResultResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const p = await ensureProfile();
        setProfile(p);
        setName(p.name);
        setNickname(p.nickname);
        try {
          const hist = await getUserHistory(p.id, 100);
          setHistory(hist || []);
        } catch (err) {
          console.error("История недоступна:", err);
        }
      } catch (err) {
        console.error("Не удалось загрузить профиль:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateProfile(name.trim(), nickname.trim());
      setProfile(updated);
      setMessage({ kind: "ok", text: "Профиль сохранён" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка сохранения";
      setMessage({ kind: "err", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    profile && (name.trim() !== profile.name || nickname.trim() !== profile.nickname);
  const canSave = !!hasChanges && name.trim().length > 0 && nickname.trim().length > 0 && !saving;

  const totalGames = history.length;
  const bestScore = history.reduce((m, r) => Math.max(m, r.score), 0);
  const avgAccuracy = totalGames === 0
    ? 0
    : Math.round(
        history.reduce((sum, r) => sum + (r.totalQuestions > 0 ? r.correctAnswers / r.totalQuestions : 0), 0) /
          totalGames *
          100
      );

  return (
    <div className="w-screen min-h-screen bg-linear-to-br from-blue-50 to-zinc-50">
      <div className="sticky top-0 z-50 flex items-center justify-between px-8 py-6
                border-b border-gray-400/20
                bg-white/70 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Image alt="VKicon" src="/icons/VKLogo.png" width={50} height={50} />
          <h1 className="text-2xl font-semibold text-gray-800">Профиль</h1>
        </div>
        <div className="flex gap-3">
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

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <p className="text-xl text-gray-500">Загрузка профиля...</p>
        </div>
      ) : !profile ? (
        <div className="flex items-center justify-center py-32">
          <p className="text-xl text-red-500">Профиль не найден</p>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
          <div className="bg-white rounded-3xl shadow-lg p-8 h-fit">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                {profile.nickname.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-800">{profile.name}</p>
                <p className="text-sm text-blue-600">@{profile.nickname}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Имя</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl
                             focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                             transition-all duration-200 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Никнейм</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.replace(/\s+/g, "_"))}
                  maxLength={50}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl
                             focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                             transition-all duration-200 text-gray-800"
                />
                <p className="text-xs text-gray-500 mt-1">Уникальный идентификатор. Может включать буквы, цифры и _</p>
              </div>

              {message && (
                <div
                  className={`p-3 rounded-xl text-sm ${
                    message.kind === "ok"
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <Button
                onClick={handleSave}
                disabled={!canSave}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300
                           text-white rounded-xl font-semibold transition-all disabled:cursor-not-allowed"
              >
                {saving ? "Сохраняем..." : "Сохранить изменения"}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-8">
              <div className="bg-blue-50 p-4 rounded-xl text-center">
                <p className="text-2xl font-bold text-blue-600">{totalGames}</p>
                <p className="text-xs text-gray-600 mt-1">Игр</p>
              </div>
              <div className="bg-green-50 p-4 rounded-xl text-center">
                <p className="text-2xl font-bold text-green-600">{bestScore}</p>
                <p className="text-xs text-gray-600 mt-1">Лучший счёт</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl text-center">
                <p className="text-2xl font-bold text-purple-600">{avgAccuracy}%</p>
                <p className="text-xs text-gray-600 mt-1">Точность</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">История игр</h2>

            {history.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">📭</div>
                <p className="text-gray-500">Вы ещё не сыграли ни одной партии</p>
                <Button
                  onClick={() => router.push("/quizzes")}
                  className="mt-6 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-all"
                >
                  Перейти в каталог
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {history.map((r, idx) => {
                  const percentage =
                    r.totalQuestions > 0
                      ? Math.round((r.correctAnswers / r.totalQuestions) * 100)
                      : 0;
                  const date = new Date(r.finishedAt);
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-300 transition-all"
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center">
                        {r.score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{r.quizName || "—"}</p>
                        <p className="text-xs text-gray-500">
                          {r.quizCode ? `Квиз ${formatRoomCode(r.quizCode)} • ` : ""}
                          {date.toLocaleString("ru-RU", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-800">
                          {r.correctAnswers}/{r.totalQuestions}
                        </p>
                        <p
                          className={`text-xs font-semibold ${
                            percentage >= 70
                              ? "text-green-600"
                              : percentage >= 40
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {percentage}%
                        </p>
                      </div>
                      {r.code && (
                        <Button
                          onClick={() => router.push(`/results/${r.code}`)}
                          className="ml-2 px-3 py-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg text-sm font-semibold transition-all"
                        >
                          Лидерборд
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
