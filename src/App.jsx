import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, ListChecks, LineChart as LineChartIcon, FileSpreadsheet, 
  Crown, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle,
  LogOut, Save, Filter, X, MessageSquareText, HelpCircle, ArrowRightCircle, Target,
  PieChart as PieChartIcon, BarChart3, Edit2, Trash2, GitBranch, Calendar, User, PlusCircle, History, Info, ChevronRight, ChevronLeft, Download, DollarSign, Image as ImageIcon, Briefcase, Globe
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, ComposedChart, LabelList
} from 'recharts';

// ==========================================
// CONFIGURAÇÃO SUPABASE & VARIÁVEIS GLOBAIS
// ==========================================
const SUPABASE_URL = "https://purxkfbijiigwnujqace.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_5w36tC01sFKqRQj7_fAQrA_IRxCZKCZ"; 

const monthOrder = { 'JAN':1, 'FEV':2, 'MAR':3, 'ABR':4, 'MAI':5, 'JUN':6, 'JUL':7, 'AGO':8, 'SET':9, 'OUT':10, 'NOV':11, 'DEZ':12 };
const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const CHART_COLORS = ['#eab308', '#10b981', '#3b82f6', '#f97316', '#8b5cf6', '#ef4444', '#14b8a6', '#f43f5e', '#06b6d4', '#84cc16'];

// METAS GLOBAIS DA DIRETORIA
const META_ANUAL_FATURAMENTO = 33500000; // 33.5 Milhões
const META_ANUAL_VENDAS = 35800000;      // 35.8 Milhões

let globalSupabaseClient = null;

// ==========================================
// FUNÇÕES UTILITÁRIAS BLINDADAS
// ==========================================
const formatCurrency = (val) => {
  if (val === undefined || val === null || isNaN(val) || val === '') return '-';
  const num = parseFloat(val);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

const formatCurrencyShort = (val) => {
  if (val === undefined || val === null || isNaN(val) || val === '') return '';
  const num = parseFloat(val);
  if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1).replace('.', ',') + 'M';
  if (Math.abs(num) >= 1000) return (num / 1000).toFixed(0).replace('.', ',') + 'K';
  return num.toFixed(0);
};

const formatNumber = (val, unit) => {
    if (val === undefined || val === null || isNaN(val) || val === '') return '-';
    if (unit === 'R$') return formatCurrency(val);
    if (unit === '%') return parseFloat(val).toFixed(1).replace('.', ',') + '%';
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

const truncateText = (text, maxLength) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

const normalizeExcelMonth = (m) => {
    if(!m) return '';
    const lower = m.toLowerCase().trim();
    if(lower.startsWith('jan')) return 'JAN';
    if(lower.startsWith('fev') || lower.startsWith('feb')) return 'FEV';
    if(lower.startsWith('mar')) return 'MAR';
    if(lower.startsWith('abr') || lower.startsWith('apr')) return 'ABR';
    if(lower.startsWith('mai') || lower.startsWith('may')) return 'MAI';
    if(lower.startsWith('jun')) return 'JUN';
    if(lower.startsWith('jul')) return 'JUL';
    if(lower.startsWith('ago') || lower.startsWith('aug')) return 'AGO';
    if(lower.startsWith('set') || lower.startsWith('sep')) return 'SET';
    if(lower.startsWith('out') || lower.startsWith('oct')) return 'OUT';
    if(lower.startsWith('nov')) return 'NOV';
    if(lower.startsWith('dez') || lower.startsWith('dec')) return 'DEZ';
    return 'JAN';
};

const getStatusColor = (s) => { 
    if (s === 'Urgente') return 'bg-red-600 text-white border-red-600 shadow-red-100'; 
    if (s === 'Em Andamento') return 'bg-yellow-50 text-black border-yellow-500 shadow-yellow-100'; 
    if (s === 'Concluído') return 'bg-green-600 text-white border-green-600 shadow-green-100'; 
    return 'bg-zinc-100 text-zinc-500 border-zinc-300'; 
};

const getHex = (s) => { 
    if (s === 'Urgente') return '#ef4444'; 
    if (s === 'Em Andamento') return '#eab308'; 
    if (s === 'Concluído') return '#10b981'; 
    return '#a1a1aa'; 
};

const getSubHex = (s) => { 
    if (s === 'Urgente') return 'bg-red-50 text-red-700 border-red-200'; 
    if (s === 'Em Andamento') return 'bg-yellow-50 text-yellow-700 border-yellow-200'; 
    if (s === 'Concluído') return 'bg-green-50 text-green-700 border-green-200'; 
    return 'bg-zinc-50 text-zinc-600 border-zinc-200'; 
};

// ==========================================
// COMPONENTES DE TOOLTIP CUSTOMIZADOS
// ==========================================
const CustomTooltipFinanceiro = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const previsto = payload.find(p => p.dataKey === 'Previsto')?.value || 0;
        const realizado = payload.find(p => p.dataKey === 'Realizado')?.value || 0;
        const perc = previsto > 0 ? ((realizado / previsto) * 100).toFixed(1) : 0;
        const isAbaixo = realizado < previsto;

        return (
            <div className="bg-zinc-950 text-white p-4 rounded-xl shadow-2xl border border-zinc-800 z-50">
                <p className="font-bold text-sm mb-3 text-yellow-500 border-b border-zinc-800 pb-2">{label}</p>
                {payload.map((entry, index) => {
                    const isRealizado = entry.dataKey === 'Realizado';
                    const color = isRealizado ? (isAbaixo ? '#ef4444' : '#10b981') : '#eab308';
                    return (
                        <p key={index} className="text-sm font-black flex justify-between gap-6 mb-1" style={{ color }}>
                            <span>{entry.name}:</span>
                            <span>{formatCurrency(entry.value)} {isRealizado && previsto > 0 ? `(${perc}%)` : ''}</span>
                        </p>
                    )
                })}
            </div>
        );
    }
    return null;
};

const CustomTooltipPie = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        return (
            <div className="bg-zinc-950 text-white p-4 rounded-xl shadow-2xl border border-zinc-800 z-50">
                <p className="text-sm font-black flex justify-between gap-4" style={{ color: data.payload.fill }}>
                    <span>{data.name}:</span>
                    <span>{formatCurrency(data.value)} ({(data.percent * 100).toFixed(1)}%)</span>
                </p>
            </div>
        );
    }
    return null;
};

const CustomTooltipGeral = ({ active, payload, label, lang }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xl z-50 relative">
                <p className="font-bold text-sm text-zinc-900 mb-2">{label}</p>
                {payload.map((entry, index) => {
                    const qtyLabels = ['Quantidade', 'Em Aberto', 'Enviadas', 'Convertidas', 'Concluído', 'Em Andamento', 'A Fazer', 'Atrasado', 'Total Projetos', 'Em Atraso', 'Atraso', 'Faturados', 'Fora do Prazo', 'Open', 'Sent', 'Submitted', 'Converted', 'Won', 'Completed', 'In Progress', 'Pending', 'To Do', 'Overdue', 'Total Projects', 'Invoiced', 'Late', 'Prepared', 'Urgente', 'Urgent', 'Ações', 'Actions'];
                    const isQty = entry.dataKey === 'qty' || qtyLabels.includes(entry.name);
                    const isPerc = typeof entry.name === 'string' && entry.name.includes('%');
                    const val = isPerc ? parseFloat(entry.value).toFixed(1)+'%' : (isQty ? `${entry.value}` : formatCurrency(entry.value));
                    return (
                        <p key={index} className="text-xs font-bold" style={{color: entry.color}}>
                            {entry.name}: {val}
                        </p>
                    )
                })}
            </div>
        );
    }
    return null;
};

