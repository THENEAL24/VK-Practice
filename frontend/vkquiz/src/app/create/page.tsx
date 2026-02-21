"use client";

import Image from "next/image";
import { Button } from "@vkontakte/vkui";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateQuizPage() {
    const router = useRouter();
    const [quizSettings, setQuizSettings] = useState({
        name: "",
        category: "general",
        difficulty: "medium",
        questionsCount: 10,
        timePerQuestion: 30,
        isPublic: true,
    });

    // Отдельные состояния для input полей (чтобы можно было стирать)
    const [questionsInput, setQuestionsInput] = useState("10");
    const [timeInput, setTimeInput] = useState("30");

    const handleCreateQuiz = () => {
        // Переходим на страницу создания вопросов с настройками в URL
        const params = new URLSearchParams({
            name: quizSettings.name,
            difficulty: quizSettings.difficulty,
            questionsCount: quizSettings.questionsCount.toString(),
            timePerQuestion: quizSettings.timePerQuestion.toString(),
            isPublic: quizSettings.isPublic.toString(),
        });
        router.push(`/create/questions?${params.toString()}`);
    };

    return (
        <div className="w-screen min-h-screen bg-linear-to-br from-blue-50 to-zinc-50">
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
                    <h1 className="text-2xl font-semibold text-gray-800">
                        Создание квиза
                    </h1>
                </div>

                <Button onClick={() => router.push('/')} className="bg-gray-200 hover:bg-gray-300 px-6 py-2 rounded-xl font-semibold text-gray-700 transition-all" > Назад </Button>
            </div>

            {/* Основное содержимое */}
            <div className="flex items-center justify-center p-8">
                <div className="w-full max-w-2xl bg-white rounded-3xl shadow-lg p-8">
                    <h2 className="text-3xl font-semibold text-gray-800 mb-8">
                        Настройте свой квиз
                    </h2>

                    <div className="space-y-6">
                        {/* Название квиза */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Название квиза
                            </label>
                            <input
                                type="text"
                                value={quizSettings.name}
                                onChange={(e) => setQuizSettings({ ...quizSettings, name: e.target.value })}
                                placeholder="Мой удивительный квиз"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl 
                         focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                         transition-all duration-200 text-gray-800"
                            />
                        </div>

                        {/* Сложность */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Сложность
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {['easy', 'medium', 'hard'].map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => setQuizSettings({ ...quizSettings, difficulty: level })}
                                        className={`py-3 px-4 rounded-xl font-semibold transition-all
                      ${quizSettings.difficulty === level
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {level === 'easy' ? 'Легко' : level === 'medium' ? 'Средне' : 'Сложно'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Количество вопросов */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Количество вопросов
                            </label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="text"
                                    value={questionsInput}
                                    onChange={(e) => {
                                        const inputValue = e.target.value;
                                        // Позволяем только цифры или пустую строку
                                        if (inputValue === '' || /^\d+$/.test(inputValue)) {
                                            setQuestionsInput(inputValue);
                                            if (inputValue !== '') {
                                                const num = parseInt(inputValue);
                                                const value = Math.max(1, Math.min(50, num));
                                                setQuizSettings({ ...quizSettings, questionsCount: value });
                                            }
                                        }
                                    }}
                                    onBlur={() => {
                                        // При потере фокуса устанавливаем минимальное значение если пусто
                                        if (questionsInput === '') {
                                            setQuestionsInput('1');
                                            setQuizSettings({ ...quizSettings, questionsCount: 1 });
                                        } else {
                                            setQuestionsInput(quizSettings.questionsCount.toString());
                                        }
                                    }}
                                    placeholder="10"
                                    className="w-24 px-4 py-3 border-2 border-gray-200 rounded-xl text-center
                           focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                           transition-all duration-200 text-gray-800 font-semibold text-lg"
                                />
                                <div className="flex-1">
                                    <input
                                        type="range"
                                        min="1"
                                        max="50"
                                        value={quizSettings.questionsCount}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value);
                                            setQuizSettings({ ...quizSettings, questionsCount: value });
                                            setQuestionsInput(value.toString());
                                        }}
                                        className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer 
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 
                             [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full 
                             [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer
                             [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 
                             [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 
                             [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">От 1 до 50 вопросов</p>
                        </div>

                        {/* Время на вопрос */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Время на вопрос (секунды)
                            </label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="text"
                                    value={timeInput}
                                    onChange={(e) => {
                                        const inputValue = e.target.value;
                                        // Позволяем только цифры или пустую строку
                                        if (inputValue === '' || /^\d+$/.test(inputValue)) {
                                            setTimeInput(inputValue);
                                            if (inputValue !== '') {
                                                const num = parseInt(inputValue);
                                                const value = Math.max(5, Math.min(180, num));
                                                setQuizSettings({ ...quizSettings, timePerQuestion: value });
                                            }
                                        }
                                    }}
                                    onBlur={() => {
                                        // При потере фокуса устанавливаем минимальное значение если пусто
                                        if (timeInput === '') {
                                            setTimeInput('5');
                                            setQuizSettings({ ...quizSettings, timePerQuestion: 5 });
                                        } else {
                                            setTimeInput(quizSettings.timePerQuestion.toString());
                                        }
                                    }}
                                    placeholder="30"
                                    className="w-24 px-4 py-3 border-2 border-gray-200 rounded-xl text-center
                           focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                           transition-all duration-200 text-gray-800 font-semibold text-lg"
                                />
                                <div className="flex-1">
                                    <input
                                        type="range"
                                        min="5"
                                        max="180"
                                        step="5"
                                        value={quizSettings.timePerQuestion}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value);
                                            setQuizSettings({ ...quizSettings, timePerQuestion: value });
                                            setTimeInput(value.toString());
                                        }}
                                        className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer 
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 
                             [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full 
                             [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer
                             [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 
                             [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 
                             [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">От 5 до 180 секунд (3 минуты)</p>
                        </div>

                        {/* Публичность */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div>
                                <p className="font-medium text-gray-800">Публичный квиз</p>
                                <p className="text-sm text-gray-500">Любой сможет присоединиться по коду</p>
                            </div>
                            <button
                                onClick={() => setQuizSettings({ ...quizSettings, isPublic: !quizSettings.isPublic })}
                                className={`relative w-14 h-8 rounded-full transition-all
                  ${quizSettings.isPublic ? 'bg-blue-500' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all
                  ${quizSettings.isPublic ? 'left-7' : 'left-1'}`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Кнопка создания */}
                    <div className="mt-8 space-y-3">
                        <Button
                            onClick={handleCreateQuiz}
                            disabled={!quizSettings.name.trim()}
                            className="w-full py-4 text-xl font-semibold text-white 
                       bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 
                       rounded-2xl transition-all duration-200 
                       disabled:cursor-not-allowed"
                        >
                            Продолжить к вопросам
                        </Button>
                        <p className="text-center text-sm text-gray-400">
                            Далее вы сможете создать вопросы для квиза
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
