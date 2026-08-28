import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Image, Modal, FlatList, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../services/api';
import { getSocket } from '../services/socket';
import storage from '../services/storage';
import { useTheme } from '../context/ThemeContext';

export default function ResultsScreen() {
  const { score, total, categoryName, categoryId, roomCode, initialLives: passedInitialLives, gameMode, questions: questionsStr, userAnswers: answersStr, lives } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  
  const [showReview, setShowReview] = useState(false);
  const [saving, setSaving] = useState(true);

  // Estados de Ranking en Tiempo Real para Alumnos
  const [rankingModalVisible, setRankingModalVisible] = useState(false);
  const [rankingData, setRankingData] = useState(null);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [liveRankingBadge, setLiveRankingBadge] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');

  const rankingModalVisibleRef = useRef(rankingModalVisible);
  const categoryIdRef = useRef(categoryId);
  const categoryNameRef = useRef(categoryName);

  useEffect(() => {
    rankingModalVisibleRef.current = rankingModalVisible;
    categoryIdRef.current = categoryId;
    categoryNameRef.current = categoryName;
  }, [rankingModalVisible, categoryId, categoryName]);

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
    setCurrentUsername(storage.getItem('username') || '');
    saveGameScore();

    // ⚡ Escuchar actualizaciones de ranking en tiempo real vía WebSockets
    try {
      const socket = getSocket();

      const handleLiveRanking = async (data) => {
        console.log('⚡ [Results WebSocket] Actualización de ranking en tiempo real:', data);
        const isVisible = rankingModalVisibleRef.current;
        const currentCatId = categoryIdRef.current;
        const currentCatName = categoryNameRef.current;

        if (isVisible && (currentCatId || currentCatName)) {
          if (!data?.categoryId || data.categoryId === currentCatId || data.categoryName === currentCatName) {
            try {
              if (currentCatId) {
                const res = await api.get(`/categories/${currentCatId}/ranking`);
                setRankingData(res.data);
              }
              setLiveRankingBadge(true);
              setTimeout(() => setLiveRankingBadge(false), 4000);
            } catch (err) {
              console.error('Error al actualizar ranking en vivo:', err);
            }
          }
        }
      };

      socket.on('ranking:updated', handleLiveRanking);

      return () => {
        socket.off('ranking:updated', handleLiveRanking);
      };
    } catch (err) {
      console.warn('No se pudo conectar socket en resultados:', err);
    }
  }, []);

  const fetchLiveRanking = async () => {
    setRankingModalVisible(true);
    setRankingLoading(true);
    try {
      if (categoryId) {
        const response = await api.get(`/categories/${categoryId}/ranking`);
        setRankingData(response.data);
      } else {
        // Buscar por nombre si no vino ID
        const catsRes = await api.get('/categories');
        const match = catsRes.data?.find(c => c.name === categoryName);
        if (match) {
          const res = await api.get(`/categories/${match._id}/ranking`);
          setRankingData(res.data);
        }
      }
    } catch (err) {
      console.error('Error al cargar ranking de la materia:', err);
      Alert.alert('Aviso', 'No se pudo cargar el ranking en este momento');
    } finally {
      setRankingLoading(false);
    }
  };

  // Helper para formatear fecha y hora completa con minutero y segundero
  const formatDateTimeWithSeconds = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const pad = (n) => String(n).padStart(2, '0');
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

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
          style={[styles.rankingButton, { backgroundColor: '#4ECDC41A', borderColor: '#4ECDC4', marginBottom: 14 }]}
          onPress={fetchLiveRanking}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Text style={{ fontSize: 20 }}>🏆</Text>
            <Text style={[styles.rankingButtonText, { color: '#4ECDC4' }]}>
              Ver Tabla de Posiciones / Ranking
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.primaryButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={() => router.replace('/')}
        >
          <Text style={[styles.primaryButtonText, { color: colors.primaryText }]}>Volver a Categorías</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Ranking de Alumnos en Tiempo Real */}
      <Modal visible={rankingModalVisible} animationType="slide" transparent={true}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay || 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.rankingModalCard, { backgroundColor: colors.card }]}>
            {/* Header del Modal */}
            <View style={[styles.rankingHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rankingModalTitle, { color: colors.text }]}>
                  🏆 Tabla de Posiciones
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#10B981' }}>
                    En Vivo (Sincronizado)
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    • {categoryName}
                  </Text>
                  {liveRankingBadge && (
                    <View style={{ backgroundColor: '#10B98122', borderColor: '#10B981', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#10B981' }}>⚡ Actualizado</Text>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.closeModalBtn, { backgroundColor: colors.border }]}
                onPress={() => setRankingModalVisible(false)}
              >
                <Text style={[styles.closeModalText, { color: colors.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Contenido del Ranking */}
            {rankingLoading ? (
              <View style={styles.rankingLoadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.rankingLoadingText, { color: colors.textSecondary }]}>Cargando posiciones...</Text>
              </View>
            ) : !rankingData?.ranking || rankingData.ranking.length === 0 ? (
              <View style={styles.rankingEmptyContainer}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>📊</Text>
                <Text style={[styles.rankingEmptyTitle, { color: colors.text }]}>Aún no hay puntuaciones</Text>
                <Text style={[styles.rankingEmptySubtitle, { color: colors.textSecondary }]}>
                  ¡Sé el primero en aparecer en la tabla de clasificación!
                </Text>
              </View>
            ) : (
              <FlatList
                data={rankingData.ranking}
                keyExtractor={(item, index) => item.historyId || index.toString()}
                contentContainerStyle={styles.rankingList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => {
                  let medal = item.medal || (index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`);

                  const isMe = currentUsername && item.username && item.username.toLowerCase() === currentUsername.toLowerCase();
                  const isPassed = item.percentage >= 60;

                  return (
                    <View
                      style={[
                        styles.rankingRow,
                        { 
                          backgroundColor: isMe ? `${colors.primary}18` : colors.background, 
                          borderColor: isMe ? colors.primary : colors.border,
                          borderWidth: isMe ? 1.5 : 1,
                        }
                      ]}
                    >
                      <Text style={styles.rankingMedal}>{medal}</Text>
                      
                      <View style={styles.rankingStudentInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.rankingStudentName, { color: colors.text, fontWeight: isMe ? '800' : '600' }]} numberOfLines={1}>
                            {item.username || 'Estudiante'}
                          </Text>
                          {isMe && (
                            <View style={[styles.meBadge, { backgroundColor: colors.primary }]}>
                              <Text style={[styles.meBadgeText, { color: colors.primaryText }]}>Tú</Text>
                            </View>
                          )}
                          {item.perfectCount > 1 && (
                            <View style={{ backgroundColor: '#F59E0B20', borderColor: '#F59E0B', borderWidth: 1, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8 }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: '#D97706' }}>🔥 {item.perfectCount}x 100%</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.rankingDate, { color: colors.textSecondary }]}>
                          ⏱️ {formatDateTimeWithSeconds(item.date)} • {item.score}/{item.total} pts
                        </Text>
                      </View>

                      <View style={styles.rankingScoreBadge}>
                        <Text style={[styles.rankingPercentage, { color: isPassed ? '#4ECDC4' : '#FF6B6B' }]}>
                          {item.percentage}%
                        </Text>
                        <Text style={styles.rankingLives}>
                          {item.lives > 0 ? '❤️'.repeat(Math.min(item.lives, 5)) : '💔'}
                        </Text>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
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
  rankingButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  rankingButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  rankingModalCard: {
    width: '100%',
    maxWidth: 550,
    maxHeight: '85%',
    borderRadius: 20,
    padding: 20,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 10px 30px rgba(0,0,0,0.25)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 }),
  },
  rankingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  rankingModalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  rankingLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  rankingLoadingText: {
    fontSize: 14,
  },
  rankingEmptyContainer: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  rankingEmptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  rankingEmptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  rankingList: {
    paddingVertical: 6,
    gap: 10,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  rankingMedal: {
    fontSize: 18,
    fontWeight: '800',
    width: 30,
    textAlign: 'center',
  },
  rankingStudentInfo: {
    flex: 1,
  },
  rankingStudentName: {
    fontSize: 15,
  },
  meBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  meBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  rankingDate: {
    fontSize: 12,
    marginTop: 2,
  },
  rankingScoreBadge: {
    alignItems: 'flex-end',
  },
  rankingPercentage: {
    fontSize: 17,
    fontWeight: '800',
  },
  rankingLives: {
    fontSize: 11,
    marginTop: 2,
  },
});
