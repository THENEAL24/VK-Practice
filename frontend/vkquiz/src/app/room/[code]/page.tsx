"use client";

import Image from "next/image";
import { Button } from "@vkontakte/vkui";
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { getRoomByCode, getQuizByCode, saveRoom, formatRoomCode } from "@/utils/storage";
import type { Room, Quiz } from "@/utils/storage";

export default function RoomPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const code = (params.code as string)?.toUpperCase() || "";
    const isHost = searchParams.get('host') === 'true';
    
    const [room, setRoom] = useState<Room | null>(null);
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [isReady, setIsReady] = useState(false);

    // Загружаем данные комнаты и квиза
    useEffect(() => {
        const loadedRoom = getRoomByCode(code);
        const loadedQuiz = getQuizByCode(code);
        
        if (!loadedRoom || !loadedQuiz) {
            console.error("Комната или квиз не найдены");
            // Можно перенаправить на главную
            // router.push('/');
            return;
        }
        
        setRoom(loadedRoom);
        setQuiz(loadedQuiz);
    }, [code]);

    const handleReady = () => {
        setIsReady(prev => !prev);
        // TODO: Обновить статус игрока в комнате
    };

    const handleStartGame = () => {
        if (!room) return;
        
        // Обновляем статус комнаты
        const updatedRoom: Room = {
            ...room,
            status: 'playing',
        };
        saveRoom(updatedRoom);
        
        // Переход на страницу игры
        router.push(`/game/${code}`);
    };

    if (!room || !quiz) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-zinc-50">
                <div className="text-center">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-xl text-gray-600">Загрузка комнаты...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-screen h-screen bg-white">
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
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-800">
                            {isHost ? "Ваша комната квиза" : "Комната квиза"}
                        </h1>
                        <p className="text-sm text-gray-500">
                            Код: <span className="font-semibold text-blue-600">{formatRoomCode(code)}</span>
                            {isHost && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Хост</span>}
                        </p>
                    </div>
                </div>

                <Button
                    onClick={() => router.push('/')}
                    className="bg-gray-200 hover:bg-gray-300 px-6 py-2 rounded-xl font-semibold text-gray-700 transition-all"
                >
                    {isHost ? "Закрыть комнату" : "Выйти"}
                </Button>
            </div>

            {/* Основное содержимое */}
            <div className="flex h-[calc(100vh-100px)] bg-linear-to-br from-blue-50 to-zinc-50">
                {/* Левая часть - Игроки */}
                <div className="w-1/4 border-r border-gray-200 bg-opacity-50 p-8 overflow-y-auto">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6">
                        Игроки ({room.players.length})
                    </h2>

                    <div className="space-y-3">
                        {room.players.map((player, index) => (
                            <div
                                key={player.id}
                                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-400 transition-all"
                            >
                                <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800">{player.name}</p>
                                    <p className="text-xs text-green-600">
                                        {player.isReady ? "✓ Готов" : "⏳ Не готов"}
                                    </p>
                                </div>
                                {isHost && player.id !== room.hostId && (
                                    <button className="text-red-500 hover:text-red-700 text-sm">
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {isHost && (
                        <Button className="w-full mt-6 py-3 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-xl font-semibold transition-all">
                            + Пригласить игроков
                        </Button>
                    )}
                </div>

                {/* Центральная часть - Информация о квизе */}
                <div className="flex-1 flex items-center justify-center p-8 bg-opacity-50">
                    <div className="text-center">
                        <div className="mb-8">
                            <h3 className="text-4xl font-semibold text-gray-800 mb-2">
                                {isHost ? "Готовы начать?" : "Ожидание начала игры"}
                            </h3>
                            <p className="text-lg text-gray-500">
                                {isHost ? "Все игроки готовы, можно начинать!" : "Ждём пока хост начнёт игру..."}
                            </p>
                        </div>

                        <div className="bg-white p-12 rounded-3xl border-2 border-gray-200 shadow-lg max-w-xl">
                            <div className="text-6xl font-bold text-blue-500 mb-2">
                                {room.players.length}
                            </div>
                            <p className="text-gray-600 mb-8">
                                игроков в комнате
                            </p>

                            {isHost ? (
                                // Кнопки для хоста
                                <div className="space-y-3">
                                    <Button
                                        onClick={handleStartGame}
                                        className="w-full py-4 bg-green-500 text-white hover:bg-green-600 rounded-xl font-semibold transition-all text-xl"
                                    >
                                        🎮 Начать игру
                                    </Button>
                                    <Button
                                        className="w-full py-3 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-xl font-semibold transition-all"
                                    >
                                        ⚙️ Настройки квиза
                                    </Button>
                                    <Button
                                        className="w-full py-3 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-xl font-semibold transition-all"
                                    >
                                        📋 Скопировать код
                                    </Button>
                                </div>
                            ) : (
                                // Кнопка готовности для игрока
                                <div className="space-y-3">
                                    <Button
                                        onClick={handleReady}
                                        className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 text-xl
                                            ${isReady
                                                ? "bg-gray-400 text-white hover:bg-gray-500"
                                                : "bg-blue-500 text-white hover:bg-blue-600"
                                            }`}
                                    >
                                        {isReady ? "✓ Готов" : "Приготовиться"}
                                    </Button>
                                    <p className="text-sm text-gray-500">
                                        {isReady 
                                            ? "Вы готовы! Ждём остальных игроков..."
                                            : "Нажмите, когда будете готовы к игре"
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Правая часть - Статистика */}
                <div className="w-1/4 border-l border-gray-200 p-8 bg-opacity-50">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6">
                        Информация о квизе
                    </h2>

                    <div className="space-y-4">
                        <div className="p-4 bg-white border-gray-200 border rounded-xl">
                            <p className="text-xs text-gray-500 mb-1">Название</p>
                            <p className="text-lg font-bold text-gray-800">{quiz.settings.name}</p>
                        </div>

                        <div className="p-4 bg-white border-gray-200 border rounded-xl">
                            <p className="text-xs text-gray-500 mb-1">Вопросов</p>
                            <p className="text-3xl font-bold text-blue-600">{quiz.settings.questionsCount}</p>
                        </div>

                        <div className="p-4 bg-white border-gray-200 border rounded-xl">
                            <p className="text-xs text-gray-500 mb-1">Время на вопрос</p>
                            <p className="text-3xl font-bold text-green-600">{quiz.settings.timePerQuestion} сек</p>
                        </div>

                        <div className="p-4 bg-white border-gray-200 border rounded-xl">
                            <p className="text-xs text-gray-500 mb-1">Сложность</p>
                            <p className="text-lg font-bold text-purple-600">
                                {quiz.settings.difficulty === 'easy' ? 'Лёгкая' : 
                                 quiz.settings.difficulty === 'medium' ? 'Средняя' : 'Сложная'}
                            </p>
                        </div>
                    </div>

                    {isHost ? (
                        // Информация для хоста
                        <>
                            <div className="mt-8 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                                <p className="text-sm font-semibold text-green-700 mb-2">
                                    🎯 Код для приглашения:
                                </p>
                                <p className="text-2xl font-bold text-green-800 text-center tracking-wider">
                                    {formatRoomCode(code)}
                                </p>
                            </div>
                            <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                                <p className="text-xs text-gray-600 text-center">
                                    💡 Поделитесь этим кодом со своими друзьями для приглашения в игру
                                </p>
                            </div>
                        </>
                    ) : (
                        // Информация для игрока
                        <div className="mt-8 p-4 bg-gray-100 rounded-xl">
                            <p className="text-xs text-gray-600 text-center">
                                💡 Вы находитесь в комнате <span className="font-semibold">{formatRoomCode(code)}</span>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
