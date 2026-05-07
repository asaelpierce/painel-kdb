import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, ListChecks, LineChart as LineChartIcon, FileSpreadsheet, 
  Crown, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle,
  LogOut, Save, Filter, X, MessageSquareText, HelpCircle, ArrowRightCircle, Target,
  PieChart as PieChartIcon, BarChart3, Edit2, Trash2, GitBranch, Calendar, User, PlusCircle, History, Info, ChevronRight, Download, DollarSign
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ComposedChart
} from 'recharts';

// ==========================================
// CONFIGURAÇÃO SUPABASE & VARIÁVEIS GLOBAIS
// ==========================================
const SUPABASE_URL = "https://purxkfbijiigwnujqace.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_5w36tC01sFKqRQj7_fAQrA_IRxCZKCZ"; 

const monthOrder = { 'JAN':1, 'FEV':2, 'MAR':3, 'ABR':4, 'MAI':5, 'JUN':6, 'JUL':7, 'AGO':8, 'SET':9, 'OUT':10, 'NOV':11, 'DEZ':12 };
const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const META_ANUAL_FATURAMENTO = 33500000; // 33.5 Milhões

let globalSupabaseClient = null;

// ==========================================
// FUNÇÕES UTILITÁRIAS BLINDADAS (Valores Reais)
// ==========================================
const formatCurrency = (val) => {
  if (val === undefined || val === null || isNaN(val) || val === '') return '-';
  const num = parseFloat(val);
  const sign = num < 0 ? '-' : '';
  const absNum = Math.abs(num);
  if (absNum >= 1000000) return sign + 'R$ ' + (absNum / 1000000).toFixed(2).replace('.', ',') + 'M';
  if (absNum >= 1000) return sign + 'R$ ' + (absNum / 1000).toFixed(1).replace('.', ',') + 'K';
  return sign + 'R$ ' + absNum.toFixed(2).replace('.', ',');
};

const formatNumber = (val, unit) => {
    if (val === undefined || val === null || isNaN(val) || val === '') return '-';
    if (unit === 'R$') return formatCurrency(val);
    if (unit === '%') return parseFloat(val).toFixed(2).replace('.', ',') + '%';
    return Number.isInteger(parseFloat(val)) ? val : parseFloat(val).toFixed(2).replace('.', ',');
};

const checkOverdue = (dateStr, status) => {
    if (status === 'Concluído') return false;
    if (dateStr.toLowerCase().trim() === 'imediato') return true;
    const parts = dateStr.split('/');
    if(parts.length !== 3) return false;
    const taskDate = new Date(parts[2], parts[1] - 1, parts[0]);
    const today = new Date(); today.setHours(0,0,0,0);
    return taskDate < today;
};

const getStatusColor = (s) => { 
    if (s === 'Urgente') return 'bg-red-600 text-white border-red-600 shadow-red-100'; 
    if (s === 'Em Andamento') return 'bg-blue-600 text-white border-blue-600 shadow-blue-100'; 
    if (s === 'Concluído') return 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-100'; 
    return 'bg-slate-100 text-slate-500 border-slate-200'; 
};

const getHex = (s) => { 
    if (s === 'Urgente') return '#ef4444'; 
    if (s === 'Em Andamento') return '#3b82f6'; 
    if (s === 'Concluído') return '#10b981'; 
    return '#94a3b8'; 
};

const getSubHex = (s) => { 
    if (s === 'Urgente') return 'bg-red-50 text-red-700 border-red-200'; 
    if (s === 'Em Andamento') return 'bg-blue-50 text-blue-700 border-blue-200'; 
    if (s === 'Concluído') return 'bg-emerald-50 text-emerald-700 border-emerald-200'; 
    return 'bg-slate-50 text-slate-600 border-slate-200'; 
};

// ==========================================
// COMPONENTES DE TOOLTIP CUSTOMIZADOS
// ==========================================
const CustomTooltipExcelencia = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 z-50">
                <p className="font-bold text-sm mb-3 text-slate-200 border-b border-slate-700 pb-2">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm font-black flex justify-between gap-4 mb-1" style={{ color: entry.color }}>
                        <span>{entry.name}:</span>
                        <span>{formatNumber(entry.value, '%')}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const CustomTooltipFinanceiro = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 z-50">
                <p className="font-bold text-sm mb-3 text-slate-200 border-b border-slate-700 pb-2">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm font-black flex justify-between gap-4 mb-1" style={{ color: entry.color }}>
                        <span>{entry.name}:</span>
                        <span>{formatCurrency(entry.value)}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const CustomTooltipGeral = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xl z-50 relative">
                <p className="font-bold text-sm text-slate-800 mb-2">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-xs font-bold" style={{color: entry.color}}>
                        {entry.name}: {entry.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const CustomTooltipSparkline = ({ active, payload, label, unit }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 z-50 max-w-md w-max">
                <p className="font-bold text-sm mb-2 text-slate-400 border-b border-slate-700 pb-2 flex items-center gap-2">
                    <Calendar size={14} /> Mês de Referência: {label}
                </p>
                <p className="text-xl font-black text-white mb-1">
                    {formatNumber(data.value, unit)}
                </p>
            </div>
        );
    }
    return null;
};


