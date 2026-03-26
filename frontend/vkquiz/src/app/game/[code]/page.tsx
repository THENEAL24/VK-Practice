"use client";

import Image from "next/image";
import { Button } from "@vkontakte/vkui";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getQuiz, submitAnswer, saveResult } from "@/utils/api";
import type { QuizResponse, AnswerDTO } from "@/utils/api";

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

  const playerId = typeof window !== "undefined" ? localStorage.getItem("vk_quiz_player_id") || "" : "";

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getQuiz(code);
        setQuiz(data);
        setTimeLeft(data.settings.timePerQuestion);
      } catch {
        console.error("Квиз не найден");
        router.push('/');
      }
    };
    load();
  }, [code, router]);

  const currentQuestion = quiz?.questions[currentQuestionIndex];
  const totalQuestions = quiz?.questions.length || 0;

  // Timer
  useEffect(() => {
    if (!quiz || !currentQuestion) return;
    
    if (timeLeft > 0 && !isAnswered) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isAnswered) {
      handleSubmitAnswer();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isAnswered, quiz, currentQuestion]);

  const toggleAnswer = (answerId: number) => {
    if (isAnswered) return;
    if (selectedAnswers.includes(answerId)) {
      setSelectedAnswers(selectedAnswers.filter(id => id !== answerId));
    } else {
      setSelectedAnswers([...selectedAnswers, answerId]);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion) return;
    setIsAnswered(true);

    try {
      const resp = await submitAnswer(code, playerId, currentQuestionIndex, selectedAnswers);
      setScore(resp.totalScore);
      setServerCorrectIds(resp.correctIds);
      if (resp.correct) {
        setCorrectAnswersCount(prev => prev + 1);
      }
    } catch {
      // Fallback: local check
      const correctIds = currentQuestion.answers
        .filter(a => a.isCorrect)
        .map(a => a.id);
      setServerCorrectIds(correctIds);
      const isCorrect =
        selectedAnswers.length === correctIds.length &&
        selectedAnswers.every(id => correctIds.includes(id));
      if (isCorrect) {
        setScore(prev => prev + 100);
        setCorrectAnswersCount(prev => prev + 1);
      }
    }
  };

  const handleNextQuestion = async () => {
    if (!quiz) return;

    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswers([]);
      setIsAnswered(false);
      setServerCorrectIds(null);
      setTimeLeft(quiz.settings.timePerQuestion);
    } else {
      try {
        await saveResult(code, playerId, score, correctAnswersCount, totalQuestions);
      } catch { /* save locally as fallback */ }
      
      localStorage.setItem('vk_quiz_last_result', JSON.stringify({
        code,
        score,
        correctAnswers: correctAnswersCount,
        totalQuestions,
        quizName: quiz.settings.name,
      }));
      router.push(`/results/${code}`);
    }
  };

  const isAnswerCorrect = (answer: AnswerDTO) => {
    if (serverCorrectIds) {
      return serverCorrectIds.includes(answer.id);
    }
    return answer.isCorrect;
  };

  const getAnswerClassName = (answer: AnswerDTO) => {
    const baseClasses = "w-full p-4 rounded-xl text-left font-medium transition-all duration-200";
    
    if (!isAnswered) {
      if (selectedAnswers.includes(answer.id)) {
        return `${baseClasses} bg-blue-500 text-white border-2 border-blue-600`;
      }
      return `${baseClasses} bg-white text-gray-800 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50`;
    } else {
      if (isAnswerCorrect(answer)) {
        return `${baseClasses} bg-green-500 text-white border-2 border-green-600`;
      }
      if (selectedAnswers.includes(answer.id) && !isAnswerCorrect(answer)) {
        return `${baseClasses} bg-red-500 text-white border-2 border-red-600`;
      }
      return `${baseClasses} bg-gray-100 text-gray-500 border-2 border-gray-200`;
    }
  };

  if (!quiz || !currentQuestion) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-zinc-50">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-xl text-gray-600">Загрузка квиза...</p>
        </div>
      </div>
    );
  }

  const wasCorrect = serverCorrectIds !== null &&
    selectedAnswers.length === serverCorrectIds.length &&
    selectedAnswers.every(id => serverCorrectIds.includes(id));

  return (
    <div className="w-screen h-screen bg-linear-to-br from-blue-50 to-zinc-50">
      {/* Хедер */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <Image
            alt="VKicon"
            src="/icons/VKLogo.png"
            width={50}
            height={50}
          />
          <div>
            <h1 className="text-xl font-semibold text-gray-800">{quiz.settings.name}</h1>
            <p className="text-sm text-gray-500">Комната: {code}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-gray-500">Вопрос</p>
            <p className="text-xl font-bold text-gray-800">
              {currentQuestionIndex + 1}/{totalQuestions}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Счёт</p>
            <p className="text-xl font-bold text-blue-600">{score}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Время</p>
            <p className={`text-2xl font-bold ${timeLeft <= 5 ? 'text-red-600' : 'text-green-600'}`}>
              {timeLeft}с
            </p>
          </div>
        </div>
      </div>

      {/* Прогресс-бар */}
      <div className="w-full h-2 bg-gray-200">
        <div 
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Основной контент */}
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
                  disabled={isAnswered}
                  className={getAnswerClassName(answer)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      isAnswered && isAnswerCorrect(answer)
                        ? 'bg-white text-green-600' 
                        : isAnswered && selectedAnswers.includes(answer.id) && !isAnswerCorrect(answer)
                        ? 'bg-white text-red-600'
                        : selectedAnswers.includes(answer.id)
                        ? 'bg-white text-blue-600'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {String.fromCharCode(65 + answer.id)}
                    </div>
                    <span className="text-lg">{answer.text}</span>
                    {isAnswered && isAnswerCorrect(answer) && (
                      <span className="ml-auto text-xl">✓</span>
                    )}
                    {isAnswered && selectedAnswers.includes(answer.id) && !isAnswerCorrect(answer) && (
                      <span className="ml-auto text-xl">✕</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8">
              {!isAnswered ? (
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
                  <div className={`p-4 rounded-xl text-center ${wasCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    <p className="font-semibold text-lg">
                      {wasCorrect ? '🎉 Правильно!' : '❌ Неправильно'}
                    </p>
                  </div>
                  <Button
                    onClick={handleNextQuestion}
                    className="w-full py-4 bg-green-500 hover:bg-green-600 text-white 
                             rounded-xl font-semibold text-xl transition-all"
                  >
                    {currentQuestionIndex < totalQuestions - 1 ? 'Следующий вопрос →' : 'Завершить игру'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {!isAnswered && (
            <p className="text-center text-gray-500 text-sm">
              💡 Можно выбрать несколько вариантов ответа
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
