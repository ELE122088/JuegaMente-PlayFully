import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform, Image, Modal, Vibration } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../services/api';
import Header from '../components/Header';
import OptionButton from '../components/OptionButton';
import { useTheme } from '../context/ThemeContext';

const createShadow = (color = '#000', offsetY = 2, opacity = 0.08, radius = 4, elevation = 3) => {
  if (Platform.OS === 'web') {
    const r = parseInt(color.slice(1, 3), 16) || 0;
    const g = parseInt(color.slice(3, 5), 16) || 0;
    const b = parseInt(color.slice(5, 7), 16) || 0;
    return {
      boxShadow: `0px ${offsetY}px ${radius}px rgba(${r},${g},${b},${opacity})`,
    };
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
};

const InteractiveActionBtn = ({
  style,
  accentColor = '#6C63FF',
  onPress,
  disabled = false,
  children,
  activeOpacity = 0.75,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <TouchableOpacity
      style={[
        style,
        Platform.OS === 'web' && {
          transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease, border-color 0.2s ease, opacity 0.2s ease',
          cursor: disabled ? 'default' : 'pointer',
        },
        isHovered && !disabled && {
          transform: [{ translateY: -2 }],
          borderColor: accentColor,
          ...createShadow(accentColor, 4, 0.28, 10, 4),
        },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={activeOpacity}
      {...(Platform.OS === 'web' && !disabled
        ? {
            onMouseEnter: () => setIsHovered(true),
            onMouseLeave: () => setIsHovered(false),
          }
        : {})}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
};

export default function QuizScreen() {
  const { categoryId, categoryName, roomCode, initialLives: passedLives, gameMode, timePerQuestion: passedTime } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();

  const maxLives = parseInt(passedLives) || (gameMode === 'practice' ? 5 : 3);
  const timeLimit = passedTime !== undefined ? Number(passedTime) : 15;
  const isUnlimitedTime = timeLimit === 0;
  
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mecánicas de juego y vidas dinámicas (3 o 5)
  const [lives, setLives] = useState(maxLives);
  const [timer, setTimer] = useState(isUnlimitedTime ? 0 : timeLimit);
  const timerRef = useRef(null);

  // Modal de advertencia de abandono (Anti-Trampas)
  const [exitModalVisible, setExitModalVisible] = useState(false);

  useEffect(() => {
    fetchRandomQuestions();
    return () => clearInterval(timerRef.current);
  }, []);

  // Control del cronómetro
  useEffect(() => {
    if (loading || questions.length === 0 || isAnswered || isUnlimitedTime) {
      clearInterval(timerRef.current);
      return;
    }

    setTimer(timeLimit); // Reiniciar cronómetro con el tiempo configurado
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [currentIndex, isAnswered, loading, isUnlimitedTime, timeLimit]);

  const fetchRandomQuestions = async () => {
    try {
      const response = await api.get(`/questions/random/${categoryId}?limit=10`);
      setQuestions(response.data);
    } catch (error) {
      console.error('Error al cargar cuestionario:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeOut = () => {
    if (isAnswered) return;
    
    // Feedback táctil: doble vibración de alerta
    try {
      if (Platform.OS !== 'web') {
        Vibration.cancel();
        Vibration.vibrate([0, 200, 100, 200]);
      }
    } catch (e) {}

    // Marcar como respondido sin seleccionar opción
    setSelectedOption(-1); // -1 indica tiempo agotado/sin responder
    setIsAnswered(true);
    
    const nextAnswers = [...userAnswers, -1];
    setUserAnswers(nextAnswers);

    // Restar una vida
    const remainingLives = lives - 1;
    setLives(remainingLives);

    if (remainingLives <= 0) {
      // Game Over inmediato por falta de vidas
      clearInterval(timerRef.current);
      setTimeout(() => {
        finishQuiz(score, nextAnswers, 0);
      }, 1000);
    }
  };

  const handleOptionPress = (index) => {
    if (isAnswered) return;
    
    clearInterval(timerRef.current);
    setSelectedOption(index);
    setIsAnswered(true);
    
    const nextAnswers = [...userAnswers, index];
    setUserAnswers(nextAnswers);

    const isCorrect = index === questions[currentIndex].correctAnswer;
    let nextScore = score;
    let nextLives = lives;

    // Feedback háptico en dispositivo móvil
    try {
      if (Platform.OS !== 'web') {
        Vibration.cancel(); // Detener vibraciones previas
        if (isCorrect) {
          // Patrón de éxito: doble toque ágil y nítido (90ms vibra, 60ms pausa, 90ms vibra)
          Vibration.vibrate([0, 90, 60, 90]);
        } else {
          // Patrón de error: doble pulso largo y pesado (200ms vibra, 100ms pausa, 200ms vibra)
          Vibration.vibrate([0, 200, 100, 200]);
        }
      }
    } catch (e) {}

    if (isCorrect) {
      nextScore = score + 1;
      setScore(nextScore);
    } else {
      nextLives = lives - 1;
      setLives(nextLives);
    }

    // Si se queda sin vidas tras este error, finalizar
    if (nextLives <= 0) {
      setTimeout(() => {
        finishQuiz(nextScore, nextAnswers, 0);
      }, 1000);
    }
  };

  const handleNext = () => {
    if (lives <= 0) return;

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      finishQuiz(score, userAnswers, lives);
    }
  };

  const finishQuiz = (finalScore, finalAnswers, finalLives) => {
    clearInterval(timerRef.current);
    router.replace({
      pathname: '/results',
      params: {
        score: finalScore,
        total: questions.length,
        categoryName,
        categoryId: categoryId || '',
        roomCode: roomCode || '',
        questions: JSON.stringify(questions),
        userAnswers: JSON.stringify(finalAnswers),
        lives: finalLives,
        initialLives: maxLives,
        gameMode: gameMode || 'exam',
      }
    });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title={categoryName || 'Cuestionario'} showBack={true} />
        <View style={styles.emptyQuestionsContainer}>
          <Image
            source={require('../../assets/images/empty_questions.jpg')}
            style={styles.emptyQuestionsImage}
            resizeMode="contain"
          />
          <Text style={[styles.emptyQuestionsTitle, { color: colors.text }]}>Sin preguntas disponibles</Text>
          <Text style={[styles.emptyQuestionsSubtitle, { color: colors.textSecondary }]}>
            Esta categoría aún no tiene suficientes preguntas para iniciar una trivia.
          </Text>
          <TouchableOpacity
            style={[styles.backToCategoriesBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/')}
          >
            <Text style={[styles.backToCategoriesBtnText, { color: colors.primaryText }]}>
              Volver a Categorías
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  // Dibujar corazones de vida dinámicos (3 o 5 vidas)
  const renderLives = () => {
    const hearts = [];
    for (let i = 0; i < maxLives; i++) {
      hearts.push(
        <Text key={i} style={styles.heartText}>
          {i < lives ? '❤️' : '🖤'}
        </Text>
      );
    }
    return <View style={styles.livesContainer}>{hearts}</View>;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header 
        title={`${categoryName}`} 
        showBack={true}
        onBackPress={() => setExitModalVisible(true)}
        rightComponent={renderLives()} 
      />

      {/* Barra de progreso de preguntas */}
      <View style={[styles.progressContainer, { backgroundColor: colors.border }]}>
        <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: colors.primary }]} />
      </View>
      
      <View style={styles.quizInfoContainer}>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>Pregunta {currentIndex + 1} de {questions.length}</Text>
        
        {/* Temporizador */}
        <View style={[
          styles.timerBadge, 
          { backgroundColor: `${colors.primary}1A`, borderColor: colors.border },
          !isUnlimitedTime && timer <= 5 && styles.timerBadgeAlert
        ]}>
          <Text style={[
            styles.timerText, 
            { color: colors.primary },
            !isUnlimitedTime && timer <= 5 && styles.timerTextAlert
          ]}>
            {isUnlimitedTime ? '⏱️ Sin límite' : `⏱️ ${timer}s`}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={[styles.questionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.questionText, { color: colors.text }]}>{currentQuestion.text}</Text>
        </View>

        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => {
            const isCorrect = isAnswered && index === currentQuestion.correctAnswer;
            const isWrong = isAnswered && selectedOption === index && index !== currentQuestion.correctAnswer;
            const isSelected = selectedOption === index;

            return (
              <OptionButton
                key={index}
                text={option}
                letter={String.fromCharCode(65 + index)}
                isSelected={isSelected && !isAnswered}
                isCorrect={isCorrect}
                isWrong={isWrong}
                disabled={isAnswered}
                onPress={() => handleOptionPress(index)}
              />
            );
          })}
        </View>
      </View>

      {/* Botón Siguiente / Terminar */}
      {isAnswered && lives > 0 && (
        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <InteractiveActionBtn 
            style={[styles.nextButton, { backgroundColor: colors.primary }]} 
            accentColor={colors.primary}
            onPress={handleNext}
          >
            <Text style={[styles.nextButtonText, { color: colors.primaryText }]}>
              {currentIndex < questions.length - 1 ? 'Siguiente Pregunta' : 'Ver Resultados'}
            </Text>
          </InteractiveActionBtn>
        </View>
      )}

      {/* Modal de Advertencia de Abandono (Anti-Trampas) */}
      <Modal visible={exitModalVisible} animationType="fade" transparent={true}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={styles.modalEmoji}>⚠️</Text>
            <Text style={[styles.modalTitle, { color: colors.text }]}>¿Abandonar Partida?</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Si sales ahora de la partida, se registrará como intento fallido con 0 vidas y 0 puntos.
            </Text>

            <View style={styles.modalButtons}>
              <InteractiveActionBtn
                style={[styles.cancelBtn, { backgroundColor: colors.border }]}
                accentColor={colors.textSecondary}
                onPress={() => setExitModalVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Seguir Jugando</Text>
              </InteractiveActionBtn>
              <InteractiveActionBtn
                style={[styles.abandonBtn, { backgroundColor: '#FF6B6B20', borderColor: '#FF6B6B' }]}
                accentColor="#FF6B6B"
                onPress={() => {
                  setExitModalVisible(false);
                  finishQuiz(score, userAnswers, 0);
                }}
              >
                <Text style={[styles.abandonBtnText, { color: '#FF6B6B' }]}>Abandonar</Text>
              </InteractiveActionBtn>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    height: 6,
    width: '100%',
  },
  progressBar: {
    height: '100%',
  },
  quizInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 12,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  timerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  timerBadgeAlert: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
  },
  timerText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  timerTextAlert: {
    color: '#C62828',
  },
  livesContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  heartText: {
    fontSize: 18,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  questionCard: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.08)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 }),
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 28,
  },
  optionsContainer: {
    flex: 1,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  nextButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyQuestionsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyQuestionsImage: {
    width: 220,
    height: 220,
    borderRadius: 20,
    marginBottom: 20,
  },
  emptyQuestionsTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyQuestionsSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
    marginBottom: 24,
  },
  backToCategoriesBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: 'center',
  },
  backToCategoriesBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  // Estilos del Modal de Abandono
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 8px 24px rgba(0,0,0,0.15)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 }),
  },
  modalEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  abandonBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  abandonBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
