"use client";

import Image from "next/image";
import { Button } from "@vkontakte/vkui";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveQuiz, saveRoom, createDefaultPlayer, generateRoomCode } from "@/utils/storage";
import type { Quiz, QuizQuestion as StorageQuestion, Room } from "@/utils/storage";

interface Question {
  id: number;
  question: string;
  answers: string[];
  correctAnswers: number[]; // Массив индексов правильных ответов
}

export default function CreateQuestionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [quizSettings] = useState({
    name: searchParams.get('name') || '',
    difficulty: searchParams.get('difficulty') || 'medium',
    questionsCount: parseInt(searchParams.get('questionsCount') || '10'),
    timePerQuestion: parseInt(searchParams.get('timePerQuestion') || '30'),
    isPublic: searchParams.get('isPublic') === 'true',
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  useEffect(() => {
    // Инициализируем вопросы с 4 вариантами ответов по умолчанию
    const initialQuestions: Question[] = Array.from({ length: quizSettings.questionsCount }, (_, i) => ({
      id: i,
      question: '',
      answers: ['', '', '', ''],
      correctAnswers: [0], // По умолчанию первый ответ правильный
    }));
    setQuestions(initialQuestions);
  }, [quizSettings.questionsCount]);

  const updateQuestion = (field: keyof Question, value: any) => {
    const newQuestions = [...questions];
    newQuestions[currentQuestion] = {
      ...newQuestions[currentQuestion],
      [field]: value,
    };
    setQuestions(newQuestions);
  };

  const updateAnswer = (index: number, value: string) => {
    const newQuestions = [...questions];
    const answers = [...newQuestions[currentQuestion].answers];
    answers[index] = value;
    newQuestions[currentQuestion] = {
      ...newQuestions[currentQuestion],
      answers,
    };
    setQuestions(newQuestions);
  };

  const addAnswer = () => {
    const newQuestions = [...questions];
    newQuestions[currentQuestion] = {
      ...newQuestions[currentQuestion],
      answers: [...newQuestions[currentQuestion].answers, ''],
    };
    setQuestions(newQuestions);
  };

  const removeAnswer = (index: number) => {
    if (questions[currentQuestion].answers.length <= 2) return; // Минимум 2 варианта
    
    const newQuestions = [...questions];
    const answers = newQuestions[currentQuestion].answers.filter((_, i) => i !== index);
    const correctAnswers = newQuestions[currentQuestion].correctAnswers
      .filter(i => i !== index)
      .map(i => i > index ? i - 1 : i); // Корректируем индексы
    
    newQuestions[currentQuestion] = {
      ...newQuestions[currentQuestion],
      answers,
      correctAnswers: correctAnswers.length > 0 ? correctAnswers : [0],
    };
    setQuestions(newQuestions);
  };

  const toggleCorrectAnswer = (index: number) => {
    const newQuestions = [...questions];
    const currentCorrect = newQuestions[currentQuestion].correctAnswers;
    
    if (currentCorrect.includes(index)) {
      // Убираем из правильных (но оставляем минимум один)
      const newCorrect = currentCorrect.filter(i => i !== index);
      if (newCorrect.length > 0) {
        newQuestions[currentQuestion].correctAnswers = newCorrect;
      }
    } else {
      // Добавляем в правильные
      newQuestions[currentQuestion].correctAnswers = [...currentCorrect, index].sort();
    }
    
    setQuestions(newQuestions);
  };

  const handleFinish = () => {
    // Генерируем код комнаты
    const roomCode = generateRoomCode();
    
    // Преобразуем вопросы в формат хранилища
    const quizQuestions: StorageQuestion[] = questions.map((q) => ({
      id: q.id,
      question: q.question,
      answers: q.answers.map((text, idx) => ({
        id: idx,
        text: text,
        isCorrect: q.correctAnswers.includes(idx),
      })),
    }));
    
    // Создаём объект квиза
    const quiz: Quiz = {
      code: roomCode,
      settings: {
        name: quizSettings.name,
        difficulty: quizSettings.difficulty,
        questionsCount: quizSettings.questionsCount,
        timePerQuestion: quizSettings.timePerQuestion,
        isPublic: quizSettings.isPublic,
      },
      questions: quizQuestions,
      createdAt: new Date().toISOString(),
    };
    
    // Сохраняем квиз
    saveQuiz(quiz);
    
    // Создаём комнату
    const hostPlayer = createDefaultPlayer("Вы (Хост)");
    const room: Room = {
      code: roomCode,
      quizCode: roomCode,
      hostId: hostPlayer.id,
      players: [hostPlayer],
      status: 'waiting',
      currentQuestion: 0,
    };
    
    // Сохраняем комнату
    saveRoom(room);
    
    console.log("Квиз создан:", quiz);
    console.log("Комната создана:", room);
    
    // Переходим в комнату как создатель (хост)
    router.push(`/room/${roomCode}?host=true`);
  };

  const isQuestionValid = (q: Question) => {
    return q.question.trim() !== '' && 
           q.answers.length >= 2 && 
           q.answers.every(a => a.trim() !== '') &&
           q.correctAnswers.length > 0;
  };

  const allQuestionsValid = questions.every(isQuestionValid);
  const currentQ = questions[currentQuestion] || { question: '', answers: ['', '', '', ''], correctAnswers: [0] };

  return (
    <div className="w-screen min-h-screen bg-linear-to-br from-blue-50 to-zinc-50">
      {/* Хедер */}
      <div className="sticky flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <Image
            alt="VKicon"
            src="/icons/VKLogo.png"
            width={50}
            height={50}
          />
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">{quizSettings.name}</h1>
            <p className="text-sm text-gray-500">Создание вопросов</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            onClick={() => router.push('/create')}
            className="bg-gray-200 hover:bg-gray-300 px-6 py-2 rounded-xl font-semibold text-gray-700 transition-all"
          >
            Назад
          </Button>
          <Button 
            onClick={handleFinish}
            disabled={!allQuestionsValid}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 px-6 py-2 rounded-xl font-semibold text-white transition-all disabled:cursor-not-allowed"
          >
            Завершить
          </Button>
        </div>
      </div>

      {/* Прогресс */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">
            Вопрос {currentQuestion + 1} из {quizSettings.questionsCount}
          </span>
          <span className="text-sm text-gray-500">
            Заполнено: {questions.filter(isQuestionValid).length}/{quizSettings.questionsCount}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / quizSettings.questionsCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Основное содержимое */}
      <div className="flex p-8 gap-6">
        {/* Боковая панель с миниатюрами вопросов */}
        <div className="w-64 bg-white rounded-2xl p-4 shadow-lg h-fit max-h-[calc(100vh-200px)] overflow-y-auto">
          <h3 className="font-semibold text-gray-800 mb-3">Все вопросы</h3>
          <div className="space-y-2">
            {questions.map((q, index) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestion(index)}
                className={`w-full p-3 rounded-xl text-left transition-all ${
                  currentQuestion === index
                    ? 'bg-blue-500 text-white'
                    : isQuestionValid(q)
                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold">#{index + 1}</span>
                  {isQuestionValid(q) && currentQuestion !== index && (
                    <span className="text-xs">✓</span>
                  )}
                </div>
                <p className="text-xs truncate mt-1">
                  {q.question || 'Без названия'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Редактор вопроса */}
        <div className="flex-1 bg-white rounded-2xl shadow-lg p-8">
          <div className="space-y-6">
            {/* Текст вопроса */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Текст вопроса
              </label>
              <textarea
                value={currentQ.question}
                onChange={(e) => updateQuestion('question', e.target.value)}
                placeholder="Введите ваш вопрос здесь..."
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl 
                         focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                         transition-all duration-200 text-gray-800 resize-none"
              />
            </div>

            {/* Варианты ответов */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Варианты ответов ({currentQ.answers.length})
                </label>
                <Button
                  onClick={addAnswer}
                  className="px-4 py-1 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg text-sm font-semibold transition-all"
                >
                  + Добавить вариант
                </Button>
              </div>
              <div className="space-y-3">
                {currentQ.answers.map((answer, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <button
                      onClick={() => toggleCorrectAnswer(index)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                        currentQ.correctAnswers.includes(index)
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                      title={currentQ.correctAnswers.includes(index) ? "Убрать из правильных" : "Отметить как правильный"}
                    >
                      {currentQ.correctAnswers.includes(index) ? '✓' : String.fromCharCode(65 + index)}
                    </button>
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => updateAnswer(index, e.target.value)}
                      placeholder={`Вариант ${String.fromCharCode(65 + index)}`}
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl 
                               focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                               transition-all duration-200 text-gray-800"
                    />
                    {currentQ.answers.length > 2 && (
                      <button
                        onClick={() => removeAnswer(index)}
                        className="w-10 h-10 rounded-full bg-red-100 text-red-600 hover:bg-red-200 
                                 flex items-center justify-center font-semibold transition-all"
                        title="Удалить вариант"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Нажмите на кружок, чтобы выбрать правильный ответ. Можно выбрать несколько.
              </p>
              {currentQ.correctAnswers.length > 1 && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Выбрано правильных ответов: {currentQ.correctAnswers.length}
                </p>
              )}
            </div>
          </div>

          {/* Навигация между вопросами */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <Button
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded-xl font-semibold text-gray-700 transition-all disabled:cursor-not-allowed"
            >
              ← Предыдущий
            </Button>
            
            <Button
              onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
              disabled={currentQuestion === questions.length - 1}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-400 rounded-xl font-semibold text-white transition-all disabled:cursor-not-allowed"
            >
              Следующий →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