export default function App() {
  // ==========================================
  // ESTADOS GLOBAIS
  // ==========================================
  const [supabaseClient, setSupabaseClient] = useState(globalSupabaseClient);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('diretoria');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [appLogo, setAppLogo] = useState('https://placehold.co/200x80?text=Painel+Gerencial');

  // Dados do Banco
  const [actions, setActions] = useState([]);
  const [subActions, setSubActions] = useState([]);
  const [dbOwners, setDbOwners] = useState([]);
  const [dbIndicators, setDbIndicators] = useState([]);
  const [dbGoals, setDbGoals] = useState([]);
  const [dbValues, setDbValues] = useState([]);
  const [dbComments, setDbComments] = useState([]);

  // Estados dos Filtros (KPI)
  const [kpiOwnerId, setKpiOwnerId] = useState(1);
  const [kpiEditPeriod, setKpiEditPeriod] = useState(months[new Date().getMonth()]);
  const [kpiViewPeriod, setKpiViewPeriod] = useState('ALL');
  const [kpiViewMode, setKpiViewMode] = useState('MONTHLY');
  const [expandedCardId, setExpandedCardId] = useState(null); // Estado para a Caixinha de Observação
  
  // Estados Formulário Dinâmico de Esforço
  const [formValues, setFormValues] = useState({});
  const [formComments, setFormComments] = useState({});
  const [expandedCommentId, setExpandedCommentId] = useState(null); 

  // Estado para Modal de Comentário (Auditoria)
  const [selectedCommentModal, setSelectedCommentModal] = useState(null);

  // Estados 5W2H
  const [actionFilterArea, setActionFilterArea] = useState('Todas');
  const [actionFilterStatus, setActionFilterStatus] = useState('Todos');
  const [isAddActionModalOpen, setIsAddActionModalOpen] = useState(false);
  const [editingActionId, setEditingActionId] = useState(null);
  const [actionForm, setActionForm] = useState({ what: '', why: '', area: 'Comercial', who: '', when: '' });
  
  // Estados Modais de Reporte (5W2H)
  const [selectedReportAction, setSelectedReportAction] = useState(null);
  const [updateType, setUpdateType] = useState('realizado');
  const [updateText, setUpdateText] = useState('');
  const [subActionForm, setSubActionForm] = useState({ what: '', who: '', when: '' });

  // Login State
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState(false);

  // ==========================================
  // INJEÇÃO SEGURA DO SUPABASE & LOGO
  // ==========================================
  useEffect(() => {
    if (globalSupabaseClient) return;
    if (window.supabase) {
        globalSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        setSupabaseClient(globalSupabaseClient);
    } else {
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
        script.onload = () => {
            globalSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            setSupabaseClient(globalSupabaseClient);
        };
        document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!supabaseClient) return;
    const fetchLogo = async () => {
        try {
            const { data } = await supabaseClient.from('settings').select('logo_base64').eq('id', 1).single();
            if (data && data.logo_base64) setAppLogo(data.logo_base64);
        } catch (e) {}
    };
    fetchLogo();
  }, [supabaseClient]);

  // ==========================================
  // EFEITOS E CARREGAMENTO DE DADOS
  // ==========================================
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    if (!supabaseClient) return;
    setLoading(true);
    try {
      const [actRes, ownRes, indRes, goalRes, valRes, subRes] = await Promise.all([
        supabaseClient.from('actions').select('*, updates(*)').order('created_at', { ascending: false }),
        supabaseClient.from('owners').select('*').order('id'),
        supabaseClient.from('indicators').select('*').order('id'),
        supabaseClient.from('goals').select('*'),
        supabaseClient.from('indicator_values').select('*').order('id'),
        supabaseClient.from('sub_actions').select('*').order('created_at', { ascending: true })
      ]);

      let comRes = { data: [] };
      try { comRes = await supabaseClient.from('indicator_comments').select('*'); } catch (e) { console.warn("Tabela de comentários ausente."); }

      setActions(actRes.data || []);
      setDbOwners(ownRes.data || []);
      setDbIndicators(indRes.data || []);
      setDbGoals(goalRes.data || []);
      setDbValues(valRes.data || []);
      setSubActions(subRes.data || []);
      setDbComments(comRes.data || []);
      
      if (selectedReportAction) {
          const updatedAction = (actRes.data || []).find(a => a.id === selectedReportAction.id);
          if(updatedAction) setSelectedReportAction(updatedAction);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!supabaseClient) {
        setLoginError(true);
        return;
    }
    
    setLoading(true);
    try {
        const { data } = await supabaseClient.from('users').select('*').eq('username', loginUser.trim()).eq('password', loginPass.trim()).single();
        
        if (data) {
          setUser(data);
          setLoginError(false);
          
          if (data.role === 'admin' || data.role === 'dev') {
            setActiveTab('diretoria');
          } else {
            setActiveTab('kpi');
          }

          const upper = data.username.toUpperCase();
          if(upper.includes('RICARDO')) setKpiOwnerId(1);
          else if(upper.includes('EDSON')) setKpiOwnerId(2);
          else if(upper.includes('PCP')) setKpiOwnerId(3);
          else if((upper.includes('DANIEL') && !upper.includes('DANIELA')) || upper.includes('JOSE')) setKpiOwnerId(4);
          else if(upper.includes('DANILO') || upper.includes('SUPPLY')) setKpiOwnerId(5);
          else if(upper.includes('LUCIENE')) setKpiOwnerId(6);
          else if(upper.includes('MARIELE')) setKpiOwnerId(7);
          else if(upper.includes('DANIELA')) setKpiOwnerId(8);
          else setKpiOwnerId(1);

          if (data.role !== 'admin' && data.role !== 'dev' && upper !== 'DANIEL') {
              setActionForm(prev => ({ ...prev, area: data.area }));
              setActionFilterArea(data.area);
          } else if (upper === 'DANIEL') {
              setActionForm(prev => ({ ...prev, area: 'Produção' }));
              setActionFilterArea('Produção');
          }

          loadData();
        } else {
          setLoginError(true);
        }
    } catch (e) {
        setLoginError(true);
    }
    setLoading(false);
  };

  // Preenchimento Automático do Formulário ao trocar de Aba/Dono
  useEffect(() => {
      const newVals = {};
      const newComms = {};
      dbValues.forEach(v => {
          if (v.owner_id === kpiOwnerId && v.period === kpiEditPeriod) {
              newVals[v.indicator_id] = v.value;
          }
      });
      dbComments.forEach(c => {
          if (c.period === kpiEditPeriod) {
              newComms[c.indicator_id] = c.comment;
          }
      });
      
      if (kpiOwnerId === 8 && newVals[56] === undefined) {
          const checkExists = dbValues.find(v => v.indicator_id === 56 && v.period === kpiEditPeriod);
          if (checkExists) newVals[56] = checkExists.value;
      }

      setFormValues(newVals);
      setFormComments(newComms);
      setExpandedCommentId(null);
  }, [kpiOwnerId, kpiEditPeriod, dbValues, dbComments]);

  const needsComment = (id, ownerId, val) => {
    const numVal = parseFloat(val);
    if (isNaN(numVal) || numVal <= 0) return false;
    if (ownerId === 6) return true; 
    if (ownerId === 7) return true; 
    const specificIds = [13, 20, 21, 22, 28, 30, 32, 40, 41, 42, 44, 47, 49, 50, 51, 52, 54, 55];
    return specificIds.includes(id);
  };

  // Lógica de Inputs no Formulário (Autocálculos)
  const handleValueChange = (id, val) => {
      const numVal = parseFloat(val);
      setFormValues(prev => {
          const next = { ...prev, [id]: isNaN(numVal) ? '' : numVal };
          
          if (kpiOwnerId === 1) {
              const v1 = next[1] || 0;
              const v4 = next[4] || 0;
              next[2] = v4 > 0 ? (v1 / v4) : 0;
          }
          if (kpiOwnerId === 3) {
              const v24 = next[24] || 0;
              const v33 = next[33] || 0;
              next[25] = v33 > 0 ? (v24 / v33) : 0;

              const v26 = next[26] || 0;
              const v28 = next[28] || 0;
              next[27] = Math.max(0, v26 - v28);
              next[29] = v26 > 0 ? (next[27] / v26) * 100 : 0;
          }
          if (kpiOwnerId === 4) {
              const pcpId29 = dbValues.find(v => v.indicator_id === 29 && v.period === kpiEditPeriod)?.value || 0;
              next[43] = Math.max(0, 100 - parseFloat(pcpId29));
          }

          return next;
      });
  };

  const handleCommentChange = (id, text) => {
      setFormComments(prev => ({...prev, [id]: text}));
  };

  // ==========================================
  // MOTOR DE CÁLCULO GERAL (Resultados e Dashboard)
  // ==========================================
  const computedData = useMemo(() => {
    let allValues = [...dbValues];

    months.forEach((period) => {
      const getVal = (id, oId) => {
        const rec = allValues.find(v => v.indicator_id === id && v.owner_id === oId && v.period === period);
        if (!rec && id === 56) {
            const fallback = allValues.find(v => v.indicator_id === 56 && v.period === period);
            return fallback ? parseFloat(fallback.value) : 0;
        }
        return rec ? parseFloat(rec.value) : 0;
      };

      const setRes = (id, val, oId) => {
        const idx = allValues.findIndex(v => v.indicator_id === id && v.owner_id === oId && v.period === period);
        if (idx >= 0) allValues[idx].value = val;
        else allValues.push({ indicator_id: id, owner_id: oId, period: period, value: val });
      };

      if (allValues.some(v => v.owner_id === 1 && v.period === period)) {
        const vVendas = getVal(1, 1);
        const qAprovados = getVal(4, 1);
        const qEnviados = getVal(6, 1);
        const vEnviados = getVal(7, 1);
        const vVendidosMes = getVal(8, 1);

        let sumVendas = vVendas, sumAprovados = qAprovados, sumEnviados = qEnviados, sumVEnviados = vEnviados;
        const currentMonthNum = monthOrder[period];
        
        allValues.forEach(v => {
            if (v.owner_id === 1 && monthOrder[v.period] < currentMonthNum) {
                if (v.indicator_id === 1) sumVendas += parseFloat(v.value);
                if (v.indicator_id === 4) sumAprovados += parseFloat(v.value);
                if (v.indicator_id === 6) sumEnviados += parseFloat(v.value);
                if (v.indicator_id === 7) sumVEnviados += parseFloat(v.value);
            }
        });

        setRes(74, sumEnviados > 0 ? (sumAprovados / sumEnviados) * 100 : 0, 1);
        setRes(75, sumVEnviados > 0 ? (sumVendas / sumVEnviados) * 100 : 0, 1); 
        setRes(76, qEnviados > 0 ? (qAprovados / qEnviados) * 100 : 0, 1); 
        setRes(77, vEnviados > 0 ? (vVendas / vEnviados) * 100 : 0, 1); 
        setRes(78, vEnviados > 0 ? (vVendidosMes / vEnviados) * 100 : 0, 1); 
      }

      if (allValues.some(v => v.owner_id === 2 && v.period === period)) {
        const orcElaborados = getVal(12, 2);
        const orcAtraso = getVal(13, 2);
        const retDes = getVal(20, 2), retEst = getVal(21, 2), retProc = getVal(22, 2);
        const desElab = getVal(18, 2), desRev = getVal(19, 2);

        setRes(79, orcElaborados > 0 ? (orcAtraso / orcElaborados) * 100 : 0, 2);
        setRes(80, (desElab + desRev) > 0 ? ((retDes + retEst + retProc) / (desElab + desRev)) * 100 : 0, 2);
      }

      if (allValues.some(v => v.owner_id === 3 && v.period === period)) {
        const pedFaturadosPcp = getVal(33, 3);
        const pedForaPrazoPcp = getVal(35, 3);
        setRes(81, pedFaturadosPcp > 0 ? Math.max(0, ((pedFaturadosPcp - pedForaPrazoPcp) / pedFaturadosPcp) * 100) : 0, 3);
      }

      if (allValues.some(v => v.owner_id === 4 && v.period === period)) {
        const projPrevistos = getVal(36, 4);
        const projAtraso = getVal(41, 4);
        const brsRetrabalho = getVal(44, 4);

        setRes(85, projPrevistos > 0 ? Math.max(0, ((projPrevistos - projAtraso) / projPrevistos) * 100) : 0, 4);
        setRes(86, projPrevistos > 0 ? (brsRetrabalho / projPrevistos) * 100 : 0, 4);
      }

      if (allValues.some(v => v.owner_id === 5 && v.period === period)) {
        const solicCompras = getVal(45, 5), ind = getVal(48, 5);
        const numNaoConf = getVal(55, 5); 
        const ordensCompra = getVal(46, 5), ocSemSol = getVal(52, 5);

        const totalSolicitacoes = solicCompras + ind;
        const compForaPrazo = getVal(50, 5), compErradas = getVal(53, 5);
        const ocValidas = ordensCompra - ocSemSol;

        setRes(83, totalSolicitacoes > 0 ? Math.max(0, ((totalSolicitacoes - (compForaPrazo + compErradas)) / totalSolicitacoes) * 100) : 0, 5);
        setRes(84, ocValidas > 0 ? (numNaoConf / ocValidas) * 100 : 0, 5);
      }

      if (allValues.some(v => v.owner_id === 6 && v.period === period)) {
        const projEmAberto = getVal(26, 3); 
        const reclamacoes = getVal(61, 6);
        setRes(82, projEmAberto > 0 ? (reclamacoes / projEmAberto) * 100 : 0, 6);
      }

      if (allValues.some(v => v.owner_id === 7 && v.period === period)) {
        const diasUteis2026 = { 'JAN': 22, 'FEV': 20, 'MAR': 22, 'ABR': 22, 'MAI': 21, 'JUN': 22, 'JUL': 23, 'AGO': 21, 'SET': 22, 'OUT': 22, 'NOV': 21, 'DEZ': 23 };
        const diasUteis = diasUteis2026[period] || 22;
        const colabAtivos = getVal(64, 7), faltas = getVal(72, 7), atestados = getVal(73, 7);

        let percFaltas = 0, percAtestados = 0;
        if (colabAtivos > 0) {
            percFaltas = (faltas / (diasUteis * colabAtivos)) * 100;
            percAtestados = (atestados / (diasUteis * colabAtivos)) * 100;
        }
        setRes(87, percFaltas, 7);    
        setRes(88, percAtestados, 7); 
        setRes(89, percFaltas + percAtestados, 7);     
      }
    });

    return allValues;
  }, [dbValues]);


  // ==========================================
  // FUNÇÕES 5W2H E AÇÕES
  // ==========================================
  const handleSaveAction = async (e) => {
      e.preventDefault();
      setLoading(true);
      const payload = { ...actionForm };
      
      if(payload.when.toLowerCase().includes('imediato')) {
          payload.status = 'Urgente';
      } else if (!editingActionId) {
          payload.status = 'A Fazer';
      }

      try {
          if (editingActionId) {
              await supabaseClient.from('actions').update(payload).eq('id', editingActionId);
              showToast("Ação editada com sucesso!");
          } else {
              payload.id = Math.random().toString(36).substr(2, 5).toUpperCase();
              await supabaseClient.from('actions').insert([payload]);
              showToast("Nova ação criada!");
          }
          setIsAddActionModalOpen(false);
          loadData();
      } catch (e) {
          showToast("Erro ao gravar ação.", "error");
      }
      setLoading(false);
  };

  const handleDeleteAction = async (id) => {
      if(!window.confirm('Tem certeza que deseja excluir esta ação e todo o seu histórico?')) return;
      try {
          await supabaseClient.from('sub_actions').delete().eq('action_id', id);
          await supabaseClient.from('updates').delete().eq('action_id', id);
          await supabaseClient.from('actions').delete().eq('id', id);
          showToast("Ação excluída com sucesso.");
          if(selectedReportAction && selectedReportAction.id === id) setSelectedReportAction(null);
          loadData();
      } catch (e) {
          showToast("Erro ao excluir.", "error");
      }
  };

  const handleStatusChangeAction = async (id, newStatus, currentArea) => {
      if (user.role !== 'admin' && user.role !== 'dev') {
          const isDaniel = user.username.toUpperCase() === 'DANIEL';
          const allowedAreas = isDaniel ? ['Produção', 'PCP'] : [user.area];
          if (!allowedAreas.includes(currentArea)) {
              showToast("Sem permissão para alterar status desta área.", "error");
              return;
          }
      }
      try {
          await supabaseClient.from('actions').update({ status: newStatus }).eq('id', id);
          showToast("Status alterado!");
          loadData();
      } catch(e) { showToast("Erro.", "error"); }
  };

  const handleAddUpdate = async (e) => {
      e.preventDefault();
      if (!updateText.trim()) return;
      
      const payload = {
          action_id: selectedReportAction.id,
          type: updateType,
          text: updateText.trim(),
          author: user.username,
          date: new Date().toLocaleString('pt-BR')
      };

      try {
          await supabaseClient.from('updates').insert([payload]);
          setUpdateText('');
          showToast("Atualização salva!");
          loadData();
      } catch(e) {
          showToast("Erro ao salvar atualização.", "error");
      }
  };

  const handleAddSubAction = async () => {
      if(!subActionForm.what || !subActionForm.who || !subActionForm.when) {
          showToast("Preencha todos os campos da sub-ação.", "error");
          return;
      }
      const payload = {
          action_id: selectedReportAction.id,
          what: subActionForm.what,
          who: subActionForm.who,
          when: subActionForm.when,
          status: 'A Fazer'
      };
      try {
          await supabaseClient.from('sub_actions').insert([payload]);
          setSubActionForm({what:'', who:'', when:''});
          showToast("Sub-ação adicionada!");
          loadData();
      } catch(e) { showToast("Erro", "error"); }
  };

  const handleSubStatusChange = async (id, newStatus) => {
      try {
          await supabaseClient.from('sub_actions').update({ status: newStatus }).eq('id', id);
          showToast("Status da sub-ação alterado.");
          loadData();
      } catch(e){}
  };

  const handleDeleteSubAction = async (id) => {
      try {
          await supabaseClient.from('sub_actions').delete().eq('id', id);
          showToast("Sub-ação removida.");
          loadData();
      } catch(e){}
  };

  // ==========================================
  // COMPONENTES DE RENDERIZAÇÃO (Telas)
  // ==========================================

  // --- TELA DE LOGIN ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
        <div className="absolute top-6 right-6">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all font-bold backdrop-blur-md border border-white/10">
            <Crown size={18} /> Acesso Restrito
          </button>
        </div>

        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 z-10 relative">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                 <LayoutDashboard className="text-white" size={40} />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Painel KdB</h1>
            <p className="text-slate-500 mt-2 font-medium">Gestão Estratégica e Liderança</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">Utilizador Corporativo</label>
              <input type="text" value={loginUser} onChange={(e)=>setLoginUser(e.target.value)} required className="w-full px-5 py-4 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 bg-slate-50 font-bold transition-all" placeholder="Seu nome" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">Senha de Acesso</label>
              <input type="password" value={loginPass} onChange={(e)=>setLoginPass(e.target.value)} required className="w-full px-5 py-4 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 bg-slate-50 font-bold transition-all" placeholder="••••••••" />
            </div>
            {loginError && <div className="text-red-500 text-sm font-bold text-center p-4 bg-red-50 rounded-xl border border-red-100">Credenciais inválidas. Verifique seu usuário.</div>}
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-black uppercase tracking-wide py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95">
              {loading ? 'Acedendo ao Cofre...' : 'Entrar no Sistema'}
            </button>
          </form>
        </div>
        
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      </div>
    );
  }

  // --- TELA DE DIRETORIA (Dashboard Executivo & Budget) ---
  const renderDiretoria = () => {
    const currentMonthKey = kpiViewPeriod === 'ALL' ? months[new Date().getMonth()] : kpiViewPeriod;
    const mesAtualNum = monthOrder[currentMonthKey] || 1;
    const metaIdeal = (META_ANUAL_FATURAMENTO / 12) * mesAtualNum;

    let computedDataDiretoria = computedData;
    if (kpiViewPeriod !== 'ALL') {
        computedDataDiretoria = computedData.filter(v => monthOrder[v.period] <= monthOrder[kpiViewPeriod]);
    }

    const faturamentoRealizado = computedDataDiretoria.filter(v => v.indicator_id === 24).reduce((acc, curr) => acc + parseFloat(curr.value || 0), 0);
    const faturamentoPrevisto = computedDataDiretoria.filter(v => v.indicator_id === 23).reduce((acc, curr) => acc + parseFloat(curr.value || 0), 0);
    
    const atingimentoMeta = META_ANUAL_FATURAMENTO > 0 ? (faturamentoRealizado / META_ANUAL_FATURAMENTO) * 100 : 0;
    const diferencaMetaIdeal = faturamentoRealizado - metaIdeal;
    const percMetaIdeal = metaIdeal > 0 ? (faturamentoRealizado / metaIdeal) * 100 : 0;

    const faturamentoMensalRealizado = computedData.find(v => v.indicator_id === 24 && v.period === currentMonthKey)?.value || 0;
    const faturamentoMensalPrevisto = computedData.find(v => v.indicator_id === 23 && v.period === currentMonthKey)?.value || 0;

    const getSumByName = (name) => {
        const ind = dbIndicators.find(i => i.name === name);
        if (!ind) return 0;
        return computedDataDiretoria.filter(v => v.indicator_id === ind.id).reduce((acc, curr) => acc + parseFloat(curr.value || 0), 0);
    };

    const vendasRealizadas = getSumByName('Volume de vendas no mês (R$)');
    const volumePropostas = getSumByName('Volume líquido orçamentos enviados (R$)');
    const orcamentosEnviados = getSumByName('Nº de orçamentos enviados');
    const orcamentosAprovados = getSumByName('Nº de orçamentos aprovados');
    const visitas = getSumByName('Nº visitas técnica/comercial');

    const contratoSpotData = [
        { name: 'Contrato', value: getSumByName('Valor pedidos Contrato (R$)') },
        { name: 'Spot', value: getSumByName('Valor pedidos Spot (R$)') }
    ].filter(d => d.value > 0);

    const pgData = [
        { name: 'PG1', value: getSumByName('Nº pedidos PG1') },
        { name: 'PG2', value: getSumByName('Nº pedidos PG2') },
        { name: 'PG3', value: getSumByName('Nº pedidos PG3') },
        { name: 'Serviço', value: getSumByName('Nº pedidos Serviço') }
    ];

    const financeiroData = months.filter(m => kpiViewPeriod === 'ALL' || monthOrder[m] <= monthOrder[kpiViewPeriod]).map(m => {
        const previsto = computedData.find(v => v.indicator_id === 23 && v.period === m)?.value || 0;
        const realizado = computedData.find(v => v.indicator_id === 24 && v.period === m)?.value || 0;
        return { name: m, Previsto: parseFloat(previsto), Realizado: parseFloat(realizado) };
    }).filter(d => d.Previsto > 0 || d.Realizado > 0);

    const getLatestRes = (id) => {
        const vals = computedDataDiretoria.filter(v => v.indicator_id === id && v.value !== undefined && v.value !== null && v.value !== '');
        if(vals.length === 0) return null;
        vals.sort((a,b) => monthOrder[b.period] - monthOrder[a.period]);
        return parseFloat(vals[0].value);
    };

    const calcMedia = (posIds, negIds) => {
        let sum = 0, count = 0;
        posIds.forEach(id => {
            const val = getLatestRes(id);
            if (val !== null) { sum += Math.min(100, Math.max(0, val)); count++; }
        });
        negIds.forEach(id => {
            const val = getLatestRes(id);
            if (val !== null) { sum += Math.min(100, Math.max(0, 100 - val)); count++; }
        });
        return count > 0 ? (sum / count) : 0;
    };

    const saudeData = [
        { subject: 'Comercial', Realizado: calcMedia([74, 75, 76, 77, 78], []), Meta: 100 }, 
        { subject: 'Engenharia', Realizado: calcMedia([], [79, 80]), Meta: 100 }, 
        { subject: 'PCP', Realizado: calcMedia([81], []), Meta: 100 },
        { subject: 'Produção', Realizado: calcMedia([85], [86]), Meta: 100 }, 
        { subject: 'Supply', Realizado: calcMedia([83], [84]), Meta: 100 }, 
        { subject: 'Qualidade', Realizado: calcMedia([], [82]), Meta: 100 }, 
        { subject: 'RH', Realizado: calcMedia([], [87, 88, 89]), Meta: 100 } 
    ];

    const areasParaGrafico = ['Comercial', 'Engenharia', 'PCP', 'Produção', 'Supply', 'Qualidade', 'DP'];
    const stackedData = areasParaGrafico.map(ar => ({
        name: ar,
        Concluído: actions.filter(a => a.area === ar && a.status === 'Concluído').length,
        'Em Andamento': actions.filter(a => a.area === ar && (a.status === 'Em Andamento' || a.status === 'Urgente')).length,
        'A Fazer': actions.filter(a => a.area === ar && a.status === 'A Fazer').length
    }));

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        
        {/* HEADER CONTROLS */}
        <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
             <div className="flex items-center gap-3 ml-4">
                <Crown className="text-amber-500" size={24} />
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Painel de Planejamento (Budget)</h2>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Análise até o mês</label>
                <select className="border-none bg-white text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer shadow-sm" value={kpiViewPeriod} onChange={(e) => setKpiViewPeriod(e.target.value)}>
                    <option value="ALL">Acumulado do Ano (YTD)</option>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>
        </div>

        {/* TOP CARD BUDGET COM PRO-RATA */}
        <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
            <h3 className="text-white text-xl font-black mb-6">Atingimento da Meta Anual (Budget)</h3>
            <div className="relative z-10">
                <div className="flex justify-between text-white text-sm font-bold mb-3">
                    <div>
                        <span className="text-slate-400 block text-[10px] uppercase tracking-widest mb-1">Faturamento Realizado (YTD)</span>
                        <span className="text-3xl text-emerald-400">{formatCurrency(faturamentoRealizado)}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-slate-400 block text-[10px] uppercase tracking-widest mb-1">Meta Anual</span>
                        <span className="text-xl">{formatCurrency(META_ANUAL_FATURAMENTO)}</span>
                    </div>
                </div>
                
                <div className="w-full bg-slate-800 h-6 rounded-full overflow-hidden border border-slate-700 p-0.5">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000 relative flex items-center justify-end pr-2" style={{width: `${Math.max(5, Math.min(100, atingimentoMeta))}%`}}>
                        {atingimentoMeta > 5 && <span className="text-[10px] font-black text-emerald-900">{atingimentoMeta.toFixed(1)}%</span>}
                    </div>
                </div>
                
                <div className="mt-6 pt-5 border-t border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <span className="text-slate-400 block text-[10px] uppercase tracking-widest mb-1">Onde deveríamos estar ({currentMonthKey})</span>
                        <span className="text-xl font-black text-indigo-300">{formatCurrency(metaIdeal)}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-slate-400 block text-[10px] uppercase tracking-widest mb-1">Status vs Planejado (Acumulado)</span>
                        <div className="flex items-center justify-end gap-2">
                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${diferencaMetaIdeal >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                {diferencaMetaIdeal >= 0 ? '+' : ''}{formatCurrency(diferencaMetaIdeal)}
                            </span>
                            <span className={`font-black ${diferencaMetaIdeal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                ({percMetaIdeal.toFixed(1)}% do ideal)
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <Target className="absolute right-5 top-5 w-40 h-40 text-white opacity-5 pointer-events-none" />
        </div>

        {/* FATURAMENTO MENSAL ESPECÍFICO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Faturamento Realizado ({currentMonthKey})</p>
                    <h3 className="text-3xl font-black text-emerald-600">{formatCurrency(faturamentoMensalRealizado)}</h3>
                </div>
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500"><DollarSign size={28} /></div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Faturamento Planejado ({currentMonthKey})</p>
                    <h3 className="text-3xl font-black text-indigo-600">{formatCurrency(faturamentoMensalPrevisto)}</h3>
                </div>
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500"><LineChartIcon size={28} /></div>
            </div>
        </div>

        {/* CARDS COMERCIAIS */}
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest ml-2 mt-8 mb-[-10px]">Destaques da Operação Comercial (YTD)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-indigo-500 uppercase mb-1">Volume de Vendas</p>
                <h3 className="text-xl md:text-2xl font-black text-slate-800 truncate">{formatCurrency(vendasRealizadas)}</h3>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-blue-500 uppercase mb-1">Volume de Propostas</p>
                <h3 className="text-xl md:text-2xl font-black text-slate-800 truncate">{formatCurrency(volumePropostas)}</h3>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                <p className="text-[10px] font-black text-emerald-500 uppercase mb-1">Aprovados vs Orçados</p>
                <h3 className="text-xl md:text-2xl font-black text-slate-800">{orcamentosAprovados} / {orcamentosEnviados} <span className="text-[10px] text-slate-400 font-medium ml-1">QTD</span></h3>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-orange-500 uppercase mb-1">Visitas Realizadas</p>
                <h3 className="text-xl md:text-2xl font-black text-slate-800">{visitas} <span className="text-[10px] text-slate-400 font-medium ml-1">QTD</span></h3>
            </div>
        </div>

        {/* GRÁFICOS DIRETORIA - LINHA 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[450px]">
                <div className="mb-6 flex justify-between items-start">
                    <div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Níveis de Excelência por Setor</h3>
                        <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase">Avaliação Global: Média Realizada vs Meta (100%)</p>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><Target size={24} /></div>
                </div>
                <div className="flex-1 min-h-0 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={saudeData} margin={{top:10, right:10, left:-20, bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val}%`} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} dx={-10} />
                            <Tooltip content={<CustomTooltipExcelencia />} cursor={{fill: '#f8fafc'}} />
                            <Legend wrapperStyle={{fontSize: '11px', fontWeight: 'bold', paddingTop: '10px'}} />
                            <Bar dataKey="Meta" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={30} />
                            <Bar dataKey="Realizado" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[450px]">
                <div className="mb-6 flex justify-between items-start">
                    <div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Desempenho Financeiro (Mês a Mês)</h3>
                        <p className="text-[10px] font-bold text-emerald-600 mt-1 uppercase">Faturamento Realizado vs Planejado</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><TrendingUp size={24} /></div>
                </div>
                <div className="flex-1 min-h-0 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={financeiroData} margin={{top:10, right:10, left:-10, bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold', fill: '#94a3b8'}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val/1000}k`} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} dx={-10} />
                            <Tooltip content={<CustomTooltipFinanceiro />} cursor={{fill: '#f8fafc'}} />
                            <Legend wrapperStyle={{fontSize: '11px', fontWeight: 'bold', paddingTop: '10px'}} />
                            <Bar dataKey="Previsto" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="Realizado" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* GRÁFICOS DIRETORIA - LINHA 2 (NOVOS RICARDO) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[350px]">
                <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Modalidade de Vendas</h3>
                    <p className="text-[10px] font-bold text-orange-500 mt-1 uppercase">Contrato vs Spot (R$)</p>
                </div>
                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={contratoSpotData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                                <Cell fill="#f97316" />
                                <Cell fill="#3b82f6" />
                            </Pie>
                            <Tooltip content={<CustomTooltipFinanceiro />} />
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize: '11px', fontWeight: 'bold'}} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[350px] lg:col-span-2">
                <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Classificação de Pedidos</h3>
                    <p className="text-[10px] font-bold text-indigo-500 mt-1 uppercase">Volume por Categoria PG (Qtd)</p>
                </div>
                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pgData} margin={{top:10, right:10, left:-20, bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold', fill: '#94a3b8'}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} dx={-10} />
                            <Tooltip content={<CustomTooltipGeral />} cursor={{fill: '#f8fafc'}} />
                            <Bar dataKey="value" name="Quantidade" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* 5W2H - Diretoria */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[400px]">
             <div className="mb-6 flex justify-between items-start">
                <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Níveis de Execução (5W2H)</h3>
                    <p className="text-[10px] font-bold text-purple-500 mt-1 uppercase">Ações Lado a Lado por Setor e Status Atual</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-2xl text-purple-600"><ListChecks size={24} /></div>
            </div>
            <div className="flex-1 min-h-0 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stackedData} margin={{top:10, right:10, left:-20, bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold', fill: '#94a3b8'}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} dx={-10} />
                        <Tooltip content={<CustomTooltipGeral />} cursor={{fill: '#f8fafc'}} />
                        <Legend wrapperStyle={{fontSize: '11px', fontWeight: 'bold', paddingTop: '10px'}} />
                        <Bar dataKey="Concluído" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} />
                        <Bar dataKey="Em Andamento" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={20} />
                        <Bar dataKey="A Fazer" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

      </div>
    );
  };

  // --- TELA DE KPI (Inputs e Gráficos Sparkline em Barras/Níveis) ---
  const renderSparklineCard = (item, isResultado) => {
    let displayHist = computedData.filter(v => v.indicator_id === item.id && v.owner_id === kpiOwnerId);
    
    if (kpiViewPeriod !== 'ALL') {
        displayHist = displayHist.filter(h => monthOrder[h.period] <= monthOrder[kpiViewPeriod]);
    }

    displayHist.sort((a, b) => monthOrder[a.period] - monthOrder[b.period]);
    
    if (kpiViewMode === 'ANNUAL') {
        let cumulativeData = [];
        let currentSum = 0;
        displayHist.forEach((h, index) => {
            let val = parseFloat(h.value);
            if (item.unit === '%' || item.unit === 'DIAS') {
                if (item.name.includes('MÉDIA AC') || item.name.includes('TOTAL')) currentSum = val;
                else currentSum = ((currentSum * index) + val) / (index + 1);
            } else if (item.id === 56 || item.name.toLowerCase().includes('estoque')) {
                currentSum = val; 
            } else {
                currentSum += val;
            }
            cumulativeData.push({ period: h.period, value: currentSum });
        });
        displayHist = cumulativeData;
    }

    const goalObj = dbGoals.find(g => g.indicator_id === item.id);
    const metaVal = goalObj ? parseFloat(goalObj.goal_value) : undefined;
    
    let curr = null, prev = null, latestVal = '-', trendHtml = null;
    if (displayHist.length > 0) {
        curr = parseFloat(displayHist[displayHist.length - 1].value);
        if (displayHist.length > 1) prev = parseFloat(displayHist[displayHist.length - 2].value);
        
        latestVal = formatNumber(curr, item.unit);
        
        if (prev !== null && prev !== 0) {
            const diff = curr - prev;
            let perc = (diff / prev) * 100;
            if (perc > 999) perc = 999;
            
            const isPositiveTrend = diff > 0;
            let colorClass = 'text-slate-400';
            
            if (diff !== 0) {
                if (isPositiveTrend) colorClass = item.inverse_goal ? 'text-red-500' : 'text-emerald-500';
                else colorClass = item.inverse_goal ? 'text-emerald-500' : 'text-red-500';
                trendHtml = (
                    <span className={`flex items-center gap-0.5 text-[11px] font-black ${colorClass} bg-slate-50 px-2 py-0.5 rounded-full`} title="Crescimento vs Mês Anterior">
                        {isPositiveTrend ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {Math.abs(perc).toFixed(1)}%
                    </span>
                );
            }
        }
    }

    const graphData = displayHist.slice(-12).map(h => {
        const commentObj = dbComments.find(c => c.indicator_id === item.id && c.period === h.period);
        return {
            name: h.period,
            value: parseFloat(h.value),
            comment: commentObj ? commentObj.comment : null
        };
    });

    const commentsList = graphData.filter(d => d.comment && d.comment.trim() !== '').reverse();
    const hasComments = commentsList.length > 0;

    const colorHex = isResultado ? (item.inverse_goal ? '#ef4444' : '#4f46e5') : '#0ea5e9';
    let currentMetaBadgeVal = metaVal;
    if (kpiViewMode === 'ANNUAL' && metaVal !== undefined && (item.unit === 'R$' || item.unit === 'QTE')) {
        currentMetaBadgeVal = metaVal * displayHist.length; 
    }

    return (
        <div key={item.id} className={`bg-white p-6 rounded-[24px] shadow-sm border ${isResultado ? 'border-indigo-100' : 'border-slate-100'} flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group h-[280px]`}>
            <div className="relative z-10 flex-shrink-0">
                <div className="flex justify-between items-start mb-3 gap-2">
                    <h4 className={`text-xs font-black ${isResultado ? 'text-indigo-500' : 'text-slate-500'} uppercase tracking-widest leading-relaxed w-full`} title={item.name}>{item.name}</h4>
                    <div className="flex items-center gap-2 shrink-0">
                         {hasComments && (
                             <button 
                                 onClick={() => setExpandedCardId(expandedCardId === item.id ? null : item.id)}
                                 className={`p-1.5 rounded-lg transition-colors ${expandedCardId === item.id ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-600 hover:bg-amber-200'} shadow-sm`}
                                 title="Ver Observações"
                             >
                                 <MessageSquareText size={14} />
                             </button>
                         )}
                        {metaVal !== undefined && (
                            <span className="text-[10px] font-black text-white bg-indigo-500 px-2 py-1 rounded uppercase">
                                Meta: {formatNumber(currentMetaBadgeVal, item.unit)}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3 mb-4">
                    <span className={`text-3xl font-black ${isResultado ? 'text-indigo-900' : 'text-slate-800'}`}>{latestVal}</span>
                    {trendHtml}
                </div>
            </div>
            {graphData.length > 0 && (
                <div className="flex-1 w-[100%] relative opacity-80 group-hover:opacity-100 transition-opacity mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={graphData} margin={{top: 5, right: 0, left: 0, bottom: 0}}>
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 9, fontWeight: 'bold', fill: '#94a3b8'}} 
                                dy={5}
                                height={20}
                            />
                            <Tooltip 
                                content={<CustomTooltipSparkline unit={item.unit} />}
                                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                            />
                            <Bar dataKey="value" name="Resultado" fill={colorHex} radius={[4, 4, 0, 0]} maxBarSize={40} />
                            {metaVal !== undefined && kpiViewMode === 'MONTHLY' && (
                                <Line type="step" dataKey={() => metaVal} name="Meta" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* OVERLAY DE OBSERVAÇÕES DENTRO DO CARD */}
            {expandedCardId === item.id && (
                <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-md p-5 flex flex-col rounded-[24px] border border-amber-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-3 border-b border-amber-100 pb-2 shrink-0">
                        <h4 className="text-xs font-black text-amber-700 uppercase flex items-center gap-2">
                            <MessageSquareText size={14} /> Observações ({commentsList.length})
                        </h4>
                        <button onClick={() => setExpandedCardId(null)} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-1 rounded-full transition-colors"><X size={14} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {commentsList.map(c => (
                            <div key={c.name} className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{c.name}</span>
                                    <span className="text-[10px] font-bold text-slate-500">{formatNumber(c.value, item.unit)}</span>
                                </div>
                                <p className="text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">{c.comment}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
  };

  const renderKPI = () => {
    const ownerIndicatorIds = [...new Set(dbValues.filter(v => v.owner_id === kpiOwnerId).map(v => v.indicator_id))];
    const finalIndicators = dbIndicators.filter(i => {
        if (i.category === 'ESFORCO') return ownerIndicatorIds.includes(i.id) || (kpiOwnerId === 8 && i.id === 56);
        if (kpiOwnerId === 1 && i.id >= 74 && i.id <= 78) return true;
        if (kpiOwnerId === 2 && i.id >= 79 && i.id <= 80) return true;
        if (kpiOwnerId === 3 && i.id === 81) return true;
        if (kpiOwnerId === 4 && i.id >= 85 && i.id <= 86) return true;
        if (kpiOwnerId === 5 && i.id >= 83 && i.id <= 84) return true;
        if (kpiOwnerId === 6 && i.id === 82) return true;
        if (kpiOwnerId === 7 && i.id >= 87 && i.id <= 89) return true;
        return false;
    });

    const esforcoList = finalIndicators.filter(i => i.category === 'ESFORCO');
    const resultadoList = finalIndicators.filter(i => i.category === 'RESULTADO');

    const isAutoCalculatedEsforco = [2, 25, 27, 29, 43];

    const handleSaveKPIs = async (e) => {
        e.preventDefault();
        setLoading(true);
        const payload = [];
        const commentsPayload = [];
        let hasError = false;
        
        esforcoList.forEach(ind => {
            const val = formValues[ind.id];
            if (val !== undefined && val !== '') {
                payload.push({ indicator_id: ind.id, owner_id: kpiOwnerId, period: kpiEditPeriod, value: parseFloat(val) });
            }
            
            const isMandatory = needsComment(ind.id, kpiOwnerId, val);
            const comment = formComments[ind.id];
            
            if (isMandatory && (!comment || comment.trim() === '')) {
                hasError = true;
                setExpandedCommentId(ind.id);
            }

            if (comment && comment.trim() !== '') {
                commentsPayload.push({ indicator_id: ind.id, period: kpiEditPeriod, comment });
            }
        });

        if (hasError) {
            showToast('Preencha as observações obrigatórias (sinalizadas a vermelho).', 'error');
            setLoading(false);
            return;
        }

        if(payload.length === 0) {
            showToast('Preencha ao menos um valor.', 'error');
            setLoading(false);
            return;
        }

        try {
            const indIds = payload.map(p => p.indicator_id);
            await supabaseClient.from('indicator_values').delete().eq('owner_id', kpiOwnerId).eq('period', kpiEditPeriod).in('indicator_id', indIds);
            await supabaseClient.from('indicator_values').insert(payload);
            
            if (commentsPayload.length > 0) {
                const cIndIds = commentsPayload.map(c => c.indicator_id);
                await supabaseClient.from('indicator_comments').delete().eq('period', kpiEditPeriod).in('indicator_id', cIndIds);
                await supabaseClient.from('indicator_comments').insert(commentsPayload);
            } else {
                 await supabaseClient.from('indicator_comments').delete().eq('period', kpiEditPeriod);
            }

            showToast(`Dados de ${kpiEditPeriod} guardados com sucesso!`);
            setExpandedCommentId(null);
            loadData();
        } catch (err) {
            showToast('Erro ao salvar no banco de dados.', 'error');
        }
        setLoading(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-md shadow-indigo-200"><LineChartIcon size={24} /></div>
                    {(user.role === 'admin' || user.role === 'dev' || user.username.toUpperCase() === 'DANIEL') ? (
                        <select 
                            className="bg-transparent text-slate-800 text-2xl font-black focus:ring-0 outline-none cursor-pointer"
                            value={kpiOwnerId}
                            onChange={(e) => setKpiOwnerId(parseInt(e.target.value))}
                        >
                            {dbOwners.filter(o => {
                                if(user.username.toUpperCase() === 'DANIEL') return o.id === 3 || o.id === 4;
                                return true;
                            }).map(o => <option key={o.id} value={o.id} className="text-base font-bold">Visão: {o.name}</option>)}
                        </select>
                    ) : (
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{user.area}</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Visão do Setor</p>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-3 bg-indigo-50 p-2 rounded-2xl shadow-sm border border-indigo-100">
                        <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-2">Análise</label>
                        <select className="border-none bg-white px-4 py-2 rounded-xl text-sm font-bold text-indigo-700 outline-none cursor-pointer shadow-sm" value={kpiViewMode} onChange={(e) => setKpiViewMode(e.target.value)}>
                            <option value="MONTHLY">Mensal (Mês a Mês)</option>
                            <option value="ANNUAL">Acumulado Anual (YTD)</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl shadow-sm border border-slate-200">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Até Mês</label>
                        <select className="border-none bg-white px-5 py-2 rounded-xl text-sm font-bold text-slate-700 outline-none cursor-pointer shadow-sm" value={kpiViewPeriod} onChange={(e) => setKpiViewPeriod(e.target.value)}>
                            <option value="ALL">Geral (Mais Recente)</option>
                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-700">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Período de Edição</label>
                        <select className="border-none bg-slate-700 text-white px-5 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer shadow-sm" value={kpiEditPeriod} onChange={(e) => setKpiEditPeriod(e.target.value)}>
                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Indicadores de Resultado (Performance)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {resultadoList.length === 0 && <p className="text-sm text-slate-400 italic col-span-full ml-2">Nenhum resultado de performance encontrado.</p>}
                    {resultadoList.map(ind => renderSparklineCard(ind, true))}
                </div>
            </div>

            <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Métricas Operacionais (Esforço)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {esforcoList.length === 0 && <p className="text-sm text-slate-400 italic col-span-full ml-2">Nenhuma métrica operacional encontrada.</p>}
                    {esforcoList.map(ind => renderSparklineCard(ind, false))}
                </div>
            </div>

            <form onSubmit={handleSaveKPIs} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-3">
                        <FileSpreadsheet className="text-indigo-600" /> Formulário de Lançamento: {kpiEditPeriod}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Lançamento de métricas. Clique no ícone de mensagem para adicionar observações e justificativas.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                    <div className="p-8 bg-indigo-50/20">
                        <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Target size={16} /> Espelho de Resultados
                        </h4>
                        <div className="space-y-3">
                            {resultadoList.length === 0 && <p className="text-sm text-slate-400 italic">Nenhum resultado mapeado.</p>}
                            {resultadoList.map(ind => {
                                const valObj = computedData.find(v => v.indicator_id === ind.id && v.owner_id === kpiOwnerId && v.period === kpiEditPeriod);
                                const valStr = valObj ? valObj.value : '';
                                return (
                                    <div key={ind.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm gap-4">
                                        <div className="flex-1">
                                            <label className="text-xs font-bold text-indigo-800 leading-snug block">{ind.name}</label>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <input type="text" readOnly value={valStr !== '' ? parseFloat(valStr).toFixed(2).replace('.', ',') : ''} className="w-24 text-right bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg p-2 font-black text-sm cursor-not-allowed outline-none" title="Calculado automaticamente pelo sistema" />
                                            <span className="text-[10px] font-black text-slate-400 w-6 text-left uppercase">{ind.unit}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="p-8">
                        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <LineChartIcon size={16} /> Digitação de Esforço
                        </h4>
                        <div className="space-y-4">
                            {esforcoList.length === 0 && <p className="text-sm text-slate-400 italic">Nenhuma métrica atribuída.</p>}
                            {esforcoList.map(ind => {
                                const isAuto = isAutoCalculatedEsforco.includes(ind.id);
                                let displayName = ind.name;
                                if (ind.name === "Não conformidade (%)") displayName = "Nº de Não Conformidades (Qtd)";
                                
                                const currentVal = formValues[ind.id] !== undefined ? formValues[ind.id] : '';
                                const currentComment = formComments[ind.id] || '';
                                const hasComment = currentComment.trim() !== '';
                                const isMandatory = needsComment(ind.id, kpiOwnerId, currentVal);

                                let iconColorClass = 'text-slate-400 bg-slate-50 hover:bg-slate-100 border border-slate-100';
                                if (hasComment) {
                                    iconColorClass = 'text-amber-600 bg-amber-100 hover:bg-amber-200 border border-amber-200 shadow-sm';
                                } else if (isMandatory) {
                                    iconColorClass = 'text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 shadow-sm animate-pulse';
                                }

                                return (
                                    <div key={ind.id} className="flex flex-col border-b border-slate-100 pb-4 gap-2 transition-colors">
                                        <div className="flex items-center justify-between gap-4 group">
                                            <label className="text-xs font-bold text-slate-600 flex-1 group-hover:text-emerald-700 leading-snug">{displayName}</label>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button 
                                                    type="button" 
                                                    onClick={() => setExpandedCommentId(expandedCommentId === ind.id ? null : ind.id)}
                                                    className={`p-2 rounded-xl transition-all ${iconColorClass}`}
                                                    title={hasComment ? "Ver/Editar Observação" : (isMandatory ? "Observação Obrigatória!" : "Adicionar Observação opcional")}
                                                >
                                                    <MessageSquareText size={18} />
                                                </button>
                                                <input 
                                                    type="number" 
                                                    step="any" 
                                                    value={currentVal} 
                                                    onChange={(e) => handleValueChange(ind.id, e.target.value)}
                                                    readOnly={isAuto}
                                                    placeholder="0" 
                                                    className={`w-28 text-right border-2 rounded-xl p-2.5 font-bold text-sm outline-none transition-all shadow-sm ${isAuto ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-800'}`} 
                                                    title={isAuto ? "Valor calculado por fórmula" : "Digite o valor"}
                                                />
                                                <span className="text-[10px] font-black text-slate-400 w-6 text-left uppercase">{ind.name === "Não conformidade (%)" ? 'QTE' : ind.unit}</span>
                                            </div>
                                        </div>
                                        {expandedCommentId === ind.id && (
                                            <div className="w-full mt-2 animate-in slide-in-from-top-2">
                                                <textarea 
                                                    placeholder={kpiOwnerId === 5 ? "Justificativa de Supply (Ex: Matéria prima em falta)" : "Observação (Qual o BR? Cliente? Detalhes...)"} 
                                                    value={formComments[ind.id] || ''}
                                                    onChange={(e) => handleCommentChange(ind.id, e.target.value)}
                                                    className={`w-full ${isMandatory && !hasComment ? 'bg-red-50/50 border-red-200 focus:border-red-400 placeholder:text-red-300' : 'bg-amber-50/50 border-amber-200 focus:border-amber-400 placeholder:text-amber-300'} text-slate-700 text-sm p-3 rounded-xl outline-none shadow-inner resize-none min-h-[60px] transition-colors`}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                        
                        <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end">
                            <button type="submit" disabled={loading} className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all flex items-center gap-3 active:scale-95 uppercase tracking-wider text-sm">
                                {loading ? <ArrowRightCircle className="animate-spin" size={20} /> : <Save size={20} />}
                                Gravar no Banco
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
  };

  // --- TELA DE AUDITORIA ---
  const renderAuditoria = () => {
    const exportToCSV = () => {
        const rows = document.querySelectorAll('#tab-auditoria table tr');
        let csvContent = "";
        rows.forEach(row => {
            const cols = row.querySelectorAll('th, td');
            const rowData = Array.from(cols).map(col => {
                let text = col.innerText.replace(/"/g, '""');
                return `"${text}"`;
            }).join(",");
            csvContent += rowData + "\r\n";
        });
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "auditoria_kdb_completa.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getOwnerName = (indId) => {
        if ([1,2,3,4,5,6,7,8,9,10,11, 74,75,76,77,78, 90,91,92,93,94,95].includes(indId)) return 'Comercial';
        if ([12,13,14,15,16,17,18,19,20,21,22, 79,80].includes(indId)) return 'Engenharia';
        if ([23,24,25,26,27,28,29,30,31,32,33,34,35, 81].includes(indId)) return 'PCP';
        if ([36,37,38,39,40,41,42,43,44, 85,86].includes(indId)) return 'Produção';
        if ([45,46,47,48,49,50,51,52,53,54,55,56, 83,84].includes(indId)) return 'Supply';
        if ([57,58,59,60,61,62,63, 82].includes(indId)) return 'Qualidade';
        if ([64,65,66,67,68,69,70,71,72,73, 87,88,89].includes(indId)) return 'RH';
        if (indId === 56) return 'Estoque';
        return 'Geral';
    };

    return (
        <div id="tab-auditoria" className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 flex flex-col h-[85vh] animate-in fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><FileSpreadsheet size={28} /></div> Auditoria Global
                    </h2>
                    <p className="text-slate-500 text-sm mt-2 font-medium">Base bruta do Banco de Dados. Clique nos valores destacados a amarelo para ler a justificação completa.</p>
                </div>
                <button onClick={exportToCSV} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-md active:scale-95">
                    <Download size={18} /> Baixar Excel (CSV)
                </button>
            </div>
            
            <div className="flex-1 overflow-auto rounded-xl border border-slate-200 shadow-inner bg-slate-50 relative">
                <table className="w-full text-left text-sm whitespace-nowrap audit-table">
                    <thead className="text-slate-500 uppercase font-black text-[10px] tracking-widest bg-white sticky top-0 shadow-sm z-10">
                        <tr>
                            <th className="p-4 border-b border-slate-200 text-center bg-white">ID</th>
                            <th className="p-4 border-b border-slate-200 bg-white">Indicador Mapeado</th>
                            <th className="p-4 border-b border-slate-200 bg-white">Setor</th>
                            <th className="p-4 border-b border-slate-200 bg-white text-center">TIPO</th>
                            <th className="p-4 border-b border-slate-200 bg-indigo-50 text-indigo-700 text-center">META</th>
                            {months.map(m => <th key={m} className="p-4 border-b border-slate-200 text-right bg-slate-50">{m}</th>)}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {[...dbIndicators].sort((a,b)=>a.id-b.id).map(ind => {
                            const isRes = ind.category === 'RESULTADO';
                            const goalObj = dbGoals.find(g => g.indicator_id === ind.id);
                            const metaVal = goalObj ? formatNumber(goalObj.goal_value, ind.unit) : '-';

                            return (
                                <tr key={ind.id} className={`hover:bg-indigo-50/30 transition-colors ${isRes ? 'bg-slate-50/50' : ''}`}>
                                    <td className="p-3 font-black text-slate-400 text-xs text-center border-r border-slate-50">{ind.id}</td>
                                    <td className={`p-3 font-bold text-xs border-r border-slate-50 truncate max-w-[300px] ${isRes ? 'text-indigo-700' : 'text-slate-700'}`}>{ind.name}</td>
                                    <td className="p-3 font-bold text-slate-500 text-[10px] uppercase border-r border-slate-50">{getOwnerName(ind.id)}</td>
                                    <td className={`p-3 font-black text-[9px] text-center uppercase border-r border-slate-50 ${isRes ? 'text-indigo-400 bg-indigo-50/50' : 'text-emerald-400'}`}>{ind.category}</td>
                                    <td className="p-3 font-bold text-slate-800 text-xs text-center border-r border-slate-50 bg-indigo-50/10">{metaVal}</td>
                                    {months.map(m => {
                                        const valObj = computedData.find(v => v.indicator_id === ind.id && v.period === m);
                                        const val = valObj ? valObj.value : undefined;
                                        const commentObj = dbComments.find(c => c.indicator_id === ind.id && c.period === m);
                                        const hasComment = !!commentObj;
                                        
                                        return (
                                            <td 
                                                key={m} 
                                                className={`p-3 text-xs text-right font-medium border-r border-slate-50 ${val === undefined ? 'text-slate-300' : 'text-slate-800 font-bold'} ${hasComment ? 'bg-amber-50/50 cursor-pointer hover:bg-amber-100 transition-colors' : ''}`}
                                                onClick={hasComment ? () => setSelectedCommentModal({
                                                    indicatorName: ind.name,
                                                    sector: getOwnerName(ind.id),
                                                    period: m,
                                                    value: formatNumber(val, ind.unit),
                                                    meta: metaVal,
                                                    comment: commentObj.comment
                                                }) : undefined}
                                            >
                                                <div className="flex items-center justify-end gap-2">
                                                    {hasComment && <MessageSquareText size={14} className="text-amber-500" />}
                                                    <span>{formatNumber(val, ind.unit)}</span>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal de Detalhe do Comentário */}
            {selectedCommentModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedCommentModal(null)}></div>
                    <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 bg-amber-50 flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-amber-200 text-amber-700 rounded-xl"><MessageSquareText size={24} /></div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800">Justificativa Registrada</h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedCommentModal.period}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedCommentModal(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Indicador</p>
                                <p className="text-sm font-bold text-slate-800">{selectedCommentModal.indicatorName}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Setor</p>
                                    <p className="text-sm font-bold text-slate-700">{selectedCommentModal.sector}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Registrado</p>
                                    <p className="text-sm font-black text-indigo-600">{selectedCommentModal.value}</p>
                                </div>
                            </div>
                            <div className="mt-4 border-t border-slate-100 pt-4">
                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Comentário / Observação da Equipe</p>
                                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                                    <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{selectedCommentModal.comment}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
  }

  // --- TELA 5W2H REACT (ECRÃ INTEIRO MODAL) ---
  const render5W2H = () => {
    let filteredActions = actions;
    if (user.role !== 'admin' && user.role !== 'dev') {
        if (user.username.toUpperCase() === 'DANIEL') {
            filteredActions = filteredActions.filter(a => a.area === 'Produção' || a.area === 'PCP');
        } else {
            filteredActions = filteredActions.filter(a => a.area === user.area);
        }
    }
    
    const availableAreas = ['Todas'];
    if (user.role === 'admin' || user.role === 'dev') {
        availableAreas.push('Comercial', 'Produção', 'Estoque', 'Engenharia', 'Supply', 'DP', 'PCP', 'Qualidade');
    } else if (user.username.toUpperCase() === 'DANIEL') {
        availableAreas.push('Produção', 'PCP');
    } else {
        availableAreas.push(user.area);
    }

    if (actionFilterArea !== 'Todas') filteredActions = filteredActions.filter(a => a.area === actionFilterArea);
    if (actionFilterStatus !== 'Todos') filteredActions = filteredActions.filter(a => a.status === actionFilterStatus);

    const total = filteredActions.length || 1;
    const overdue = filteredActions.filter(a => checkOverdue(a.when, a.status)).length;
    const completed = filteredActions.filter(a => a.status === 'Concluído').length;
    const eff = Math.round((completed/total)*100) || 0;

    const sCounts = { 'Urgente': 0, 'A Fazer': 0, 'Em Andamento': 0, 'Concluído': 0 };
    filteredActions.forEach(a => { if(sCounts[a.status] !== undefined) sCounts[a.status]++; });
    const pieData = Object.keys(sCounts).map(k => ({ name: k, value: sCounts[k] }));
    const pieColors = { 'Urgente': '#ef4444', 'A Fazer': '#94a3b8', 'Em Andamento': '#3b82f6', 'Concluído': '#10b981' };

    const aCounts = {};
    filteredActions.forEach(a => { aCounts[a.area] = (aCounts[a.area] || 0) + 1; });
    const barData = Object.entries(aCounts).map(([name, value]) => ({name, value})).sort((a,b) => b.value - a.value);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><ListChecks size={24} /></div>
                    Gestão de Ações (5W2H)
                </h2>
                <button 
                    onClick={() => {
                        setEditingActionId(null);
                        setActionForm({ what: '', why: '', area: availableAreas.length > 1 ? availableAreas[1] : availableAreas[0], who: '', when: '' });
                        setIsAddActionModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                >
                    <PlusCircle size={20} /> Registrar Nova Ação
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Carga Total</p>
                    <h3 className="text-3xl font-black text-slate-900">{filteredActions.length}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-lg shadow-red-50 flex flex-col items-center ring-2 ring-red-50">
                    <p className="text-[9px] font-black text-red-500 uppercase mb-1">Atrasados</p>
                    <h3 className="text-3xl font-black text-red-600">{overdue}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Pendentes</p>
                    <h3 className="text-3xl font-black text-slate-900">{filteredActions.length - completed}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex flex-col items-center">
                    <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Finais</p>
                    <h3 className="text-3xl font-black text-emerald-600">{completed}</h3>
                </div>
                <div className="bg-indigo-600 p-6 rounded-3xl text-white flex flex-col items-center shadow-xl shadow-indigo-100">
                    <p className="text-[9px] font-black opacity-70 uppercase mb-1">Eficiência</p>
                    <h3 className="text-3xl font-black">{eff}%</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[350px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Saúde das Ações</h3>
                        <PieChartIcon className="text-indigo-500" size={20} />
                    </div>
                    <div className="flex-1 relative min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" stroke="none">
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={pieColors[entry.name]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize: '11px', fontWeight: 'bold'}} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[350px] lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Carga por Área</h3>
                        <BarChart3 className="text-indigo-500" size={20} />
                    </div>
                    <div className="flex-1 relative min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold', fill: '#64748b'}} width={100} />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                                <Bar dataKey="value" fill="#6366f1" radius={[0, 8, 8, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-4">
                    <h3 className="font-extrabold text-slate-800 flex items-center gap-3">
                        <ListChecks className="text-indigo-600" size={24} /> Matriz de Acompanhamento
                    </h3>
                    <div className="flex gap-3">
                        {availableAreas.length > 1 && (
                            <select 
                                className="border-2 border-slate-200 bg-white px-4 py-2 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-indigo-500"
                                value={actionFilterArea} onChange={(e) => setActionFilterArea(e.target.value)}
                            >
                                {availableAreas.map(a => <option key={a} value={a}>{a === 'Todas' ? 'Todas Áreas' : a}</option>)}
                            </select>
                        )}
                        <select 
                            className="border-2 border-slate-200 bg-white px-4 py-2 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-indigo-500"
                            value={actionFilterStatus} onChange={(e) => setActionFilterStatus(e.target.value)}
                        >
                            <option value="Todos">Todos os Status</option>
                            <option value="Urgente">Urgente</option>
                            <option value="A Fazer">A Fazer</option>
                            <option value="Em Andamento">Em Andamento</option>
                            <option value="Concluído">Concluído</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white text-slate-400 uppercase font-bold text-[11px] border-b border-slate-100">
                            <tr><th className="p-6">Ref</th><th>Área / Dono</th><th>Ação Estratégica</th><th>Causa Raiz</th><th>Prazo</th><th>Status</th><th className="text-center">Gerir</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                            {filteredActions.length === 0 && <tr><td colSpan="7" className="p-10 text-center text-slate-400 italic">Nenhuma ação encontrada.</td></tr>}
                            {filteredActions.map(a => {
                                const isOverdue = checkOverdue(a.when, a.status);
                                const mySubs = subActions.filter(s => s.action_id === a.id);
                                return (
                                    <tr key={a.id} className={`hover:bg-slate-50 transition-colors group ${isOverdue ? 'bg-red-50/30' : ''}`}>
                                        <td className="p-6 font-bold text-slate-300 text-xs">#{a.id}</td>
                                        <td className="py-6">
                                            <div className="font-bold text-slate-800">{a.area}</div>
                                            <div className="text-[9px] uppercase font-black text-slate-400">{a.who}</div>
                                        </td>
                                        <td className="py-6 max-w-sm pr-4">
                                            <div className="font-bold text-slate-700 leading-tight">{a.what}</div>
                                            {mySubs.length > 0 && (
                                                <div className="mt-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-flex items-center gap-1 border border-indigo-100">
                                                    <GitBranch size={12} /> {mySubs.length} Sub-ação(ões) ({mySubs.filter(x=>x.status==='Concluído').length} fin.)
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-6 min-w-[280px] max-w-md pr-6">
                                            <div className="text-xs italic text-slate-500 leading-relaxed flex items-start gap-1.5">
                                                <Info size={16} className="mt-0.5 shrink-0 text-slate-400" />
                                                <span>{a.why}</span>
                                            </div>
                                        </td>
                                        <td className="py-6 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-bold text-slate-600">{a.when}</span>
                                                {isOverdue && <span className="text-[8px] font-black text-red-600 uppercase bg-red-100 px-1.5 py-0.5 rounded-full w-fit">Atrasado</span>}
                                            </div>
                                        </td>
                                        <td className="py-6">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${getStatusColor(a.status)} uppercase`}>{a.status}</span>
                                        </td>
                                        <td className="py-6 text-center">
                                            <button 
                                                onClick={() => setSelectedReportAction(a)}
                                                className="inline-flex p-3 bg-white border-2 border-slate-100 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <ChevronRight size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Modal Add/Edit Ação */}
            {isAddActionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setIsAddActionModalOpen(false)}></div>
                    <div className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl p-10 m-4 flex flex-col fade-in max-h-[90vh] overflow-y-auto">
                        <h2 className="text-3xl font-black mb-8 flex items-center gap-3 text-slate-900 tracking-tight">
                            {editingActionId ? <Edit2 className="text-blue-500" size={40} /> : <PlusCircle className="text-emerald-500" size={40} />}
                            {editingActionId ? 'Editar Ação 5W2H' : 'Nova Ação 5W2H'}
                        </h2>
                        <form onSubmit={handleSaveAction} className="space-y-6">
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">O Quê? (Ação Estratégica)</label>
                                <input type="text" required value={actionForm.what} onChange={e=>setActionForm({...actionForm, what: e.target.value})} className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-indigo-500 bg-slate-50 transition-all font-medium" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Por Quê? (Causa Raiz)</label>
                                <input type="text" required value={actionForm.why} onChange={e=>setActionForm({...actionForm, why: e.target.value})} className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-indigo-500 bg-slate-50 transition-all font-medium" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Área</label>
                                    <select required value={actionForm.area} onChange={e=>setActionForm({...actionForm, area: e.target.value})} className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none bg-slate-50 cursor-pointer font-bold text-slate-700">
                                        {availableAreas.filter(a => a !== 'Todas').map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Quem? (Responsável)</label>
                                    <input type="text" required value={actionForm.who} onChange={e=>setActionForm({...actionForm, who: e.target.value})} className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-indigo-500 bg-slate-50 transition-all font-medium" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Quando? (Prazo Limite)</label>
                                <input type="text" required placeholder="Ex: 30/05/2026 ou Imediato" value={actionForm.when} onChange={e=>setActionForm({...actionForm, when: e.target.value})} className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-indigo-500 bg-slate-50 transition-all font-medium" />
                            </div>
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setIsAddActionModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-5 rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
                                <button type="submit" disabled={loading} className="flex-[2] bg-indigo-600 text-white font-bold py-5 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95">Registrar no Banco</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Reporte Full Screen */}
            {selectedReportAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setSelectedReportAction(null)}></div>
                    <div className="relative w-full max-w-6xl bg-white h-full max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        
                        {/* HEADER */}
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start shrink-0">
                            <div className="flex-1 pr-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-[10px] font-black px-3 py-1 bg-indigo-600 rounded-full text-white uppercase tracking-widest">Ref #{selectedReportAction.id}</span>
                                    <span className="text-[10px] font-black px-3 py-1 bg-slate-200 rounded-full text-slate-600 uppercase tracking-widest">{selectedReportAction.area}</span>
                                    
                                    {(user.role === 'admin' || user.role === 'dev' || user.username.toUpperCase() === 'DANIEL') && (
                                        <div className="flex gap-2 ml-4 border-l border-slate-300 pl-4">
                                            <button onClick={() => {
                                                setEditingActionId(selectedReportAction.id);
                                                setActionForm({ what: selectedReportAction.what, why: selectedReportAction.why, area: selectedReportAction.area, who: selectedReportAction.who, when: selectedReportAction.when });
                                                setSelectedReportAction(null);
                                                setIsAddActionModalOpen(true);
                                            }} className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 text-xs font-bold"><Edit2 size={14} /> Editar</button>
                                            <button onClick={() => handleDeleteAction(selectedReportAction.id)} className="text-red-600 hover:text-red-800 transition-colors flex items-center gap-1 text-xs font-bold"><Trash2 size={14} /> Excluir</button>
                                        </div>
                                    )}
                                </div>
                                <h2 className="font-extrabold text-2xl md:text-3xl text-slate-900 leading-tight">{selectedReportAction.what}</h2>
                            </div>
                            <button onClick={() => setSelectedReportAction(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors shrink-0"><X size={24} /></button>
                        </div>
                        
                        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
                            {/* LEFT COLUMN - CAUSE & HISTORY */}
                            <div className="flex-[3] border-r border-slate-200 flex flex-col min-h-0 bg-white">
                                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
                                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-sm flex gap-3 shadow-sm flex-1">
                                        <HelpCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <span className="block font-bold text-amber-800 uppercase text-[10px] mb-1">Causa Raiz Identificada</span>
                                            <span className="text-amber-900 italic font-medium leading-relaxed">{selectedReportAction.why}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Estado Atual</span>
                                        <select 
                                            className="font-bold text-sm rounded-xl px-4 py-3 border-2 border-transparent outline-none cursor-pointer text-white shadow-md"
                                            style={{backgroundColor: getHex(selectedReportAction.status)}}
                                            value={selectedReportAction.status}
                                            onChange={(e) => handleStatusChangeAction(selectedReportAction.id, e.target.value, selectedReportAction.area)}
                                        >
                                            <option value="Urgente" style={{backgroundColor:'white', color:'black'}}>🔴 Urgente</option>
                                            <option value="A Fazer" style={{backgroundColor:'white', color:'black'}}>⚪ A Fazer</option>
                                            <option value="Em Andamento" style={{backgroundColor:'white', color:'black'}}>🔵 Em Andamento</option>
                                            <option value="Concluído" style={{backgroundColor:'white', color:'black'}}>🟢 Concluído</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="flex-1 p-6 overflow-y-auto bg-slate-50/30">
                                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6 flex items-center gap-2">
                                        <History className="text-indigo-500" size={18} /> Diário de Bordo (Histórico)
                                    </h3>
                                    <div className="space-y-6">
                                        {(!selectedReportAction.updates || selectedReportAction.updates.length === 0) && (
                                            <div className="text-center py-16 opacity-40"><History size={48} className="mx-auto mb-3" /><p className="text-sm font-bold uppercase">Sem registros ainda</p></div>
                                        )}
                                        {[...(selectedReportAction.updates || [])].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map(u => (
                                            <div key={u.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative">
                                                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                                                    <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest ${u.type === 'realizado' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                                        {u.type.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-400">{u.date}</span>
                                                </div>
                                                <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{u.text}</p>
                                                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">{u.author ? u.author[0] : 'U'}</div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">{u.author || 'Usuário'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6 border-t border-slate-200 bg-white shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.02)]">
                                    <form onSubmit={handleAddUpdate} className="space-y-4">
                                        <div className="flex gap-3">
                                            <label className={`flex-1 flex items-center justify-center gap-2 py-3 border-2 rounded-xl cursor-pointer text-xs font-black uppercase transition-all shadow-sm ${updateType === 'realizado' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
                                                <input type="radio" className="hidden" checked={updateType === 'realizado'} onChange={()=>setUpdateType('realizado')} /> <CheckCircle2 size={16}/> Ação Feita
                                            </label>
                                            <label className={`flex-1 flex items-center justify-center gap-2 py-3 border-2 rounded-xl cursor-pointer text-xs font-black uppercase transition-all shadow-sm ${updateType === 'proximo_passo' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
                                                <input type="radio" className="hidden" checked={updateType === 'proximo_passo'} onChange={()=>setUpdateType('proximo_passo')} /> <ArrowRightCircle size={16}/> Próximo Passo
                                            </label>
                                        </div>
                                        <textarea 
                                            className="w-full border-2 border-slate-200 p-4 rounded-xl text-sm outline-none focus:border-indigo-500 bg-slate-50 font-medium resize-none h-[100px] shadow-inner" 
                                            placeholder="Descreva o que aconteceu ou o plano a seguir..."
                                            value={updateText}
                                            onChange={e=>setUpdateText(e.target.value)}
                                        ></textarea>
                                        <div className="flex justify-end">
                                            <button type="submit" disabled={loading || !updateText.trim()} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95 flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                                                <Save size={18} /> Salvar no Diário
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>

                            {/* RIGHT COLUMN - SUB ACTIONS */}
                            <div className="flex-[2] flex flex-col min-h-0 bg-slate-50">
                                <div className="p-6 border-b border-slate-200 bg-slate-100/50">
                                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                        <GitBranch className="text-indigo-500" size={18} /> Desdobramento de Tarefas
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1 font-medium">Divida a ação principal em subtarefas com responsáveis.</p>
                                </div>
                                <div className="flex-1 p-6 overflow-y-auto space-y-3">
                                    {subActions.filter(s => s.action_id === selectedReportAction.id).length === 0 && (
                                        <div className="text-center py-10 opacity-40"><ListChecks size={32} className="mx-auto mb-2" /><p className="text-xs font-bold uppercase">Nenhuma subtarefa</p></div>
                                    )}
                                    {subActions.filter(s => s.action_id === selectedReportAction.id).map(s => (
                                        <div key={s.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative group transition-all hover:border-indigo-300">
                                            <p className="text-sm font-bold text-slate-800 mb-3 pr-8 leading-tight">{s.what}</p>
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1"><User size={12} className="text-indigo-400" /> {s.who}</span>
                                                    <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1 border-l border-slate-200 pl-3"><Calendar size={12} className="text-amber-400" /> {s.when}</span>
                                                </div>
                                                <select 
                                                    onChange={(e) => handleSubStatusChange(s.id, e.target.value)} 
                                                    value={s.status}
                                                    className={`text-[10px] font-bold rounded-lg px-3 py-1.5 outline-none cursor-pointer border shadow-sm ${getSubHex(s.status)}`}
                                                >
                                                    <option value="Urgente">🔴 Urgente</option>
                                                    <option value="A Fazer">⚪ A Fazer</option>
                                                    <option value="Em Andamento">🔵 Em Andamento</option>
                                                    <option value="Concluído">🟢 Concluído</option>
                                                </select>
                                            </div>
                                            <button onClick={() => handleDeleteSubAction(s.id)} className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-6 border-t border-slate-200 bg-white">
                                    <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2"><PlusCircle size={14}/> Nova Subtarefa</h4>
                                    <div className="flex flex-col gap-3">
                                        <input type="text" placeholder="O que deve ser feito?" value={subActionForm.what} onChange={e=>setSubActionForm({...subActionForm, what: e.target.value})} className="w-full text-sm font-bold text-slate-700 p-3 rounded-xl border-2 border-slate-100 outline-none focus:border-indigo-400 bg-slate-50" />
                                        <div className="flex gap-3">
                                            <input type="text" placeholder="Responsável" value={subActionForm.who} onChange={e=>setSubActionForm({...subActionForm, who: e.target.value})} className="flex-1 text-sm font-bold text-slate-700 p-3 rounded-xl border-2 border-slate-100 outline-none focus:border-indigo-400 bg-slate-50" />
                                            <input type="text" placeholder="Prazo" value={subActionForm.when} onChange={e=>setSubActionForm({...subActionForm, when: e.target.value})} className="w-1/3 text-sm font-bold text-slate-700 p-3 rounded-xl border-2 border-slate-100 outline-none focus:border-indigo-400 bg-slate-50" />
                                        </div>
                                        <button type="button" onClick={handleAddSubAction} className="w-full mt-1 bg-slate-800 text-white px-4 py-3 rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-md flex justify-center items-center gap-2">Adicionar à Lista</button>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

        </div>
    );
  };

  // ==========================================
  // MAIN LAYOUT
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-indigo-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-200">
                    <img src={appLogo} alt="Logo" className="max-w-full max-h-full object-contain p-1 rounded-lg" onError={(e)=>{e.target.style.display='none'}} />
                    {!appLogo && <Crown size={24} />}
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">Painel KdB</h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{user.role === 'admin' || user.role === 'dev' ? 'Acesso Administrativo' : `Operacional: ${user.area}`}</p>
                </div>
            </div>

            <nav className="hidden lg:flex gap-1 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 shadow-inner">
                {(user.role === 'admin' || user.role === 'dev') && (
                    <button onClick={() => setActiveTab('diretoria')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'diretoria' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                        <BarChart3 size={18} /> Diretoria
                    </button>
                )}
                <button onClick={() => setActiveTab('kpi')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'kpi' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                    <LineChartIcon size={18} /> Lançamento de KPIs
                </button>
                <button onClick={() => setActiveTab('5w2h')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === '5w2h' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                    <ListChecks size={18} /> Matriz 5W2H
                </button>
                {(user.username.toUpperCase() === 'LUCIENE' || user.role === 'admin' || user.role === 'dev') && (
                    <button onClick={() => setActiveTab('auditoria')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'auditoria' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                        <FileSpreadsheet size={18} /> Auditoria Base
                    </button>
                )}
            </nav>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-200"></div>
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider">{user.username}</span>
                </div>
                <button onClick={() => window.location.reload()} className="p-3 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors border border-transparent hover:border-red-100" title="Sair com Segurança">
                    <LogOut size={20} />
                </button>
            </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        {activeTab === 'diretoria' && renderDiretoria()}
        {activeTab === 'kpi' && renderKPI()}
        {activeTab === 'auditoria' && renderAuditoria()}
        {activeTab === '5w2h' && render5W2H()}
      </main>

      {/* TOAST SYSTEM (Notificações Flutuantes) */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-white font-bold text-sm border-2 ${toast.type === 'error' ? 'bg-red-600 border-red-500 shadow-red-200' : 'bg-emerald-600 border-emerald-500 shadow-emerald-200'}`}>
                {toast.type === 'error' ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
                <span className="mt-0.5 tracking-wide">{toast.msg}</span>
            </div>
        </div>
      )}
    </div>
  );
}