const CustomTooltipSparkline = ({ active, payload, label, unit, lang }) => {
    const t = (pt, en) => lang === 'PT' ? pt : en;
    if (active && payload && payload.length) {
        const primaryData = payload.find(p => p.dataKey === 'value' || p.dataKey === 'Mensal') || payload[0];

        return (
            <div className="bg-zinc-950 text-white p-4 rounded-xl shadow-2xl border border-zinc-800 z-50 max-w-md w-max">
                <p className="font-bold text-sm mb-2 text-yellow-500 border-b border-zinc-800 pb-2 flex items-center gap-2">
                    <Calendar size={14} /> {t('Mês:', 'Month:')} {label}
                </p>
                
                {payload.map((entry, index) => {
                    if (typeof entry.dataKey === 'string' && entry.dataKey.includes('comment')) return null;
                    
                    return (
                        <p key={index} className="text-sm font-black flex justify-between gap-6 mb-1" style={{ color: entry.color }}>
                            <span>{entry.name}:</span>
                            <span>{formatNumber(entry.value, entry.name === 'Acumulado' || entry.name === 'YTD' ? 'R$' : unit)}</span>
                        </p>
                    );
                })}

                {primaryData.payload && primaryData.payload.comment && (
                    <div className="mt-3 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                        <span className="text-[10px] uppercase font-black text-yellow-500 flex items-center gap-1 mb-1">
                            <MessageSquareText size={12} /> {t('Observação', 'Note')}
                        </span>
                        <p className="text-xs text-yellow-100 italic leading-relaxed whitespace-pre-wrap break-words">{primaryData.payload.comment}</p>
                    </div>
                )}
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
  const [appLogo, setAppLogo] = useState('');
  
  // Idioma e Dicionário Corporativo Dinâmico
  const [lang, setLang] = useState('PT');
  const t = (pt, en) => lang === 'PT' ? pt : en;

  const tInd = (name) => {
      if (!name) return '';
      if (lang === 'PT') return name;
      const lowerName = name.toLowerCase();

      // Mapeamento por palavras-chave (ignora formatação "Nº", maiúsculas, etc.)
      const map = {
          // --- COMERCIAL ---
          "eficiência comercial (média ac) n.po": "Commercial Efficiency (YTD Avg) Qty",
          "eficiência comercial (média ac) r$": "Commercial Efficiency (YTD Avg) Revenue",
          "eficiência comercial (média movel) n.po": "Commercial Efficiency (Moving Avg) Qty",
          "eficiência comercial (média movel) r$": "Commercial Efficiency (Moving Avg) Revenue",
          "eficiência comercial (média mês) r$": "Commercial Efficiency (Monthly Avg) Revenue",
          "eficiência comercial": "Commercial Efficiency",
          "volume de vendas": "Sales Booking Volume",
          "ticket médio": "Average Order Value",
          "ticket medio": "Average Order Value",
          "orçamentos aprovados": "Approved Quotes (Qty)",
          "orçamentos em atraso pendentes": "Pending Overdue Quotes",
          "volume líquido orçamentos": "Net Quoted Volume (BRL)",
          "orçamentos enviados": "Submitted Quotes (Qty)",
          "visitas técnica": "Technical/Commercial Visits",
          "visitas tecnica": "Technical/Commercial Visits",
          "clientes atendidos": "Customers Served",
          "enviados e vendidos (r$)": "Submitted & Won Quotes (BRL)",
          "enviados e vendidos": "Submitted & Won Quotes",
          "orçamentos perdidos": "Lost Quotes (Qty)",
          "ciclo de venda (dias)": "Avg Sales Cycle (Days)",
          "ciclo de venda": "Avg Sales Cycle",
          "pedidos contrato (r$)": "Contract Orders Value (BRL)",
          "pedidos contrato": "Contract Orders Value",
          "pedidos spot (r$)": "Spot Orders Value (BRL)",
          "pedidos spot": "Spot Orders Value",
          "pedidos pg1": "PG1 Orders (Qty)",
          "pedidos pg2": "PG2 Orders (Qty)",
          "pedidos pg3": "PG3 Orders (Qty)",

          // --- ENGENHARIA (EDSON) ---
          "proposta em atraso": "Overdue Quotes (%)",
          "projetos retrabalhados": "Reworked Projects (%)",
          "orçamentos elaborados": "Prepared Quotes",
          "enviados em atraso": "Overdue Submitted Quotes",
          "entregues em atraso": "Late Submitted Quotes",
          "com pendências": "Quotes w/ Pending Issues",
          "com pendencias": "Quotes w/ Pending Issues",
          "em aberto": "Open Quotes (Qty)",
          "reprogramados": "Rescheduled Quotes",
          "urgentes": "Urgent Quotes",
          "desenhos elaborados": "Drawings Prepared",
          "desenhos revisados": "Drawings Reviewed",
          "falha de desenho": "Rework: Drawing Error",
          "falha de estrutura": "Rework: Structural Error",
          "falha de processo": "Rework: Process Error",
          "retrabalho de desenhos": "Drawing Reworks",
          "retrabalho de estruturas": "Structure Reworks",
          "retrabalho de processos": "Process Reworks",

          // --- PCP, PRODUÇÃO (DANIEL) E LOGÍSTICA ---
          "tx. de atendimento da programação (%)": "Schedule Adherence Rate (%)",
          "tx de atendimento da programação (%)": "Schedule Adherence Rate (%)",
          "tx. de atendimento da programação": "Schedule Adherence Rate",
          "tx de atendimento da programação": "Schedule Adherence Rate",
          "taxa de retrabalho (%)": "Rework Rate (%)",
          "taxa de retrabalho": "Rework Rate",
          "projetos finalizados": "Completed Projects",
          "projetos programados na data": "Scheduled Projects (On Date)",
          "projetos antecipados": "Early Projects",
          "tx. atendimento atraso (%)": "Overdue Compliance Rate (%)",
          "tx atendimento atraso (%)": "Overdue Compliance Rate (%)",
          "tx. atendimento atraso": "Overdue Compliance Rate",
          "tx atendimento atraso": "Overdue Compliance Rate",
          "taxa de atendimento prazo cliente": "Client OTD Rate",
          "taxa de atendimento": "On-Time Delivery Rate",
          "t.médio pedido faturado": "Avg Invoiced Order Value",
          "t.medio pedido faturado": "Avg Invoiced Order Value",
          "projetos dentro do prazo": "On-Time Projects (Qty)",
          "projetos fora do prazo": "Late Projects (Qty)",
          "tx atendimento projetos (%)": "Projects OTD Rate (%)",
          "tx atendimento projetos": "Projects OTD Rate",
          "valor projetos pendentes (r$)": "Pending Projects Value (BRL)",
          "valor projetos pendentes": "Pending Projects Value",
          "projetos pendentes": "Pending Projects (Qty)",
          "média de atraso (dias)": "Avg Delay (Days)",
          "media de atraso (dias)": "Avg Delay (Days)",
          "média de atraso": "Avg Delay",
          "entregas fora do prazo": "Late Deliveries",
          "pedidos faturados no prazo": "On-Time Invoiced Orders",
          "pedidos entregues no prazo": "On-Time Delivered Orders",
          "entregas no prazo": "On-Time Delivery (OTD)",
          "pedidos faturados": "Invoiced Orders",
          "pedidos fora do prazo": "Late Orders",
          "pedidos em atraso": "Overdue Orders",
          "projetos previstos": "Planned Projects",
          "projetos em atraso": "Overdue Projects",
          "projetos em aberto": "Open Projects",
          "projetos no prazo": "On-Time Projects",
          "índice de retrabalho": "Rework Rate",
          "br's com retrabalho": "Reworked BRs",
          "brs com retrabalho": "Reworked BRs",
          "ordens de produção": "Production Orders (PO)",
          "op's": "POs",
          "ops": "POs",

          // --- QUALIDADE (LUCIENE) ---
          "taxa de reclamação clientes (%)": "Customer Complaint Rate (%)",
          "taxa de reclamacao clientes (%)": "Customer Complaint Rate (%)",
          "taxa de reclamação clientes": "Customer Complaint Rate",
          "taxa de reclamacao clientes": "Customer Complaint Rate",
          "nc cliente": "Customer NCs",
          "material não conforme": "Non-Conforming Material",
          "material nao conforme": "Non-Conforming Material",
          "reclamações clientes": "Customer Complaints",
          "reclamacoes clientes": "Customer Complaints",
          "reclamações procedentes": "Valid Complaints",
          "reclamacoes procedentes": "Valid Complaints",
          "reclamações analisadas": "Analyzed Complaints",
          "reclamacoes analisadas": "Analyzed Complaints",
          "relatórios 8 pq": "8 PQ Reports",
          "relatorios 8 pq": "8 PQ Reports",
          "relatórios sem resposta": "Unanswered Reports",
          "relatorios sem resposta": "Unanswered Reports",

          // --- SUPPLY (DANILO), ESTOQUE (DANIELA) & RH (MARIELE) ---
          "nível de serviço em suprimentos (%)": "Supply Service Level (%)",
          "nivel de servico em suprimentos (%)": "Supply Service Level (%)",
          "nível de serviço em suprimentos": "Supply Service Level",
          "nivel de servico em suprimentos": "Supply Service Level",
          "solicitações de compra": "Purchase Requests",
          "solicitações compras": "Purchase Requests",
          "solicitacoes compras": "Purchase Requests",
          "ordens de compra": "Purchase Orders",
          "compras urgentes": "Urgent Purchases",
          "industrializações": "Toll Manufacturing",
          "industrializacoes": "Toll Manufacturing",
          "compras sem especificação": "Purchases w/o Specs",
          "compras sem especificacao": "Purchases w/o Specs",
          "oc sem solicitação": "POs w/o Request",
          "oc sem solicitacao": "POs w/o Request",
          "compras fora do prazo": "Late Purchases",
          "compras erradas": "Incorrect Purchases",
          "saving (%)": "Cost Savings (%)",
          "saving": "Cost Savings",
          "aproveitamento de sobras": "Scrap Recovery Value",
          "obsoletos no estoque": "Obsolete Inventory Value",
          "não conformidade (%)": "Non-Conformities (%)",
          "nao conformidade (%)": "Non-Conformities (%)",
          "não conformidade": "Non-Conformities",
          "nao conformidade": "Non-Conformities",
          "colaboradores ativos": "Active Employees",
          "admitidos": "New Hires",
          "admissões andamento": "Ongoing Hirings",
          "admissoes andamento": "Ongoing Hirings",
          "demitidos (empresa)": "Involuntary Terminations",
          "demitidos (pedido)": "Voluntary Terminations",
          "demitidos": "Terminations",
          "vagas abertas (compl.)": "Open Positions (Complementary)",
          "vagas abertas (subst.)": "Open Positions (Replacement)",
          "vagas abertas (aumento)": "Open Positions (Growth)",
          "vagas abertas": "Open Positions",
          "faltas injustificadas": "Unjustified Absences",
          "faltas": "Absences",
          "atestados médicos": "Medical Certificates",
          "atestados medicos": "Medical Certificates",
          "atestados": "Sick Leaves",
          "absenteísmo": "Absenteeism Rate",
          "absenteismo": "Absenteeism Rate",
          "turnover": "Turnover Rate",

          // --- GERAL ---
          "faturamento líquido": "Net Revenue",
          "faturamento liquido": "Net Revenue",
          "faturamento previsto": "Forecasted Revenue",
          "faturamento realizado": "Actual Revenue / Invoiced",
          "faturamento": "Revenue",
          "prazo médio": "Average Lead Time",
          "prazo medio": "Average Lead Time",
          "estoque": "Inventory"
      };
      
      // 1. Tenta correspondência exata
      for (const [pt, en] of Object.entries(map)) {
          if (lowerName === pt) return en;
      }
      // 2. Tenta correspondência parcial (palavra-chave contida na string, resolve os "Nº" e formatações exóticas)
      for (const [pt, en] of Object.entries(map)) {
          if (lowerName.includes(pt)) return en;
      }
      
      return name;
  };

  const translateArea = (ar) => {
      const map = { 'Comercial': 'Commercial', 'Engenharia': 'Engineering', 'Produção': 'Production', 'Qualidade': 'Quality', 'DP': 'HR', 'Estoque': 'Inventory', 'Supply': 'Procurement', 'PCP': 'PCP' };
      return lang === 'EN' ? (map[ar] || ar) : ar;
  };

  const translateStatus = (s) => {
      if (lang === 'PT') return s;
      if (s === 'Urgente') return 'Urgent';
      if (s === 'A Fazer') return 'To Do';
      if (s === 'Em Andamento') return 'In Progress';
      if (s === 'Concluído') return 'Completed';
      return s;
  };

  // Dados do Banco
  const [actions, setActions] = useState([]);
  const [subActions, setSubActions] = useState([]);
  const [dbOwners, setDbOwners] = useState([]);
  const [dbIndicators, setDbIndicators] = useState([]);
  const [dbGoals, setDbGoals] = useState([]);
  const [dbValues, setDbValues] = useState([]);
  const [dbComments, setDbComments] = useState([]);
  const [incomingOrders, setIncomingOrders] = useState([]);

  // Estados dos Filtros (KPI)
  const [kpiOwnerId, setKpiOwnerId] = useState(1);
  const [kpiEditPeriod, setKpiEditPeriod] = useState(months[new Date().getMonth()]);
  const [kpiViewPeriod, setKpiViewPeriod] = useState('ALL');
  const [kpiViewMode, setKpiViewMode] = useState('MONTHLY');
  const [comercialViewPeriod, setComercialViewPeriod] = useState('ALL'); 
  const [comercialViewMode, setComercialViewMode] = useState('YTD'); 
  
  // Financeiro
  const [financeMargins, setFinanceMargins] = useState({});
  const [pcpMargin, setPcpMargin] = useState(0);
  const [isFinanceLoaded, setIsFinanceLoaded] = useState(false);

  // Estados Formulário Dinâmico de Esforço
  const [formValues, setFormValues] = useState({});
  const [formComments, setFormComments] = useState({});
  const [expandedCommentId, setExpandedCommentId] = useState(null); 
  const [expandedCardId, setExpandedCardId] = useState(null);

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
  
  // Custom Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });

  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Carrossel de Setores (Diretoria)
  const [currentSectorIndex, setCurrentSectorIndex] = useState(0);

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

  // Load Finance Margins cleanly
  useEffect(() => {
    if (!isFinanceLoaded && dbComments.length > 0) {
        const row = dbComments.find(c => c.indicator_id === 9999 && c.period === 'FINANCE_MARGINS');
        if (row && row.comment) {
            try {
                const parsed = JSON.parse(row.comment);
                setFinanceMargins(parsed.margins || {});
                setPcpMargin(parsed.pcp || 0);
                setIsFinanceLoaded(true);
            } catch(e) {}
        }
    }
  }, [dbComments, isFinanceLoaded]);

  useEffect(() => {
      if (activeTab === 'diretoria') {
          const timer = setInterval(() => {
              setCurrentSectorIndex(prev => (prev + 1) % 7);
          }, 5000);
          return () => clearInterval(timer);
      }
  }, [activeTab, currentSectorIndex]);

  const handleLogoUpload = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
          const base64 = e.target.result;
          try {
              setLoading(true);
              const { error } = await supabaseClient.from('settings').upsert({ id: 1, logo_base64: base64 });
              if (error) throw error;
              setAppLogo(base64);
              showToast(t("Logo atualizada com sucesso!", "Logo updated successfully!"), "success");
          } catch (err) {
              console.error(err);
              showToast(t("Erro ao salvar a logo no banco.", "Error saving logo to database."), "error");
          } finally {
              setLoading(false);
          }
      };
      reader.readAsDataURL(file);
  };

  const triggerLogoUpload = () => {
      document.getElementById('logo-upload-input').click();
  };

  // ==========================================
  // IMPORTAÇÃO EXCEL - INCOMING ORDERS
  // ==========================================
  const processExcelFile = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setLoading(true);
      showToast(t("Carregando motor de leitura Excel...", "Loading Excel reading engine..."), "success");

      try {
          const XLSX = await new Promise((resolve, reject) => {
              if (window.XLSX) return resolve(window.XLSX);
              const script = document.createElement('script');
              script.src = "https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js";
              script.onload = () => resolve(window.XLSX);
              script.onerror = reject;
              document.head.appendChild(script);
          });

          const reader = new FileReader();
          reader.onload = async (evt) => {
              try {
                  const data = evt.target.result;
                  const workbook = XLSX.read(data, { type: 'binary' });
                  const firstSheetName = workbook.SheetNames[0];
                  const worksheet = workbook.Sheets[firstSheetName];
                  const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                  if (!jsonData || jsonData.length === 0) {
                      throw new Error(t("A planilha está vazia.", "The spreadsheet is empty."));
                  }

                  showToast(t("Lendo colunas e formatando dados...", "Reading columns and formatting data..."), "success");

                  const normalizeKey = (key) => key.trim().toLowerCase();
                  
                  const mappedData = jsonData.map(row => {
                      const getVal = (keyNames) => {
                          for(let k of Object.keys(row)) {
                              if(keyNames.includes(normalizeKey(k))) return row[k];
                          }
                          return null;
                      };

                      let rawNetValue = getVal(['net value', 'net value ']);
                      let netVal = 0;
                      if (typeof rawNetValue === 'number') {
                          netVal = rawNetValue;
                      } else if (rawNetValue) {
                          const strVal = String(rawNetValue).trim();
                          if (strVal.includes(',') && strVal.includes('.')) {
                              netVal = parseFloat(strVal.replace(/\./g, '').replace(',', '.'));
                          } else if (strVal.includes(',')) {
                              netVal = parseFloat(strVal.replace(',', '.'));
                          } else {
                              netVal = parseFloat(strVal);
                          }
                      }
                      if (isNaN(netVal)) netVal = 0;

                      let rawQty = getVal(['qts peças', 'qty', 'qtde']);
                      let qtyVal = parseFloat(rawQty);
                      if (isNaN(qtyVal)) qtyVal = 0;

                      let dataCpRaw = getVal(['data cp']);
                      let dataCpFinal = null;
                      if (typeof dataCpRaw === 'number') {
                         const date = new Date(Math.round((dataCpRaw - 25569)*86400*1000));
                         dataCpFinal = date.toISOString().split('T')[0];
                      } else if (dataCpRaw) {
                         dataCpFinal = String(dataCpRaw).split(' ')[0];
                         if(dataCpFinal.includes('/')) {
                            const parts = dataCpFinal.split('/');
                            if(parts.length === 3 && parts[2].length === 4) {
                                dataCpFinal = `${parts[2]}-${parts[1]}-${parts[0]}`;
                            }
                         }
                      }

                      const clientStr = String(getVal(['client', 'cliente', 'client ']) || '').trim();
                      
                      return {
                          n_order: String(getVal(['nº', 'n', 'no']) || ''),
                          month: String(getVal(['month', 'mês']) || ''),
                          year: parseInt(getVal(['year', 'ano'])) || new Date().getFullYear(),
                          client: clientStr,
                          segment: String(getVal(['segment', 'segmento']) || ''),
                          category: String(getVal(['category', 'categoria']) || ''),
                          region: String(getVal(['region', 'região', 'regiao']) || ''),
                          uf: String(getVal(['uf']) || ''),
                          br_number: String(getVal(['br', 'br number', 'br_number']) || ''),
                          data_cp: dataCpFinal,
                          client_oc_number: String(getVal(['client oc number', 'client oc  number']) || ''),
                          tipo: String(getVal(['tipo', 'type']) || ''),
                          sales_rep: String(getVal(['sales', 'vendedor', 'sales ']) || ''),
                          pg: String(getVal(['pg']) || ''),
                          net_value: netVal,
                          group_value: String(getVal(['group $', 'group value', 'group $ ']) || ''),
                          item: String(getVal(['item']) || ''),
                          kalenborn_group: String(getVal(['kalenborn group', 'grupo kalenborn']) || ''),
                          product: String(getVal(['product', 'produto']) || ''),
                          applications: String(getVal(['applications', 'aplicações', 'aplicacoes']) || ''),
                          unit: String(getVal(['unit', 'unidade']) || ''),
                          qty: qtyVal,
                          dimensions: String(getVal(['dimensões esp. / ø', 'dimensions', 'dimensões']) || ''),
                          contato: String(getVal(['contato', 'contact']) || ''),
                          observacoes: String(getVal(['observações', 'observacoes', 'observations']) || ''),
                          status: String(getVal(['status']) || '')
                      };
                  }).filter(row => row.client !== ''); 

                  if (mappedData.length === 0) {
                      throw new Error(t("Nenhum dado válido encontrado na planilha.", "No valid data found in the spreadsheet."));
                  }

                  showToast(t(`Sincronizando ${mappedData.length} registros com o Supabase...`, `Synchronizing ${mappedData.length} records with Supabase...`), "success");

                  const { error: delError } = await supabaseClient.from('incoming_orders').delete().gte('id', 0);
                  if (delError) throw delError;

                  const chunkSize = 300;
                  for (let i = 0; i < mappedData.length; i += chunkSize) {
                      const chunk = mappedData.slice(i, i + chunkSize);
                      const { error: insError } = await supabaseClient.from('incoming_orders').insert(chunk);
                      if (insError) throw insError;
                  }

                  showToast(t("Planilha sincronizada com sucesso e pronta para uso!", "Spreadsheet synchronized successfully and ready to use!"), "success");
                  e.target.value = null; 
                  loadData();

              } catch (err) {
                  console.error(err);
                  showToast(t("Erro ao processar arquivo: ", "Error processing file: ") + err.message, "error");
              } finally {
                  setLoading(false);
              }
          };
          reader.readAsBinaryString(file);
      } catch (err) {
          console.error(err);
          showToast(t("Erro ao baixar dependências do Excel. Verifique a internet.", "Error downloading Excel dependencies. Check your internet connection."), "error");
          setLoading(false);
      }
  };

  const exportIncomingToExcel = async () => {
      setLoading(true);
      showToast(t("A recolher dados no banco...", "Fetching data from the database..."), "success");
      try {
          const { data, error } = await supabaseClient.from('incoming_orders').select('*').order('id', { ascending: true });
          if (error) throw error;
          if (!data || data.length === 0) {
              showToast(t("Nenhum dado encontrado para exportar.", "No data found to export."), "error");
              setLoading(false);
              return;
          }

          const XLSX = await new Promise((resolve, reject) => {
              if (window.XLSX) return resolve(window.XLSX);
              const script = document.createElement('script');
              script.src = "https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js";
              script.onload = () => resolve(window.XLSX);
              script.onerror = reject;
              document.head.appendChild(script);
          });

          const exportData = data.map(row => ({
              "Nº": row.n_order,
              "Month": row.month,
              "Year": row.year,
              "Client": row.client,
              "Segment": row.segment,
              "Category": row.category,
              "Region": row.region,
              "UF": row.uf,
              "BR": row.br_number,
              "Data CP": row.data_cp,
              "Client OC Number": row.client_oc_number,
              "Tipo": row.tipo,
              "Sales": row.sales_rep,
              "PG": row.pg,
              "Net Value": row.net_value,
              "Group $": row.group_value,
              "Item": row.item,
              "Kalenborn Group": row.kalenborn_group,
              "Product": row.product,
              "Applications": row.applications,
              "Unit": row.unit,
              "Qts peças": row.qty,
              "Dimensões esp. / Ø": row.dimensions,
              "Contato": row.contato,
              "Observações": row.observacoes,
              "Status": row.status
          }));

          const worksheet = XLSX.utils.json_to_sheet(exportData);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Incoming Orders");
          XLSX.writeFile(workbook, "Base_Incoming_Orders_Exportada.xlsx");
          showToast(t("Planilha XLSX gerada com sucesso!", "XLSX spreadsheet generated successfully!"), "success");

      } catch (err) {
          console.error(err);
          showToast(t("Erro ao exportar dados.", "Error exporting data."), "error");
      } finally {
          setLoading(false);
      }
  };

  // ==========================================
  // EFEITOS E CARREGAMENTO DE DADOS
  // ==========================================
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    if (!supabaseClient) return;
    setLoading(true);
    try {
      const [actRes, ownRes, indRes, goalRes, valRes, subRes, incRes] = await Promise.all([
        supabaseClient.from('actions').select('*, updates(*)').order('created_at', { ascending: false }),
        supabaseClient.from('owners').select('*').order('id'),
        supabaseClient.from('indicators').select('*').order('id'),
        supabaseClient.from('goals').select('*'),
        supabaseClient.from('indicator_values').select('*').order('id'),
        supabaseClient.from('sub_actions').select('*').order('created_at', { ascending: true }),
        supabaseClient.from('incoming_orders').select('*') 
      ]);

      let comRes = { data: [] };
      try { comRes = await supabaseClient.from('indicator_comments').select('*'); } catch (e) {}

      setActions(actRes.data || []);
      setDbOwners(ownRes.data || []);
      setDbIndicators(indRes.data || []);
      setDbGoals(goalRes.data || []);
      setDbValues(valRes.data || []);
      setSubActions(subRes.data || []);
      setDbComments(comRes.data || []);
      setIncomingOrders(incRes.data || []); 
      
      if (selectedReportAction) {
          const updatedAction = (actRes.data || []).find(a => a.id === selectedReportAction.id);
          if(updatedAction) setSelectedReportAction(updatedAction);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
    setLoading(false);
  };

  // ==========================================
  // NOVA FUNÇÃO DE LOGIN BLINDADA
  // ==========================================
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!supabaseClient) {
        setLoginError(true);
        return;
    }

    setLoading(true);
    try {
        // 1. Usa o Auth Oficial do Supabase
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: loginUser.trim(),
            password: loginPass.trim()
        });

        if (authError || !authData.user) {
            throw new Error('Credenciais inválidas no Auth');
        }

        // 2. Busca o perfil na tabela interna usando o email validado
        const { data } = await supabaseClient
            .from('users')
            .select('*')
            .eq('email', authData.user.email)
            .single();

        if (data) {
          setUser(data);
          setLoginError(false);

          if (data.role === 'admin' || data.role === 'dev') setActiveTab('diretoria');
          else setActiveTab('kpi');

          const upper = data.username.toUpperCase();
          if(upper.includes('RICARDO') || upper.includes('PRISCILA')) setKpiOwnerId(1);
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
        console.error("Erro no login:", e);
        setLoginError(true);
    }
    setLoading(false);
  };

  const handleSaveAction = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
          if (editingActionId) {
              const { error } = await supabaseClient.from('actions').update(actionForm).eq('id', editingActionId);
              if (error) throw error; // <- AGORA ELE PEGA O ERRO!
              showToast(t("Ação atualizada!", "Action updated!"));
          } else {
              const { error } = await supabaseClient.from('actions').insert([actionForm]);
              if (error) throw error; // <- AGORA ELE PEGA O ERRO!
              showToast(t("Ação registrada com sucesso!", "Action registered successfully!"));
          }
          setIsAddActionModalOpen(false);
          loadData();
      } catch(e) {
          console.error(e);
          showToast(t("Erro ao salvar no banco", "Error saving to DB"), "error");
      }
      setLoading(false);
  };

  const requestDeleteAction = (id) => {
      setConfirmDialog({
          isOpen: true,
          message: t("Tem a certeza que deseja excluir esta ação permanentemente?", "Are you sure you want to permanently delete this action?"),
          onConfirm: () => handleDeleteAction(id)
      });
  };

  const handleDeleteAction = async (id) => {
      setLoading(true);
      try {
          const { error } = await supabaseClient.from('actions').delete().eq('id', id);
          if (error) throw error;
          setSelectedReportAction(null);
          showToast(t("Ação excluída!", "Action deleted!"));
          loadData();
      } catch(e) {
          console.error(e);
          showToast(t("Erro ao excluir", "Error deleting"), "error");
      }
      setLoading(false);
  };

  const handleStatusChangeAction = async (id, newStatus, area) => {
      if (user.role !== 'admin' && user.role !== 'dev' && user.area !== area && user.username.toUpperCase() !== 'DANIEL') {
          showToast(t("Sem permissão para alterar o status.", "No permission to change status."), "error");
          return;
      }
      setLoading(true);
      try {
          const { error } = await supabaseClient.from('actions').update({ status: newStatus }).eq('id', id);
          if (error) throw error;
          showToast(t("Status atualizado!", "Status updated!"));
          loadData();
      } catch(e) {
          console.error(e);
          showToast(t("Erro", "Error"), "error");
      }
      setLoading(false);
  };

  const handleAddUpdate = async (e) => {
      e.preventDefault();
      if(!updateText.trim() || !selectedReportAction) return;
      setLoading(true);
      try {
          const dateStr = new Date().toLocaleDateString('pt-BR');
          const { error } = await supabaseClient.from('updates').insert([{
              action_id: selectedReportAction.id,
              type: updateType,
              text: updateText,
              date: dateStr,
              author: user.username
          }]);
          if (error) throw error;
          setUpdateText('');
          showToast(t("Atualização registrada!", "Update registered!"));
          loadData();
      } catch(err) {
          console.error(err);
          showToast(t("Erro ao registrar.", "Error registering."), "error");
      }
      setLoading(false);
  };

  const handleAddSubAction = async () => {
      if(!subActionForm.what || !subActionForm.who || !subActionForm.when) return;
      setLoading(true);
      try {
          const { error } = await supabaseClient.from('sub_actions').insert([{
              action_id: selectedReportAction.id,
              what: subActionForm.what,
              who: subActionForm.who,
              when: subActionForm.when
          }]);
          if (error) throw error;
          setSubActionForm({ what: '', who: '', when: '' });
          showToast(t("Subtarefa adicionada!", "Subtask added!"));
          loadData();
      } catch(e) {
          console.error(e);
          showToast(t("Erro ao adicionar", "Error adding"), "error");
      }
      setLoading(false);
  };
  
  const requestDeleteSubAction = (subId) => {
      setConfirmDialog({
          isOpen: true,
          message: t("Excluir esta subtarefa permanentemente?", "Delete this subtask permanently?"),
          onConfirm: () => handleDeleteSubAction(subId)
      });
  };

  const handleDeleteSubAction = async (subId) => {
      setLoading(true);
      try {
          await supabaseClient.from('sub_actions').delete().eq('id', subId);
          loadData();
      } catch(e) {
          showToast(t("Erro", "Error"), "error");
      }
      setLoading(false);
  };

  // ==========================================
  // MOTOR DE CÁLCULO GERAL (Movido para ANTES do useEffect)
  // ==========================================
  const computedData = useMemo(() => {
    let allValues = [...dbValues];

    // Mapeia os IDs automaticamente para não dependermos de números fixos
    const autoMap = {
        contratoId: dbIndicators.find(i => i.name.toLowerCase().includes('pedidos contrato'))?.id,
        spotId: dbIndicators.find(i => i.name.toLowerCase().includes('pedidos spot'))?.id,
        pg1Id: dbIndicators.find(i => i.name.toLowerCase().includes('pg1'))?.id,
        pg2Id: dbIndicators.find(i => i.name.toLowerCase().includes('pg2'))?.id,
        pg3Id: dbIndicators.find(i => i.name.toLowerCase().includes('pg3'))?.id,
        servicoId: dbIndicators.find(i => i.name.toLowerCase().includes('pedidos serviço') || i.name.toLowerCase().includes('pedidos servico'))?.id,
    };

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
        if(!id) return;
        const idx = allValues.findIndex(v => v.indicator_id === id && v.owner_id === oId && v.period === period);
        if (idx >= 0) allValues[idx].value = val;
        else allValues.push({ indicator_id: id, owner_id: oId, period: period, value: val });
      };

      // --- AUTOMAÇÃO DA PLANILHA EXCEL (INCOMING ORDERS) ---
      const ordersInMonth = incomingOrders.filter(o => normalizeExcelMonth(o.month) === period);
      let vContrato = 0, vSpot = 0, qPg1 = 0, qPg2 = 0, qPg3 = 0, qServ = 0;
      
      ordersInMonth.forEach(o => {
          const tipo = (o.tipo || '').toLowerCase();
          const pg = (o.pg || '').toLowerCase();
          const netVal = parseFloat(o.net_value) || 0;

          if (tipo.includes('contrato')) vContrato += netVal;
          if (tipo.includes('spot')) vSpot += netVal;

          if (pg.includes('pg1') || pg.includes('pg 1')) qPg1++;
          if (pg.includes('pg2') || pg.includes('pg 2')) qPg2++;
          if (pg.includes('pg3') || pg.includes('pg 3')) qPg3++;
          if (pg.includes('serviço') || pg.includes('servico') || pg.includes('service')) qServ++;
      });

      // Injecção automática dos valores no Setor Comercial (Owner ID 1)
      if (autoMap.contratoId) setRes(autoMap.contratoId, vContrato, 1);
      if (autoMap.spotId) setRes(autoMap.spotId, vSpot, 1);
      if (autoMap.pg1Id) setRes(autoMap.pg1Id, qPg1, 1);
      if (autoMap.pg2Id) setRes(autoMap.pg2Id, qPg2, 1);
      if (autoMap.pg3Id) setRes(autoMap.pg3Id, qPg3, 1);
      if (autoMap.servicoId) setRes(autoMap.servicoId, qServ, 1);
      // -----------------------------------------------------

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
  }, [dbValues, incomingOrders, dbIndicators]); // Dependências adicionadas para recalcular se a base Excel mudar

  useEffect(() => {
      const newVals = {};
      const newComms = {};
      
      // LÊ DIRETAMENTE DOS CÁLCULOS AUTOMÁTICOS (INCLUINDO EXCEL)
      computedData.forEach(v => {
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
          const checkExists = computedData.find(v => v.indicator_id === 56 && v.period === kpiEditPeriod);
          if (checkExists) newVals[56] = checkExists.value;
      }

      setFormValues(newVals);
      setFormComments(newComms);
      setExpandedCommentId(null);
  }, [kpiOwnerId, kpiEditPeriod, computedData, dbComments]); // <- Atenção a esta linha, computedData foi adicionado

  const needsComment = (id, ownerId, val) => {
    const numVal = parseFloat(val);
    if (isNaN(numVal) || numVal <= 0) return false;
    if (ownerId === 6) return true; 
    if (ownerId === 7) return true; 
    const specificIds = [13, 20, 21, 22, 28, 30, 32, 40, 41, 42, 44, 47, 49, 50, 51, 52, 54, 55];
    return specificIds.includes(id);
  };

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

  // Extract profit Data for Diretoria and Finance tab safely
  const profitDataFinanceiro = useMemo(() => {
        const salesByCat = {};
        incomingOrders.forEach(o => {
            const cat = (o.kalenborn_group || o.category || o.product || '').trim();
            if(cat) {
                if(!salesByCat[cat]) salesByCat[cat] = 0;
                salesByCat[cat] += (parseFloat(o.net_value) || 0);
            }
        });
        return Object.keys(salesByCat).map(cat => {
            const margin = parseFloat(financeMargins[cat]) || 0;
            return { name: cat, Lucro: (salesByCat[cat] * margin) / 100 };
        }).filter(d => d.Lucro > 0).sort((a,b) => b.Lucro - a.Lucro).slice(0, 10);
  }, [incomingOrders, financeMargins]);

  // ==========================================
  // COMPONENTES DE RENDERIZAÇÃO (Telas)
  // ==========================================

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
        <div className="max-w-md w-full bg-zinc-900 rounded-3xl shadow-2xl p-10 z-10 border border-zinc-800">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-zinc-950 rounded-[2rem] flex items-center justify-center shadow-xl shadow-yellow-500/10 border border-zinc-800">
                 <span className="text-yellow-500 font-black text-6xl" style={{ fontFamily: 'Georgia, serif' }}>K</span>
              </div>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Kalenborn</h1>
            <p className="text-zinc-400 mt-2 font-bold uppercase tracking-widest text-xs">{t('Painel de Gestão Estratégica', 'Strategic Management Dashboard')}</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-black text-yellow-500 mb-2 uppercase tracking-widest">{t('E-mail de Acesso', 'Email')}</label>
              <input type="email" value={loginUser} onChange={(e)=>setLoginUser(e.target.value)} required className="w-full px-5 py-4 border-2 border-zinc-700 rounded-2xl outline-none focus:border-yellow-500 bg-zinc-800 text-white font-bold transition-all placeholder:text-zinc-500" placeholder="seu.nome@kalenborn.com.br" />
            </div>
            <div>
              <label className="block text-xs font-black text-yellow-500 mb-2 uppercase tracking-widest">{t('Senha de Acesso', 'Password')}</label>
              <input type="password" value={loginPass} onChange={(e)=>setLoginPass(e.target.value)} required className="w-full px-5 py-4 border-2 border-zinc-700 rounded-2xl outline-none focus:border-yellow-500 bg-zinc-800 text-white font-bold transition-all placeholder:text-zinc-500" placeholder="••••••••" />
            </div>
            {loginError && <div className="text-red-500 text-sm font-bold text-center p-4 bg-red-500/10 rounded-xl border border-red-500/20">{t('Credenciais inválidas. Verifique seu e-mail e senha.', 'Invalid credentials. Please check your email and password.')}</div>}
            <button type="submit" disabled={loading} className="w-full bg-yellow-500 text-black font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-yellow-400 transition-all shadow-xl shadow-yellow-500/20 active:scale-95">
              {loading ? t('Acedendo...', 'Logging in...') : t('Entrar no Sistema', 'Sign In')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- TELA FINANCEIRO (FÁBIO) ---
  const renderFinanceiro = () => {
    const handleSaveFinance = async () => {
        setLoading(true);
        const payload = JSON.stringify({ margins: financeMargins, pcp: pcpMargin });
        try {
            await supabaseClient.from('indicator_comments').delete().eq('indicator_id', 9999).eq('period', 'FINANCE_MARGINS');
            await supabaseClient.from('indicator_comments').insert([{ indicator_id: 9999, period: 'FINANCE_MARGINS', comment: payload }]);
            showToast(t("Margens salvas com sucesso!", "Margins saved successfully!"));
            loadData();
        } catch(e) {
            showToast(t("Erro ao salvar", "Error saving"), "error");
        }
        setLoading(false);
    };

    const financeCategories = Array.from(new Set(incomingOrders.map(o => (o.kalenborn_group || o.category || o.product || '').trim()).filter(Boolean))).sort();
    
    // CORREÇÃO: Faturamento Realizado do PCP (ID 24)
    const pcpYtd = computedData.filter(v => v.indicator_id === 24).reduce((a,c) => a + parseFloat(c.value||0), 0);
    const pcpProfit = (pcpYtd * (parseFloat(pcpMargin)||0)) / 100;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
           <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-zinc-200">
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
                  <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl"><DollarSign size={24} /></div>
                  {t('Painel Financeiro', 'Financial Dashboard')}
              </h2>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200">
                   <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4">{t('Definição de Margens (%)', 'Margin Settings (%)')}</h3>
                   <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                       <div className="bg-zinc-100 p-3 rounded-xl flex justify-between items-center border border-zinc-300 shadow-sm">
                           <div className="flex flex-col">
                               <span className="font-bold text-xs">{t('Margem de Lucro PCP (%)', 'PCP Profit Margin (%)')}</span>
                               <span className="text-[10px] text-zinc-500 font-medium mt-0.5">{t('Faturamento Atual:', 'Current Revenue:')} <strong className="text-zinc-700">{formatCurrency(pcpYtd)}</strong></span>
                           </div>
                           <input type="number" step="any" className="w-20 p-2 text-right rounded-lg border border-zinc-300 font-black text-sm outline-none focus:border-yellow-500" value={pcpMargin} onChange={e=>setPcpMargin(e.target.value)} />
                       </div>
                       <hr className="my-3 border-zinc-200" />
                       {financeCategories.map(cat => (
                           <div key={cat} className="bg-zinc-50 p-3 rounded-xl flex justify-between items-center border border-zinc-200">
                               <span className="font-bold text-xs truncate mr-2" title={cat}>{cat}</span>
                               <input type="number" step="any" className="w-20 p-2 text-right rounded-lg border font-black text-sm outline-none focus:border-yellow-500" value={financeMargins[cat] || ''} onChange={e=>setFinanceMargins({...financeMargins, [cat]: e.target.value})} placeholder="0" />
                           </div>
                       ))}
                   </div>
                   <button onClick={handleSaveFinance} disabled={loading} className="w-full mt-4 bg-black text-yellow-500 py-4 rounded-xl font-black shadow-lg active:scale-95 flex justify-center items-center gap-2"><Save size={18}/> {t('Gravar Margens', 'Save Margins')}</button>
               </div>

               <div className="lg:col-span-2 flex flex-col gap-6">
                   <div className="bg-zinc-950 p-6 rounded-3xl shadow-xl border border-zinc-800 flex items-center justify-between">
                       <div>
                           <p className="text-[10px] font-black text-yellow-500 uppercase mb-1">{t('Lucro Projetado (Faturamento PCP)', 'Projected Profit (Actual Revenue)')}</p>
                           <h3 className="text-4xl font-black text-white">{formatCurrency(pcpProfit)}</h3>
                       </div>
                       <div className="text-right">
                           <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">{t('Base de Cálculo YTD', 'YTD Revenue Base')}</p>
                           <h3 className="text-xl font-bold text-zinc-300">{formatCurrency(pcpYtd)}</h3>
                       </div>
                   </div>

                   <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 flex-1 flex flex-col min-h-0">
                      <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4">{t('Lucro por Categoria (Vendas Realizadas)', 'Profit by Category (Actual Sales)')}</h3>
                      <div className="flex-1 min-h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={profitDataFinanceiro} margin={{top:20, right:10, left:-20, bottom:0}}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold', fill: '#71717a'}} dy={10} interval={0} angle={-30} textAnchor="end" height={60} tickFormatter={(val) => truncateText(val, 15)} />
                                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => formatCurrencyShort(val)} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={-10} />
                                  <Tooltip content={<CustomTooltipGeral />} cursor={{fill: '#f4f4f5'}} />
                                  <Bar dataKey="Lucro" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                      <LabelList dataKey="Lucro" position="top" fill="#71717a" fontSize={9} fontWeight="bold" formatter={(val) => formatCurrencyShort(val)} />
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                   </div>
               </div>
           </div>
        </div>
    )
  };

  // --- TELA INTELIGÊNCIA COMERCIAL ---
  const renderComercial = () => {
      const filteredOrders = incomingOrders.filter(o => {
          if (comercialViewPeriod === 'ALL') return true;
          const orderMonth = normalizeExcelMonth(o.month);
          
          if (comercialViewMode === 'MONTHLY') {
              return orderMonth === comercialViewPeriod; 
          } else {
              return monthOrder[orderMonth] <= monthOrder[comercialViewPeriod]; 
          }
      });

      const totalVendido = filteredOrders.reduce((acc, curr) => acc + (parseFloat(curr.net_value) || 0), 0);
      const totalPedidos = filteredOrders.length;

      const aggregateBy = (key, valueKey = 'net_value', sumQty = false) => {
          const acc = {};
          filteredOrders.forEach(o => {
              const k = o[key] || 'N/D';
              if (!acc[k]) acc[k] = { name: k, value: 0, qty: 0 };
              acc[k].value += (parseFloat(o[valueKey]) || 0);
              if (sumQty) acc[k].qty += (parseFloat(o.qty) || 0);
          });
          return Object.values(acc).sort((a,b) => b.value - a.value); 
      };

      const dataRegion = aggregateBy('region');
      const dataSalesRep = aggregateBy('sales_rep');
      const dataItem = aggregateBy('item');
      const dataPG = aggregateBy('pg');
      const dataTipo = aggregateBy('tipo');
      const totalTipo = dataTipo.reduce((sum, item) => sum + (item.value || 0), 0);
      const dataClientFull = aggregateBy('client', 'net_value', true);
      const dataClientTop15 = dataClientFull.slice(0, 15);

      return (
          <div className="space-y-6 animate-in fade-in duration-500">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-zinc-200">
                   <div className="flex items-center gap-3 ml-4">
                      <Briefcase className="text-yellow-500" size={24} />
                      <div>
                          <h2 className="text-xl font-black text-zinc-900 tracking-tight leading-none">{t('Inteligência Comercial', 'Business Intelligence')}</h2>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">{t('Análise Tática de Vendas', 'Tactical Sales Analysis')}</p>
                      </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-3 bg-zinc-50 p-2 rounded-2xl border border-zinc-200">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">{t('Modo de Análise', 'View Mode')}</label>
                          <select className="border-none bg-white text-zinc-900 px-4 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer shadow-sm" value={comercialViewMode} onChange={(e) => setComercialViewMode(e.target.value)}>
                              <option value="YTD">{t('Acumulado Anual (YTD)', 'Year-to-Date (YTD)')}</option>
                              <option value="MONTHLY">{t('Apenas o Mês Específico', 'Monthly View')}</option>
                          </select>
                      </div>
                      <div className="flex items-center gap-3 bg-zinc-50 p-2 rounded-2xl border border-zinc-200">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">{comercialViewMode === 'MONTHLY' ? t('Mês Referência', 'Reporting Month') : t('Acumulado Até', 'YTD as of')}</label>
                          <select className="border-none bg-white text-zinc-900 px-4 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer shadow-sm" value={comercialViewPeriod} onChange={(e) => setComercialViewPeriod(e.target.value)}>
                              <option value="ALL">{t('Todo o Ano (Geral)', 'Full Year Overview')}</option>
                              {months.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-950 p-6 rounded-3xl shadow-xl border border-zinc-800">
                      <p className="text-[10px] font-black text-yellow-500 uppercase mb-1">{t('Volume Convertido (Net Value)', 'Booked Revenue (Net Value)')}</p>
                      <h3 className="text-4xl font-black text-white">{formatCurrency(totalVendido)}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200">
                      <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">{t('Quantidade de Entradas (Orders)', 'Order Intake (Volume)')}</p>
                      <h3 className="text-4xl font-black text-zinc-900">{totalPedidos} <span className="text-sm font-bold text-zinc-400">{t('pedidos mapeados', 'orders processed')}</span></h3>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200 flex flex-col h-[400px]">
                      <div className="mb-4">
                          <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest">{t('Penetração por Região', 'Market Penetration by Region')}</h3>
                          <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase">{t('Volume de Vendas R$', 'Sales Revenue (BRL)')}</p>
                      </div>
                      <div className="flex-1 min-h-0 relative mt-2">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={dataRegion} layout="vertical" margin={{top: 0, right: 60, left: 10, bottom: 0}}>
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                                  <XAxis type="number" hide />
                                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold', fill: '#52525b'}} width={110} tickFormatter={(val) => truncateText(val, 15)} />
                                  <Tooltip content={<CustomTooltipGeral />} cursor={{fill: '#f4f4f5'}} />
                                  <Bar dataKey="value" name={t('Vendido R$', 'Revenue (BRL)')} radius={[0, 4, 4, 0]} barSize={24}>
                                      {dataRegion.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                                      <LabelList dataKey="value" position="right" fill="#71717a" fontSize={11} fontWeight="bold" formatter={(val) => formatCurrencyShort(val)} />
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200 flex flex-col h-[400px]">
                      <div className="mb-4">
                          <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest">{t('Performance por Vendedor', 'Sales Representative Performance')}</h3>
                          <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase">{t('Volume Convertido (Sales Rep)', 'Booked Revenue by Rep')}</p>
                      </div>
                      <div className="flex-1 min-h-0 mt-4">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={dataSalesRep} margin={{top:20, right:10, left:-20, bottom:0}}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#71717a'}} dy={10} angle={-45} textAnchor="end" height={80} interval={0} tickFormatter={(val) => truncateText(val, 12)} />
                                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => formatCurrencyShort(val)} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={-10} />
                                  <Tooltip content={<CustomTooltipGeral />} cursor={{fill: '#f4f4f5'}} />
                                  <Bar dataKey="value" name={t('Vendido', 'Booked')} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                      <LabelList dataKey="value" position="top" fill="#71717a" fontSize={9} fontWeight="bold" formatter={(val) => formatCurrencyShort(val)} />
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200 flex flex-col h-[400px]">
                      <div className="mb-4">
                          <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest">{t('Saída por Linha de Item', 'Revenue by Product Line')}</h3>
                          <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase">{t('Ex: Chapa de desgaste, Kalfix, Tubulação...', 'E.g., Wear plate, Kalfix, Piping...')}</p>
                      </div>
                      <div className="flex-1 min-h-0 mt-4">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={dataItem.slice(0, 10)} margin={{top:20, right:10, left:-20, bottom:0}}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold', fill: '#71717a'}} dy={10} interval={0} angle={-45} textAnchor="end" height={90} tickFormatter={(val) => truncateText(val, 16)} />
                                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => formatCurrencyShort(val)} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={-10} />
                                  <Tooltip content={<CustomTooltipGeral />} cursor={{fill: '#f4f4f5'}} />
                                  <Bar dataKey="value" name={t('Vendido', 'Booked')} fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                      <LabelList dataKey="value" position="top" fill="#71717a" fontSize={9} fontWeight="bold" formatter={(val) => formatCurrencyShort(val)} />
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  <div className="flex flex-col gap-6 h-[400px]">
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 flex-1 flex flex-col min-h-0">
                          <div className="mb-2 flex justify-between items-center">
                              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest">{t('Classificação PG', 'Product Group (PG) Breakdown')}</h3>
                          </div>
                          <div className="flex-1 min-h-0 mt-2">
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={dataPG} layout="vertical" margin={{top: 0, right: 40, left: 10, bottom: 0}}>
                                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                                      <XAxis type="number" hide />
                                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold', fill: '#52525b'}} width={50} />
                                      <Tooltip content={<CustomTooltipGeral />} cursor={{fill: '#f4f4f5'}} />
                                      <Bar dataKey="value" name={t('Vendido', 'Booked')} fill="#eab308" radius={[0, 4, 4, 0]} barSize={20}>
                                          <LabelList dataKey="value" position="right" fill="#71717a" fontSize={10} fontWeight="bold" formatter={(val) => formatCurrencyShort(val)} />
                                      </Bar>
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>
                      </div>

                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 flex-1 flex flex-col min-h-0">
                          <div className="mb-2">
                              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest">{t('Modalidade de Vendas', 'Contract Type Breakdown')}</h3>
                              <p className="text-[9px] font-bold text-zinc-500 mt-0.5 uppercase">{t('Contrato vs Spot', 'Contract vs. Spot')}</p>
                          </div>
                          <div className="flex-1 min-h-0 mt-2">
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={dataTipo} layout="vertical" margin={{top: 0, right: 40, left: 10, bottom: 0}}>
                                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" />
                                      <XAxis type="number" hide />
                                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold', fill: '#71717a'}} width={65} />
                                      <Tooltip content={<CustomTooltipGeral />} cursor={{fill: '#f4f4f5'}} />
                                      <Bar dataKey="value" name={t('Vendido', 'Booked')} radius={[0, 4, 4, 0]} barSize={20}>
                                          {dataTipo.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#f97316' : '#18181b'} />)}
                                          <LabelList dataKey="value" position="insideLeft" fill="#ffffff" fontSize={10} fontWeight="900" offset={8} formatter={(val) => totalTipo > 0 ? `${((val / totalTipo) * 100).toFixed(1)}%` : ''} />
                                          <LabelList dataKey="value" position="right" fill="#71717a" fontSize={11} fontWeight="bold" formatter={(val) => formatCurrencyShort(val)} />
                                      </Bar>
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>
                      </div>
                  </div>

                  <div className="bg-zinc-950 p-8 rounded-3xl shadow-xl border border-zinc-800 flex flex-col h-[600px] lg:col-span-2">
                      <div className="mb-6">
                          <h3 className="text-sm font-bold text-white uppercase tracking-widest">{t('Top 15 Clientes de Maior Expressão', 'Top 15 Key Accounts')}</h3>
                          <p className="text-[10px] font-bold text-yellow-500 mt-1 uppercase">{t('Volume Financeiro (Barras) e Quantidade de Peças (QTD no final da barra)', 'Revenue (Bars) and Unit Volume (Labels)')}</p>
                      </div>
                      <div className="flex-1 min-h-0 mt-2">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={dataClientTop15} layout="vertical" margin={{top: 0, right: 80, left: 0, bottom: 0}}>
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#27272a" />
                                  <XAxis type="number" hide />
                                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#a1a1aa'}} width={200} tickFormatter={(val) => truncateText(val, 25)} />
                                  <Tooltip content={<CustomTooltipGeral />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                                  <Bar dataKey="value" name={t('Vendido R$', 'Revenue (BRL)')} fill="#eab308" radius={[0, 4, 4, 0]} maxBarSize={24}>
                                      <LabelList dataKey="value" position="right" fill="#e4e4e7" fontSize={11} fontWeight="bold" formatter={(val) => formatCurrencyShort(val)} />
                                      <LabelList dataKey="qty" position="right" fill="#71717a" fontSize={9} fontWeight="bold" offset={45} formatter={(val) => `(${val} un)`} />
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

              </div>
          </div>
      );
  };

  // --- TELA DE DIRETORIA ---
  const renderDiretoria = () => {
    const currentMonthKey = kpiViewPeriod === 'ALL' ? months[new Date().getMonth()] : kpiViewPeriod;
    const mesAtualNum = monthOrder[currentMonthKey] || 1;
    
    const metaIdealFaturamento = (META_ANUAL_FATURAMENTO / 12) * mesAtualNum;
    const metaIdealVendas = (META_ANUAL_VENDAS / 12) * mesAtualNum;

    let computedDataDiretoria = computedData;
    if (kpiViewPeriod !== 'ALL') {
        computedDataDiretoria = computedData.filter(v => monthOrder[v.period] <= monthOrder[kpiViewPeriod]);
    }

    const faturamentoRealizado = computedDataDiretoria.filter(v => v.indicator_id === 24).reduce((acc, curr) => acc + parseFloat(curr.value || 0), 0);
    const atingimentoMetaFat = META_ANUAL_FATURAMENTO > 0 ? (faturamentoRealizado / META_ANUAL_FATURAMENTO) * 100 : 0;
    const diferencaMetaIdealFat = faturamentoRealizado - metaIdealFaturamento;
    const percMetaIdealFat = metaIdealFaturamento > 0 ? (faturamentoRealizado / metaIdealFaturamento) * 100 : 0;

    const vendasRealizadas = computedDataDiretoria.filter(v => v.indicator_id === 1).reduce((acc, curr) => acc + parseFloat(curr.value || 0), 0);
    const atingimentoMetaVen = META_ANUAL_VENDAS > 0 ? (vendasRealizadas / META_ANUAL_VENDAS) * 100 : 0;
    const diferencaMetaIdealVen = vendasRealizadas - metaIdealVendas;
    const percMetaIdealVen = metaIdealVendas > 0 ? (vendasRealizadas / metaIdealVendas) * 100 : 0;

    const getSumByName = (name) => {
        const ind = dbIndicators.find(i => i.name === name);
        if (!ind) return 0;
        return computedDataDiretoria.filter(v => v.indicator_id === ind.id).reduce((acc, curr) => acc + parseFloat(curr.value || 0), 0);
    };

    const volumePropostas = getSumByName('Volume líquido orçamentos enviados (R$)');
    const orcamentosEnviados = getSumByName('Nº de orçamentos enviados');
    const orcamentosAprovados = getSumByName('Nº de orçamentos aprovados');
    const visitas = getSumByName('Nº visitas técnica/comercial');

    const filteredIncomingDiretoria = incomingOrders.filter(o => {
        if (kpiViewPeriod === 'ALL') return true;
        const orderMonth = normalizeExcelMonth(o.month);
        return monthOrder[orderMonth] <= monthOrder[kpiViewPeriod];
    });

    const aggregateIncoming = (key, valueKey = 'net_value') => {
        const acc = {};
        filteredIncomingDiretoria.forEach(o => {
            const k = o[key] || 'N/D';
            if (!acc[k]) acc[k] = { name: k, value: 0 };
            acc[k].value += (parseFloat(o[valueKey]) || 0);
        });
        return Object.values(acc).sort((a,b) => b.value - a.value);
    };

    const contratoSpotData = aggregateIncoming('tipo');
    const totalContratoSpot = contratoSpotData.reduce((sum, item) => sum + (item.value || 0), 0);
    const pgData = aggregateIncoming('pg');

    const profitDataExecutivo = (() => {
        const salesByCat = {};
        filteredIncomingDiretoria.forEach(o => {
            const cat = (o.kalenborn_group || o.category || o.product || '').trim();
            if(cat) {
                if(!salesByCat[cat]) salesByCat[cat] = 0;
                salesByCat[cat] += (parseFloat(o.net_value) || 0);
            }
        });
        return Object.keys(salesByCat).map(cat => {
            const margin = parseFloat(financeMargins[cat]) || 0;
            return { name: cat, Lucro: (salesByCat[cat] * margin) / 100 };
        }).filter(d => d.Lucro > 0).sort((a,b) => b.Lucro - a.Lucro).slice(0, 10);
    })();

    const financeiroData = months.filter(m => kpiViewPeriod === 'ALL' || monthOrder[m] <= monthOrder[kpiViewPeriod]).map(m => {
        const previsto = computedData.find(v => v.indicator_id === 23 && v.period === m)?.value || 0;
        const realizado = computedData.find(v => v.indicator_id === 24 && v.period === m)?.value || 0;
        return { name: m, Previsto: parseFloat(previsto), Realizado: parseFloat(realizado) };
    }).filter(d => d.Previsto > 0 || d.Realizado > 0);

    const propostasVsVendasData = months.filter(m => kpiViewPeriod === 'ALL' || monthOrder[m] <= monthOrder[kpiViewPeriod]).map(m => {
        const propGeradas = computedDataDiretoria.find(v => v.indicator_id === 7 && v.period === m)?.value || 0; 
        const propVendidas = computedDataDiretoria.find(v => v.indicator_id === 1 && v.period === m)?.value || 0; 
        const conversao = propGeradas > 0 ? (propVendidas / propGeradas) * 100 : 0;
        return { name: m, 'Gerado R$': parseFloat(propGeradas), 'Vendido R$': parseFloat(propVendidas), 'Conversão %': parseFloat(conversao) };
    }).filter(d => d['Gerado R$'] > 0 || d['Vendido R$'] > 0);

    const trackingPropData = months.filter(m => kpiViewPeriod === 'ALL' || monthOrder[m] <= monthOrder[kpiViewPeriod]).map(m => {
        const enviadas = computedDataDiretoria.find(v => v.indicator_id === 6 && v.period === m)?.value || 0;
        const convertidas = computedDataDiretoria.find(v => v.indicator_id === 4 && v.period === m)?.value || 0;
        const abertas = Math.max(0, enviadas - convertidas);
        return { name: m, 'Enviadas': parseFloat(enviadas), 'Convertidas': parseFloat(convertidas), 'Em Aberto': parseFloat(abertas) };
    }).filter(d => d.Enviadas > 0 || d.Convertidas > 0);

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
        { subject: translateArea('Comercial'), Realizado: calcMedia([74, 75, 76, 77, 78], []), Meta: 100 }, 
        { subject: translateArea('Engenharia'), Realizado: calcMedia([], [79, 80]), Meta: 100 }, 
        { subject: 'PCP', Realizado: calcMedia([81], []), Meta: 100 },
        { subject: translateArea('Produção'), Realizado: calcMedia([85], [86]), Meta: 100 }, 
        { subject: 'Supply', Realizado: calcMedia([83], [84]), Meta: 100 }, 
        { subject: translateArea('Qualidade'), Realizado: calcMedia([], [82]), Meta: 100 }, 
        { subject: translateArea('DP'), Realizado: calcMedia([], [87, 88, 89]), Meta: 100 } 
    ];

    const activeSector = saudeData[currentSectorIndex] || saudeData[0];
    const isSectorAlert = activeSector.Realizado < activeSector.Meta;

    const handlePrevSector = () => setCurrentSectorIndex(prev => (prev - 1 + saudeData.length) % saudeData.length);
    const handleNextSector = () => setCurrentSectorIndex(prev => (prev + 1) % saudeData.length);

    const areasParaGrafico = ['Comercial', 'Engenharia', 'PCP', 'Produção', 'Supply', 'Qualidade', 'DP'];
    const stackedData = areasParaGrafico.map(ar => {
        const areaActions = actions.filter(a => a.area === ar);
        return {
            name: translateArea(ar),
            Concluído: areaActions.filter(a => a.status === 'Concluído').length,
            Atrasado: areaActions.filter(a => checkOverdue(a.when, a.status)).length,
            'Em Andamento': areaActions.filter(a => !checkOverdue(a.when, a.status) && (a.status === 'Em Andamento' || a.status === 'Urgente')).length,
            'A Fazer': areaActions.filter(a => !checkOverdue(a.when, a.status) && a.status === 'A Fazer').length
        };
    });

    const renderBudgetCard = (title, metaTotal, realizado, atingimentoMeta, metaIdeal, diferencaIdeal, percIdeal) => {
        const isAlert = diferencaIdeal < 0;
        return (
            <div className={`bg-zinc-950 p-8 rounded-3xl shadow-2xl relative overflow-hidden border-2 ${isAlert ? 'border-red-500/50 shadow-red-500/10' : 'border-zinc-800'}`}>
                <h3 className="text-white text-xl font-black mb-6">{title}</h3>
                <div className="relative z-10">
                    <div className="flex justify-between text-white text-sm font-bold mb-3">
                        <div>
                            <span className="text-zinc-400 block text-[10px] uppercase tracking-widest mb-1">{t('Realizado (YTD)', 'Actual (YTD)')}</span>
                            <span className="text-3xl text-white">{formatCurrency(realizado)}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-zinc-400 block text-[10px] uppercase tracking-widest mb-1">{t('Meta Anual', 'Annual Target')}</span>
                            <span className="text-xl text-yellow-500">{formatCurrency(metaTotal)}</span>
                        </div>
                    </div>
                    
                    <div className="w-full bg-zinc-800 h-6 rounded-full overflow-hidden border border-zinc-700 p-0.5">
                        <div className={`${isAlert ? 'bg-red-500' : 'bg-yellow-500'} h-full rounded-full transition-all duration-1000 relative flex items-center justify-end pr-2`} style={{width: `${Math.max(5, Math.min(100, atingimentoMeta))}%`}}>
                            {atingimentoMeta > 5 && <span className={`text-[10px] font-black ${isAlert ? 'text-white' : 'text-zinc-900'}`}>{atingimentoMeta.toFixed(1)}%</span>}
                        </div>
                    </div>
                    
                    <div className="mt-6 pt-5 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <span className="text-zinc-400 block text-[10px] uppercase tracking-widest mb-1">
                                {t(`BUDGET (${currentMonthKey})`, `BUDGET (${currentMonthKey}/${new Date().getFullYear()})`)}
                            </span>
                            <span className="text-xl font-black text-zinc-300">{formatCurrency(metaIdeal)}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-zinc-400 block text-[10px] uppercase tracking-widest mb-1">{t('Status vs Planejado', 'Variance to Target')}</span>
                            <div className="flex items-center justify-end gap-2">
                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${!isAlert ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {!isAlert ? '+' : ''}{formatCurrency(diferencaIdeal)}
                                </span>
                                <span className={`font-black ${!isAlert ? 'text-green-400' : 'text-red-400'}`}>
                                    ({percIdeal.toFixed(1)}% {t('do ideal', 'of target')})
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                {isAlert && <AlertTriangle className="absolute right-5 top-5 w-40 h-40 text-red-500 opacity-5 pointer-events-none" />}
                {!isAlert && <Target className="absolute right-5 top-5 w-40 h-40 text-white opacity-5 pointer-events-none" />}
            </div>
        );
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-zinc-200">
             <div className="flex items-center gap-3 ml-4">
                <Crown className="text-yellow-500" size={24} />
                <h2 className="text-xl font-black text-zinc-900 tracking-tight">{t('Painel Executivo', 'Executive Dashboard')}</h2>
            </div>
            <div className="flex items-center gap-3 bg-zinc-50 p-2 rounded-2xl border border-zinc-200">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">{t('Análise até o mês', 'YTD as of')}</label>
                <select className="border-none bg-white text-zinc-900 px-4 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer shadow-sm" value={kpiViewPeriod} onChange={(e) => setKpiViewPeriod(e.target.value)}>
                    <option value="ALL">{t('Acumulado do Ano (YTD)', 'Year-to-Date (YTD)')}</option>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderBudgetCard(t("Meta Anual Faturamento", "Annual Revenue Target"), META_ANUAL_FATURAMENTO, faturamentoRealizado, atingimentoMetaFat, metaIdealFaturamento, diferencaMetaIdealFat, percMetaIdealFat)}
            {renderBudgetCard(t("Meta Anual Vendas", "Annual Booking Target"), META_ANUAL_VENDAS, vendasRealizadas, atingimentoMetaVen, metaIdealVendas, diferencaMetaIdealVen, percMetaIdealVen)}
        </div>

        <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest ml-2 mt-8 mb-[-10px]">{t('Destaques da Operação Comercial (YTD)', 'Sales Operations Highlights (YTD)')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                <p className="text-[10px] font-black text-yellow-600 uppercase mb-1">{t('Volume de Vendas', 'Total Sales Booking')}</p>
                <h3 className="text-xl md:text-2xl font-black text-zinc-900 truncate">{formatCurrency(vendasRealizadas)}</h3>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                <p className="text-[10px] font-black text-yellow-600 uppercase mb-1">{t('Volume de Propostas', 'Total Quoted Value')}</p>
                <h3 className="text-xl md:text-2xl font-black text-zinc-900 truncate">{formatCurrency(volumePropostas)}</h3>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center">
                <p className="text-[10px] font-black text-emerald-500 uppercase mb-1">{t('Aprovados vs Orçados', 'Won vs Quoted (Count)')}</p>
                <h3 className="text-xl md:text-2xl font-black text-zinc-900">{orcamentosAprovados} / {orcamentosEnviados} <span className="text-[10px] text-zinc-400 font-medium ml-1">QTY</span></h3>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                <p className="text-[10px] font-black text-orange-500 uppercase mb-1">{t('Visitas Realizadas', 'Customer Visits')}</p>
                <h3 className="text-xl md:text-2xl font-black text-zinc-900">{visitas} <span className="text-[10px] text-zinc-400 font-medium ml-1">QTY</span></h3>
            </div>
        </div>

        {/* GRAFICOS EXTRAS: PROPOSTAS E CONVERSÃO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200 flex flex-col h-[500px]">
                <div className="mb-6 flex justify-between items-start">
                    <div>
                        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest">{t('Conversão de Propostas (Mensal)', 'Quote-to-Order Conversion (Monthly)')}</h3>
                        <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase">{t('Gerado vs Vendido vs % Conversão (Semáforo)', 'Quoted vs Booked vs Win Rate (%)')}</p>
                    </div>
                </div>
                <div className="flex-1 min-h-0 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={propostasVsVendasData} margin={{top:60, right:10, left:-20, bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#71717a'}} dy={10} />
                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tickFormatter={(val) => formatCurrencyShort(val)} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={-10} />
                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={10} tickFormatter={(v)=>v+'%'} />
                            <Tooltip content={<CustomTooltipGeral />} cursor={{fill: '#f4f4f5'}} />
                            <Legend wrapperStyle={{fontSize: '11px', fontWeight: 'bold', paddingTop: '20px'}} />

                            <Bar yAxisId="left" dataKey="Gerado R$" name={t('Gerado R$', 'Quoted BRL')} fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={30}>
                                <LabelList dataKey="Gerado R$" content={(props) => {
                                    const { x, y, width, value } = props;
                                    if (!value || value <= 0) return null;
                                    return (
                                        <g>
                                            <text x={x + width / 2} y={y - 12} stroke="white" strokeWidth={5} strokeLinejoin="round" fill="white" fontSize={11} fontWeight="900" textAnchor="middle">{formatCurrencyShort(value)}</text>
                                            <text x={x + width / 2} y={y - 12} fill="#71717a" fontSize={11} fontWeight="900" textAnchor="middle">{formatCurrencyShort(value)}</text>
                                        </g>
                                    );
                                }} />
                            </Bar>
                            
                            <Bar yAxisId="left" dataKey="Vendido R$" name={t('Vendido R$', 'Booked BRL')} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30}>
                                <LabelList dataKey="Vendido R$" content={(props) => {
                                    const { x, y, width, value } = props;
                                    if (!value || value <= 0) return null;
                                    return (
                                        <g>
                                            <text x={x + width / 2} y={y - 12} stroke="white" strokeWidth={5} strokeLinejoin="round" fill="white" fontSize={11} fontWeight="900" textAnchor="middle">{formatCurrencyShort(value)}</text>
                                            <text x={x + width / 2} y={y - 12} fill="#71717a" fontSize={11} fontWeight="900" textAnchor="middle">{formatCurrencyShort(value)}</text>
                                        </g>
                                    );
                                }} />
                            </Bar>
                            
                            <Line yAxisId="right" type="monotone" dataKey="Conversão %" name={t('Conversão %', 'Win Rate %')} stroke="#a1a1aa" strokeOpacity={0.4} strokeWidth={3} dot={(props) => {
                                const { cx, cy, value } = props;
                                let fill = value >= 30 ? '#10b981' : (value >= 15 ? '#eab308' : '#ef4444');
                                return <circle cx={cx} cy={cy} r={3.5} fill={fill} stroke="white" strokeWidth={1.5} key={cx} />;
                            }}>
                                <LabelList dataKey="Conversão %" content={(props) => {
                                    const { x, y, value } = props;
                                    if (!value || value <= 0) return null;
                                    return (
                                        <g>
                                            <rect x={x - 22} y={y - 34} width={44} height={20} fill="#ffffff" rx={10} stroke="#e4e4e7" strokeWidth={1} />
                                            <text x={x} y={y - 20} fill="#000000" fontSize={11} fontWeight="900" textAnchor="middle">{value.toFixed(1)}%</text>
                                        </g>
                                    );
                                }} />
                            </Line>

                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200 flex flex-col h-[500px]">
                <div className="mb-6 flex justify-between items-start">
                    <div>
                        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest">{t('Funil de Orçamentos', 'Sales Funnel (Quotes)')}</h3>
                        <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase">{t('Em Aberto vs Enviadas vs Convertidas', 'Open vs Submitted vs Won')}</p>
                    </div>
                </div>
                <div className="flex-1 min-h-0 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trackingPropData} margin={{top:60, right:10, left:-20, bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#71717a'}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={-10} />
                            <Tooltip content={<CustomTooltipGeral />} cursor={{fill: '#f4f4f5'}} />
                            <Legend wrapperStyle={{fontSize: '11px', fontWeight: 'bold', paddingTop: '20px'}} />
                            
                            <Bar dataKey="Em Aberto" name={t('Em Aberto', 'Open')} fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={20}>
                                <LabelList dataKey="Em Aberto" content={(props) => {
                                    const { x, y, width, value } = props;
                                    if (!value || value <= 0) return null;
                                    return (
                                        <g>
                                            <text x={x + width / 2} y={y - 10} stroke="white" strokeWidth={5} strokeLinejoin="round" fill="white" fontSize={11} fontWeight="900" textAnchor="middle">{value}</text>
                                            <text x={x + width / 2} y={y - 10} fill="#71717a" fontSize={11} fontWeight="900" textAnchor="middle">{value}</text>
                                        </g>
                                    );
                                }} />
                            </Bar>
                            
                            <Bar dataKey="Enviadas" name={t('Enviadas', 'Submitted')} fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={20}>
                                <LabelList dataKey="Enviadas" content={(props) => {
                                    const { x, y, width, value } = props;
                                    if (!value || value <= 0) return null;
                                    return (
                                        <g>
                                            <text x={x + width / 2} y={y - 10} stroke="white" strokeWidth={5} strokeLinejoin="round" fill="white" fontSize={11} fontWeight="900" textAnchor="middle">{value}</text>
                                            <text x={x + width / 2} y={y - 10} fill="#71717a" fontSize={11} fontWeight="900" textAnchor="middle">{value}</text>
                                        </g>
                                    );
                                }} />
                            </Bar>
                            
                            <Bar dataKey="Convertidas" name={t('Convertidas', 'Won')} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20}>
                                <LabelList dataKey="Convertidas" content={(props) => {
                                    const { x, y, width, value } = props;
                                    if (!value || value <= 0) return null;
                                    return (
                                        <g>
                                            <text x={x + width / 2} y={y - 10} stroke="white" strokeWidth={5} strokeLinejoin="round" fill="white" fontSize={11} fontWeight="900" textAnchor="middle">{value}</text>
                                            <text x={x + width / 2} y={y - 10} fill="#71717a" fontSize={11} fontWeight="900" textAnchor="middle">{value}</text>
                                        </g>
                                    );
                                }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* GRÁFICOS DIRETORIA - LINHA FINANCEIRO E SAÚDE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <div className="bg-zinc-950 p-8 rounded-3xl shadow-xl border border-zinc-800 flex flex-col h-[500px]">
                <div className="mb-6 flex justify-between items-start">
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">{t('Níveis de Excelência por Setor', 'Departmental Performance Index')}</h3>
                        <p className="text-[10px] font-bold text-yellow-500 mt-1 uppercase">{t('Saúde Global dos Setores Individual', 'Overall Departmental Health')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrevSector} className="p-2 bg-yellow-500 text-black rounded-full hover:bg-yellow-400 transition-colors active:scale-95" title="Setor Anterior">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={handleNextSector} className="p-2 bg-yellow-500 text-black rounded-full hover:bg-yellow-400 transition-colors active:scale-95" title="Próximo Setor">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center relative fade-in" key={currentSectorIndex}>
                    <h3 className="text-3xl font-black text-white mb-2">{activeSector.subject}</h3>
                    <div className="relative w-56 h-56 my-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={[{value: activeSector.Realizado}, {value: Math.max(0, 100 - activeSector.Realizado)}]}
                                    cx="50%" cy="50%" innerRadius={70} outerRadius={90} startAngle={90} endAngle={-270}
                                    dataKey="value" stroke="none"
                                >
                                    <Cell fill={isSectorAlert ? '#ef4444' : '#eab308'} />
                                    <Cell fill="#27272a" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className={`text-4xl font-black ${isSectorAlert ? 'text-red-500' : 'text-yellow-500'}`}>
                                {activeSector.Realizado.toFixed(1)}%
                            </span>
                            <span className="text-[10px] text-zinc-400 uppercase tracking-widest">{t('Realizado', 'Actual')}</span>
                        </div>
                    </div>
                    
                    <div className="flex gap-10 mt-6 w-full justify-center">
                        <div className="text-center bg-zinc-900 px-6 py-3 rounded-xl border border-zinc-800">
                            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t('Meta Geral', 'Benchmark Target')}</p>
                            <p className="text-xl font-bold text-white">100%</p>
                        </div>
                        <div className={`text-center px-6 py-3 rounded-xl border ${isSectorAlert ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                            <p className={`text-xs uppercase tracking-widest mb-1 ${isSectorAlert ? 'text-red-400' : 'text-green-400'}`}>{t('Status', 'Status')}</p>
                            <p className={`text-xl font-bold ${isSectorAlert ? 'text-red-500' : 'text-green-500'}`}>
                                {isSectorAlert ? t('Abaixo do Alvo', 'Below Target') : t('Atingido', 'On Target')}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2 absolute bottom-0">
                        {saudeData.map((_, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === currentSectorIndex ? 'bg-yellow-500 w-4' : 'bg-zinc-700'}`}></div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200 flex flex-col h-[500px]">
                <div className="mb-6 flex justify-between items-start">
                    <div>
                        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest">{t('Desempenho Financeiro (Mês a Mês)', 'Financial Performance (MoM)')}</h3>
                        <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase">{t('Faturamento Realizado vs Planejado', 'Actual vs Budgeted Revenue')}</p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-2xl text-yellow-600"><TrendingUp size={24} /></div>
                </div>
                <div className="flex-1 min-h-0 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={financeiroData} margin={{top:20, right:10, left:-10, bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold', fill: '#71717a'}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => formatCurrencyShort(val)} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={-10} />
                            <Tooltip content={<CustomTooltipFinanceiro />} cursor={{fill: '#f4f4f5'}} />
                            <Legend wrapperStyle={{fontSize: '11px', fontWeight: 'bold', paddingTop: '20px'}} />
                            <Bar dataKey="Previsto" name={t('Previsto', 'Budget')} fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                <LabelList dataKey="Previsto" position="top" fill="#71717a" fontSize={10} fontWeight="bold" formatter={(val) => formatCurrencyShort(val)} />
                            </Bar>
                            <Bar dataKey="Realizado" name={t('Realizado', 'Actual')} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                {financeiroData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.Realizado < entry.Previsto ? '#ef4444' : '#10b981'} />
                                ))}
                                <LabelList dataKey="Realizado" position="top" fill="#71717a" fontSize={10} fontWeight="bold" formatter={(val) => formatCurrencyShort(val)} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* GRÁFICOS DIRETORIA - LINHA 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            
            {/* AGRUPAMENTO: CLASSIFICAÇÃO PG E MODALIDADE (Padrão Comercial) */}
            <div className="flex flex-col gap-6 h-[400px]">
                
                {/* GRÁFICO: POR PG */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 flex-1 flex flex-col min-h-0">
                    <div className="mb-2 flex justify-between items-center">
                        <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest">{t('Classificação PG', 'Product Group (PG) Breakdown')}</h3>
                    </div>
                    <div className="flex-1 min-h-0 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={pgData} layout="vertical" margin={{top: 0, right: 40, left: 10, bottom: 0}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold', fill: '#52525b'}} width={60} />
                                <Tooltip content={<CustomTooltipGeral />} cursor={{fill: '#f4f4f5'}} />
                                <Bar dataKey="value" name={t('Vendido R$', 'Revenue (BRL)')} fill="#eab308" radius={[0, 4, 4, 0]} barSize={20}>
                                    <LabelList dataKey="value" position="right" fill="#71717a" fontSize={10} fontWeight="bold" formatter={(val) => formatCurrencyShort(val)} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* GRÁFICO: SPOT VS CONTRATO */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 flex-1 flex flex-col min-h-0">
                    <div className="mb-2">
                        <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest">{t('Modalidade de Vendas', 'Contract Type Breakdown')}</h3>
                        <p className="text-[9px] font-bold text-zinc-500 mt-0.5 uppercase">{t('Contrato vs Spot (R$)', 'Contract vs. Spot (BRL)')}</p>
                    </div>
                    <div className="flex-1 min-h-0 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={contratoSpotData} layout="vertical" margin={{top: 0, right: 40, left: 10, bottom: 0}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold', fill: '#71717a'}} width={65} />
                                <Tooltip content={<CustomTooltipGeral />} cursor={{fill: '#f4f4f5'}} />
                                <Bar dataKey="value" name={t('Vendido R$', 'Revenue (BRL)')} radius={[0, 4, 4, 0]} barSize={20}>
                                    {contratoSpotData.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#f97316' : '#18181b'} />)}
                                    <LabelList dataKey="value" position="insideLeft" fill="#ffffff" fontSize={10} fontWeight="900" offset={8} formatter={(val) => totalContratoSpot > 0 ? `${((val / totalContratoSpot) * 100).toFixed(1)}%` : ''} />
                                    <LabelList dataKey="value" position="right" fill="#71717a" fontSize={11} fontWeight="bold" formatter={(val) => formatCurrencyShort(val)} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* GRÁFICO: MARGEM DE LUCRO */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 flex flex col h-[400px]">
                <div className="mb-4">
                    <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest">{t('Margem de Lucro Projetado', 'Projected Profit (Production Revenue)')}</h3>
                    <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase">{t('Top Categorias (R$)', 'Top Categories (BRL)')}</p>
                </div>
                <div className="flex-1 min-h-0 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={profitDataExecutivo.slice(0, 5)} layout="vertical" margin={{top: 0, right: 40, left: 0, bottom: 0}}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold', fill: '#71717a'}} width={90} tickFormatter={val => truncateText(val, 12)} />
                            <Tooltip content={<CustomTooltipGeral />} cursor={{fill: '#f4f4f5'}} />
                            <Bar dataKey="Lucro" name={t('Lucro', 'Profit')} fill="#10b981" radius={[0, 4, 4, 0]} barSize={25}>
                                <LabelList dataKey="Lucro" position="right" fill="#71717a" fontSize={10} fontWeight="bold" formatter={(val) => formatCurrencyShort(val)} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>

        {/* 5W2H - Diretoria */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200 flex flex-col h-[450px]">
             <div className="mb-6 flex justify-between items-start">
                <div>
                    <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest">{t('Níveis de Execução (5W2H)', 'Action Plan Execution (5W2H)')}</h3>
                    <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase">{t('Ações Lado a Lado por Setor e Status Atual', 'Action Items by Department and Status')}</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-2xl text-yellow-600"><ListChecks size={24} /></div>
            </div>
            <div className="flex-1 min-h-0 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stackedData} margin={{top:20, right:10, left:-20, bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold', fill: '#71717a'}} dy={10} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={-10} />
                        <Tooltip content={<CustomTooltipGeral />} cursor={{fill: '#f4f4f5'}} />
                        <Legend wrapperStyle={{fontSize: '11px', fontWeight: 'bold', paddingTop: '10px'}} />
                        <Bar dataKey="Atrasado" name={t('Atrasado', 'Overdue')} fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30}>
                            <LabelList dataKey="Atrasado" position="top" fill="#71717a" fontSize={9} formatter={v => v > 0 ? v : ''} />
                        </Bar>
                        <Bar dataKey="Concluído" name={t('Concluído', 'Completed')} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30}>
                            <LabelList dataKey="Concluído" position="top" fill="#71717a" fontSize={9} formatter={v => v > 0 ? v : ''} />
                        </Bar>
                        <Bar dataKey="Em Andamento" name={t('Em Andamento', 'In Progress')} fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={30}>
                            <LabelList dataKey="Em Andamento" position="top" fill="#71717a" fontSize={9} formatter={v => v > 0 ? v : ''} />
                        </Bar>
                        <Bar dataKey="A Fazer" name={t('A Fazer', 'Pending')} fill="#a1a1aa" radius={[4, 4, 0, 0]} maxBarSize={30}>
                            <LabelList dataKey="A Fazer" position="top" fill="#71717a" fontSize={9} formatter={v => v > 0 ? v : ''} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

      </div>
    );
  };

  // --- TELA DE KPI ---
  const renderSparklineCard = (item, isResultado) => {
    // Oculta os gráficos individuais pois já foram fundidos com os gráficos de Atrasos
    if (kpiOwnerId === 1 && item.id === 6) return null; // Comercial: Enviados
    if (kpiOwnerId === 2 && item.id === 12) return null; // Engenharia: Elaborados
    if (kpiOwnerId === 3 && item.id === 33) return null; // PCP: Faturados
    if (kpiOwnerId === 4 && item.id === 36) return null; // Produção: Previstos

    let displayHist = computedData.filter(v => v.indicator_id === item.id && v.owner_id === kpiOwnerId);
    
    // Remove possíveis duplicados do banco (ex: dois registos de MAI)
    const uniqueMap = new Map();
    displayHist.forEach(h => uniqueMap.set(h.period, h));
    displayHist = Array.from(uniqueMap.values());
    
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
    let latestRawVal = null;

    if (displayHist.length > 0) {
        curr = parseFloat(displayHist[displayHist.length - 1].value);
        latestRawVal = curr;
        if (displayHist.length > 1) prev = parseFloat(displayHist[displayHist.length - 2].value);
        
        latestVal = formatNumber(curr, item.unit);
        
        if (prev !== null && prev !== 0) {
            const diff = curr - prev;
            let perc = (diff / prev) * 100;
            if (perc > 999) perc = 999;
            
            const isPositiveTrend = diff > 0;
            let colorClass = 'text-zinc-400';
            
            if (diff !== 0) {
                if (isPositiveTrend) colorClass = item.inverse_goal ? 'text-red-500' : 'text-emerald-500';
                else colorClass = item.inverse_goal ? 'text-emerald-500' : 'text-red-500';
                trendHtml = (
                    <span className={`flex items-center gap-0.5 text-[11px] font-black ${colorClass} bg-zinc-100 px-2 py-0.5 rounded-full`}>
                        {isPositiveTrend ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {Math.abs(perc).toFixed(1)}%
                    </span>
                );
            }
        }
    }

    const baseGraphData = displayHist.slice(-12).map(h => {
        const commentObj = dbComments.find(c => c.indicator_id === item.id && c.period === h.period);
        return { name: h.period, value: parseFloat(h.value), comment: commentObj ? commentObj.comment : null };
    });

    // OVERRIDE CUSTOMIZADO PARA KPIs ESPECÍFICOS (Eng, Prod, Com)
    let CustomBars = null;
    let modifiedGraphData = baseGraphData;
    let displayName = tInd(item.name);

    if (kpiOwnerId === 4 && item.id === 41) { 
        // Prod: Projetos em Atraso (41) vs Previstos (36)
        displayName = t("Projetos: Previstos vs Em Atraso", "Projects: Planned vs Overdue");
        const previstosHist = computedData.filter(v => v.indicator_id === 36 && v.owner_id === 4);
        modifiedGraphData = baseGraphData.map(g => {
            const pVal = previstosHist.find(v => v.period === g.name)?.value || 0;
            return { ...g, 'Total Projetos': parseFloat(pVal), 'Em Atraso': g.value };
        });
        CustomBars = [
            <Bar key="bar1" dataKey="Total Projetos" name={t('Total Projetos', 'Total Projects')} fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={20}>
                <LabelList dataKey="Total Projetos" position="top" fill="#71717a" fontSize={9} formatter={v => v > 0 ? v : ''} />
            </Bar>,
            <Bar key="bar2" dataKey="Em Atraso" name={t('Em Atraso', 'Overdue')} fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={20}>
                <LabelList dataKey="Em Atraso" position="top" fill="#71717a" fontSize={9} formatter={v => v > 0 ? v : ''} />
            </Bar>
        ];
    } else if (kpiOwnerId === 2 && item.id === 13) {
        // Eng: Orc Atraso (13) vs Elaborados (12)
        displayName = t("Orçamentos: Elaborados vs Em Atraso", "Quotes: Prepared vs Overdue");
        const elabHist = computedData.filter(v => v.indicator_id === 12 && v.owner_id === 2);
        modifiedGraphData = baseGraphData.map(g => {
            const eVal = elabHist.find(v => v.period === g.name)?.value || 0;
            return { ...g, 'Enviados': parseFloat(eVal), 'Atraso': g.value };
        });
        CustomBars = [
            <Bar key="bar1" dataKey="Enviados" name={t('Enviados', 'Prepared')} fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={20}>
                <LabelList dataKey="Enviados" position="top" fill="#71717a" fontSize={9} formatter={v => v > 0 ? v : ''} />
            </Bar>,
            <Bar key="bar2" dataKey="Atraso" name={t('Atraso', 'Overdue')} fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={20}>
                <LabelList dataKey="Atraso" position="top" fill="#71717a" fontSize={9} formatter={v => v > 0 ? v : ''} />
            </Bar>
        ];
    } else if (kpiOwnerId === 1 && typeof item.name === 'string' && item.name.toLowerCase().includes('atraso pendentes')) {
        // Com: Orc Atraso Pendentes vs Enviados (6)
        displayName = t("Orçamentos: Enviados vs Em Atraso", "Quotes: Submitted vs Overdue");
        const enviadosHist = computedData.filter(v => v.indicator_id === 6 && v.owner_id === 1);
        modifiedGraphData = baseGraphData.map(g => {
            const eVal = enviadosHist.find(v => v.period === g.name)?.value || 0;
            return { ...g, 'Enviados': parseFloat(eVal), 'Atraso': g.value };
        });
        CustomBars = [
            <Bar key="bar1" dataKey="Enviados" name={t('Enviados', 'Submitted')} fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={20}>
                <LabelList dataKey="Enviados" position="top" fill="#71717a" fontSize={9} formatter={v => v > 0 ? v : ''} />
            </Bar>,
            <Bar key="bar2" dataKey="Atraso" name={t('Atraso', 'Overdue')} fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={20}>
                <LabelList dataKey="Atraso" position="top" fill="#71717a" fontSize={9} formatter={v => v > 0 ? v : ''} />
            </Bar>
        ];
    } else if (kpiOwnerId === 3 && item.id === 35) {
        // PCP: Pedidos Fora do Prazo (35) vs Faturados (33)
        displayName = t("Pedidos: Faturados vs Fora do Prazo", "Orders: Invoiced vs Late");
        const faturadosHist = computedData.filter(v => v.indicator_id === 33 && v.owner_id === 3);
        modifiedGraphData = baseGraphData.map(g => {
            const fVal = faturadosHist.find(v => v.period === g.name)?.value || 0;
            return { ...g, 'Faturados': parseFloat(fVal), 'Atraso': g.value };
        });
        CustomBars = [
            <Bar key="bar1" dataKey="Faturados" name={t('Faturados', 'Invoiced')} fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={20}>
                <LabelList dataKey="Faturados" position="top" fill="#71717a" fontSize={9} formatter={v => v > 0 ? v : ''} />
            </Bar>,
            <Bar key="bar2" dataKey="Atraso" name={t('Fora do Prazo', 'Late')} fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={20}>
                <LabelList dataKey="Atraso" position="top" fill="#71717a" fontSize={9} formatter={v => v > 0 ? v : ''} />
            </Bar>
        ];
    } else if (kpiOwnerId === 1 && item.id === 2) {
        // Com: Ticket Medio -> Mensal + Coluna Acumulada (Soma Direta)
        displayName = t("Ticket Médio (Mensal vs YTD)", "Average Order Value (MoM vs YTD)");
        let sumAcum = 0;
        modifiedGraphData = displayHist.slice(-12).map(h => {
             const m = h.period;
             sumAcum += parseFloat(h.value || 0); // Soma literal mês a mês a pedido da Diretoria
             const commentObj = dbComments.find(c => c.indicator_id === item.id && c.period === m);
             return { name: m, value: parseFloat(h.value), comment: commentObj?.comment, 'Mensal': parseFloat(h.value), 'Acumulado': sumAcum };
        });
        CustomBars = [
            <Bar key="bar1" dataKey="Mensal" name={t('Mensal', 'Monthly')} fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={20}>
                <LabelList dataKey="Mensal" position="top" fill="#71717a" fontSize={9} formatter={v => formatCurrencyShort(v)} />
            </Bar>,
            <Bar key="bar2" dataKey="Acumulado" name={t('Acumulado', 'YTD')} fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={20}>
                <LabelList dataKey="Acumulado" position="top" fill="#71717a" fontSize={9} formatter={v => formatCurrencyShort(v)} />
            </Bar>
        ];
    } else {
        // Standard Bar
        CustomBars = (
            <Bar dataKey="value" name={t('Resultado', 'Actual')} radius={[4, 4, 0, 0]} maxBarSize={40}>
                {modifiedGraphData.map((entry, index) => {
                    let barColor = isResultado ? '#18181b' : '#eab308';
                    if (metaVal !== undefined) {
                        const targetVal = kpiViewMode === 'ANNUAL' && (item.unit === 'R$' || item.unit === 'QTE') ? metaVal * (index + 1) : metaVal;
                        const isBad = item.inverse_goal ? entry.value > targetVal : entry.value < targetVal;
                        if (isBad) {
                            barColor = '#ef4444'; 
                        } else {
                            barColor = '#10b981'; // Verde para meta atingida ou superada
                        }
                    }
                    return <Cell key={`cell-${index}`} fill={barColor} />;
                })}
                <LabelList dataKey="value" position="top" fill="#71717a" fontSize={9} formatter={v => {
                    if(item.unit === 'R$') return formatCurrencyShort(v);
                    if(item.unit === '%') return v.toFixed(1) + '%';
                    return v;
                }} />
            </Bar>
        );
    }

    const commentsList = baseGraphData.filter(d => d.comment && d.comment.trim() !== '').reverse();
    const hasComments = commentsList.length > 0;

    let currentMetaBadgeVal = metaVal;
    if (kpiViewMode === 'ANNUAL' && metaVal !== undefined && (item.unit === 'R$' || item.unit === 'QTE')) {
        currentMetaBadgeVal = metaVal * displayHist.length; 
    }

    let headerColorClass = isResultado ? 'text-zinc-800' : 'text-zinc-500';
    let valueColorClass = 'text-zinc-900';
    
    if (metaVal !== undefined && latestRawVal !== null) {
        const isBad = item.inverse_goal ? latestRawVal > currentMetaBadgeVal : latestRawVal < currentMetaBadgeVal;
        if (isBad) {
            headerColorClass = 'text-red-500';
            valueColorClass = 'text-red-600';
        } else {
            headerColorClass = 'text-emerald-600';
            valueColorClass = 'text-emerald-500';
        }
    }

    return (
        <div key={item.id} className={`bg-white p-6 rounded-[24px] shadow-sm border ${isResultado ? 'border-zinc-300' : 'border-zinc-200'} flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group h-[300px]`}>
            <div className="relative z-10 flex-shrink-0">
                <div className="flex justify-between items-start mb-3 gap-2">
                    <h4 className={`text-xs font-black ${headerColorClass} uppercase tracking-widest leading-relaxed w-full`} title={displayName}>{displayName}</h4>
                    <div className="flex items-center gap-2 shrink-0">
                         {hasComments && (
                             <button 
                                 onClick={() => setExpandedCardId(expandedCardId === item.id ? null : item.id)}
                                 className={`p-1.5 rounded-lg transition-colors ${expandedCardId === item.id ? 'bg-yellow-500 text-black' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'} shadow-sm`}
                                 title={t("Ver Observações", "View Comments")}
                             >
                                 <MessageSquareText size={14} />
                             </button>
                         )}
                        {metaVal !== undefined && (
                            <span className="text-[10px] font-black text-black bg-yellow-400 px-2 py-1 rounded uppercase">
                                {t('Meta:', 'Target:')} {formatNumber(currentMetaBadgeVal, item.unit)}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3 mb-4">
                    <span className={`text-3xl font-black ${valueColorClass}`}>{latestVal}</span>
                    {trendHtml}
                </div>
            </div>
            {modifiedGraphData.length > 0 && (
                <div className="flex-1 w-[100%] relative opacity-80 group-hover:opacity-100 transition-opacity mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={modifiedGraphData} margin={{top: 20, right: 0, left: 0, bottom: 0}}>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold', fill: '#a1a1aa'}} dy={5} height={20} />
                            <Tooltip content={<CustomTooltipSparkline unit={item.unit} lang={lang} />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                            
                            {CustomBars}

                            {metaVal !== undefined && kpiViewMode === 'MONTHLY' && (
                                <Line type="step" dataKey={() => metaVal} name={t("Meta", "Target")} stroke="#a1a1aa" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            )}

            {expandedCardId === item.id && (
                <div className="absolute inset-0 z-20 bg-zinc-950/95 backdrop-blur-md p-5 flex flex-col rounded-[24px] border border-zinc-800 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-3 border-b border-zinc-800 pb-2 shrink-0">
                        <h4 className="text-xs font-black text-yellow-500 uppercase flex items-center gap-2">
                            <MessageSquareText size={14} /> {t('Observações', 'Comments / Notes')} ({commentsList.length})
                        </h4>
                        <button onClick={() => setExpandedCardId(null)} className="text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 p-1 rounded-full transition-colors"><X size={14} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {commentsList.map(c => (
                            <div key={c.name} className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{c.name}</span>
                                    <span className="text-[10px] font-bold text-yellow-500">{formatNumber(c.value, item.unit)}</span>
                                </div>
                                <p className="text-xs font-medium text-white leading-relaxed whitespace-pre-wrap">{c.comment}</p>
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
        // Bloqueio Exclusivo: Estoque pertence apenas à Daniela (ID 8)
        if (i.id === 56 || i.name.toLowerCase().includes('estoque')) {
            return kpiOwnerId === 8;
        }

        if (i.category === 'ESFORCO') return ownerIndicatorIds.includes(i.id);
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

    const autoOrdersIds = [
        dbIndicators.find(i => i.name.toLowerCase().includes('pedidos contrato'))?.id,
        dbIndicators.find(i => i.name.toLowerCase().includes('pedidos spot'))?.id,
        dbIndicators.find(i => i.name.toLowerCase().includes('pg1'))?.id,
        dbIndicators.find(i => i.name.toLowerCase().includes('pg2'))?.id,
        dbIndicators.find(i => i.name.toLowerCase().includes('pg3'))?.id,
        dbIndicators.find(i => i.name.toLowerCase().includes('pedidos serviço') || i.name.toLowerCase().includes('pedidos servico'))?.id,
    ].filter(Boolean);

    const isAutoCalculatedEsforco = [2, 25, 27, 29, 43, ...autoOrdersIds];
    const visibleEsforcoList = esforcoList.filter(ind => !autoOrdersIds.includes(ind.id));

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
            showToast(t('Preencha as observações obrigatórias (sinalizadas a vermelho).', 'Fill in the mandatory observations (highlighted in red).'), 'error');
            setLoading(false);
            return;
        }

        if(payload.length === 0) {
            showToast(t('Preencha ao menos um valor.', 'Fill in at least one value.'), 'error');
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

            showToast(t(`Dados de ${kpiEditPeriod} guardados com sucesso!`, `${kpiEditPeriod} data saved successfully!`));
            setExpandedCommentId(null);
            loadData();
        } catch (err) {
            showToast(t('Erro ao salvar no banco de dados.', 'Error saving to database.'), 'error');
        }
        setLoading(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-zinc-200">
                <div className="flex items-center gap-4">
                    <div className="bg-zinc-900 p-3 rounded-2xl text-yellow-500 shadow-md"><LineChartIcon size={24} /></div>
                    {(user.role === 'admin' || user.role === 'dev' || user.username.toUpperCase() === 'DANIEL') ? (
                        <select 
                            className="bg-transparent text-zinc-900 text-2xl font-black focus:ring-0 outline-none cursor-pointer"
                            value={kpiOwnerId}
                            onChange={(e) => setKpiOwnerId(parseInt(e.target.value))}
                        >
                            {dbOwners.filter(o => {
                                 if(user.username.toUpperCase() === 'DANIEL') return o.id === 3 || o.id === 4;
                                return true;
                            }).map(o => <option key={o.id} value={o.id} className="text-base font-bold">{t('Visão:', 'View:')} {translateArea(o.name)}</option>)}
                        </select>
                    ) : (
                        <div>
                            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{translateArea(user.area)}</h2>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{t('Visão do Setor', 'Department View')}</p>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-3 bg-zinc-50 p-2 rounded-2xl border border-zinc-200">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">{t('Análise', 'View Mode')}</label>
                        <select className="border-none bg-white px-4 py-2 rounded-xl text-sm font-bold text-zinc-800 outline-none cursor-pointer shadow-sm" value={kpiViewMode} onChange={(e) => setKpiViewMode(e.target.value)}>
                            <option value="MONTHLY">{t('Mensal (Mês a Mês)', 'Monthly (MoM)')}</option>
                            <option value="ANNUAL">{t('Acumulado Anual (YTD)', 'Year-to-Date (YTD)')}</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-3 bg-zinc-50 p-2 rounded-2xl border border-zinc-200">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">{t('Até Mês', 'Up to Month')}</label>
                        <select className="border-none bg-white px-5 py-2 rounded-xl text-sm font-bold text-zinc-800 outline-none cursor-pointer shadow-sm" value={kpiViewPeriod} onChange={(e) => setKpiViewPeriod(e.target.value)}>
                            <option value="ALL">{t('Geral (Mais Recente)', 'Latest Available')}</option>
                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-3 bg-zinc-900 p-2 rounded-2xl shadow-sm border border-zinc-800">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">{t('Período de Edição', 'Data Entry Period')}</label>
                        <select className="border-none bg-zinc-800 text-yellow-500 px-5 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer shadow-sm" value={kpiEditPeriod} onChange={(e) => setKpiEditPeriod(e.target.value)}>
                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 ml-2">{t('Indicadores de Resultado (Performance)', 'Key Performance Indicators (Results)')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {resultadoList.length === 0 && <p className="text-sm text-zinc-400 italic col-span-full ml-2">{t('Nenhum resultado de performance encontrado.', 'No performance metrics found.')}</p>}
                    {resultadoList.map(ind => renderSparklineCard(ind, true))}
                </div>
            </div>

            <div>
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 ml-2">{t('Métricas Operacionais (Esforço)', 'Operational Metrics (Leading)')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {visibleEsforcoList.length === 0 && <p className="text-sm text-zinc-400 italic col-span-full ml-2">{t('Nenhuma métrica operacional encontrada.', 'No operational metrics found.')}</p>}
                    {visibleEsforcoList.map(ind => renderSparklineCard(ind, false))}
                </div>
            </div>

            <form onSubmit={handleSaveKPIs} className="bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden">
                <div className="p-6 border-b border-zinc-100 bg-zinc-50">
                    <h3 className="text-xl font-extrabold text-zinc-900 flex items-center gap-3">
                        <FileSpreadsheet className="text-yellow-600" /> {t('Formulário de Lançamento:', 'Data Entry Form:')} {kpiEditPeriod}
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1 font-medium">{t('Lançamento de métricas. Clique no ícone de mensagem para adicionar observações e justificativas.', 'Please enter your metrics. Click the message icon to add mandatory notes/justifications.')}</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-zinc-100">
                    <div className="p-8 bg-zinc-50/50">
                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Target size={16} /> {t('Espelho de Resultados', 'Calculated Results')}
                        </h4>
                        <div className="space-y-3">
                            {resultadoList.length === 0 && <p className="text-sm text-zinc-400 italic">{t('Nenhum resultado mapeado.', 'No KPIs assigned.')}</p>}
                            {resultadoList.map(ind => {
                                const valObj = computedData.find(v => v.indicator_id === ind.id && v.owner_id === kpiOwnerId && v.period === kpiEditPeriod);
                                const valStr = valObj ? valObj.value : '';
                                return (
                                    <div key={ind.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm gap-4">
                                        <div className="flex-1">
                                            <label className="text-xs font-bold text-zinc-800 leading-snug block">{tInd(ind.name)}</label>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <input type="text" readOnly value={valStr !== '' ? parseFloat(valStr).toFixed(2).replace('.', ',') : ''} className="w-24 text-right bg-zinc-100 border border-zinc-200 text-zinc-500 rounded-lg p-2 font-black text-sm cursor-not-allowed outline-none" title={t("Calculado automaticamente pelo sistema", "Calculated automatically by the system")} />
                                            <span className="text-[10px] font-black text-zinc-400 w-6 text-left uppercase">{ind.unit}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="p-8">
                        <h4 className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <LineChartIcon size={16} /> {t('Digitação de Esforço', 'Operational Data Entry')}
                        </h4>
                        <div className="space-y-4">
                            {visibleEsforcoList.length === 0 && <p className="text-sm text-zinc-400 italic">{t('Nenhuma métrica atribuída.', 'No metrics assigned.')}</p>}
                            {visibleEsforcoList.map(ind => {
                                const isAuto = isAutoCalculatedEsforco.includes(ind.id);
                                let displayName = tInd(ind.name);
                                if (ind.name === "Não conformidade (%)") displayName = t("Nº de Não Conformidades (Qtd)", "Number of Non-Conformities (Qty)");
                                
                                const currentVal = formValues[ind.id] !== undefined ? formValues[ind.id] : '';
                                const currentComment = formComments[ind.id] || '';
                                const hasComment = currentComment.trim() !== '';
                                const isMandatory = needsComment(ind.id, kpiOwnerId, currentVal);

                                let iconColorClass = 'text-zinc-400 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200';
                                if (hasComment) {
                                    iconColorClass = 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 shadow-sm';
                                } else if (isMandatory) {
                                    iconColorClass = 'text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 shadow-sm animate-pulse';
                                }

                                return (
                                    <div key={ind.id} className="flex flex-col border-b border-zinc-100 pb-4 gap-2 transition-colors">
                                        <div className="flex items-center justify-between gap-4 group">
                                            <label className="text-xs font-bold text-zinc-700 flex-1 group-hover:text-black leading-snug">{displayName}</label>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button 
                                                    type="button" 
                                                    onClick={() => setExpandedCommentId(expandedCommentId === ind.id ? null : ind.id)}
                                                    className={`p-2 rounded-xl transition-all ${iconColorClass}`}
                                                    title={hasComment ? t("Ver/Editar Observação", "View/Edit Comment") : (isMandatory ? t("Observação Obrigatória!", "Mandatory Comment Required!") : t("Adicionar Observação opcional", "Add Optional Comment"))}
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
                                                    className={`w-28 text-right border-2 rounded-xl p-2.5 font-bold text-sm outline-none transition-all shadow-sm ${isAuto ? 'bg-zinc-100 border-zinc-200 text-zinc-500 cursor-not-allowed' : 'bg-white border-zinc-300 focus:border-yellow-500 text-zinc-900'}`} 
                                                    title={isAuto ? t("Valor calculado por fórmula", "Calculated by formula") : t("Digite o valor", "Enter value")}
                                                />
                                                <span className="text-[10px] font-black text-zinc-400 w-6 text-left uppercase">{ind.name === "Não conformidade (%)" ? t('QTE', 'QTY') : ind.unit}</span>
                                            </div>
                                        </div>
                                        {expandedCommentId === ind.id && (
                                            <div className="w-full mt-2 animate-in slide-in-from-top-2">
                                                <textarea 
                                                    placeholder={kpiOwnerId === 5 ? t("Justificativa de Supply (Ex: Matéria prima em falta)", "Supply Justification (e.g., Raw material shortage)") : t("Observação (Qual o BR? Cliente? Detalhes...)", "Notes (e.g., BR code, Client, Details...)")} 
                                                    value={formComments[ind.id] || ''}
                                                    onChange={(e) => handleCommentChange(ind.id, e.target.value)}
                                                    className={`w-full ${isMandatory && !hasComment ? 'bg-red-50 border-red-200 focus:border-red-400 placeholder:text-red-300' : 'bg-yellow-50/50 border-yellow-200 focus:border-yellow-400 placeholder:text-yellow-600/50'} text-zinc-800 text-sm p-3 rounded-xl outline-none shadow-inner resize-none min-h-[60px] transition-colors`}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                        
                        <div className="mt-10 pt-6 border-t border-zinc-100 flex justify-end">
                            <button type="submit" disabled={loading} className="bg-black text-yellow-500 px-10 py-4 rounded-2xl font-black hover:bg-zinc-900 shadow-xl shadow-zinc-200 transition-all flex items-center gap-3 active:scale-95 uppercase tracking-wider text-sm">
                                {loading ? <ArrowRightCircle className="animate-spin" size={20} /> : <Save size={20} />}
                                {t('Gravar no Banco', 'Submit Data')}
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
        <div id="tab-auditoria" className="bg-white rounded-3xl shadow-sm border border-zinc-200 p-8 flex flex-col h-[85vh] animate-in fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-3">
                        <div className="p-3 bg-yellow-50 rounded-2xl text-yellow-600"><FileSpreadsheet size={28} /></div> {t('Auditoria Global', 'Master Data Audit')}
                    </h2>
                    <p className="text-zinc-500 text-sm mt-2 font-medium">{t('Base bruta do Banco de Dados. Clique nos valores destacados a amarelo para ler a justificação completa.', 'Raw database overview. Click on highlighted values to read full justifications.')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <input type="file" id="incoming-upload" accept=".xlsx, .xls, .csv" onChange={processExcelFile} className="hidden" />
                    
                    <button onClick={() => document.getElementById('incoming-upload').click()} disabled={loading} className="flex items-center gap-2 px-6 py-3 bg-white text-zinc-800 border border-zinc-200 font-bold rounded-xl hover:bg-zinc-50 transition-all shadow-sm active:scale-95 disabled:opacity-50">
                        <Download size={18} className="rotate-180" /> {loading ? t('Enviando...', 'Uploading...') : t('Atualizar Base Vendas (Excel)', 'Import Sales Data (Excel)')}
                    </button>

                    <button onClick={exportIncomingToExcel} disabled={loading} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-md active:scale-95 disabled:opacity-50">
                        <FileSpreadsheet size={18} /> {t('Exportar Vendas (XLSX)', 'Export Sales Data (XLSX)')}
                    </button>

                    <button onClick={exportToCSV} className="flex items-center gap-2 px-6 py-3 bg-black text-yellow-500 font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-md active:scale-95">
                        <Download size={18} /> {t('Baixar Painel (CSV)', 'Export Audit Data (CSV)')}
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-auto rounded-xl border border-zinc-200 shadow-inner bg-zinc-50 relative">
                <table className="w-full text-left text-sm whitespace-nowrap audit-table">
                    <thead className="text-zinc-500 uppercase font-black text-[10px] tracking-widest bg-white sticky top-0 shadow-sm z-10">
                        <tr>
                            <th className="p-4 border-b border-zinc-200 text-center bg-white">{t('ID', 'ID')}</th>
                            <th className="p-4 border-b border-zinc-200 bg-white">{t('Indicador Mapeado', 'KPI Description')}</th>
                            <th className="p-4 border-b border-zinc-200 bg-white">{t('Setor', 'Department')}</th>
                            <th className="p-4 border-b border-zinc-200 bg-white text-center">{t('TIPO', 'TYPE')}</th>
                            <th className="p-4 border-b border-zinc-200 bg-zinc-100 text-zinc-800 text-center">{t('META', 'TARGET')}</th>
                            {months.map(m => <th key={m} className="p-4 border-b border-zinc-200 text-right bg-zinc-50">{m}</th>)}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-zinc-100">
                        {[...dbIndicators].sort((a,b)=>a.id-b.id).map(ind => {
                            const isRes = ind.category === 'RESULTADO';
                            const goalObj = dbGoals.find(g => g.indicator_id === ind.id);
                            const metaVal = goalObj ? formatNumber(goalObj.goal_value, ind.unit) : '-';

                            return (
                                <tr key={ind.id} className={`hover:bg-yellow-50/30 transition-colors ${isRes ? 'bg-zinc-50/50' : ''}`}>
                                    <td className="p-3 font-black text-zinc-400 text-xs text-center border-r border-zinc-50">{ind.id}</td>
                                    <td className={`p-3 font-bold text-xs border-r border-zinc-50 truncate max-w-[300px] ${isRes ? 'text-zinc-900' : 'text-zinc-700'}`}>{tInd(ind.name)}</td>
                                    <td className="p-3 font-bold text-zinc-500 text-[10px] uppercase border-r border-zinc-50">{translateArea(getOwnerName(ind.id))}</td>
                                    <td className={`p-3 font-black text-[9px] text-center uppercase border-r border-zinc-50 ${isRes ? 'text-zinc-600 bg-zinc-100' : 'text-yellow-600'}`}>{ind.category}</td>
                                    <td className="p-3 font-bold text-zinc-800 text-xs text-center border-r border-zinc-50 bg-zinc-100/50">{metaVal}</td>
                                    {months.map(m => {
                                        const valObj = computedData.find(v => v.indicator_id === ind.id && v.period === m);
                                        const val = valObj ? valObj.value : undefined;
                                        const commentObj = dbComments.find(c => c.indicator_id === ind.id && c.period === m);
                                        const hasComment = !!commentObj;
                                        
                                        return (
                                            <td 
                                                key={m} 
                                                className={`p-3 text-xs text-right font-medium border-r border-zinc-50 ${val === undefined ? 'text-zinc-300' : 'text-zinc-900 font-bold'} ${hasComment ? 'bg-yellow-100 cursor-pointer hover:bg-yellow-200 transition-colors' : ''}`}
                                                onClick={hasComment ? () => setSelectedCommentModal({
                                                    indicatorName: tInd(ind.name),
                                                    sector: translateArea(getOwnerName(ind.id)),
                                                    period: m,
                                                    value: formatNumber(val, ind.unit),
                                                    meta: metaVal,
                                                    comment: commentObj.comment
                                                }) : undefined}
                                            >
                                                <div className="flex items-center justify-end gap-2">
                                                    {hasComment && <MessageSquareText size={14} className="text-yellow-600" />}
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

            {selectedCommentModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm" onClick={() => setSelectedCommentModal(null)}></div>
                    <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-zinc-100 bg-yellow-50 flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-yellow-200 text-yellow-800 rounded-xl"><MessageSquareText size={24} /></div>
                                <div>
                                    <h3 className="text-lg font-black text-zinc-900">{t('Justificativa Registrada', 'Logged Justification')}</h3>
                                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{selectedCommentModal.period}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedCommentModal(null)} className="text-zinc-400 hover:text-zinc-800"><X size={24} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t('Indicador', 'KPI Description')}</p>
                                <p className="text-sm font-bold text-zinc-900">{selectedCommentModal.indicatorName}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t('Setor', 'Department')}</p>
                                    <p className="text-sm font-bold text-zinc-800">{selectedCommentModal.sector}</p>
                                </div>
                                <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t('Valor Registrado', 'Logged Value')}</p>
                                    <p className="text-sm font-black text-yellow-600">{selectedCommentModal.value}</p>
                                </div>
                            </div>
                            <div className="mt-4 border-t border-zinc-100 pt-4">
                                <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-2">{t('Comentário / Observação da Equipe', 'Team Comment / Note')}</p>
                                <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-100">
                                    <p className="text-sm text-zinc-800 leading-relaxed font-medium whitespace-pre-wrap">{selectedCommentModal.comment}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
  }

  // --- TELA 5W2H ---
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
    
    const pieColors = {
        [t('Urgente', 'Urgent')]: '#ef4444',
        [t('A Fazer', 'To Do')]: '#a1a1aa',
        [t('Em Andamento', 'In Progress')]: '#eab308',
        [t('Concluído', 'Completed')]: '#10b981'
    };
    
    const pieData = Object.keys(sCounts).map(k => {
        const translatedKey = translateStatus(k);
        return { name: translatedKey, value: sCounts[k] };
    });

    const aCounts = {};
    filteredActions.forEach(a => { aCounts[a.area] = (aCounts[a.area] || 0) + 1; });
    const barData = Object.entries(aCounts).map(([name, value]) => ({name: translateArea(name), value})).sort((a,b) => b.value - a.value);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-zinc-200">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
                    <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl"><ListChecks size={24} /></div>
                    {t('Gestão de Ações (5W2H)', 'Strategic Action Plan (5W2H)')}
                </h2>
                <button 
                    onClick={() => {
                        setEditingActionId(null);
                        setActionForm({ 
                            what: '', 
                            why: '', 
                            area: availableAreas.length > 1 ? availableAreas[1] : 'Comercial', 
                            who: '', 
                            when: '',
                            status: 'A Fazer'
                        });
                        setIsAddActionModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-black text-yellow-500 font-bold rounded-2xl hover:bg-zinc-800 shadow-lg shadow-zinc-200 transition-all active:scale-95"
                >
                    <PlusCircle size={20} /> {t('Registrar Nova Ação', 'Create New Action')}
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm flex flex-col items-center">
                    <p className="text-[9px] font-black text-zinc-400 uppercase mb-1">{t('Carga Total', 'Total Actions')}</p>
                    <h3 className="text-3xl font-black text-zinc-900">{filteredActions.length}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-red-200 shadow-lg shadow-red-50 flex flex-col items-center ring-2 ring-red-50">
                    <p className="text-[9px] font-black text-red-500 uppercase mb-1">{t('Atrasados', 'Overdue')}</p>
                    <h3 className="text-3xl font-black text-red-600">{overdue}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm flex flex-col items-center">
                    <p className="text-[9px] font-black text-zinc-400 uppercase mb-1">{t('Pendentes', 'Pending Actions')}</p>
                    <h3 className="text-3xl font-black text-zinc-900">{filteredActions.length - completed}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-emerald-200 shadow-sm flex flex-col items-center">
                    <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">{t('Finais', 'Completed')}</p>
                    <h3 className="text-3xl font-black text-emerald-600">{completed}</h3>
                </div>
                <div className="bg-zinc-900 p-6 rounded-3xl text-yellow-500 flex flex-col items-center shadow-xl shadow-zinc-200">
                    <p className="text-[9px] font-black opacity-70 uppercase mb-1 text-white">{t('Eficiência', 'Completion Rate')}</p>
                    <h3 className="text-3xl font-black">{eff}%</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200 flex flex-col h-[350px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">{t('Saúde das Ações', 'Action Plan Health')}</h3>
                        <PieChartIcon className="text-zinc-400" size={20} />
                    </div>
                    <div className="flex-1 relative min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={pieData} 
                                    cx="50%" cy="50%" 
                                    innerRadius={40} outerRadius={70} 
                                    dataKey="value" stroke="none"
                                    label={({ name, value, percent }) => value > 0 ? `${value} (${(percent * 100).toFixed(0)}%)` : ''}
                                    labelLine={true}
                                >
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
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200 flex flex-col h-[350px] lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">{t('Carga por Área', 'Actions by Department')}</h3>
                        <BarChart3 className="text-zinc-400" size={20} />
                    </div>
                    <div className="flex-1 relative min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} layout="vertical" margin={{right: 30}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold', fill: '#52525b'}} width={100} />
                                <Tooltip cursor={{fill: '#f4f4f5'}} contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                                <Bar dataKey="value" name={t('Ações', 'Actions')} fill="#18181b" radius={[0, 8, 8, 0]} barSize={24}>
                                    <LabelList dataKey="value" position="right" fill="#71717a" fontSize={11} fontWeight="bold" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden">
                 <div className="p-6 border-b border-zinc-200 bg-zinc-50 flex flex-wrap justify-between items-center gap-4">
                    <h3 className="font-extrabold text-zinc-900 flex items-center gap-3">
                        <ListChecks className="text-yellow-600" size={24} /> {t('Matriz de Acompanhamento', 'Action Tracking Matrix')}
                    </h3>
                    <div className="flex gap-3">
                        {availableAreas.length > 1 && (
                            <select 
                                className="border border-zinc-300 bg-white px-4 py-2 rounded-xl text-sm font-bold text-zinc-700 outline-none focus:border-zinc-500"
                                value={actionFilterArea} onChange={(e) => setActionFilterArea(e.target.value)}
                            >
                                {availableAreas.map(a => <option key={a} value={a}>{a === 'Todas' ? t('Todas Áreas', 'All Departments') : translateArea(a)}</option>)}
                            </select>
                        )}
                        <select 
                            className="border border-zinc-300 bg-white px-4 py-2 rounded-xl text-sm font-bold text-zinc-700 outline-none focus:border-zinc-500"
                            value={actionFilterStatus} onChange={(e) => setActionFilterStatus(e.target.value)}
                        >
                            <option value="Todos">{t('Todos os Status', 'All Statuses')}</option>
                            <option value="Urgente">{t('Urgente', 'Urgent')}</option>
                            <option value="A Fazer">{t('A Fazer', 'To Do')}</option>
                            <option value="Em Andamento">{t('Em Andamento', 'In Progress')}</option>
                            <option value="Concluído">{t('Concluído', 'Completed')}</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white text-zinc-500 uppercase font-bold text-[11px] border-b border-zinc-200">
                            <tr>
                                <th className="p-6">{t('Ref', 'Ref')}</th>
                                <th>{t('Área / Dono', 'Department / Owner')}</th>
                                <th>{t('Ação Estratégica', 'Action Item (What)')}</th>
                                <th>{t('Causa Raiz', 'Root Cause (Why)')}</th>
                                <th>{t('Prazo', 'Due Date (When)')}</th>
                                <th>{t('Status', 'Status')}</th>
                                <th className="text-center">{t('Gerir', 'Manage')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 font-medium text-zinc-800">
                            {filteredActions.length === 0 && <tr><td colSpan="7" className="p-10 text-center text-zinc-400 italic">{t('Nenhuma ação encontrada.', 'No actions found.')}</td></tr>}
                            {filteredActions.map(a => {
                                const isOverdue = checkOverdue(a.when, a.status);
                                const mySubs = subActions.filter(s => s.action_id === a.id);
                                return (
                                    <tr key={a.id} className={`hover:bg-yellow-50 transition-colors group ${isOverdue ? 'bg-red-50/50' : ''}`}>
                                        <td className="p-6 font-bold text-zinc-400 text-xs">#{a.id}</td>
                                        <td className="py-6">
                                            <div className="font-bold text-zinc-900">{translateArea(a.area)}</div>
                                            <div className="text-[9px] uppercase font-black text-zinc-500">{a.who}</div>
                                        </td>
                                        <td className="py-6 max-w-sm pr-4">
                                            <div className="font-bold text-zinc-800 leading-tight">{a.what}</div>
                                            {mySubs.length > 0 && (
                                                <div className="mt-2 text-[10px] font-bold text-zinc-700 bg-zinc-100 px-2 py-1 rounded inline-flex items-center gap-1 border border-zinc-200">
                                                    <GitBranch size={12} /> {mySubs.length} {t('Sub-ação(ões)', 'Subtask(s)')} ({mySubs.filter(x=>x.status==='Concluído').length} {t('fin.', 'comp.')})
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-6 min-w-[280px] max-w-md pr-6">
                                            <div className="text-xs italic text-zinc-500 leading-relaxed flex items-start gap-1.5">
                                                <Info size={16} className="mt-0.5 shrink-0 text-zinc-400" />
                                                <span>{a.why}</span>
                                            </div>
                                        </td>
                                        <td className="py-6 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-bold text-zinc-700">{a.when?.toLowerCase().trim() === 'imediato' ? t('Imediato', 'Immediate') : a.when}</span>
                                                {isOverdue && <span className="text-[8px] font-black text-red-600 uppercase bg-red-100 px-1.5 py-0.5 rounded-full w-fit">{t('Atrasado', 'Overdue')}</span>}
                                            </div>
                                        </td>
                                        <td className="py-6">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${getStatusColor(a.status)} uppercase`}>
                                                {translateStatus(a.status)}
                                            </span>
                                        </td>
                                        <td className="py-6 text-center">
                                            <button 
                                                onClick={() => setSelectedReportAction(a)}
                                                className="inline-flex p-3 bg-white border border-zinc-200 text-zinc-800 rounded-2xl hover:bg-black hover:text-yellow-500 transition-all shadow-sm"
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
            
            {isAddActionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm" onClick={() => setIsAddActionModalOpen(false)}></div>
                    <div className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl p-10 m-4 flex flex-col fade-in max-h-[90vh] overflow-y-auto">
                        <h2 className="text-3xl font-black mb-8 flex items-center gap-3 text-zinc-900 tracking-tight">
                            {editingActionId ? <Edit2 className="text-yellow-600" size={40} /> : <PlusCircle className="text-emerald-500" size={40} />}
                            {editingActionId ? t('Editar Ação 5W2H', 'Edit 5W2H Action') : t('Nova Ação 5W2H', 'New 5W2H Action')}
                        </h2>
                        <form onSubmit={handleSaveAction} className="space-y-6">
                            <div>
                                <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-2">{t('O Quê? (Ação Estratégica)', 'What? (Action Item)')}</label>
                                <input type="text" required value={actionForm.what} onChange={e=>setActionForm({...actionForm, what: e.target.value})} className="w-full border-2 border-zinc-200 p-4 rounded-2xl outline-none focus:border-yellow-500 bg-zinc-50 transition-all font-medium text-zinc-900" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-2">{t('Por Quê? (Causa Raiz)', 'Why? (Reason / Root Cause)')}</label>
                                <input type="text" required value={actionForm.why} onChange={e=>setActionForm({...actionForm, why: e.target.value})} className="w-full border-2 border-zinc-200 p-4 rounded-2xl outline-none focus:border-yellow-500 bg-zinc-50 transition-all font-medium text-zinc-900" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-2">{t('Área', 'Department')}</label>
                                    <select required value={actionForm.area} onChange={e=>setActionForm({...actionForm, area: e.target.value})} className="w-full border-2 border-zinc-200 p-4 rounded-2xl outline-none bg-zinc-50 cursor-pointer font-bold text-zinc-900">
                                        {availableAreas.filter(a => a !== 'Todas').map(a => <option key={a} value={a}>{translateArea(a)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-2">{t('Quem? (Responsável)', 'Who? (Owner)')}</label>
                                    <input type="text" required value={actionForm.who} onChange={e=>setActionForm({...actionForm, who: e.target.value})} className="w-full border-2 border-zinc-200 p-4 rounded-2xl outline-none focus:border-yellow-500 bg-zinc-50 transition-all font-medium text-zinc-900" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-2">{t('Quando? (Prazo Limite)', 'When? (Due Date)')}</label>
                                <input type="text" required placeholder={t("Ex: 30/05/2026 ou Imediato", "e.g., 05/30/2026 or Immediate")} value={actionForm.when} onChange={e=>setActionForm({...actionForm, when: e.target.value})} className="w-full border-2 border-zinc-200 p-4 rounded-2xl outline-none focus:border-yellow-500 bg-zinc-50 transition-all font-medium text-zinc-900" />
                            </div>
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setIsAddActionModalOpen(false)} className="flex-1 bg-zinc-100 text-zinc-600 font-bold py-5 rounded-2xl hover:bg-zinc-200 transition-all">{t('Cancelar', 'Cancel')}</button>
                                <button type="submit" disabled={loading} className="flex-[2] bg-black text-yellow-500 font-bold py-5 rounded-2xl hover:bg-zinc-900 transition-all shadow-xl active:scale-95">{t('Registrar no Banco', 'Save to Database')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedReportAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
                    <div className="absolute inset-0 bg-zinc-900/90 backdrop-blur-sm" onClick={() => setSelectedReportAction(null)}></div>
                    <div className="relative w-full max-w-6xl bg-white h-full max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        
                        <div className="p-6 border-b border-zinc-200 bg-zinc-50 flex justify-between items-start shrink-0">
                            <div className="flex-1 pr-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-[10px] font-black px-3 py-1 bg-black rounded-full text-yellow-500 uppercase tracking-widest">Ref #{selectedReportAction.id}</span>
                                    <span className="text-[10px] font-black px-3 py-1 bg-zinc-200 rounded-full text-zinc-700 uppercase tracking-widest">{translateArea(selectedReportAction.area)}</span>
                                    
                                    {(user.role === 'admin' || user.role === 'dev' || user.username.toUpperCase() === 'DANIEL') && (
                                        <div className="flex gap-2 ml-4 border-l border-zinc-300 pl-4">
                                            <button onClick={() => {
                                                setEditingActionId(selectedReportAction.id);
                                                setActionForm({ what: selectedReportAction.what, why: selectedReportAction.why, area: selectedReportAction.area, who: selectedReportAction.who, when: selectedReportAction.when });
                                                setSelectedReportAction(null);
                                                setIsAddActionModalOpen(true);
                                            }} className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 text-xs font-bold"><Edit2 size={14} /> {t('Editar', 'Edit')}</button>
                                            <button onClick={() => requestDeleteAction(selectedReportAction.id)} className="text-red-600 hover:text-red-800 transition-colors flex items-center gap-1 text-xs font-bold"><Trash2 size={14} /> {t('Excluir', 'Delete')}</button>
                                        </div>
                                    )}
                                </div>
                                <h2 className="font-extrabold text-2xl md:text-3xl text-zinc-900 leading-tight">{selectedReportAction.what}</h2>
                            </div>
                            <button onClick={() => setSelectedReportAction(null)} className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-full transition-colors shrink-0"><X size={24} /></button>
                        </div>
                        
                        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
                            <div className="flex-[3] border-r border-zinc-200 flex flex-col min-h-0 bg-white">
                                <div className="p-6 border-b border-zinc-100 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
                                    <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-200 text-sm flex gap-3 shadow-sm flex-1">
                                        <HelpCircle className="text-yellow-600 shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <span className="block font-bold text-yellow-800 uppercase text-[10px] mb-1">{t('Causa Raiz Identificada', 'Identified Root Cause')}</span>
                                            <span className="text-yellow-900 italic font-medium leading-relaxed">{selectedReportAction.why}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                                        <span className="text-[11px] font-black text-zinc-500 uppercase tracking-widest text-right">{t('Estado Atual', 'Current Status')}</span>
                                        <select 
                                            className="font-bold text-sm rounded-xl px-4 py-3 border-2 border-transparent outline-none cursor-pointer text-white shadow-md"
                                            style={{backgroundColor: getHex(selectedReportAction.status), color: selectedReportAction.status==='Em Andamento'?'black':'white'}}
                                            value={selectedReportAction.status}
                                            onChange={(e) => handleStatusChangeAction(selectedReportAction.id, e.target.value, selectedReportAction.area)}
                                        >
                                            <option value="Urgente" style={{backgroundColor:'white', color:'black'}}>🔴 {t('Urgente', 'Urgent')}</option>
                                            <option value="A Fazer" style={{backgroundColor:'white', color:'black'}}>⚪ {t('A Fazer', 'To Do')}</option>
                                            <option value="Em Andamento" style={{backgroundColor:'white', color:'black'}}>🟡 {t('Em Andamento', 'In Progress')}</option>
                                            <option value="Concluído" style={{backgroundColor:'white', color:'black'}}>🟢 {t('Concluído', 'Completed')}</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="flex-1 p-6 overflow-y-auto bg-zinc-50/30">
                                    <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                                        <History className="text-zinc-500" size={18} /> {t('Diário de Bordo (Histórico)', 'Progress Log (History)')}
                                    </h3>
                                    <div className="space-y-6">
                                        {(!selectedReportAction.updates || selectedReportAction.updates.length === 0) && (
                                            <div className="text-center py-16 opacity-40"><History size={48} className="mx-auto mb-3" /><p className="text-sm font-bold uppercase">{t('Sem registros ainda', 'No progress logged yet')}</p></div>
                                        )}
                                        {[...(selectedReportAction.updates || [])].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map(u => (
                                            <div key={u.id} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm relative">
                                                <div className="flex justify-between items-center mb-4 border-b border-zinc-100 pb-3">
                                                    <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest ${u.type === 'realizado' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                                                        {u.type === 'realizado' ? t('Ação Feita', 'Action Done') : t('Próximo Passo', 'Next Step')}
                                                    </span>
                                                    <span className="text-xs font-bold text-zinc-400">{u.date}</span>
                                                </div>
                                                <p className="text-sm text-zinc-800 leading-relaxed font-medium whitespace-pre-wrap">{u.text}</p>
                                                <div className="mt-4 pt-3 border-t border-zinc-50 flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-zinc-200 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-600">{u.author ? u.author[0] : 'U'}</div>
                                                    <span className="text-[10px] font-black text-zinc-500 uppercase">{u.author || t('Usuário', 'User')}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6 border-t border-zinc-200 bg-white shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.02)]">
                                    <form onSubmit={handleAddUpdate} className="space-y-4">
                                        <div className="flex gap-3">
                                            <label className={`flex-1 flex items-center justify-center gap-2 py-3 border-2 rounded-xl cursor-pointer text-xs font-black uppercase transition-all shadow-sm ${updateType === 'realizado' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-white text-zinc-400 border-zinc-200 hover:bg-zinc-50'}`}>
                                                <input type="radio" className="hidden" checked={updateType === 'realizado'} onChange={()=>setUpdateType('realizado')} /> <CheckCircle2 size={16}/> {t('Ação Feita', 'Log Progress')}
                                            </label>
                                            <label className={`flex-1 flex items-center justify-center gap-2 py-3 border-2 rounded-xl cursor-pointer text-xs font-black uppercase transition-all shadow-sm ${updateType === 'proximo_passo' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-zinc-400 border-zinc-200 hover:bg-zinc-50'}`}>
                                                <input type="radio" className="hidden" checked={updateType === 'proximo_passo'} onChange={()=>setUpdateType('proximo_passo')} /> <ArrowRightCircle size={16}/> {t('Próximo Passo', 'Next Step')}
                                            </label>
                                        </div>
                                        <textarea 
                                            className="w-full border-2 border-zinc-200 p-4 rounded-xl text-sm outline-none focus:border-yellow-500 bg-zinc-50 font-medium resize-none h-[100px] shadow-inner text-zinc-900" 
                                            placeholder={t("Descreva o que aconteceu ou o plano a seguir...", "Describe progress made or next steps...")}
                                            value={updateText}
                                            onChange={e=>setUpdateText(e.target.value)}
                                        ></textarea>
                                        <div className="flex justify-end">
                                            <button type="submit" disabled={loading || !updateText.trim()} className="bg-black text-yellow-500 px-8 py-3 rounded-xl font-bold hover:bg-zinc-800 shadow-lg active:scale-95 flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                                                <Save size={18} /> {t('Salvar no Diário', 'Save Progress')}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>

                            <div className="flex-[2] flex flex-col min-h-0 bg-zinc-50">
                                <div className="p-6 border-b border-zinc-200 bg-white">
                                    <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-2">
                                        <GitBranch className="text-zinc-500" size={18} /> {t('Desdobramento de Tarefas', 'Sub-tasks Breakdown')}
                                    </h3>
                                    <p className="text-xs text-zinc-500 mt-1 font-medium">{t('Divida a ação principal em subtarefas com responsáveis.', 'Break down the main action into assigned sub-tasks.')}</p>
                                </div>
                                <div className="flex-1 p-6 overflow-y-auto space-y-3">
                                    {subActions.filter(s => s.action_id === selectedReportAction.id).length === 0 && (
                                        <div className="text-center py-10 opacity-40"><ListChecks size={32} className="mx-auto mb-2" /><p className="text-xs font-bold uppercase">{t('Nenhuma subtarefa', 'No subtasks')}</p></div>
                                    )}
                                    {subActions.filter(s => s.action_id === selectedReportAction.id).map(s => (
                                        <div key={s.id} className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm relative group transition-all hover:border-zinc-400">
                                            <p className="text-sm font-bold text-zinc-800 mb-3 pr-8 leading-tight">{s.what}</p>
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-100">
                                                    <span className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-1"><User size={12} className="text-yellow-600" /> {s.who}</span>
                                                    <span className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-1 border-l border-zinc-200 pl-3"><Calendar size={12} className="text-emerald-600" /> {s.when?.toLowerCase().trim() === 'imediato' ? t('Imediato', 'Immediate') : s.when}</span>
                                                </div>
                                                <select 
                                                    onChange={(e) => handleSubStatusChange(s.id, e.target.value)} 
                                                    value={s.status}
                                                    className={`text-[10px] font-bold rounded-lg px-3 py-1.5 outline-none cursor-pointer border shadow-sm ${getSubHex(s.status)}`}
                                                >
                                                    <option value="Urgente">🔴 {t('Urgente', 'Urgent')}</option>
                                                    <option value="A Fazer">⚪ {t('A Fazer', 'To Do')}</option>
                                                    <option value="Em Andamento">🟡 {t('Em Andamento', 'In Progress')}</option>
                                                    <option value="Concluído">🟢 {t('Concluído', 'Completed')}</option>
                                                </select>
                                            </div>
                                            <button onClick={() => requestDeleteSubAction(s.id)} className="absolute top-3 right-3 p-1.5 text-zinc-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-6 border-t border-zinc-200 bg-white">
                                    <h4 className="text-[10px] font-black text-zinc-800 uppercase tracking-widest mb-3 flex items-center gap-2"><PlusCircle size={14} className="text-yellow-500"/> {t('Nova Subtarefa', 'Add Sub-task')}</h4>
                                    <div className="flex flex-col gap-3">
                                        <input type="text" placeholder={t("O que deve ser feito?", "Sub-task description")} value={subActionForm.what} onChange={e=>setSubActionForm({...subActionForm, what: e.target.value})} className="w-full text-sm font-bold text-zinc-800 p-3 rounded-xl border-2 border-zinc-200 outline-none focus:border-yellow-500 bg-zinc-50" />
                                        <div className="flex gap-3">
                                            <input type="text" placeholder={t("Responsável", "Owner")} value={subActionForm.who} onChange={e=>setSubActionForm({...subActionForm, who: e.target.value})} className="flex-1 text-sm font-bold text-zinc-800 p-3 rounded-xl border-2 border-zinc-200 outline-none focus:border-yellow-500 bg-zinc-50" />
                                            <input type="text" placeholder={t("Prazo", "Deadline")} value={subActionForm.when} onChange={e=>setSubActionForm({...subActionForm, when: e.target.value})} className="w-1/3 text-sm font-bold text-zinc-800 p-3 rounded-xl border-2 border-zinc-200 outline-none focus:border-yellow-500 bg-zinc-50" />
                                        </div>
                                        <button type="button" onClick={handleAddSubAction} className="w-full mt-1 bg-zinc-800 text-yellow-500 px-4 py-3 rounded-xl font-black uppercase tracking-wider hover:bg-black transition-colors shadow-md flex justify-center items-center gap-2">{t('Adicionar à Lista', 'Add to List')}</button>
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
    <div className="min-h-screen bg-zinc-100 font-sans text-zinc-900 selection:bg-yellow-200 selection:text-black">
      <header className="bg-black border-b border-zinc-800 sticky top-0 z-40 shadow-xl">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-6">
                <div className="h-12 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 overflow-hidden px-3 min-w-[3rem]">
                    {appLogo ? (
                        <img src={appLogo} alt="Logo" className="h-8 w-auto object-contain" onError={(e)=>{e.target.style.display='none'}} />
                    ) : (
                        <span className="text-yellow-500 font-black text-2xl" style={{ fontFamily: 'Georgia, serif' }}>K</span>
                    )}
                </div>
                <div>
                    <h1 className="text-xl font-black text-white tracking-tight leading-none">{t('Painel KdB', 'KdB Dashboard')}</h1>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1.5">{user.role === 'admin' || user.role === 'dev' ? t('Acesso Administrativo', 'Administrative Access') : `${t('Operacional:', 'Operational:')} ${translateArea(user.area)}`}</p>
                </div>
            </div>

            <nav className="hidden lg:flex gap-1 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 shadow-inner">
                {(user.role === 'admin' || user.role === 'dev') && (
                    <button onClick={() => setActiveTab('diretoria')} className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all flex items-center gap-2 ${activeTab === 'diretoria' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                        <BarChart3 size={16} /> {t('Diretoria', 'Board')}
                    </button>
                )}
                <button onClick={() => setActiveTab('kpi')} className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all flex items-center gap-2 ${activeTab === 'kpi' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                    <LineChartIcon size={16} /> {t('KPIs', 'KPIs')}
                </button>

                {(user.role === 'admin' || user.role === 'dev' || user.area === 'Comercial') && (
                    <button onClick={() => setActiveTab('comercial')} className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all flex items-center gap-2 ${activeTab === 'comercial' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                        <DollarSign size={16} /> {t('Comercial', 'Commercial')}
                    </button>
                )}

                {(user.role === 'admin' || user.role === 'dev' || user.area === 'Financeiro' || user.username.toUpperCase().includes('FABIO')) && (
                    <button onClick={() => setActiveTab('financeiro')} className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all flex items-center gap-2 ${activeTab === 'financeiro' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                        <Globe size={16} /> {t('Financeiro', 'Finance')}
                    </button>
                )}

                <button onClick={() => setActiveTab('5w2h')} className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all flex items-center gap-2 ${activeTab === '5w2h' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                    <ListChecks size={16} /> {t('Matriz 5W2H', '5W2H Matrix')}
                </button>
                {(user.username.toUpperCase() === 'LUCIENE' || user.area === 'Comercial' || user.role === 'admin' || user.role === 'dev') && (
                    <button onClick={() => setActiveTab('auditoria')} className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all flex items-center gap-2 ${activeTab === 'auditoria' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                        <FileSpreadsheet size={16} /> {t('Auditoria', 'Audit')}
                    </button>
                )}
            </nav>

            <div className="flex items-center gap-4">
                <input type="file" id="logo-upload-input" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                
                {(user.role === 'admin' || user.role === 'dev') && (
                    <button onClick={triggerLogoUpload} className="p-3 text-zinc-500 hover:bg-zinc-800 hover:text-yellow-500 rounded-xl transition-colors" title={t('Alterar Logo da Empresa', 'Change Company Logo')}>
                        <ImageIcon size={20} />
                    </button>
                )}

                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 mr-2">
                    <button onClick={() => setLang('PT')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${lang === 'PT' ? 'bg-yellow-500 text-black shadow-sm' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}>PT</button>
                    <button onClick={() => setLang('EN')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${lang === 'EN' ? 'bg-yellow-500 text-black shadow-sm' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}>EN</button>
                </div>

                <div className="flex items-center gap-3 bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800 shadow-sm">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-500/50"></div>
                    <span className="text-xs font-black text-white uppercase tracking-wider">{user.username}</span>
                </div>
                <button onClick={() => window.location.reload()} className="p-3 text-zinc-500 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-colors" title={t('Sair com Segurança', 'Logout Safely')}>
                    <LogOut size={20} />
                </button>
            </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        {activeTab === 'diretoria' && renderDiretoria()}
        {activeTab === 'kpi' && renderKPI()}
        {activeTab === 'comercial' && renderComercial()}
        {activeTab === 'financeiro' && renderFinanceiro()}
        {activeTab === 'auditoria' && renderAuditoria()}
        {activeTab === '5w2h' && render5W2H()}
      </main>

      {/* CONFIRM DIALOG SYSTEM */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-zinc-900/90 backdrop-blur-sm" onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null })}></div>
            <div className="relative bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-red-100 text-red-600 rounded-full shrink-0">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-lg font-black text-zinc-900 leading-tight">{confirmDialog.message}</h3>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null })} className="flex-1 px-4 py-3 bg-zinc-100 text-zinc-700 font-bold rounded-xl hover:bg-zinc-200 transition-colors">{t('Cancelar', 'Cancel')}</button>
                    <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog({ isOpen: false, message: '', onConfirm: null }); }} className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors">{t('Sim, Excluir', 'Yes, Delete')}</button>
                </div>
            </div>
        </div>
      )}

      {/* TOAST SYSTEM */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-white font-bold text-sm border-2 ${toast.type === 'error' ? 'bg-red-600 border-red-500 shadow-red-500/30' : 'bg-zinc-900 border-yellow-500 shadow-yellow-500/20'}`}>
                {toast.type === 'error' ? <AlertTriangle size={22} /> : <CheckCircle2 className="text-yellow-500" size={22} />}
                <span className="mt-0.5 tracking-wide">{toast.msg}</span>
            </div>
        </div>
      )}
    </div>
  );
}
