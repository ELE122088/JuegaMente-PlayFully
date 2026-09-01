import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform, Image, Modal, ScrollView, TextInput, useWindowDimensions } from 'react-native';
import api, { BASE_URL } from '../services/api';
import { getSocket } from '../services/socket';
import storage from '../services/storage';
import Header from '../components/Header';
import CategoryForm from '../components/CategoryForm';
import QuestionForm from '../components/QuestionForm';
import { useTheme } from '../context/ThemeContext';

export const PRESET_AVATARS = [
  {
    id: 'megamind_baby_gamer',
    name: 'Bebé Gamer',
    localSource: require('../../assets/images/avatars/avatar_megamind_baby_gamer.png'),
    serverPath: '/uploads/avatars/avatar_megamind_baby_gamer.png',
  },
  {
    id: 'megamind_baby_elegante',
    name: 'Bebé con Capa',
    localSource: require('../../assets/images/avatars/avatar_megamind_baby_elegante.png'),
    serverPath: '/uploads/avatars/avatar_megamind_baby_elegante.png',
  },
  {
    id: 'megamind_baby_travieso',
    name: 'Bebé Travieso',
    localSource: require('../../assets/images/avatars/avatar_megamind_baby_travieso.png'),
    serverPath: '/uploads/avatars/avatar_megamind_baby_travieso.png',
  },
  {
    id: 'megamind_college',
    name: 'Universitario',
    localSource: require('../../assets/images/avatars/avatar_megamind_college.png'),
    serverPath: '/uploads/avatars/avatar_megamind_college.png',
  },
  {
    id: 'megamind_sabio',
    name: 'Científico',
    localSource: require('../../assets/images/avatars/avatar_megamind_sabio.png'),
    serverPath: '/uploads/avatars/avatar_megamind_sabio.png',
  },
  {
    id: 'megamind_graduado',
    name: 'Campeón Nº 1',
    localSource: require('../../assets/images/avatars/avatar_megamind_graduado.png'),
    serverPath: '/uploads/avatars/avatar_megamind_graduado.png',
  },
  {
    id: 'cerebrito_gamer',
    name: 'Cerebrito JM',
    localSource: require('../../assets/images/avatars/avatar_cerebrito_gamer.png'),
    serverPath: '/uploads/avatars/avatar_cerebrito_gamer.png',
  },
  {
    id: 'control_neon',
    name: 'Mando Neón',
    localSource: require('../../assets/images/avatars/avatar_control_neon.png'),
    serverPath: '/uploads/avatars/avatar_control_neon.png',
  },
];

export const getAvatarSource = (profileImage) => {
  if (!profileImage) return require('../../assets/images/megamind_sidebar.png');
  const imgStr = String(profileImage).trim();
  const match = PRESET_AVATARS.find((a) => 
    a.serverPath === imgStr || 
    a.id === imgStr || 
    imgStr.includes(a.id) || 
    imgStr.endsWith(a.serverPath)
  );
  if (match) return match.localSource;
  if (imgStr.startsWith('http://') || imgStr.startsWith('https://') || imgStr.startsWith('data:')) {
    return { uri: imgStr };
  }
  const cleanPath = imgStr.startsWith('/') ? imgStr : `/${imgStr}`;
  return { uri: `${BASE_URL}${cleanPath}` };
};

export const getCategorySampleQuestions = (catName = '') => {
  const nameLower = String(catName).toLowerCase();

  if (nameLower.includes('mat') || nameLower.includes('calc') || nameLower.includes('álg') || nameLower.includes('alg') || nameLower.includes('geom')) {
    return [
      {
        text: '¿Cuánto es 12 × 12?',
        options: ['124', '144', '154', '164'],
        correctAnswer: 1,
      },
      {
        text: '¿Cuál es la raíz cuadrada de 81?',
        options: ['7', '8', '9', '10'],
        correctAnswer: 2,
      },
      {
        text: 'Si 2x + 6 = 16, ¿cuál es el valor de x?',
        options: ['3', '5', '7', '8'],
        correctAnswer: 1,
      },
    ];
  }

  if (nameLower.includes('hist') || nameLower.includes('social') || nameLower.includes('civi') || nameLower.includes('geo')) {
    return [
      {
        text: '¿En qué año llegó el ser humano a la Luna?',
        options: ['1959', '1969', '1975', '1982'],
        correctAnswer: 1,
      },
      {
        text: '¿Cuál fue la civilización que construyó Machu Picchu?',
        options: ['Maya', 'Azteca', 'Inca', 'Olmeca'],
        correctAnswer: 2,
      },
      {
        text: '¿En qué año comenzó la Segunda Guerra Mundial?',
        options: ['1914', '1939', '1945', '1950'],
        correctAnswer: 1,
      },
    ];
  }

  if (nameLower.includes('cien') || nameLower.includes('bio') || nameLower.includes('quim') || nameLower.includes('fís') || nameLower.includes('fis') || nameLower.includes('nat')) {
    return [
      {
        text: '¿Cuál es la fórmula química del agua?',
        options: ['CO2', 'NaCl', 'H2O', 'O2'],
        correctAnswer: 2,
      },
      {
        text: '¿Cuál es el órgano principal del sistema circulatorio humano?',
        options: ['Pulmón', 'Hígado', 'Corazón', 'Cerebro'],
        correctAnswer: 2,
      },
      {
        text: '¿Cuál es la velocidad aproximada de la luz en el vacío?',
        options: ['150,000 km/s', '300,000 km/s', '500,000 km/s', '1,000,000 km/s'],
        correctAnswer: 1,
      },
    ];
  }

  if (nameLower.includes('tec') || nameLower.includes('prog') || nameLower.includes('inf') || nameLower.includes('sist') || nameLower.includes('comp') || nameLower.includes('web') || nameLower.includes('red')) {
    return [
      {
        text: '¿Qué significa la sigla HTML?',
        options: ['HyperText Markup Language', 'High Transfer Machine Language', 'Home Tool Multi Language', 'Hyperlink Terminal Module Logic'],
        correctAnswer: 0,
      },
      {
        text: '¿Qué protocolo se utiliza para la transferencia segura en la Web?',
        options: ['FTP', 'HTTP', 'HTTPS', 'SMTP'],
        correctAnswer: 2,
      },
      {
        text: '¿Cuál es el lenguaje estándar para dar estilos visuales en páginas web?',
        options: ['Python', 'CSS', 'SQL', 'C++'],
        correctAnswer: 1,
      },
    ];
  }

  if (nameLower.includes('mús') || nameLower.includes('mus') || nameLower.includes('art') || nameLower.includes('cult')) {
    return [
      {
        text: '¿Cuántas notas musicales básicas existen en la escala diatónica?',
        options: ['5', '6', '7', '8'],
        correctAnswer: 2,
      },
      {
        text: '¿Quién compuso la famosa Quinta Sinfonía?',
        options: ['Mozart', 'Beethoven', 'Bach', 'Chopin'],
        correctAnswer: 1,
      },
      {
        text: '¿Qué instrumento de viento madera tiene boquilla de caña simple?',
        options: ['Flauta traversa', 'Clarinete', 'Trompeta', 'Violín'],
        correctAnswer: 1,
      },
    ];
  }

  // Plantilla general personalizada para cualquier otra materia
  const cleanCat = catName ? ` en ${catName}` : '';
  return [
    {
      text: `¿Cuál es el concepto o principio fundamental${cleanCat}?`,
      options: ['Concepto Básico', 'Concepto Principal (Correcto)', 'Concepto Secundario', 'Distractor'],
      correctAnswer: 1,
    },
    {
      text: `Pregunta de evaluación temática${cleanCat}:`,
      options: ['Opción A', 'Opción B', 'Opción C (Correcta)', 'Opción D'],
      correctAnswer: 2,
    },
    {
      text: `Caso práctico de aplicación${cleanCat}:`,
      options: ['Respuesta Correcta', 'Alternativa 1', 'Alternativa 2', 'Alternativa 3'],
      correctAnswer: 0,
    },
  ];
};

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
    shadowOpacity: Math.min(1, opacity * 2.5),
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
  const [isActive, setIsActive] = useState(false);

  return (
    <TouchableOpacity
      style={[
        style,
        Platform.OS === 'web' && {
          transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease, border-color 0.2s ease, opacity 0.2s ease',
          cursor: disabled ? 'default' : 'pointer',
        },
        isActive && !disabled && {
          transform: [{ translateY: -2 }],
          borderColor: accentColor,
          ...createShadow(accentColor, 4, 0.35, 10, 6),
        },
      ]}
      onPress={onPress}
      onPressIn={() => !disabled && setIsActive(true)}
      onPressOut={() => !disabled && setIsActive(false)}
      disabled={disabled}
      activeOpacity={activeOpacity}
      {...(Platform.OS === 'web' && !disabled
        ? {
            onMouseEnter: () => setIsActive(true),
            onMouseLeave: () => setIsActive(false),
          }
        : {})}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
};

