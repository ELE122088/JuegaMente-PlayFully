import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function ResultsScreen() {
  const { score, total, categoryName, categoryId, roomCode, initialLives: passedInitialLives, gameMode, questions: questionsStr, userAnswers: answersStr, lives } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  
  const [showReview, setShowReview] = useState(false);
  const [saving, setSaving] = useState(true);

  const numScore = parseInt(score) || 0;
  const numTotal = parseInt(total) || 10;
  const parsedLives = parseInt(lives);
  const numLives = isNaN(parsedLives) ? 3 : parsedLives;
  const initialLives = parseInt(passedInitialLives) || (gameMode === 'practice' ? 5 : 3);
  const percentage = Math.round((numScore / numTotal) * 100);

  // Parsear datos de preguntas y respuestas
  const questions = questionsStr ? JSON.parse(questionsStr) : [];
  const userAnswers = answersStr ? JSON.parse(answersStr) : [];

  const isGameOver = numLives <= 0;

  useEffect(() => {
    saveGameScore();
  }, []);

  const saveGameScore = async () => {
    try {
      const detailedQuestions = questions.map((q, idx) => ({
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        userAnswer: userAnswers[idx] !== undefined ? userAnswers[idx] : -1,
      }));

      await api.post('/auth/score', {
        categoryName,
        categoryId: categoryId || null,
        roomCode: roomCode || '',
        score: numScore,
        total: numTotal,
        questions: detailedQuestions,
        lives: numLives,
      });
    } catch (error) {
      console.error('Error al guardar puntuación en el servidor:', error);
    } finally {
      setSaving(false);
    }
  };

  let title = 'Resultados del Cuestionario';
  let message = '';
  let color = '#4ECDC4'; // Verde

  if (isGameOver) {
    title = '💔 ¡GAME OVER!';
    message = 'Te quedaste sin vidas...';
    color = '#FF6B6B'; // Rojo
  } else {
    if (percentage >= 80) {
      title = '🏆 ¡Excelente Trabajo!';
      message = '¡Dominas este tema por completo!';
    } else if (percentage >= 60) {
      title = '👍 ¡Buen Intento!';
      message = 'Vas por buen camino, ¡sigue practicando!';
    } else {
      title = '📚 Sigue Estudiando';
      message = 'Puedes mejorar, ¡inténtalo de nuevo!';
      color = '#FFD166'; // Amarillo
    }
  }

  const getLivesHearts = () => {
    let hearts = '';
    for (let i = 0; i < initialLives; i++) {
      hearts += i < numLives ? '❤️' : '🖤';
    }
    return hearts;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <Image
          source={
            isGameOver || percentage < 60
              ? require('../../assets/images/game_over.jpg')
              : require('../../assets/images/quiz_victory.jpg')
          }
          style={styles.resultIllustration}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: colors.text }, isGameOver && styles.titleGameOver]}>{title}</Text>
        <Text style={[styles.category, { color: colors.textSecondary }]}>{categoryName}</Text>
        
        <View style={[styles.scoreCircle, { backgroundColor: colors.card, borderColor: color }]}>
          <Text style={[styles.scoreText, { color }]}>{percentage}%</Text>
          <Text style={styles.livesBadge}>
            {isGameOver ? '💔 0 Vidas' : `${getLivesHearts()}`}
          </Text>
        </View>

        <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
        
        {isGameOver ? (
          <Text style={[styles.details, { color: colors.textSecondary }]}>
            Lograste responder correctamente <Text style={{fontWeight: 'bold', color: colors.text}}>{numScore}</Text> de <Text style={{fontWeight: 'bold', color: colors.text}}>{numTotal}</Text> preguntas antes de perder tus vidas.
          </Text>
        ) : (
          <Text style={[styles.details, { color: colors.textSecondary }]}>
            Respondiste correctamente <Text style={{fontWeight: 'bold', color: colors.text}}>{numScore}</Text> de <Text style={{fontWeight: 'bold', color: colors.text}}>{numTotal}</Text> preguntas.
          </Text>
        )}

        {saving && (
          <View style={styles.savingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.savingText, { color: colors.textSecondary }]}>Guardando resultado...</Text>
          </View>
        )}
      </View>

      {/* Botón para ver respuestas correctas */}
      {questions.length > 0 && (
        <View style={styles.reviewSection}>
          <TouchableOpacity 
            style={[styles.reviewButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowReview(!showReview)}
          >
            <Text style={[styles.reviewButtonText, { color: colors.text }]}>
              {showReview ? '🔼 Ocultar Respuestas' : '🔽 Ver Respuestas Correctas'}
            </Text>
          </TouchableOpacity>

          {showReview && (
            <View style={styles.reviewList}>
              {questions.map((question, qIndex) => {
                const userAnswer = userAnswers[qIndex];
                const isCorrect = userAnswer === question.correctAnswer;

                return (
                  <View key={qIndex} style={[styles.reviewCard, { backgroundColor: colors.card }, isCorrect ? styles.reviewCardCorrect : styles.reviewCardWrong]}>
                    <View style={styles.reviewHeader}>
                      <Text style={[styles.reviewNumber, { color: colors.textSecondary }]}>Pregunta {qIndex + 1}</Text>
                      <Text style={[styles.reviewBadge, isCorrect ? styles.badgeCorrect : styles.badgeWrong]}>
                        {userAnswer === -1 ? '⏱️ Expirado' : isCorrect ? '✓ Correcta' : '✗ Incorrecta'}
                      </Text>
                    </View>
                    
                    <Text style={[styles.reviewQuestion, { color: colors.text }]}>{question.text}</Text>
                    
                    <View style={styles.reviewOptions}>
                      {question.options.map((option, oIndex) => {
                        const isCorrectOption = oIndex === question.correctAnswer;
                        const isUserAnswer = oIndex === userAnswer;

                        let optionStyle = [styles.reviewOption, { backgroundColor: colors.background, borderColor: colors.border }];
                        let textStyle = [styles.reviewOptionText, { color: colors.text }];

                        if (isCorrectOption) {
                          optionStyle.push(styles.correctOptionBg);
                          textStyle.push(styles.correctOptionText);
                        } else if (isUserAnswer && !isCorrectOption) {
                          optionStyle.push(styles.wrongOptionBg);
                          textStyle.push(styles.wrongOptionText);
                        }

                        return (
                          <View key={oIndex} style={optionStyle}>
                            <Text style={textStyle}>
                              {String.fromCharCode(65 + oIndex)}. {option}
                              {isCorrectOption ? ' ✓' : ''}
                              {isUserAnswer && !isCorrectOption ? ' ✗' : ''}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.primaryButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={() => router.replace('/')}
        >
          <Text style={[styles.primaryButtonText, { color: colors.primaryText }]}>Volver a Categorías</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingTop: 32,
  },
  resultIllustration: {
    width: 170,
    height: 170,
    borderRadius: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  titleGameOver: {
    color: '#FF6B6B',
  },
  category: {
    fontSize: 18,
    marginBottom: 40,
  },
  scoreCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 8,
    marginBottom: 32,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 8px rgba(0,0,0,0.08)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 }),
  },
  scoreText: {
    fontSize: 44,
    fontWeight: 'bold',
  },
  livesBadge: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: 'bold',
    marginTop: 4,
  },
  message: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  details: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  savingText: {
    fontSize: 13,
  },
  reviewSection: {
    padding: 16,
  },
  reviewButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  reviewButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewList: {
    marginTop: 16,
    gap: 16,
  },
  reviewCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 1px 4px rgba(0,0,0,0.05)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }),
  },
  reviewCardCorrect: {
    borderColor: '#C3E6CB',
  },
  reviewCardWrong: {
    borderColor: '#F5C6CB',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewNumber: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  reviewBadge: {
    fontSize: 13,
    fontWeight: 'bold',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  badgeCorrect: {
    backgroundColor: '#D4EDDA',
    color: '#155724',
  },
  badgeWrong: {
    backgroundColor: '#F8D7DA',
    color: '#721C24',
  },
  reviewQuestion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 22,
  },
  reviewOptions: {
    gap: 6,
  },
  reviewOption: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  correctOptionBg: {
    backgroundColor: '#D4EDDA',
    borderColor: '#C3E6CB',
  },
  wrongOptionBg: {
    backgroundColor: '#F8D7DA',
    borderColor: '#F5C6CB',
  },
  reviewOptionText: {
    fontSize: 14,
  },
  correctOptionText: {
    color: '#155724',
    fontWeight: '600',
  },
  wrongOptionText: {
    color: '#721C24',
    fontWeight: '600',
  },
  footer: {
    padding: 24,
  },
  primaryButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 6px rgba(0,0,0,0.2)' }
      : { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 }),
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
