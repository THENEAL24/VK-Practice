"use client";

import Image from "next/image";
import { Button } from "@vkontakte/vkui";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getQuizByCode, getRoomByCode } from "@/utils/storage";
import type { Quiz, QuizQuestion, QuizAnswer } from "@/utils/storage";

export default function GamePage() {
  const router = useRouter();
  const params = useParams();
  const code = (params.code as string)?.toUpperCase() || "";
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);

  // Загружаем квиз при монтировании
  useEffect(() => {
    const loadedQuiz = getQuizByCode(code);
    
    if (!loadedQuiz) {
      console.error("Квиз не найден");
      router.push('/');
      return;
    }
    
    setQuiz(loadedQuiz);
    setTimeLeft(loadedQuiz.settings.timePerQuestion);
  }, [code, router]);

  const currentQuestion = quiz?.questions[currentQuestionIndex];
  const totalQuestions = quiz?.questions.length || 0;

  // Таймер
  useEffect(() => {
    if (!quiz || !currentQuestion) return;
    
    if (timeLeft > 0 && !isAnswered) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isAnswered) {
      handleSubmitAnswer();
    }
  }, [timeLeft, isAnswered, quiz, currentQuestion]);

  const toggleAnswer = (answerId: number) => {
    if (isAnswered) return;
    
    if (selectedAnswers.includes(answerId)) {
      setSelectedAnswers(selectedAnswers.filter(id => id !== answerId));
    } else {
      setSelectedAnswers([...selectedAnswers, answerId]);
    }
  };

  const handleSubmitAnswer = () => {
    if (!currentQuestion) return;
    
    setIsAnswered(true);
    
    // Проверяем правильность ответа
    const correctAnswerIds = currentQuestion.answers
      .filter(a => a.isCorrect)
      .map(a => a.id);
    
    const isCorrect = 
      selectedAnswers.length === correctAnswerIds.length &&
      selectedAnswers.every(id => correctAnswerIds.includes(id));
    
    if (isCorrect) {
      setScore(score + 100);
      setCorrectAnswersCount(correctAnswersCount + 1);
    }
  };

  const handleNextQuestion = () => {
    if (!quiz || !currentQuestion) return;
    
    // Проверяем правильность текущего ответа для финальной статистики
    const correctAnswerIds = currentQuestion.answers
      .filter(a => a.isCorrect)
      .map(a => a.id);
    
    const wasCorrect = 
      selectedAnswers.length === correctAnswerIds.length &&
      selectedAnswers.every(id => correctAnswerIds.includes(id));
    
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswers([]);
      setIsAnswered(false);
      setTimeLeft(quiz.settings.timePerQuestion);
    } else {
      // Игра окончена - переход к результатам
      // Сохраняем результаты в localStorage
      localStorage.setItem('vk_quiz_last_result', JSON.stringify({
        code,
        score,
        correctAnswers: wasCorrect ? correctAnswersCount + 1 : correctAnswersCount,
        totalQuestions,
        quizName: quiz.settings.name,
      }));
      router.push(`/results/${code}`);
    }
  };

  const formatTime = (seconds: number) => {
    return `${seconds}с`;
  };

  const getAnswerClassName = (answer: QuizAnswer) => {
    const baseClasses = "w-full p-4 rounded-xl text-left font-medium transition-all duration-200";
    
    if (!isAnswered) {
      // До ответа
      if (selectedAnswers.includes(answer.id)) {
        return `${baseClasses} bg-blue-500 text-white border-2 border-blue-600`;
      }
      return `${baseClasses} bg-white text-gray-800 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50`;
    } else {
      // После ответа
      if (answer.isCorrect) {
        return `${baseClasses} bg-green-500 text-white border-2 border-green-600`;
      }
      if (selectedAnswers.includes(answer.id) && !answer.isCorrect) {
        return `${baseClasses} bg-red-500 text-white border-2 border-red-600`;
      }
      return `${baseClasses} bg-gray-100 text-gray-500 border-2 border-gray-200`;
    }
  };

  // Показываем загрузку пока квиз не загружен
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

        {/* Прогресс и счёт */}
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
              {formatTime(timeLeft)}
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
          {/* Вопрос */}
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-6">
            <h2 className="text-3xl font-bold text-gray-800 text-center mb-8">
              {currentQuestion.question}
            </h2>

            {/* Варианты ответов */}
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
                      isAnswered && answer.isCorrect 
                        ? 'bg-white text-green-600' 
                        : isAnswered && selectedAnswers.includes(answer.id) && !answer.isCorrect
                        ? 'bg-white text-red-600'
                        : selectedAnswers.includes(answer.id)
                        ? 'bg-white text-blue-600'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {String.fromCharCode(65 + answer.id)}
                    </div>
                    <span className="text-lg">{answer.text}</span>
                    {isAnswered && answer.isCorrect && (
                      <span className="ml-auto text-xl">✓</span>
                    )}
                    {isAnswered && selectedAnswers.includes(answer.id) && !answer.isCorrect && (
                      <span className="ml-auto text-xl">✕</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Кнопка ответа */}
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
                  <div className={`p-4 rounded-xl text-center ${
                    selectedAnswers.length > 0 && 
                    selectedAnswers.every(id => currentQuestion.answers.find(a => a.id === id)?.isCorrect)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    <p className="font-semibold text-lg">
                      {selectedAnswers.length > 0 && 
                       selectedAnswers.every(id => currentQuestion.answers.find(a => a.id === id)?.isCorrect)
                        ? '🎉 Правильно!'
                        : '❌ Неправильно'}
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

          {/* Подсказка */}
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
