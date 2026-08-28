import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform, Image, Modal, ScrollView, TextInput } from 'react-native';
import api from '../services/api';
import { getSocket } from '../services/socket';
import storage from '../services/storage';
import Header from '../components/Header';
import CategoryForm from '../components/CategoryForm';
import QuestionForm from '../components/QuestionForm';
import { useTheme } from '../context/ThemeContext';

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Modales
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Estados de Ranking de Alumnos
  const [rankingModalVisible, setRankingModalVisible] = useState(false);
  const [rankingCategory, setRankingCategory] = useState(null);
  const [rankingData, setRankingData] = useState(null);
  const [rankingLoading, setRankingLoading] = useState(false);

  // Estados para Carga Masiva (JSON)
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [bulkJsonText, setBulkJsonText] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Estados para Gestión de Usuarios / Docentes
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const { colors } = useTheme();

  useEffect(() => {
    // Determinar si el usuario actual es SuperAdmin
    const storedIsSuper = storage.getItem('isSuperAdmin') === 'true';
    const storedUsername = (storage.getItem('username') || '').toLowerCase();
    const isSuper = storedIsSuper || storedUsername === 'superadmin';
    setIsSuperAdmin(isSuper);

    // ⚡ Sincronización en tiempo real con WebSockets
    try {
      const socket = getSocket();

      const handleCategoriesUpdate = (data) => {
        console.log('⚡ [Admin WebSocket] Notificación en tiempo real:', data);
        fetchData(); // Recarga materias y preguntas correctamente
      };

      socket.on('categories:updated', handleCategoriesUpdate);

      return () => {
        socket.off('categories:updated', handleCategoriesUpdate);
      };
    } catch (err) {
      console.warn('No se pudo conectar socket en panel admin:', err);
    }
  }, []);

  const handleOpenRanking = async (category) => {
    setRankingCategory(category);
    setRankingModalVisible(true);
    setRankingLoading(true);
    try {
      const response = await api.get(`/categories/${category._id}/ranking`);
      setRankingData(response.data);
    } catch (error) {
      console.error('Error al cargar ranking:', error);
      Alert.alert('Error', 'No se pudo cargar el ranking de alumnos');
    } finally {
      setRankingLoading(false);
    }
  };

  // Exportar ranking a CSV / Excel
  const handleExportRankingCSV = () => {
    if (!rankingData?.ranking || rankingData.ranking.length === 0) {
      Alert.alert('Aviso', 'No hay datos de ranking para exportar');
      return;
    }

    const headers = ['Posicion', 'Estudiante', 'Aciertos', 'Total', 'Porcentaje', 'Vidas', 'Fecha'];
    const rows = rankingData.ranking.map((item, idx) => [
      idx + 1,
      `"${(item.username || 'Anonimo').replace(/"/g, '""')}"`,
      item.score,
      item.total,
      `${item.percentage}%`,
      item.lives !== undefined ? item.lives : 'N/A',
      `"${item.date ? new Date(item.date).toLocaleString('es-ES') : ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ranking_${(rankingCategory?.name || 'materia').toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Alert.alert('📥 Reporte Generado', `Se generó el reporte CSV con ${rankingData.ranking.length} alumnos evaluados.`);
    }
  };

  // Copiar resumen de notas al portapapeles
  const handleCopyRankingText = () => {
    if (!rankingData?.ranking || rankingData.ranking.length === 0) return;

    let text = `📊 RANKING DE NOTAS - ${rankingCategory?.name}\n`;
    text += `=========================================\n`;
    rankingData.ranking.forEach((r, idx) => {
      text += `#${idx + 1} | ${r.username} | ${r.percentage}% (${r.score}/${r.total}) | Vidas: ${r.lives}\n`;
    });

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert('📋 ¡Tabla de notas copiada al portapapeles!');
    } else {
      Alert.alert('📋 Reporte Copiado', text);
    }
  };

  // Cambiar estado de sala (Abierto / Cerrado)
  const handleToggleCategoryStatus = async (category) => {
    try {
      const newStatus = category.isActive === false ? true : false;
      await api.put(`/categories/${category._id}`, { isActive: newStatus });
      fetchData();
    } catch (error) {
      console.error('Error al cambiar estado de categoría:', error);
      Alert.alert('Error', 'No se pudo cambiar el estado de la materia');
    }
  };

  // Ejecutar carga masiva de preguntas JSON
  const handleExecuteBulkImport = async () => {
    if (!bulkCategoryId) {
      Alert.alert('Error', 'Selecciona una categoría de destino');
      return;
    }
    if (!bulkJsonText.trim()) {
      Alert.alert('Error', 'Pega el código JSON con las preguntas');
      return;
    }

    try {
      const parsed = JSON.parse(bulkJsonText.trim());
      if (!Array.isArray(parsed)) {
        Alert.alert('Error de Formato', 'El JSON debe ser un arreglo de preguntas [...]');
        return;
      }

      setBulkLoading(true);
      const response = await api.post('/questions/bulk', {
        categoryId: bulkCategoryId,
        questions: parsed,
      });

      Alert.alert('✅ ¡Éxito!', response.data.message || 'Preguntas importadas exitosamente');
      setShowBulkModal(false);
      setBulkJsonText('');
      setBulkCategoryId('');
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'JSON inválido. Revisa la estructura.';
      Alert.alert('Error en Carga Masiva', msg);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDeleteRankingItem = async (item) => {
    const confirmMessage = `¿Estás seguro de eliminar el registro de calificación de ${item.username}?`;

    const executeDelete = async () => {
      try {
        await api.delete(`/categories/${rankingCategory._id}/ranking/${item.historyId}`);
        setRankingData((prev) => ({
          ...prev,
          ranking: prev.ranking.filter((r) => r.historyId !== item.historyId),
        }));
      } catch (error) {
        console.error('Error al eliminar calificación:', error);
        Alert.alert('Error', 'No se pudo eliminar el registro de calificación');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        await executeDelete();
      }
    } else {
      Alert.alert(
        'Eliminar Calificación',
        confirmMessage,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: executeDelete },
        ]
      );
    }
  };

  const handleClearAllRanking = async () => {
    if (!rankingData?.ranking || rankingData.ranking.length === 0) return;

    const confirmMessage = `¿Estás seguro de vaciar TODAS las calificaciones de "${rankingCategory?.name}"? Esta acción no se puede deshacer.`;

    const executeClear = async () => {
      try {
        await api.delete(`/categories/${rankingCategory._id}/ranking`);
        setRankingData((prev) => ({
          ...prev,
          ranking: [],
        }));
      } catch (error) {
        console.error('Error al vaciar ranking:', error);
        Alert.alert('Error', 'No se pudo vaciar el ranking');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        await executeClear();
      }
    } else {
      Alert.alert(
        'Vaciar Todo el Ranking',
        confirmMessage,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Vaciar Todo', style: 'destructive', onPress: executeClear },
        ]
      );
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, questRes, usersRes] = await Promise.all([
        api.get('/categories/mine'),
        api.get('/questions/mine'),
        api.get('/auth/users').catch(() => ({ data: [] })),
      ]);
      setCategories(catRes.data);
      setQuestions(questRes.data);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await api.get('/auth/users');
      setUsers(res.data || []);
    } catch (e) {
      console.warn('Error al cargar usuarios:', e);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleToggleUserRole = async (user) => {
    if (user.isSuperAdmin || ['superadmin', 'admin'].includes((user.username || '').toLowerCase())) {
      Alert.alert('Acción no permitida', 'La cuenta de SuperAdmin es inmutable y no se puede modificar.');
      return;
    }

    const isCurrentlyAdmin = user.role === 'admin';
    const newRole = isCurrentlyAdmin ? 'user' : 'admin';
    const actionText = isCurrentlyAdmin ? 'cambiar a Estudiante' : 'ascender a Docente / Administrador';

    const performRoleChange = async () => {
      try {
        await api.put(`/auth/users/${user._id}/role`, {
          role: newRole,
          adminPin: newRole === 'admin' ? (user.adminPin || '1234') : undefined,
        });
        const successMsg = `Rol actualizado: "${user.username}" ahora es ${newRole === 'admin' ? '👑 Docente' : '🎓 Estudiante'}`;
        if (Platform.OS === 'web') {
          alert(successMsg);
        } else {
          Alert.alert('Éxito', successMsg);
        }
        fetchUsers();
      } catch (err) {
        const msg = err.response?.data?.message || 'Error al cambiar rol';
        Alert.alert('Error', msg);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`¿Estás seguro de ${actionText} al usuario "${user.username}"?`)) {
        performRoleChange();
      }
    } else {
      Alert.alert(
        'Confirmar Cambio de Rol',
        `¿Estás seguro de ${actionText} al usuario "${user.username}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Confirmar', onPress: performRoleChange }
        ]
      );
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.isSuperAdmin || ['superadmin', 'admin'].includes((user.username || '').toLowerCase())) {
      Alert.alert('Acción no permitida', 'La cuenta principal de SuperAdmin no se puede eliminar.');
      return;
    }

    const performDelete = async () => {
      try {
        await api.delete(`/auth/users/${user._id}`);
        fetchUsers();
      } catch (err) {
        const msg = err.response?.data?.message || 'Error al eliminar usuario';
        Alert.alert('Error', msg);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`¿Estás seguro de eliminar permanentemente la cuenta de "${user.username}"?`)) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Eliminar Usuario',
        `¿Estás seguro de eliminar permanentemente la cuenta de "${user.username}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: performDelete }
        ]
      );
    }
  };

  // ==================== CATEGORÍAS ====================
  const handleSaveCategory = async (data) => {
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, data);
      } else {
        await api.post('/categories', data);
      }
      setShowCategoryForm(false);
      setEditingCategory(null);
      fetchData();
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al guardar la categoría';
      Alert.alert('Error', msg);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const handleDeleteCategory = (category) => {
    const performDelete = async () => {
      try {
        await api.delete(`/categories/${category._id}`);
        fetchData();
      } catch (error) {
        const msg = error.response?.data?.message || 'No se pudo eliminar la categoría';
        if (Platform.OS === 'web') {
          alert(`Error: ${msg}`);
        } else {
          Alert.alert('Error', msg);
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm(`¿Estás seguro de eliminar "${category.name}"?\n\nSe eliminarán también todas sus preguntas.`);
      if (confirmDelete) {
        performDelete();
      }
    } else {
      Alert.alert(
        '🗑️ Eliminar Categoría',
        `¿Estás seguro de eliminar "${category.name}"?\n\nSe eliminarán también todas sus preguntas.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: performDelete }
        ]
      );
    }
  };

  // ==================== PREGUNTAS ====================
  const handleSaveQuestion = async (data) => {
    try {
      if (editingQuestion) {
        await api.put(`/questions/${editingQuestion._id}`, data);
      } else {
        await api.post('/questions', data);
      }
      setShowQuestionForm(false);
      setEditingQuestion(null);
      fetchData();
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al guardar la pregunta';
      Alert.alert('Error', msg);
    }
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setShowQuestionForm(true);
  };

  const handleDeleteQuestion = (question) => {
    const performDelete = async () => {
      try {
        await api.delete(`/questions/${question._id}`);
        fetchData();
      } catch (error) {
        const msg = error.response?.data?.message || 'No se pudo eliminar la pregunta';
        if (Platform.OS === 'web') {
          alert(`Error: ${msg}`);
        } else {
          Alert.alert('Error', msg);
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm(`¿Estás seguro de eliminar esta pregunta?\n\n"${question.text}"`);
      if (confirmDelete) {
        performDelete();
      }
    } else {
      Alert.alert(
        '🗑️ Eliminar Pregunta',
        `¿Estás seguro de eliminar esta pregunta?\n\n"${question.text}"`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: performDelete }
        ]
      );
    }
  };

  // ==================== RENDERS ====================
  const renderCategoryItem = ({ item }) => (
    <View style={[
      styles.categoryCardAdmin, 
      { 
        backgroundColor: colors.card, 
        borderLeftColor: item.color, 
      }
    ]}>
      <View style={styles.categoryCardAdminMain}>
        <Text style={styles.cardIconCompact}>{item.icon}</Text>
        <View style={styles.cardInfoCompact}>
          {/* Fila 1: Título y Estado Abierto/Cerrado */}
          <View style={styles.categoryTitleRow}>
            <Text style={[styles.categoryTitleText, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            
            {/* Badge de Estado Activo/Bloqueado con 1 toque */}
            <TouchableOpacity 
              onPress={() => handleToggleCategoryStatus(item)}
              activeOpacity={0.7}
              style={[
                styles.pinBadgeCompact, 
                { 
                  backgroundColor: item.isActive !== false ? '#4ECDC418' : '#FF6B6B18', 
                  borderColor: item.isActive !== false ? '#4ECDC4' : '#FF6B6B' 
                }
              ]}
            >
              <Text style={[styles.pinBadgeTextCompact, { color: item.isActive !== false ? '#4ECDC4' : '#FF6B6B' }]}>
                {item.isActive !== false ? '🟢 Abierto' : '🔴 Cerrado'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Fila 2: Badges de Tipo/PIN y Segundero (Envueltos en móvil) */}
          <View style={styles.categoryBadgesRow}>
            {item.isPublic || !item.roomCode ? (
              <View style={[styles.pinBadgeCompact, { backgroundColor: '#4ECDC418', borderColor: '#4ECDC4' }]}>
                <Text style={[styles.pinBadgeTextCompact, { color: '#4ECDC4' }]}>🌐 Práctica (5 ❤️)</Text>
              </View>
            ) : (
              <View style={[styles.pinBadgeCompact, { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]}>
                <Text style={[styles.pinBadgeTextCompact, { color: colors.primary }]}>🎯 PIN: {item.roomCode} (3 ❤️)</Text>
              </View>
            )}

            <View style={[styles.pinBadgeCompact, { backgroundColor: `${colors.textSecondary}15`, borderColor: `${colors.textSecondary}30` }]}>
              <Text style={[styles.pinBadgeTextCompact, { color: colors.textSecondary }]}>
                ⏱️ {item.timePerQuestion === 0 ? 'Sin límite' : `${item.timePerQuestion || 15}s`}
              </Text>
            </View>
          </View>

          {item.description ? (
            <Text style={[styles.categorySubtitleText, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.categoryAdminBottomRow}>
        <TouchableOpacity
          style={[styles.rankingBtnCompact, { backgroundColor: `${colors.primary}14`, borderColor: colors.primary }]}
          onPress={() => handleOpenRanking(item)}
          activeOpacity={0.8}
        >
          <Text style={[styles.rankingBtnTextCompact, { color: colors.primary }]}>
            📊 Ranking ({item.questionCount || 0} preg.)
          </Text>
        </TouchableOpacity>

        <View style={styles.cardActionsCompact}>
          <TouchableOpacity style={styles.editBtnCompact} onPress={() => handleEditCategory(item)}>
            <Text style={styles.editBtnTextCompact}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtnCompact} onPress={() => handleDeleteCategory(item)}>
            <Text style={styles.deleteBtnTextCompact}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderQuestionItem = ({ item }) => {
    const catName = typeof item.category === 'object' ? item.category?.name : '';
    const catColor = typeof item.category === 'object' ? item.category?.color : '#6C63FF';
    const letters = ['A', 'B', 'C', 'D'];

    return (
      <View style={[
        styles.questionCardClassic, 
        { 
          backgroundColor: colors.card, 
          borderLeftColor: catColor, 
        }
      ]}>
        <View style={styles.questionCardHeaderRow}>
          <View style={[styles.categoryBadge, { backgroundColor: `${catColor}18`, borderColor: catColor }]}>
            <Text style={[styles.categoryBadgeText, { color: catColor }]}>{catName}</Text>
          </View>

          <View style={styles.cardActionsCompact}>
            <TouchableOpacity style={styles.editBtnCompact} onPress={() => handleEditQuestion(item)}>
              <Text style={styles.editBtnTextCompact}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtnCompact} onPress={() => handleDeleteQuestion(item)}>
              <Text style={styles.deleteBtnTextCompact}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.questionCardTitle, { color: colors.text }]} numberOfLines={2}>
          {item.text}
        </Text>

        <View style={styles.optionsListClassic}>
          {item.options.map((opt, idx) => (
            <Text
              key={idx}
              style={[
                styles.optionPreviewClassic,
                { color: colors.textSecondary },
                idx === item.correctAnswer && styles.optionCorrectClassic,
              ]}
              numberOfLines={1}
            >
              {letters[idx]}. {opt} {idx === item.correctAnswer ? '✓' : ''}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  const filteredUsers = users.filter((u) => {
    const isSuper = u.isSuperAdmin === true || (u.username || '').toLowerCase() === 'superadmin';
    if (isSuper) return false;
    return (u.username || '').toLowerCase().includes(userSearchQuery.toLowerCase());
  });

  const totalTeachers = filteredUsers.filter((u) => u.role === 'admin').length;
  const totalStudents = filteredUsers.filter((u) => u.role !== 'admin').length;

  const renderUserItem = ({ item }) => {
    const isUserAdmin = item.role === 'admin';
    return (
      <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.userCardHeader}>
          <View style={[styles.userAvatarMini, { backgroundColor: isUserAdmin ? '#F59E0B' : colors.primary }]}>
            <Text style={styles.userAvatarText}>
              {(item.username || 'U').substring(0, 2).toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={[styles.userNameText, { color: colors.text }]}>{item.username}</Text>
              <View style={[
                styles.userRoleBadge, 
                { backgroundColor: isUserAdmin ? '#F59E0B20' : '#10B98120', borderColor: isUserAdmin ? '#F59E0B' : '#10B981' }
              ]}>
                <Text style={[styles.userRoleBadgeText, { color: isUserAdmin ? '#D97706' : '#10B981' }]}>
                  {isUserAdmin ? '👑 Docente' : '🎓 Estudiante'}
                </Text>
              </View>
            </View>
            {isUserAdmin && (
              <Text style={[styles.userPinText, { color: colors.textSecondary }]}>
                PIN de Panel: <Text style={{ fontWeight: 'bold', color: colors.text }}>{item.adminPin || '1234'}</Text>
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.deleteUserBtn}
            onPress={() => handleDeleteUser(item)}
          >
            <Text style={styles.deleteUserIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.userCardActions, { borderTopColor: 'rgba(128,128,128,0.1)' }]}>
          <TouchableOpacity
            style={[
              styles.toggleRoleBtn,
              { 
                backgroundColor: isUserAdmin ? '#F59E0B18' : `${colors.primary}18`, 
                borderColor: isUserAdmin ? '#F59E0B' : colors.primary 
              }
            ]}
            onPress={() => handleToggleUserRole(item)}
          >
            <Text style={[styles.toggleRoleBtnText, { color: isUserAdmin ? '#D97706' : colors.primary }]}>
              {isUserAdmin ? '⬇️ Degradar a Estudiante' : '⬆️ Ascender a Docente'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={isSuperAdmin ? '🔧 Administración (SuperAdmin)' : '🔧 Panel Docente'} showBack={true} />

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'categories' && [styles.tabActive, { borderBottomColor: colors.primary }]]}
          onPress={() => setActiveTab('categories')}
        >
          <Text style={[
            styles.tabText, 
            { color: colors.textSecondary },
            activeTab === 'categories' && [styles.tabTextActive, { color: colors.primary }]
          ]}>
            📂 Materias ({categories.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'questions' && [styles.tabActive, { borderBottomColor: colors.primary }]]}
          onPress={() => setActiveTab('questions')}
        >
          <Text style={[
            styles.tabText, 
            { color: colors.textSecondary },
            activeTab === 'questions' && [styles.tabTextActive, { color: colors.primary }]
          ]}>
            ❓ Preguntas ({questions.length})
          </Text>
        </TouchableOpacity>

        {/* 👑 Pestaña de Usuarios: SOLO VISIBLE PARA EL SUPERADMIN */}
        {isSuperAdmin && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && [styles.tabActive, { borderBottomColor: colors.primary }]]}
            onPress={() => {
              setActiveTab('users');
              fetchUsers();
            }}
          >
            <Text style={[
              styles.tabText, 
              { color: colors.textSecondary },
              activeTab === 'users' && [styles.tabTextActive, { color: colors.primary }]
            ]}>
              👥 Usuarios ({filteredUsers.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lista de Contenido por Pestaña */}
      {activeTab === 'categories' || (!isSuperAdmin && activeTab === 'users') ? (
        <FlatList
          data={categories}
          keyExtractor={(item) => item._id}
          renderItem={renderCategoryItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Image
                source={require('../../assets/images/empty_categories.jpg')}
                style={styles.emptyIllustration}
                resizeMode="contain"
              />
              <Text style={[styles.emptyText, { color: colors.text }]}>No hay categorías creadas</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Crea la primera categoría con el botón '+' inferior</Text>
            </View>
          }
        />
      ) : activeTab === 'questions' ? (
        <View style={{ flex: 1 }}>
          {/* Barra de Acciones de Preguntas */}
          <View style={[styles.questionsTopBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Text style={[styles.questionsCountTitle, { color: colors.text }]}>
              {questions.length} preguntas registradas
            </Text>
            <TouchableOpacity
              style={[styles.bulkImportBtn, { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]}
              onPress={() => {
                if (categories.length === 0) {
                  Alert.alert('Aviso', 'Primero debes crear al menos una categoría');
                  return;
                }
                setBulkCategoryId(categories[0]._id);
                setShowBulkModal(true);
              }}
            >
              <Text style={[styles.bulkImportBtnText, { color: colors.primary }]}>📥 Carga Masiva (JSON)</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={questions}
            keyExtractor={(item) => item._id}
            renderItem={renderQuestionItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Image
                  source={require('../../assets/images/empty_questions.jpg')}
                  style={styles.emptyIllustration}
                  resizeMode="contain"
                />
                <Text style={[styles.emptyText, { color: colors.text }]}>No hay preguntas registradas</Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Crea categorías primero, luego agrega preguntas con el botón '+' o con Carga Masiva</Text>
              </View>
            }
          />
        </View>
      ) : isSuperAdmin && activeTab === 'users' ? (
        <View style={{ flex: 1 }}>
          {/* Barra de Estadísticas y Buscador de Usuarios */}
          <View style={[styles.usersTopContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={styles.userStatsRow}>
              <View style={[styles.statChip, { backgroundColor: `${colors.primary}18` }]}>
                <Text style={[styles.statChipText, { color: colors.primary }]}>👥 Total: {filteredUsers.length}</Text>
              </View>
              <View style={[styles.statChip, { backgroundColor: '#F59E0B18' }]}>
                <Text style={[styles.statChipText, { color: '#D97706' }]}>👑 Docentes: {totalTeachers}</Text>
              </View>
              <View style={[styles.statChip, { backgroundColor: '#10B98118' }]}>
                <Text style={[styles.statChipText, { color: '#10B981' }]}>🎓 Alumnos: {totalStudents}</Text>
              </View>
            </View>

            <View style={[styles.userSearchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={{ fontSize: 14 }}>🔍</Text>
              <TextInput
                style={[styles.userSearchInput, { color: colors.text }]}
                placeholder="Buscar usuario o docente..."
                placeholderTextColor={colors.textSecondary}
                value={userSearchQuery}
                onChangeText={setUserSearchQuery}
              />
              {userSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setUserSearchQuery('')}>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {usersLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item._id}
              renderItem={renderUserItem}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: colors.text }]}>No se encontraron usuarios</Text>
                  <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                    {userSearchQuery.length > 0 ? 'No hay coincidencias con la búsqueda' : 'Aún no hay usuarios registrados'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      ) : null}

      {/* Botón flotante + (Solo visible en Categorías y Preguntas) */}
      {activeTab !== 'users' && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={() => {
            if (activeTab === 'categories') {
              setEditingCategory(null);
              setShowCategoryForm(true);
            } else {
              if (categories.length === 0) {
                Alert.alert('Aviso', 'Primero debes crear al menos una categoría');
                return;
              }
              setEditingQuestion(null);
              setShowQuestionForm(true);
            }
          }}
        >
          <Text style={[styles.fabText, { color: colors.primaryText }]}>+</Text>
        </TouchableOpacity>
      )}

      {/* Modales */}
      <CategoryForm
        visible={showCategoryForm}
        onClose={() => {
          setShowCategoryForm(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
        category={editingCategory}
      />

      <QuestionForm
        visible={showQuestionForm}
        onClose={() => {
          setShowQuestionForm(false);
          setEditingQuestion(null);
        }}
        onSave={handleSaveQuestion}
        question={editingQuestion}
        categories={categories}
      />

      {/* Modal de Carga Masiva (JSON) */}
      <Modal visible={showBulkModal} animationType="slide" transparent={true}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.bulkModalCard, { backgroundColor: colors.card }]}>
            <View style={styles.bulkModalHeader}>
              <Text style={[styles.bulkModalTitle, { color: colors.text }]}>📥 Carga Masiva de Preguntas</Text>
              <TouchableOpacity onPress={() => setShowBulkModal(false)} style={styles.closeModalBtn}>
                <Text style={[styles.closeModalText, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <Text style={[styles.bulkSectionLabel, { color: colors.text }]}>1. Selecciona la Materia de Destino:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat._id}
                    style={[
                      styles.categoryPickerChip,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      bulkCategoryId === cat._id && { backgroundColor: `${cat.color || colors.primary}25`, borderColor: cat.color || colors.primary }
                    ]}
                    onPress={() => setBulkCategoryId(cat._id)}
                  >
                    <Text style={styles.chipEmoji}>{cat.icon || '📚'}</Text>
                    <Text style={[styles.chipText, { color: colors.text, fontWeight: bulkCategoryId === cat._id ? 'bold' : 'normal' }]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.bulkJsonHeaderRow}>
                <Text style={[styles.bulkSectionLabel, { color: colors.text, marginBottom: 0 }]}>2. Pega el JSON de Preguntas:</Text>
                <TouchableOpacity
                  onPress={() => {
                    const sample = JSON.stringify([
                      {
                        "text": "¿Cuál es la capital de Francia?",
                        "options": ["Madrid", "París", "Roma", "Berlín"],
                        "correctAnswer": 1
                      },
                      {
                        "text": "¿Cuánto es 7 x 8?",
                        "options": ["54", "56", "62", "48"],
                        "correctAnswer": 1
                      },
                      {
                        "text": "¿Cuál es el planeta más cercano al Sol?",
                        "options": ["Venus", "Marte", "Mercurio", "Júpiter"],
                        "correctAnswer": 2
                      }
                    ], null, 2);
                    setBulkJsonText(sample);
                  }}
                >
                  <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '700' }}>📋 Cargar Plantilla</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[
                  styles.bulkTextInput,
                  { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }
                ]}
                multiline
                numberOfLines={10}
                placeholder='[\n  {\n    "text": "¿Pregunta?",\n    "options": ["A", "B", "C", "D"],\n    "correctAnswer": 0\n  }\n]'
                placeholderTextColor={colors.textSecondary}
                value={bulkJsonText}
                onChangeText={setBulkJsonText}
              />
            </ScrollView>

            <View style={styles.bulkModalFooter}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowBulkModal(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBulkBtn, { backgroundColor: colors.primary }]}
                onPress={handleExecuteBulkImport}
                disabled={bulkLoading}
              >
                {bulkLoading ? (
                  <ActivityIndicator color={colors.primaryText} size="small" />
                ) : (
                  <Text style={[styles.confirmBulkBtnText, { color: colors.primaryText }]}>Importar Preguntas</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Ranking de Alumnos */}
      <Modal visible={rankingModalVisible} animationType="slide" transparent={true}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.rankingModalCard, { backgroundColor: colors.card }]}>
            {/* Header del Modal */}
            <View style={[styles.rankingHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.rankingHeaderTitleContainer}>
                <Text style={styles.rankingCategoryIcon}>{rankingCategory?.icon || '📚'}</Text>
                <View>
                  <Text style={[styles.rankingTitle, { color: colors.text }]}>
                    Ranking: {rankingCategory?.name}
                  </Text>
                  <Text style={[styles.rankingSubtitle, { color: colors.textSecondary }]}>
                    {rankingCategory?.isPublic ? '🌐 Práctica Libre' : `PIN de la Sala: ${rankingCategory?.roomCode || '---'}`}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {rankingData?.ranking && rankingData.ranking.length > 0 && (
                  <TouchableOpacity
                    style={[styles.clearAllRankingBtn, { backgroundColor: '#FF6B6B18', borderColor: '#FF6B6B' }]}
                    onPress={handleClearAllRanking}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.clearAllRankingBtnText}>🧹 Vaciar</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.closeModalBtn}
                  onPress={() => setRankingModalVisible(false)}
                >
                  <Text style={[styles.closeModalText, { color: colors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Barra de Acciones de Exportar Ranking */}
            {rankingData?.ranking && rankingData.ranking.length > 0 && (
              <View style={styles.rankingExportRow}>
                <TouchableOpacity
                  style={[styles.exportRankingBtn, { backgroundColor: '#4ECDC418', borderColor: '#4ECDC4' }]}
                  onPress={handleExportRankingCSV}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.exportRankingBtnText, { color: '#4ECDC4' }]}>📥 Exportar Excel/CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.exportRankingBtn, { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]}
                  onPress={handleCopyRankingText}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.exportRankingBtnText, { color: colors.primary }]}>📋 Copiar Notas</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Contenido del Ranking */}
            {rankingLoading ? (
              <View style={styles.rankingLoadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.rankingLoadingText, { color: colors.textSecondary }]}>Cargando calificaciones...</Text>
              </View>
            ) : !rankingData?.ranking || rankingData.ranking.length === 0 ? (
              <View style={styles.rankingEmptyContainer}>
                <Image
                  source={require('../../assets/images/empty_questions.jpg')}
                  style={styles.rankingEmptyImage}
                  resizeMode="contain"
                />
                <Text style={[styles.rankingEmptyTitle, { color: colors.text }]}>Aún no hay participantes</Text>
                <Text style={[styles.rankingEmptySubtitle, { color: colors.textSecondary }]}>
                  Comparte el PIN <Text style={{ fontWeight: 'bold', color: colors.primary }}>{rankingCategory?.roomCode}</Text> con tus alumnos para que jueguen y aparezcan aquí.
                </Text>
              </View>
            ) : (
              <FlatList
                data={rankingData.ranking}
                keyExtractor={(item, index) => item.historyId || index.toString()}
                contentContainerStyle={styles.rankingList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => {
                  let medal = `#${index + 1}`;
                  if (index === 0) medal = '🥇';
                  else if (index === 1) medal = '🥈';
                  else if (index === 2) medal = '🥉';

                  const isPassed = item.percentage >= 60;

                  return (
                    <View style={[styles.rankingItemCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={styles.rankingMedal}>{medal}</Text>
                      
                      <View style={styles.rankingStudentInfo}>
                        <Text style={[styles.rankingStudentName, { color: colors.text }]}>{item.username}</Text>
                        <Text style={[styles.rankingStudentDate, { color: colors.textSecondary }]}>
                          {item.date ? new Date(item.date).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : ''}
                        </Text>
                      </View>

                      <View style={styles.rankingScoreContainer}>
                        <View style={[styles.rankingScoreBadge, { backgroundColor: isPassed ? '#4ECDC420' : '#FF6B6B20' }]}>
                          <Text style={[styles.rankingScoreText, { color: isPassed ? '#4ECDC4' : '#FF6B6B' }]}>
                            {item.percentage}%
                          </Text>
                        </View>
                        <Text style={styles.rankingLivesText}>
                          {item.lives !== undefined ? (item.lives === 0 ? '💔 0 Vidas' : '❤️'.repeat(Math.max(0, item.lives))) : ''}
                        </Text>
                      </View>

                      {/* Botón para eliminar calificación individual */}
                      <TouchableOpacity
                        style={styles.deleteRankingItemBtn}
                        onPress={() => handleDeleteRankingItem(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.deleteRankingItemBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            )}

            <TouchableOpacity
              style={[styles.closeBottomBtn, { backgroundColor: colors.primary }]}
              onPress={() => setRankingModalVisible(false)}
            >
              <Text style={[styles.closeBottomBtnText, { color: colors.primaryText }]}>Cerrar</Text>
            </TouchableOpacity>
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
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    // Definido dinámicamente
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  tabTextActive: {
    // Definido dinámicamente
  },
  list: {
    padding: Platform.OS === 'web' ? 16 : 10,
    paddingBottom: 100,
    maxWidth: 920,
    width: '100%',
    alignSelf: 'center',
  },
  // Estilos de Tarjetas de Categorías en Admin
  categoryCardAdmin: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryCardAdminMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconCompact: {
    fontSize: 22,
    marginRight: 10,
  },
  cardInfoCompact: {
    flex: 1,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  categoryTitleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'var(--font-display)' : undefined,
  },
  categoryBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  pinBadgeCompact: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  pinBadgeTextCompact: {
    fontSize: 11,
    fontWeight: '700',
  },
  categorySubtitleText: {
    fontSize: 12,
    lineHeight: 16,
  },
  categoryAdminBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  rankingBtnCompact: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  rankingBtnTextCompact: {
    fontSize: 10,
    fontWeight: '700',
  },
  // Estilos de Tarjetas de Preguntas en Admin (Clásico Compacto con opciones A, B, C, D)
  questionCardClassic: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  questionCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardActionsCompact: {
    flexDirection: 'row',
    gap: 4,
  },
  editBtnCompact: {
    padding: 4,
    borderRadius: 5,
    backgroundColor: '#FFF3E0',
  },
  editBtnTextCompact: {
    fontSize: 13,
  },
  deleteBtnCompact: {
    padding: 4,
    borderRadius: 5,
    backgroundColor: '#FFEBEE',
  },
  deleteBtnTextCompact: {
    fontSize: 13,
  },
  questionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 18,
  },
  optionsListClassic: {
    gap: 2,
  },
  optionPreviewClassic: {
    fontSize: 12,
    lineHeight: 16,
  },
  optionCorrectClassic: {
    color: '#4ECDC4',
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  fabText: {
    fontSize: 32,
    fontWeight: '300',
    marginTop: -2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIllustration: {
    width: 200,
    height: 200,
    borderRadius: 20,
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'var(--font-display)' : undefined,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 20,
  },
  // Estilos del Modal de Ranking
  rankingModalCard: {
    width: '100%',
    maxWidth: 480,
    height: Platform.OS === 'web' ? undefined : '82%',
    maxHeight: '88%',
    flexDirection: 'column',
    borderRadius: 20,
    padding: 16,
    boxShadow: '0px 8px 24px rgba(0,0,0,0.15)',
    elevation: 8,
  },
  rankingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  rankingHeaderTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rankingCategoryIcon: {
    fontSize: 32,
  },
  rankingTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  rankingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeModalBtn: {
    padding: 8,
  },
  closeModalText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  rankingLoadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankingLoadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  rankingEmptyContainer: {
    alignItems: 'center',
    padding: 24,
  },
  rankingEmptyImage: {
    width: 140,
    height: 140,
    borderRadius: 16,
    marginBottom: 16,
  },
  rankingEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  rankingEmptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  rankingList: {
    paddingBottom: 16,
    gap: 10,
  },
  rankingItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  rankingMedal: {
    fontSize: 20,
    fontWeight: 'bold',
    width: 28,
    textAlign: 'center',
  },
  rankingStudentInfo: {
    flex: 1,
  },
  rankingStudentName: {
    fontSize: 15,
    fontWeight: '700',
  },
  rankingStudentDate: {
    fontSize: 11,
    marginTop: 2,
  },
  rankingScoreContainer: {
    alignItems: 'flex-end',
  },
  rankingScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 2,
  },
  rankingScoreText: {
    fontSize: 14,
    fontWeight: '800',
  },
  rankingLivesText: {
    fontSize: 11,
  },
  deleteRankingItemBtn: {
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteRankingItemBtnText: {
    fontSize: 16,
  },
  clearAllRankingBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearAllRankingBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  closeBottomBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeBottomBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Estilos de Exportación y Acciones de Ranking
  rankingExportRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  exportRankingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  exportRankingBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Barra Superior de Preguntas
  questionsTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  questionsCountTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  bulkImportBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  bulkImportBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Estilos de Modal de Carga Masiva
  bulkModalCard: {
    width: '100%',
    maxWidth: 520,
    height: Platform.OS === 'web' ? undefined : '85%',
    maxHeight: '90%',
    flexDirection: 'column',
    borderRadius: 20,
    padding: 18,
    boxShadow: '0px 8px 24px rgba(0,0,0,0.15)',
    elevation: 8,
  },
  bulkModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    marginBottom: 12,
  },
  bulkModalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  bulkSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  chipsScroll: {
    marginBottom: 14,
  },
  categoryPickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    marginRight: 8,
  },
  chipEmoji: {
    fontSize: 16,
  },
  chipText: {
    fontSize: 13,
  },
  bulkJsonHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  bulkTextInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    height: 180,
    textAlignVertical: 'top',
  },
  bulkModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  confirmBulkBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBulkBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Estilos de la Pestaña de Usuarios y Docentes
  usersTopContainer: {
    padding: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  userStatsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  userSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    height: 40,
    gap: 8,
  },
  userSearchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  userCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    marginHorizontal: 16,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.04)',
    elevation: 2,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatarMini: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  userNameText: {
    fontSize: 15,
    fontWeight: '700',
  },
  userRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  userRoleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  userPinText: {
    fontSize: 11,
    marginTop: 2,
  },
  deleteUserBtn: {
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteUserIcon: {
    fontSize: 16,
  },
  userCardActions: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  toggleRoleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleRoleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
