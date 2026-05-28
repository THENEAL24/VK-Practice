"use client";

import Image from "next/image";
import { Button } from "@vkontakte/vkui";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listQuizzes, launchQuiz, QuizSummary } from "@/utils/api";
import { ensureProfile, savePlayerId } from "@/utils/storage";

type FilterMode = "all" | "mine";

export default function QuizzesCatalogPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [profileId, setProfileId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [launchingCode, setLaunchingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const p = await ensureProfile();
        setProfileId(p.id);
      } catch (err) {
        console.error("Не удалось загрузить профиль:", err);
      }
      try {
        const list = await listQuizzes();
        setQuizzes(list || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить квизы");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const refilter = async (mode: FilterMode) => {
    setFilter(mode);
    setLoading(true);
    try {
      const list = await listQuizzes(
        mode === "mine" && profileId ? { authorId: profileId } : {}
      );
      setQuizzes(list || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить квизы");
    } finally {
      setLoading(false);
    }
  };

  const filtered = quizzes.filter((q) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return (
      q.name.toLowerCase().includes(s) ||
      (q.authorNickname || "").toLowerCase().includes(s) ||
      q.code.toLowerCase().includes(s)
    );
  });

  const handleLaunch = async (code: string) => {
    setLaunchingCode(code);
    setError(null);
    try {
      const resp = await launchQuiz(code, profileId || undefined);
      if (!resp.room) {
        throw new Error("Бэкенд не вернул комнату при запуске");
      }
      savePlayerId(resp.room.hostId);
      router.push(`/room/${resp.room.code}?host=true`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось запустить квиз");
      setLaunchingCode(null);
    }
  };

  const difficultyLabel = (d: string) =>
    d === "easy" ? "Лёгкая" : d === "hard" ? "Сложная" : "Средняя";
  const difficultyColor = (d: string) =>
    d === "easy"
      ? "bg-green-100 text-green-700"
      : d === "hard"
      ? "bg-red-100 text-red-700"
      : "bg-yellow-100 text-yellow-700";

  return (
    <div className="w-screen min-h-screen bg-linear-to-br from-blue-50 to-zinc-50">
      <div className="sticky top-0 z-50 flex items-center justify-between px-8 py-6
                border-b border-gray-400/20
                bg-white/70 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Image alt="VKicon" src="/icons/VKLogo.png" width={50} height={50} />
          <h1 className="text-2xl font-semibold text-gray-800">Каталог квизов</h1>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => router.push("/create")}
            className="bg-green-500 hover:bg-green-600 px-5 py-2 rounded-xl font-semibold text-white transition-all"
          >
            + Создать
          </Button>
          <Button
            onClick={() => router.push("/profile")}
            className="bg-white hover:bg-gray-50 border border-gray-200 px-5 py-2 rounded-xl font-semibold text-gray-700 transition-all"
          >
            Профиль
          </Button>
          <Button
            onClick={() => router.push("/")}
            className="bg-gray-200 hover:bg-gray-300 px-6 py-2 rounded-xl font-semibold text-gray-700 transition-all"
          >
            На главную
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => refilter("all")}
              className={`px-5 py-2 rounded-xl font-semibold transition-all ${
                filter === "all"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              Все
            </button>
            <button
              onClick={() => refilter("mine")}
              disabled={!profileId}
              className={`px-5 py-2 rounded-xl font-semibold transition-all ${
                filter === "mine"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Мои
            </button>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию, автору или коду..."
            className="md:w-80 px-4 py-2 border-2 border-gray-200 rounded-xl
                       focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                       transition-all duration-200 text-gray-800"
          />
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-xl text-gray-500">Загрузка...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
            <div className="text-5xl mb-4">🗂️</div>
            <p className="text-xl text-gray-700 mb-2">Квизов пока нет</p>
            <p className="text-gray-500 mb-6">Создайте первый квиз — и он появится в каталоге!</p>
            <Button
              onClick={() => router.push("/create")}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-all"
            >
              Создать квиз
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((q) => (
              <div
                key={q.code}
                className="bg-white rounded-2xl shadow hover:shadow-lg transition-all p-6 flex flex-col"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">{q.name}</h3>
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${difficultyColor(
                      q.difficulty
                    )}`}
                  >
                    {difficultyLabel(q.difficulty)}
                  </span>
                </div>

                <div className="text-sm text-gray-500 space-y-1 mb-4">
                  <p>
                    Вопросов: <span className="font-semibold text-gray-700">{q.questionsCount}</span>
                  </p>
                  <p>
                    Время на вопрос:{" "}
                    <span className="font-semibold text-gray-700">{q.timePerQuestion} сек</span>
                  </p>
                  {q.authorNickname && (
                    <p>
                      Автор:{" "}
                      <span className="font-semibold text-blue-600">@{q.authorNickname}</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    Создан{" "}
                    {new Date(q.createdAt).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="mt-auto flex gap-2">
                  <Button
                    onClick={() => handleLaunch(q.code)}
                    disabled={launchingCode === q.code}
                    className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300
                               text-white rounded-xl font-semibold transition-all disabled:cursor-not-allowed"
                  >
                    {launchingCode === q.code ? "Запуск..." : "🎮 Запустить"}
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center font-mono">
                  {q.code}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
