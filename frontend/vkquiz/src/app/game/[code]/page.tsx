"use client";

import Image from "next/image";
import { Button } from "@vkontakte/vkui";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRoom, getQuiz, submitAnswer, saveResult } from "@/utils/api";
import type { QuizResponse, AnswerDTO } from "@/utils/api";
import { getPlayerId, getProfile } from "@/utils/storage";
import { connectRoomSocket } from "@/utils/ws";
import type { GameCountdownData, WsEnvelope } from "@/utils/ws";

type GamePhase = "loading" | "countdown" | "active" | "feedback" | "finishing";

const FEEDBACK_MS = 1200;

export default function GamePage() {
  const router = useRouter();
  const params = useParams();
  const code = (params.code as string)?.toUpperCase() || "";

  const [quiz, setQuiz] = useState<QuizResponse | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [serverCorrectIds, setServerCorrectIds] = useState<number[] | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [countdownValue, setCountdownValue] = useState(0);

  const endsAtRef = useRef<number>(0);
  const finishingRef = useRef(false);
  const gameStartedRef = useRef(false);
  const isAnsweredRef = useRef(false);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const quizRef = useRef<QuizResponse | null>(null);
  const playerIdRef = useRef("");
  const userIdRef = useRef("");
  const currentIndexRef = useRef(0);
  const advancingRef = useRef(false);

  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { correctRef.current = correctAnswersCount; }, [correctAnswersCount]);
  useEffect(() => { isAnsweredRef.current = isAnswered; }, [isAnswered]);
  useEffect(() => { quizRef.current = quiz; }, [quiz]);
  useEffect(() => { playerIdRef.current = playerId; }, [playerId]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { currentIndexRef.current = currentQuestionIndex; }, [currentQuestionIndex]);

  const finishGame = useCallback(async () => {
    if (finishingRef.current) return;
    const q = quizRef.current;
    if (!q) return;

    finishingRef.current = true;
    setPhase("finishing");

    const pid = playerIdRef.current;
    const total = q.questions.length;

    try {
      if (pid) {
        await saveResult(
          code,
          pid,
          scoreRef.current,
          correctRef.current,
          total,
          userIdRef.current || undefined
        );
      }
    } catch (err) {
      console.error("Не удалось сохранить результат:", err);
    }

    localStorage.setItem("vk_quiz_last_result", JSON.stringify({
      code,
      quizCode: q.code,
      score: scoreRef.current,
      correctAnswers: correctRef.current,
      totalQuestions: total,
      quizName: q.settings.name,
    }));
    router.push(`/results/${code}`);
  }, [code, router]);

  const beginQuestion = useCallback((index: number) => {
    const q = quizRef.current;
    if (!q || index >= q.questions.length) return;

    gameStartedRef.current = true;
    currentIndexRef.current = index;
    setCurrentQuestionIndex(index);
    setSelectedAnswers([]);
    setIsAnswered(false);
    isAnsweredRef.current = false;
    setServerCorrectIds(null);
    advancingRef.current = false;

    const sec = q.settings.timePerQuestion || 30;
    endsAtRef.current = Date.now() + sec * 1000;
    setTimeLeft(sec);
    setPhase("active");
  }, []);

  const advanceAfterAnswer = useCallback((index: number) => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setPhase("feedback");

    const q = quizRef.current;
    const total = q?.questions.length ?? 0;

    window.setTimeout(() => {
      if (index + 1 >= total) {
        void finishGame();
      } else {
        beginQuestion(index + 1);
      }
    }, FEEDBACK_MS);
  }, [beginQuestion, finishGame]);

  const submitCurrentAnswer = useCallback(async (answers: number[], qIndex: number) => {
    const pid = playerIdRef.current;
    if (!pid || isAnsweredRef.current) return false;
    isAnsweredRef.current = true;
    setIsAnswered(true);

    try {
      const resp = await submitAnswer(code, pid, qIndex, answers);
      setScore(resp.totalScore);
      setServerCorrectIds(resp.correctIds);
      if (resp.correct) {
        setCorrectAnswersCount((prev) => prev + 1);
      }
      advanceAfterAnswer(qIndex);
      return true;
    } catch (err) {
      console.error("submit answer:", err);
      isAnsweredRef.current = false;
      setIsAnswered(false);
      advancingRef.current = false;
      return false;
    }
  }, [code, advanceAfterAnswer]);

  const beginQuestionRef = useRef(beginQuestion);
  useEffect(() => { beginQuestionRef.current = beginQuestion; }, [beginQuestion]);

  useEffect(() => {
    const disconnect = connectRoomSocket(code, (msg: WsEnvelope) => {
      if (msg.type === "game:countdown") {
        const data = msg.data as GameCountdownData;
        setCountdownValue(data.value);
        setPhase("countdown");
      }
      if (msg.type === "game:start") {
        if (!gameStartedRef.current && !finishingRef.current) {
          beginQuestionRef.current(0);
        }
      }
    });
    return disconnect;
  }, [code]);

  useEffect(() => {
    setPlayerId(getPlayerId());
    const profile = getProfile();
    if (profile) setUserId(profile.id);

    const load = async () => {
      try {
        const room = await getRoom(code);
        if (room.status !== "playing") {
          router.push(`/room/${code}`);
          return;
        }
        const data = await getQuiz(room.quizCode);
        setQuiz(data);
        setPhase("countdown");

        // Late join: if countdown already passed, start locally.
        window.setTimeout(() => {
          if (!gameStartedRef.current && !finishingRef.current) {
            beginQuestionRef.current(0);
          }
        }, 4500);
      } catch {
        router.push("/");
      }
    };
    load();
  }, [code, router]);

  useEffect(() => {
    if (phase !== "active") return;

    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0 && !isAnsweredRef.current) {
        void submitCurrentAnswer([], currentIndexRef.current);
      }
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [phase, submitCurrentAnswer]);

  const currentQuestion = quiz?.questions[currentQuestionIndex];

  const toggleAnswer = (answerId: number) => {
    if (phase !== "active" || isAnswered) return;
    if (selectedAnswers.includes(answerId)) {
      setSelectedAnswers(selectedAnswers.filter((id) => id !== answerId));
    } else {
      setSelectedAnswers([...selectedAnswers, answerId]);
    }
  };

  const handleSubmitAnswer = async () => {
    if (phase !== "active" || isAnswered || !currentQuestion) return;
    await submitCurrentAnswer(selectedAnswers, currentQuestionIndex);
  };

  const isAnswerCorrect = (answer: AnswerDTO) => {
    if (serverCorrectIds) return serverCorrectIds.includes(answer.id);
    return answer.isCorrect;
  };

  const getAnswerClassName = (answer: AnswerDTO) => {
    const baseClasses = "w-full p-4 rounded-xl text-left font-medium transition-all duration-200";
    const showResult = isAnswered || phase === "feedback";

    if (!showResult) {
      if (selectedAnswers.includes(answer.id)) {
        return `${baseClasses} bg-blue-500 text-white border-2 border-blue-600`;
      }
      return `${baseClasses} bg-white text-gray-800 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50`;
    }
    if (isAnswerCorrect(answer)) {
      return `${baseClasses} bg-green-500 text-white border-2 border-green-600`;
    }
    if (selectedAnswers.includes(answer.id) && !isAnswerCorrect(answer)) {
      return `${baseClasses} bg-red-500 text-white border-2 border-red-600`;
    }
    return `${baseClasses} bg-gray-100 text-gray-500 border-2 border-gray-200`;
  };

  if (phase === "loading" || !quiz) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-zinc-50">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-xl text-gray-600">Загрузка квиза...</p>
        </div>
      </div>
    );
  }

  if (phase === "countdown") {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-zinc-50">
        <div className="text-center">
          <p className="text-xl text-gray-500 mb-6">Игра начинается</p>
          <div
            key={countdownValue}
            className="text-[9rem] leading-none font-black text-blue-500 animate-[countdown-pop_0.45s_ease-out]"
          >
            {countdownValue || "…"}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "finishing") {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-zinc-50">
        <div className="text-center">
          <div className="text-4xl mb-4">🏁</div>
          <p className="text-xl text-gray-600">Подводим итоги...</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-zinc-50">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-xl text-gray-600">В квизе нет вопросов</p>
        </div>
      </div>
    );
  }

  const total = quiz.questions.length;
  const wasCorrect =
    serverCorrectIds !== null &&
    selectedAnswers.length === serverCorrectIds.length &&
    selectedAnswers.every((id) => serverCorrectIds.includes(id));

  return (
    <div className="w-screen h-screen bg-linear-to-br from-blue-50 to-zinc-50">
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <Image alt="VKicon" src="/icons/VKLogo.png" width={50} height={50} />
          <div>
            <h1 className="text-xl font-semibold text-gray-800">{quiz.settings.name}</h1>
            <p className="text-sm text-gray-500">Комната: {code}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-gray-500">Вопрос</p>
            <p className="text-xl font-bold text-gray-800">
              {currentQuestionIndex + 1}/{total}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Счёт</p>
            <p className="text-xl font-bold text-blue-600">{score}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Время</p>
            <p className={`text-2xl font-bold ${timeLeft <= 5 ? "text-red-600" : "text-green-600"}`}>
              {phase === "active" ? `${timeLeft}с` : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="w-full h-2 bg-gray-200">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / total) * 100}%` }}
        />
      </div>

      <div className="flex items-center justify-center p-8 h-[calc(100vh-150px)]">
        <div className="w-full max-w-4xl">
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-6">
            <h2 className="text-3xl font-bold text-gray-800 text-center mb-8">
              {currentQuestion.question}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {currentQuestion.answers.map((answer) => (
                <button
                  key={answer.id}
                  onClick={() => toggleAnswer(answer.id)}
                  disabled={phase !== "active" || isAnswered}
                  className={getAnswerClassName(answer)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        (isAnswered || phase === "feedback") && isAnswerCorrect(answer)
                          ? "bg-white text-green-600"
                          : (isAnswered || phase === "feedback") && selectedAnswers.includes(answer.id) && !isAnswerCorrect(answer)
                          ? "bg-white text-red-600"
                          : selectedAnswers.includes(answer.id)
                          ? "bg-white text-blue-600"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {String.fromCharCode(65 + answer.id)}
                    </div>
                    <span className="text-lg">{answer.text}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8">
              {phase === "active" && !isAnswered ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={selectedAnswers.length === 0}
                  className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300
                           text-white rounded-xl font-semibold text-xl transition-all
                           disabled:cursor-not-allowed"
                >
                  Ответить
                </Button>
              ) : (
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-xl text-center ${
                      wasCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    <p className="font-semibold text-lg">
                      {wasCorrect ? "Правильно!" : "Неправильно"}
                    </p>
                  </div>
                  {phase === "feedback" && (
                    <p className="text-center text-gray-500 text-sm">
                      {currentQuestionIndex + 1 >= total
                        ? "Переход к результатам..."
                        : "Следующий вопрос..."}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