export default function AdminScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const isMobileView = windowWidth < 640;
  const isVerySmall = windowWidth < 390;

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
  const [liveRankingBadge, setLiveRankingBadge] = useState(false);

  // Refs para capturar estado actual dentro del listener de WebSockets sin re-renderizar listeners
  const rankingCategoryRef = useRef(rankingCategory);
  const rankingModalVisibleRef = useRef(rankingModalVisible);

  useEffect(() => {
    rankingCategoryRef.current = rankingCategory;
    rankingModalVisibleRef.current = rankingModalVisible;
  }, [rankingCategory, rankingModalVisible]);

  // Estados para Carga Masiva (JSON)
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [bulkJsonText, setBulkJsonText] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Estados para Gestión de Usuarios / Docentes
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

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

      // ⚡ Actualización automática del Ranking en Tiempo Real
      const handleRankingUpdate = async (data) => {
        console.log('⚡ [Admin WebSocket] Actualización de ranking en tiempo real recibida:', data);
        const currentCat = rankingCategoryRef.current;
        const isVisible = rankingModalVisibleRef.current;

        // Si el modal de ranking está abierto y corresponde a la materia actual
        if (isVisible && currentCat) {
          if (!data?.categoryId || data.categoryId === currentCat._id || data.categoryName === currentCat.name) {
            try {
              const response = await api.get(`/categories/${currentCat._id}/ranking`);
              setRankingData(response.data);
              setLiveRankingBadge(true);
              setTimeout(() => setLiveRankingBadge(false), 4000);
            } catch (err) {
              console.error('Error al actualizar ranking en vivo:', err);
            }
          }
        }
      };

      socket.on('categories:updated', handleCategoriesUpdate);
      socket.on('ranking:updated', handleRankingUpdate);

      return () => {
        socket.off('categories:updated', handleCategoriesUpdate);
        socket.off('ranking:updated', handleRankingUpdate);
      };
    } catch (err) {
      console.warn('No se pudo conectar socket en panel admin:', err);
    }
  }, []);

  const handleOpenRanking = async (category) => {
    setRankingCategory(category);
    setRankingModalVisible(true);

    // ⚡ Carga instantánea de ranking en caché a 0ms
    if (category?._id) {
      try {
        const cachedRank = storage.getItem(`cached_ranking_${category._id}`);
        if (cachedRank) {
          setRankingData(JSON.parse(cachedRank));
          setRankingLoading(false);
        } else {
          setRankingLoading(true);
        }
      } catch (e) {
        setRankingLoading(true);
      }
    } else {
      setRankingLoading(true);
    }

    try {
      const response = await api.get(`/categories/${category._id}/ranking`);
      setRankingData(response.data);
      try {
        storage.setItem(`cached_ranking_${category._id}`, JSON.stringify(response.data));
      } catch (e) {}
    } catch (error) {
      console.error('Error al cargar ranking:', error);
      if (!rankingData) {
        Alert.alert('Error', 'No se pudo cargar el ranking de alumnos');
      }
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

  // Exportar ranking a CSV / Excel
  const handleExportRankingCSV = () => {
    if (!rankingData?.ranking || rankingData.ranking.length === 0) {
      Alert.alert('Aviso', 'No hay datos de ranking para exportar');
      return;
    }

    const headers = ['Puesto', 'Estudiante', 'Aciertos', 'Total', 'Porcentaje', 'Vidas', 'Victorias 100%', 'Fecha y Hora Exacta'];
    const rows = rankingData.ranking.map((item) => [
      `"${item.medal || item.rank || ''}"`,
      `"${(item.username || 'Anonimo').replace(/"/g, '""')}"`,
      item.score,
      item.total,
      `${item.percentage}%`,
      item.lives !== undefined ? item.lives : 'N/A',
      item.perfectCount || 0,
      `"${formatDateTimeWithSeconds(item.date)}"`,
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
    rankingData.ranking.forEach((r) => {
      text += `${r.medal || `#${r.rank}`} | ${r.username} | ${r.percentage}% (${r.score}/${r.total}) | Vidas: ${r.lives} | ⏱️ ${formatDateTimeWithSeconds(r.date)}\n`;
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

  // Abrir modal de carga masiva con validación previa de materias existentes
  const handleOpenBulkModal = () => {
    if (categories.length === 0) {
      const msg = '⚠️ Aún no tienes materias creadas.\n\nPrimero debes crear al menos una materia antes de poder importar preguntas en lote.';
      if (Platform.OS === 'web') {
        const createNow = window.confirm(`${msg}\n\n¿Deseas crear una nueva materia ahora?`);
        if (createNow) {
          setEditingCategory(null);
          setShowCategoryForm(true);
        }
      } else {
        Alert.alert(
          '⚠️ Sin Materias Disponibles',
          msg,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: '➕ Crear Materia',
              onPress: () => {
                setEditingCategory(null);
                setShowCategoryForm(true);
              },
            },
          ]
        );
      }
      return;
    }
    setBulkCategoryId(categories[0]?._id || '');
    setBulkJsonText('');
    setShowBulkModal(true);
  };

  // Abrir modal de nueva pregunta con validación previa de materias existentes
  const handleOpenAddQuestion = () => {
    if (categories.length === 0) {
      const msg = '⚠️ Aún no tienes materias creadas.\n\nPrimero debes crear al menos una materia antes de poder agregar preguntas.';
      if (Platform.OS === 'web') {
        const createNow = window.confirm(`${msg}\n\n¿Deseas crear una nueva materia ahora?`);
        if (createNow) {
          setEditingCategory(null);
          setShowCategoryForm(true);
        }
      } else {
        Alert.alert(
          '⚠️ Sin Materias Disponibles',
          msg,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: '➕ Crear Materia',
              onPress: () => {
                setEditingCategory(null);
                setShowCategoryForm(true);
              },
            },
          ]
        );
      }
      return;
    }
    setEditingQuestion(null);
    setShowQuestionForm(true);
  };

  // Ejecutar carga masiva de preguntas JSON con validación exhaustiva
  const handleExecuteBulkImport = async () => {
    if (!bulkCategoryId) {
      const msg = '⚠️ Por favor, selecciona la materia de destino para las preguntas.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Materia Requerida', msg);
      return;
    }
    if (!bulkJsonText.trim()) {
      const msg = '⚠️ El código JSON está vacío. Puedes hacer clic en "📋 Cargar Plantilla" para insertar la estructura de ejemplo.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('JSON Vacío', msg);
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(bulkJsonText.trim());
    } catch (e) {
      const msg = '⚠️ El formato JSON no es válido. Asegúrate de que las llaves y comillas estén bien cerradas (puedes usar "📋 Cargar Plantilla" como base).';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('JSON Inválido', msg);
      return;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      const msg = '⚠️ El JSON debe ser un arreglo con al menos una pregunta: [ { "text": "...", "options": [...], "correctAnswer": 0 } ]';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Arreglo Requerido', msg);
      return;
    }

    // Validar estructura de cada pregunta en el lote
    for (let i = 0; i < parsed.length; i++) {
      const q = parsed[i];
      if (!q.text || typeof q.text !== 'string' || !q.text.trim()) {
        const msg = `⚠️ La pregunta #${i + 1} no tiene texto válido en el campo "text".`;
        if (Platform.OS === 'web') alert(msg);
        else Alert.alert('Pregunta Incompleta', msg);
        return;
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        const msg = `⚠️ La pregunta #${i + 1} debe contener al menos 2 opciones de respuesta en el arreglo "options".`;
        if (Platform.OS === 'web') alert(msg);
        else Alert.alert('Opciones Inválidas', msg);
        return;
      }
      if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
        const msg = `⚠️ La pregunta #${i + 1} tiene un índice "correctAnswer" inválido (debe ser un número del 0 al ${q.options.length - 1}).`;
        if (Platform.OS === 'web') alert(msg);
        else Alert.alert('Respuesta Correcta Inválida', msg);
        return;
      }
    }

    try {
      setBulkLoading(true);
      const response = await api.post('/questions/bulk', {
        categoryId: bulkCategoryId,
        questions: parsed,
      });

      const successMsg = `✅ ¡Carga Masiva Exitosa!\n\n${response.data.message || `Se importaron ${parsed.length} preguntas correctamente.`}`;
      if (Platform.OS === 'web') alert(successMsg);
      else Alert.alert('✅ ¡Éxito!', successMsg);

      setShowBulkModal(false);
      setBulkJsonText('');
      setBulkCategoryId('');
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error al importar lote de preguntas';
      if (Platform.OS === 'web') alert(`Error: ${msg}`);
      else Alert.alert('Error en Carga Masiva', msg);
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

  const fetchUsers = async (silent = false) => {
    try {
      if (!silent && (!users || users.length === 0)) {
        setUsersLoading(true);
      }
      const res = await api.get('/auth/users');
      setUsers(res.data || []);
    } catch (e) {
      console.warn('Error al cargar usuarios:', e);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleToggleUserRole = async (user) => {
    if (user.isSuperAdmin || (user.username || '').toLowerCase() === 'superadmin') {
      const msg = 'La cuenta principal de SuperAdmin es inmutable y no se puede modificar.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Acción no permitida', msg);
      return;
    }

    const isCurrentlyAdmin = user.role === 'admin';
    const newRole = isCurrentlyAdmin ? 'user' : 'admin';
    const actionText = isCurrentlyAdmin ? 'degradar a Estudiante' : 'ascender a Docente / Administrador';

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
        if (Platform.OS === 'web') {
          alert(`Error: ${msg}`);
        } else {
          Alert.alert('Error', msg);
        }
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
    if (user.isSuperAdmin || (user.username || '').toLowerCase() === 'superadmin') {
      const msg = 'La cuenta principal de SuperAdmin no se puede eliminar.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Acción no permitida', msg);
      return;
    }

    const performDelete = async () => {
      try {
        await api.delete(`/auth/users/${user._id}`);
        fetchUsers();
      } catch (err) {
        const msg = err.response?.data?.message || 'Error al eliminar usuario';
        if (Platform.OS === 'web') {
          alert(`Error: ${msg}`);
        } else {
          Alert.alert('Error', msg);
        }
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
    const associatedQuestions = questions.filter(q => {
      const catId = (q.category && typeof q.category === 'object') ? q.category._id : q.category;
      return String(catId) === String(category._id);
    });
    const questionCount = associatedQuestions.length;

    const performDelete = async () => {
      try {
        await api.delete(`/categories/${category._id}`);
        fetchData();
      } catch (error) {
        const msg = error.response?.data?.message || 'No se pudo eliminar la materia';
        if (Platform.OS === 'web') {
          alert(`Error: ${msg}`);
        } else {
          Alert.alert('Error', msg);
        }
      }
    };

    const confirmMsg = questionCount > 0
      ? `¿Estás seguro de eliminar la materia "${category.name}"?\n\n⚠️ ADVERTENCIA: Esta materia contiene ${questionCount} pregunta(s) asociada(s). Se eliminarán de forma permanente junto con sus estadísticas y rankings.`
      : `¿Estás seguro de eliminar la materia "${category.name}"?`;

    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm(confirmMsg);
      if (confirmDelete) {
        performDelete();
      }
    } else {
      Alert.alert(
        '🗑️ Eliminar Materia',
        confirmMsg,
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

  // ==================== SUBCOMPONENTES INTERACTIVOS CON HOVER GLOW ====================
  const CategoryAdminCardItem = ({ item }) => {
    const [isHovered, setIsHovered] = useState(false);
    const cardColor = item.color || colors.primary;

    return (
      <View
        style={[
          styles.categoryCardAdmin,
          {
            backgroundColor: colors.card,
            borderColor: isHovered ? cardColor : colors.border,
            borderLeftColor: cardColor,
            transform: isHovered ? [{ translateY: -2 }] : [{ translateY: 0 }],
            ...(isHovered
              ? createShadow(cardColor, 6, 0.22, 14, 6)
              : createShadow('#000', 1, 0.04, 3, 2)),
          },
          Platform.OS === 'web' && {
            transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease, border-color 0.2s ease',
          },
        ]}
        {...(Platform.OS === 'web'
          ? {
              onMouseEnter: () => setIsHovered(true),
              onMouseLeave: () => setIsHovered(false),
            }
          : {})}
      >
        <View style={styles.categoryCardAdminMain}>
          <Text style={styles.cardIconCompact}>{item.icon}</Text>
          <View style={styles.cardInfoCompact}>
            {/* Fila 1: Título y Estado Abierto/Cerrado */}
            <View style={styles.categoryTitleRow}>
              <Text style={[styles.categoryTitleText, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>

              {/* Badge de Estado Activo/Bloqueado con 1 toque */}
              <InteractiveActionBtn
                onPress={() => handleToggleCategoryStatus(item)}
                accentColor={item.isActive !== false ? '#4ECDC4' : '#FF6B6B'}
                style={[
                  styles.pinBadgeCompact,
                  {
                    backgroundColor: item.isActive !== false ? '#4ECDC418' : '#FF6B6B18',
                    borderColor: item.isActive !== false ? '#4ECDC4' : '#FF6B6B',
                  },
                ]}
              >
                <Text style={[styles.pinBadgeTextCompact, { color: item.isActive !== false ? '#4ECDC4' : '#FF6B6B' }]}>
                  {item.isActive !== false ? '🟢 Abierto' : '🔴 Cerrado'}
                </Text>
              </InteractiveActionBtn>
            </View>

            {/* Fila 2: Badges de Tipo/PIN, Modo de Juego y Segundero */}
            <View style={styles.categoryBadgesRow}>
              {item.isPublic || !item.roomCode ? (
                <View style={[styles.pinBadgeCompact, { backgroundColor: '#4ECDC418', borderColor: '#4ECDC4' }]}>
                  <Text style={[styles.pinBadgeTextCompact, { color: '#4ECDC4' }]}>🌐 Público</Text>
                </View>
              ) : (
                <View style={[styles.pinBadgeCompact, { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]}>
                  <Text style={[styles.pinBadgeTextCompact, { color: colors.primary }]}>🎯 PIN: {item.roomCode}</Text>
                </View>
              )}

              <View style={[styles.pinBadgeCompact, { backgroundColor: item.gameMode === 'exam' ? '#8B5CF618' : '#10B98118', borderColor: item.gameMode === 'exam' ? '#8B5CF6' : '#10B981' }]}>
                <Text style={[styles.pinBadgeTextCompact, { color: item.gameMode === 'exam' ? '#8B5CF6' : '#10B981' }]}>
                  {item.gameMode === 'exam' ? '📝 Examen' : '💡 Práctica'} ({item.initialLives || (item.gameMode === 'exam' ? 3 : 5)} ❤️)
                </Text>
              </View>

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
          <InteractiveActionBtn
            style={[styles.rankingBtnCompact, { backgroundColor: `${colors.primary}14`, borderColor: colors.primary }]}
            onPress={() => handleOpenRanking(item)}
            accentColor={colors.primary}
          >
            <Text style={[styles.rankingBtnTextCompact, { color: colors.primary }]}>
              📊 Ranking ({item.questionCount || 0} preg.)
            </Text>
          </InteractiveActionBtn>

          <View style={styles.cardActionsCompact}>
            <InteractiveActionBtn style={styles.editBtnCompact} accentColor="#F59E0B" onPress={() => handleEditCategory(item)}>
              <Text style={styles.editBtnTextCompact}>✏️</Text>
            </InteractiveActionBtn>
            <InteractiveActionBtn style={styles.deleteBtnCompact} accentColor="#EF4444" onPress={() => handleDeleteCategory(item)}>
              <Text style={styles.deleteBtnTextCompact}>🗑️</Text>
            </InteractiveActionBtn>
          </View>
        </View>
      </View>
    );
  };

  const QuestionAdminCardItem = ({ item }) => {
    const [isHovered, setIsHovered] = useState(false);
    const catName = typeof item.category === 'object' ? item.category?.name : '';
    const catColor = typeof item.category === 'object' ? item.category?.color : '#6C63FF';
    const letters = ['A', 'B', 'C', 'D'];

    return (
      <View
        style={[
          styles.questionCardClassic,
          {
            backgroundColor: colors.card,
            borderColor: isHovered ? catColor : colors.border,
            borderLeftColor: catColor,
            transform: isHovered ? [{ translateY: -2 }] : [{ translateY: 0 }],
            ...(isHovered
              ? createShadow(catColor, 6, 0.22, 14, 6)
              : createShadow('#000', 1, 0.04, 3, 2)),
          },
          Platform.OS === 'web' && {
            transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease, border-color 0.2s ease',
          },
        ]}
        {...(Platform.OS === 'web'
          ? {
              onMouseEnter: () => setIsHovered(true),
              onMouseLeave: () => setIsHovered(false),
            }
          : {})}
      >
        <View style={styles.questionCardHeaderRow}>
          <View style={[styles.categoryBadge, { backgroundColor: `${catColor}18`, borderColor: catColor }]}>
            <Text style={[styles.categoryBadgeText, { color: catColor }]}>{catName}</Text>
          </View>

          <View style={styles.cardActionsCompact}>
            <InteractiveActionBtn style={styles.editBtnCompact} accentColor="#F59E0B" onPress={() => handleEditQuestion(item)}>
              <Text style={styles.editBtnTextCompact}>✏️</Text>
            </InteractiveActionBtn>
            <InteractiveActionBtn style={styles.deleteBtnCompact} accentColor="#EF4444" onPress={() => handleDeleteQuestion(item)}>
              <Text style={styles.deleteBtnTextCompact}>🗑️</Text>
            </InteractiveActionBtn>
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

  const nonSuperUsers = users.filter((u) => {
    const isSuper = u.isSuperAdmin === true || (u.username || '').toLowerCase() === 'superadmin';
    return !isSuper;
  });

  const totalTeachers = nonSuperUsers.filter((u) => u.role === 'admin').length;
  const totalStudents = nonSuperUsers.filter((u) => u.role !== 'admin').length;

  const filteredUsers = nonSuperUsers.filter((u) => {
    const matchesSearch = (u.username || '').toLowerCase().includes(userSearchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (userRoleFilter === 'admin') return u.role === 'admin';
    if (userRoleFilter === 'user') return u.role !== 'admin';
    return true;
  });

  const UserAdminCardItem = ({ item }) => {
    const [isHovered, setIsHovered] = useState(false);
    const isUserAdmin = item.role === 'admin';
    const userAccent = isUserAdmin ? '#F59E0B' : '#10B981';

    return (
      <View
        style={[
          styles.userCard,
          {
            backgroundColor: colors.card,
            borderColor: isHovered ? userAccent : colors.border,
            borderLeftColor: userAccent,
            transform: isHovered ? [{ translateY: -2 }] : [{ translateY: 0 }],
            ...(isHovered
              ? createShadow(userAccent, 6, 0.22, 14, 6)
              : createShadow('#000', 1, 0.04, 3, 2)),
          },
          Platform.OS === 'web' && {
            transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease, border-color 0.2s ease',
          },
        ]}
        {...(Platform.OS === 'web'
          ? {
              onMouseEnter: () => setIsHovered(true),
              onMouseLeave: () => setIsHovered(false),
            }
          : {})}
      >
        <View style={styles.userCardHeader}>
          {/* Avatar Circular con Insignia Flotante (Opción 2) */}
          <View style={[styles.userAvatarContainer, { borderColor: userAccent }]}>
            <Image 
              source={getAvatarSource(item.profileImage)} 
              style={styles.userAvatarImg} 
              resizeMode="cover" 
            />
            {/* Mini Insignia Flotante de Rol */}
            <View style={[styles.userFloatingBadge, { backgroundColor: isUserAdmin ? '#F59E0B' : '#10B981' }]}>
              <Text style={styles.userFloatingBadgeEmoji}>{isUserAdmin ? '👑' : '🎓'}</Text>
            </View>
          </View>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={[styles.userNameText, { color: colors.text }]}>{item.username}</Text>
              <View
                style={[
                  styles.userRoleBadge,
                  {
                    backgroundColor: isUserAdmin ? '#F59E0B20' : '#10B98120',
                    borderColor: isUserAdmin ? '#F59E0B' : '#10B981',
                  },
                ]}
              >
                <Text style={[styles.userRoleBadgeText, { color: isUserAdmin ? '#D97706' : '#10B981' }]}>
                  {isUserAdmin ? '👑 Docente' : '🎓 Estudiante'}
                </Text>
              </View>
            </View>
            {isUserAdmin ? (
              <Text style={[styles.userPinText, { color: colors.textSecondary }]}>
                PIN de Panel: <Text style={{ fontWeight: 'bold', color: colors.text }}>{item.adminPin || '1234'}</Text>
              </Text>
            ) : (
              <Text style={[styles.userPinText, { color: colors.textSecondary }]}>
                Estudiante de la plataforma
              </Text>
            )}
          </View>

          <InteractiveActionBtn
            style={styles.deleteUserBtn}
            accentColor="#EF4444"
            onPress={() => handleDeleteUser(item)}
          >
            <Text style={styles.deleteUserIcon}>🗑️</Text>
          </InteractiveActionBtn>
        </View>

        <View style={[styles.userCardActions, { borderTopColor: 'rgba(128,128,128,0.1)' }]}>
          <InteractiveActionBtn
            style={[
              styles.toggleRoleBtn,
              {
                backgroundColor: isUserAdmin ? '#F59E0B18' : `${colors.primary}18`,
                borderColor: isUserAdmin ? '#F59E0B' : colors.primary,
              },
            ]}
            accentColor={isUserAdmin ? '#F59E0B' : colors.primary}
            onPress={() => handleToggleUserRole(item)}
          >
            <Text style={[styles.toggleRoleBtnText, { color: isUserAdmin ? '#D97706' : colors.primary }]}>
              {isUserAdmin ? '⬇️ Degradar a Estudiante' : '⬆️ Ascender a Docente'}
            </Text>
          </InteractiveActionBtn>
        </View>
      </View>
    );
  };

  const renderCategoryItem = ({ item }) => <CategoryAdminCardItem item={item} />;
  const renderQuestionItem = ({ item }) => <QuestionAdminCardItem item={item} />;
  const renderUserItem = ({ item }) => <UserAdminCardItem item={item} />;

  if (loading && categories.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header 
        title={isSuperAdmin ? '👑 SuperAdmin' : '👨‍🏫 Panel Docente'} 
        showBack={true} 
      />

      {/* Barra de Pestañas Segmentada (Estilo Cápsula Redondeada) */}
      <View style={[styles.adminTabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.adminTabItem,
            activeTab === 'categories' && [styles.adminTabItemActive, { backgroundColor: colors.primary }]
          ]}
          onPress={() => setActiveTab('categories')}
          activeOpacity={0.75}
        >
          <Text style={styles.adminTabEmoji}>📂</Text>
          <Text 
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              styles.adminTabTitle, 
              { 
                color: activeTab === 'categories' ? '#FFFFFF' : colors.textSecondary,
                fontSize: isVerySmall ? 11 : isMobileView ? 12 : 13.5,
              }
            ]}
          >
            Materias ({categories.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.adminTabItem,
            activeTab === 'questions' && [styles.adminTabItemActive, { backgroundColor: colors.primary }]
          ]}
          onPress={() => setActiveTab('questions')}
          activeOpacity={0.75}
        >
          <Text style={styles.adminTabEmoji}>❓</Text>
          <Text 
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              styles.adminTabTitle, 
              { 
                color: activeTab === 'questions' ? '#FFFFFF' : colors.textSecondary,
                fontSize: isVerySmall ? 11 : isMobileView ? 12 : 13.5,
              }
            ]}
          >
            Preguntas ({questions.length})
          </Text>
        </TouchableOpacity>

        {/* 👑 Pestaña de Usuarios: SOLO VISIBLE PARA EL SUPERADMIN */}
        {isSuperAdmin && (
          <TouchableOpacity
            style={[
              styles.adminTabItem,
              activeTab === 'users' && [styles.adminTabItemActive, { backgroundColor: colors.primary }]
            ]}
            onPress={() => {
              setActiveTab('users');
              fetchUsers(true);
            }}
            activeOpacity={0.75}
          >
            <Text style={styles.adminTabEmoji}>👥</Text>
            <Text 
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.adminTabTitle, 
                { 
                  color: activeTab === 'users' ? '#FFFFFF' : colors.textSecondary,
                  fontSize: isVerySmall ? 11 : isMobileView ? 12 : 13.5,
                }
              ]}
            >
              Usuarios ({filteredUsers.length})
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
        <FlatList
          data={questions}
          keyExtractor={(item) => item._id}
          renderItem={renderQuestionItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={[styles.adminActionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.bulkCardInner}>
                <View style={styles.bulkCardLeft}>
                  <Text style={styles.bulkCardEmoji}>📚</Text>
                  <Text style={[styles.questionsCountTitle, { color: colors.text }]} numberOfLines={1}>
                    <Text style={{ fontWeight: '800' }}>{questions.length}</Text> preguntas registradas
                  </Text>
                </View>
                <InteractiveActionBtn
                  style={[styles.bulkImportBtn, { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]}
                  accentColor={colors.primary}
                  onPress={handleOpenBulkModal}
                >
                  <Text style={[styles.bulkImportBtnText, { color: colors.primary }]}>📥 Carga Masiva</Text>
                </InteractiveActionBtn>
              </View>
            </View>
          }
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
      ) : isSuperAdmin && activeTab === 'users' ? (
        <View style={{ flex: 1 }}>
          {/* Barra de Búsqueda de Usuarios (Estilo Ventana Principal) */}
          <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Buscar usuario o docente..."
              placeholderTextColor={colors.textSecondary}
              value={userSearchQuery}
              onChangeText={setUserSearchQuery}
            />
            {userSearchQuery.length > 0 && (
              <InteractiveActionBtn 
                onPress={() => setUserSearchQuery('')} 
                style={styles.clearSearchBtn} 
                accentColor={colors.primary}
              >
                <Text style={[styles.clearSearchText, { color: colors.textSecondary }]}>✕</Text>
              </InteractiveActionBtn>
            )}
          </View>

          {/* Píldoras de Filtro y Conteo de Usuarios (1 Sola Fila Compacta y Simétrica) */}
          <View style={styles.userPillsRow}>
            {/* Todos */}
            <InteractiveActionBtn
              style={[
                styles.pillBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
                userRoleFilter === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              accentColor={colors.primary}
              onPress={() => setUserRoleFilter('all')}
            >
              <Text style={styles.pillIconEmoji}>👥</Text>
              <Text style={[styles.pillText, { color: userRoleFilter === 'all' ? '#FFFFFF' : colors.text }]} numberOfLines={1}>
                Todos
              </Text>
              <View
                style={[
                  styles.pillCountBubble,
                  {
                    backgroundColor: userRoleFilter === 'all' ? 'rgba(255,255,255,0.25)' : `${colors.textSecondary}15`,
                  }
                ]}
              >
                <Text
                  style={[
                    styles.pillCountText,
                    { color: userRoleFilter === 'all' ? '#FFFFFF' : colors.textSecondary }
                  ]}
                  numberOfLines={1}
                >
                  {nonSuperUsers.length}
                </Text>
              </View>
            </InteractiveActionBtn>

            {/* Docentes */}
            <InteractiveActionBtn
              style={[
                styles.pillBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
                userRoleFilter === 'admin' && { backgroundColor: '#F59E0B', borderColor: '#F59E0B' }
              ]}
              accentColor="#F59E0B"
              onPress={() => setUserRoleFilter(userRoleFilter === 'admin' ? 'all' : 'admin')}
            >
              <Text style={styles.pillIconEmoji}>👑</Text>
              <Text style={[styles.pillText, { color: userRoleFilter === 'admin' ? '#FFFFFF' : colors.text }]} numberOfLines={1}>
                Docentes
              </Text>
              <View
                style={[
                  styles.pillCountBubble,
                  {
                    backgroundColor: userRoleFilter === 'admin' ? 'rgba(255,255,255,0.25)' : '#F59E0B20',
                  }
                ]}
              >
                <Text
                  style={[
                    styles.pillCountText,
                    { color: userRoleFilter === 'admin' ? '#FFFFFF' : '#D97706' }
                  ]}
                  numberOfLines={1}
                >
                  {totalTeachers}
                </Text>
              </View>
            </InteractiveActionBtn>

            {/* Alumnos */}
            <InteractiveActionBtn
              style={[
                styles.pillBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
                userRoleFilter === 'user' && { backgroundColor: '#10B981', borderColor: '#10B981' }
              ]}
              accentColor="#10B981"
              onPress={() => setUserRoleFilter(userRoleFilter === 'user' ? 'all' : 'user')}
            >
              <Text style={styles.pillIconEmoji}>🎓</Text>
              <Text style={[styles.pillText, { color: userRoleFilter === 'user' ? '#FFFFFF' : colors.text }]} numberOfLines={1}>
                Alumnos
              </Text>
              <View
                style={[
                  styles.pillCountBubble,
                  {
                    backgroundColor: userRoleFilter === 'user' ? 'rgba(255,255,255,0.25)' : '#10B98120',
                  }
                ]}
              >
                <Text
                  style={[
                    styles.pillCountText,
                    { color: userRoleFilter === 'user' ? '#FFFFFF' : '#10B981' }
                  ]}
                  numberOfLines={1}
                >
                  {totalStudents}
                </Text>
              </View>
            </InteractiveActionBtn>
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
                    {userSearchQuery.length > 0 ? `No hay coincidencias para "${userSearchQuery}"` : 'Aún no hay usuarios registrados en esta categoría'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      ) : null}

      {/* Botón flotante + (Solo visible en Categorías y Preguntas) */}
      {activeTab !== 'users' && (
        <InteractiveActionBtn
          style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          accentColor={colors.primary}
          onPress={() => {
            if (activeTab === 'categories') {
              setEditingCategory(null);
              setShowCategoryForm(true);
            } else {
              handleOpenAddQuestion();
            }
          }}
        >
          <Text style={[styles.fabText, { color: colors.primaryText }]}>+</Text>
        </InteractiveActionBtn>
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
              <InteractiveActionBtn onPress={() => setShowBulkModal(false)} style={styles.closeModalBtn} accentColor={colors.textSecondary}>
                <Text style={[styles.closeModalText, { color: colors.textSecondary }]}>✕</Text>
              </InteractiveActionBtn>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <Text style={[styles.bulkSectionLabel, { color: colors.text }]}>1. Selecciona la Materia de Destino:</Text>
              <View style={styles.chipsContainer}>
                {categories.map((cat) => {
                  const isSelected = bulkCategoryId === cat._id;
                  const catColor = cat.color || colors.primary;
                  return (
                    <InteractiveActionBtn
                      key={cat._id}
                      style={[
                        styles.categoryPickerChip,
                        { backgroundColor: colors.background, borderColor: colors.border },
                        isSelected && { 
                          backgroundColor: `${catColor}22`, 
                          borderColor: catColor,
                          borderWidth: 2,
                        }
                      ]}
                      accentColor={catColor}
                      onPress={() => {
                        setBulkCategoryId(cat._id);
                      }}
                    >
                      <Text style={styles.chipEmoji}>{cat.icon || '📚'}</Text>
                      <Text style={[styles.chipText, { color: isSelected ? catColor : colors.text, fontWeight: isSelected ? 'bold' : '600' }]}>
                        {cat.name}
                      </Text>
                      {isSelected && (
                        <Text style={{ fontSize: 11, color: catColor, fontWeight: '900', marginLeft: 2 }}>✓</Text>
                      )}
                    </InteractiveActionBtn>
                  );
                })}
              </View>

              <View style={styles.bulkJsonHeaderRow}>
                <Text style={[styles.bulkSectionLabel, { color: colors.text, marginBottom: 0 }]}>2. Pega el JSON de Preguntas:</Text>
                {(() => {
                  const currentBulkCat = categories.find((c) => c._id === bulkCategoryId) || categories[0];
                  return (
                    <InteractiveActionBtn
                      style={{
                        backgroundColor: `${colors.primary}15`,
                        borderColor: `${colors.primary}40`,
                        borderWidth: 1,
                        borderRadius: 8,
                        paddingVertical: 5,
                        paddingHorizontal: 10,
                      }}
                      accentColor={colors.primary}
                      onPress={() => {
                        const targetCat = categories.find((c) => c._id === bulkCategoryId) || categories[0];
                        const sampleQuestions = getCategorySampleQuestions(targetCat?.name);
                        setBulkJsonText(JSON.stringify(sampleQuestions, null, 2));
                      }}
                    >
                      <Text style={{ fontSize: 12.5, color: colors.primary, fontWeight: '800' }}>
                        📋 Cargar Plantilla ({currentBulkCat?.name || 'Materia'})
                      </Text>
                    </InteractiveActionBtn>
                  );
                })()}
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

            <View style={[styles.bulkModalFooter, { borderTopColor: colors.border }]}>
              <InteractiveActionBtn
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                accentColor={colors.textSecondary}
                onPress={() => setShowBulkModal(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
              </InteractiveActionBtn>
              <InteractiveActionBtn
                style={[styles.confirmBulkBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                accentColor={colors.primary}
                onPress={handleExecuteBulkImport}
                disabled={bulkLoading}
              >
                {bulkLoading ? (
                  <ActivityIndicator color={colors.primaryText} size="small" />
                ) : (
                  <Text style={[styles.confirmBulkBtnText, { color: colors.primaryText }]}>Importar Preguntas</Text>
                )}
              </InteractiveActionBtn>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Ranking de Alumnos */}
      <Modal visible={rankingModalVisible} animationType="fade" transparent={true}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.rankingModalCard, { backgroundColor: colors.card }]}>
            {/* Header del Modal */}
            <View style={[styles.rankingHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.rankingHeaderTitleContainer}>
                <Text style={styles.rankingCategoryIcon}>{rankingCategory?.icon || '📚'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rankingTitle, { color: colors.text }]} numberOfLines={1}>
                    Ranking: {rankingCategory?.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#10B981' }}>
                      En Vivo
                    </Text>
                    <Text style={[styles.rankingSubtitle, { color: colors.textSecondary, marginTop: 0 }]}>
                      • {rankingCategory?.isPublic ? '🌐 Práctica Libre' : `PIN: ${rankingCategory?.roomCode || '---'}`}
                    </Text>
                    {liveRankingBadge && (
                      <View style={{ backgroundColor: '#10B98122', borderColor: '#10B981', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#10B981' }}>⚡ Actualizado</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <InteractiveActionBtn
                style={styles.closeModalBtn}
                accentColor={colors.textSecondary}
                onPress={() => setRankingModalVisible(false)}
              >
                <Text style={[styles.closeModalText, { color: colors.textSecondary }]}>✕</Text>
              </InteractiveActionBtn>
            </View>

            {/* Barra de Acciones de Exportar y Vaciar Ranking */}
            {rankingData?.ranking && rankingData.ranking.length > 0 && (
              <View style={styles.rankingExportRow}>
                <InteractiveActionBtn
                  style={[styles.exportRankingBtn, { backgroundColor: '#4ECDC418', borderColor: '#4ECDC4' }]}
                  accentColor="#4ECDC4"
                  onPress={handleExportRankingCSV}
                >
                  <Text style={[styles.exportRankingBtnText, { color: '#4ECDC4' }]}>📥 Exportar CSV</Text>
                </InteractiveActionBtn>
                <InteractiveActionBtn
                  style={[styles.exportRankingBtn, { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]}
                  accentColor={colors.primary}
                  onPress={handleCopyRankingText}
                >
                  <Text style={[styles.exportRankingBtnText, { color: colors.primary }]}>📋 Copiar Notas</Text>
                </InteractiveActionBtn>
                <InteractiveActionBtn
                  style={[styles.exportRankingBtn, { backgroundColor: '#FF6B6B18', borderColor: '#FF6B6B' }]}
                  accentColor="#FF6B6B"
                  onPress={handleClearAllRanking}
                >
                  <Text style={[styles.exportRankingBtnText, { color: '#FF6B6B' }]}>🧹 Vaciar Ranking</Text>
                </InteractiveActionBtn>
              </View>
            )}

            {/* Contenido del Ranking */}
            {rankingLoading && (!rankingData?.ranking || rankingData.ranking.length === 0) ? (
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
                  let medal = item.medal || (index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`);

                  const isPassed = item.percentage >= 60;

                  return (
                    <View style={[styles.rankingItemCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={styles.rankingMedal}>{medal}</Text>
                      
                      <View style={styles.rankingStudentInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.rankingStudentName, { color: colors.text }]}>{item.username}</Text>
                          {item.perfectCount > 1 && (
                            <View style={{ backgroundColor: '#F59E0B20', borderColor: '#F59E0B', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: '#D97706' }}>🔥 {item.perfectCount}x 100%</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.rankingStudentDate, { color: colors.textSecondary }]}>
                          ⏱️ {formatDateTimeWithSeconds(item.date)}
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
                      <InteractiveActionBtn
                        style={styles.deleteRankingItemBtn}
                        accentColor="#EF4444"
                        onPress={() => handleDeleteRankingItem(item)}
                      >
                        <Text style={styles.deleteRankingItemBtnText}>🗑️</Text>
                      </InteractiveActionBtn>
                    </View>
                  );
                }}
              />
            )}

            <InteractiveActionBtn
              style={[styles.closeBottomBtn, { backgroundColor: colors.primary }]}
              accentColor={colors.primary}
              onPress={() => setRankingModalVisible(false)}
            >
              <Text style={[styles.closeBottomBtnText, { color: colors.primaryText }]}>Cerrar</Text>
            </InteractiveActionBtn>
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
  adminTabBar: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    maxWidth: 920,
    alignSelf: Platform.OS === 'web' ? 'center' : 'stretch',
    width: Platform.OS === 'web' ? 'calc(100% - 32px)' : undefined,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.04)' }
      : { elevation: 1 }),
  },
  adminTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 10,
    gap: 5,
    minWidth: 0,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', userSelect: 'none', transition: 'all 0.15s ease' } : {}),
  },
  adminTabItemActive: {
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 6px rgba(0,0,0,0.12)' }
      : { elevation: 2 }),
  },
  adminTabEmoji: {
    fontSize: 14,
  },
  adminTabTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  list: {
    paddingTop: Platform.OS === 'web' ? 12 : 6,
    paddingBottom: 100,
    maxWidth: 920,
    width: '100%',
    alignSelf: 'center',
  },
  // Estilos de Tarjetas de Categorías en Admin
  categoryCardAdmin: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderLeftWidth: 5,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    ...(Platform.OS === 'web' ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.04)' } : {}),
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
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderLeftWidth: 5,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    ...(Platform.OS === 'web' ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.04)' } : {}),
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
    maxWidth: 520,
    height: Platform.OS === 'web' ? undefined : '82%',
    maxHeight: '88%',
    flexDirection: 'column',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
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
  // Estilos de Tarjetas de Acciones y Cabeceras en Admin
  adminActionCard: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    maxWidth: 920,
    alignSelf: Platform.OS === 'web' ? 'center' : 'stretch',
    width: Platform.OS === 'web' ? 'calc(100% - 32px)' : undefined,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.04)' }
      : { elevation: 2 }),
  },
  bulkCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  bulkCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulkCardEmoji: {
    fontSize: 18,
  },
  questionsCountTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bulkImportBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    flexShrink: 0,
  },
  bulkImportBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
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
    borderWidth: 1,
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
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
    maxHeight: 150,
    ...(Platform.OS === 'web' ? { overflowY: 'auto' } : {}),
  },
  categoryPickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', userSelect: 'none', transition: 'all 0.15s ease' } : {}),
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
    marginBottom: 8,
    marginTop: 4,
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
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 16,
    paddingBottom: 4,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBulkBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  confirmBulkBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  // Estilos de Barra de Búsqueda y Píldoras de Usuarios (Idénticos a Pantalla Principal)
  searchContainer: {
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 8,
    marginTop: 4,
    maxWidth: 920,
    alignSelf: 'center',
    width: Platform.OS === 'web' ? 'calc(100% - 32px)' : undefined,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.04)' }
      : { elevation: 2 }),
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    outlineWidth: 0,
    ...(Platform.OS === 'web' ? { outline: 'none', outlineStyle: 'none' } : {}),
  },
  clearSearchBtn: {
    padding: 6,
  },
  clearSearchText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userPillsRow: {
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    maxWidth: 920,
    flexWrap: 'nowrap',
    alignSelf: Platform.OS === 'web' ? 'center' : 'stretch',
    width: Platform.OS === 'web' ? 'calc(100% - 32px)' : undefined,
  },
  pillBtn: {
    flex: 1,
    flexShrink: 1,
    flexBasis: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 3,
    minWidth: 0,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', userSelect: 'none', transition: 'all 0.15s ease', whiteSpace: 'nowrap' } : {}),
  },
  pillIconEmoji: {
    fontSize: 11.5,
    flexShrink: 0,
  },
  pillText: {
    fontSize: 10.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  pillCountBubble: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 1,
    flexShrink: 0,
  },
  pillCountText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  userCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    ...(Platform.OS === 'web' ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.04)' } : {}),
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    backgroundColor: 'rgba(128,128,128,0.1)',
  },
  userAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { objectFit: 'cover' } : {}),
  },
  userFloatingBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 1px 3px rgba(0,0,0,0.3)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 2 }),
  },
  userFloatingBadgeEmoji: {
    fontSize: 10,
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
