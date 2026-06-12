import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, ListChecks, LineChart as LineChartIcon, FileSpreadsheet, 
  Crown, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle,
  LogOut, Save, Filter, X, MessageSquareText, HelpCircle, ArrowRightCircle, Target,
  PieChart as PieChartIcon, BarChart3, Edit2, Trash2, GitBranch, Calendar, User, PlusCircle, History, Info, ChevronRight, ChevronLeft, Download, DollarSign, Image as ImageIcon, Briefcase, Globe, Menu
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
const META_ANUAL_FATURAMENTO = 33500000;
const META_ANUAL_VENDAS = 35800000;

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

const formatCurrencyShort3 = (val) => {
  if (val === undefined || val === null || isNaN(val) || val === '') return '';
  const num = parseFloat(val);
  if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(3).replace('.', ',') + 'M';
  if (Math.abs(num) >= 1000) return (num / 1000).toFixed(3).replace('.', ',') + 'K';
  return num.toFixed(3).replace('.', ',');
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

const CustomTooltipFinanceiro2 = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-zinc-950 text-white p-4 rounded-xl shadow-2xl border border-zinc-800 z-50">
                <p className="font-bold text-sm mb-3 text-yellow-500 border-b border-zinc-800 pb-2">{label}</p>
                {payload.map((entry, index) => {
                    let valStr = entry.value;
                    if (entry.name.includes('%') || ['Giro Ativo', 'Alavancagem', 'Liq Imediata', 'Liq Seca', 'Liq Corrente'].includes(entry.name)) {
                        valStr = parseFloat(entry.value).toFixed(1) + '%';
                    } else {
                        valStr = formatCurrency(entry.value);
                    }

                    return (
                        <p key={index} className="text-sm font-black flex justify-between gap-6 mb-1" style={{ color: entry.color }}>
                            <span>{entry.name}:</span>
                            <span>{valStr}</span>
                        </p>
                    )
                })}
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDuPontExpanded, setIsDuPontExpanded] = useState(false); 
  const [duPontActiveIndex, setDuPontActiveIndex] = useState(0);
  
  const [lang, setLang] = useState('PT');
  const t = (pt, en) => lang === 'PT' ? pt : en;

  const tInd = (name) => {
      if (!name) return '';
      if (lang === 'PT') return name;
      const lowerName = name.toLowerCase();

      const map = {
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
          "faturamento líquido": "Net Revenue",
          "faturamento liquido": "Net Revenue",
          "faturamento previsto": "Forecasted Revenue",
          "faturamento realizado": "Actual Revenue / Invoiced",
          "faturamento": "Revenue",
          "prazo médio": "Average Lead Time",
          "prazo medio": "Average Lead Time",
          "estoque": "Inventory"
      };
      
      for (const [pt, en] of Object.entries(map)) {
          if (lowerName === pt) return en;
      }
      for (const [pt, en] of Object.entries(map)) {
          if (lowerName.includes(pt)) return en;
      }
      
      return name;
  };

  const translateArea = (ar) => {
      const map = { 'Comercial': 'Commercial', 'Engenharia': 'Engineering', 'Produção': 'Production', 'Qualidade': 'Quality', 'DP': 'HR', 'Estoque': 'Inventory', 'Supply': 'Procurement', 'PCP': 'PCP', 'Financeiro': 'Finance' };
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

  const [actions, setActions] = useState([]);
  const [subActions, setSubActions] = useState([]);
  const [dbOwners, setDbOwners] = useState([]);
  const [dbIndicators, setDbIndicators] = useState([]);
  const [dbGoals, setDbGoals] = useState([]);
  const [dbValues, setDbValues] = useState([]);
  const [dbComments, setDbComments] = useState([]);
  const [incomingOrders, setIncomingOrders] = useState([]);

  const [kpiOwnerId, setKpiOwnerId] = useState(1);
  const [kpiEditPeriod, setKpiEditPeriod] = useState(months[new Date().getMonth()]);
  const [kpiViewPeriod, setKpiViewPeriod] = useState('ALL');
  const [kpiViewMode, setKpiViewMode] = useState('MONTHLY');
  const [comercialViewPeriod, setComercialViewPeriod] = useState('ALL'); 
  const [comercialViewMode, setComercialViewMode] = useState('YTD'); 
  
  const [financeMargins, setFinanceMargins] = useState({});
  const [pcpMargin, setPcpMargin] = useState(0);
  const [isFinanceLoaded, setIsFinanceLoaded] = useState(false);

  const [formValues, setFormValues] = useState({});
  const [formComments, setFormComments] = useState({});
  const [expandedCommentId, setExpandedCommentId] = useState(null); 
  const [expandedCardId, setExpandedCardId] = useState(null);

  const [selectedCommentModal, setSelectedCommentModal] = useState(null);

  const [actionFilterArea, setActionFilterArea] = useState('Todas');
  const [actionFilterStatus, setActionFilterStatus] = useState('Todos');
  const [isAddActionModalOpen, setIsAddActionModalOpen] = useState(false);
  const [editingActionId, setEditingActionId] = useState(null);
  const [actionForm, setActionForm] = useState({ what: '', why: '', area: 'Comercial', who: '', when: '' });
  
  const [selectedReportAction, setSelectedReportAction] = useState(null);
  const [updateType, setUpdateType] = useState('realizado');
  const [updateText, setUpdateText] = useState('');
  const [subActionForm, setSubActionForm] = useState({ what: '', who: '', when: '' });
  
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });

  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState(false);

  const [currentSectorIndex, setCurrentSectorIndex] = useState(0);

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
      if (activeTab === 'financeiro') {
          setKpiOwnerId(9);
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

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!supabaseClient) {
        setLoginError(true);
        return;
    }

    setLoading(true);
    try {
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: loginUser.trim(),
            password: loginPass.trim()
        });

        if (authError || !authData.user) {
            throw new Error('Credenciais inválidas no Auth');
        }

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
          else if(upper.includes('FABIO') || upper.includes('FINANCEIRO')) setKpiOwnerId(9);
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
              if (error) throw error; 
              showToast(t("Ação atualizada!", "Action updated!"));
          } else {
              const { error } = await supabaseClient.from('actions').insert([actionForm]);
              if (error) throw error; 
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
  
  const handleSubStatusChange = async (subId, newStatus) => {
      setLoading(true);
      try {
          await supabaseClient.from('sub_actions').update({ status: newStatus }).eq('id', subId);
          loadData();
      } catch(e) {
          showToast(t("Erro", "Error"), "error");
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

  const computedData = useMemo(() => {
    let allValues = [...dbValues];

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

      if (autoMap.contratoId) setRes(autoMap.contratoId, vContrato, 1);
      if (autoMap.spotId) setRes(autoMap.spotId, vSpot, 1);
      if (autoMap.pg1Id) setRes(autoMap.pg1Id, qPg1, 1);
      if (autoMap.pg2Id) setRes(autoMap.pg2Id, qPg2, 1);
      if (autoMap.pg3Id) setRes(autoMap.pg3Id, qPg3, 1);
      if (autoMap.servicoId) setRes(autoMap.servicoId, qServ, 1);

      if (allValues.some(v => v.owner_id === 1 && v.period === period)) {
        const manualFilled = dbValues.some(v => v.owner_id === 1 && v.period === period);
        const vVendas = getVal(1, 1);
        const qAprovados = getVal(4, 1);
        const qEnviados = getVal(6, 1);
        const vEnviados = getVal(7, 1);
        const vVendidosMes = getVal(8, 1);

        if (manualFilled) {
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
        } else {
            setRes(74, 0, 1);
            setRes(75, 0, 1);
        }
        
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
  }, [dbValues, incomingOrders, dbIndicators]); 

  useEffect(() => {
      const newVals = {};
      const newComms = {};
      
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
  }, [kpiOwnerId, kpiEditPeriod, computedData, dbComments]); 

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
    
    const pcpYtd = computedData.filter(v => v.indicator_id === 24).reduce((a,c) => a + parseFloat(c.value||0), 0);
    const pcpProfit = (pcpYtd * (parseFloat(pcpMargin)||0)) / 100;

    const financeIndicators = dbIndicators.filter(i => {
        if (i.id >= 101 && i.id <= 130) return true;
        if (!i.name) return false;
        const cleanName = i.name.toUpperCase().replace(/[^A-Z]/g, '');
        return ['EBT', 'EBTBUDGET', 'EBITDA', 'EBITDABUDGET', 'EBTREALIZADO', 'EBITDAREALIZADO'].includes(cleanName);
    }).sort((a,b) => a.id - b.id);

    const handleSaveFinanceKPIs = async (e) => {
        e.preventDefault();
        setLoading(true);
        const payload = [];
        financeIndicators.forEach(ind => {
            const val = formValues[ind.id];
            if (val !== undefined && val !== '') {
                payload.push({ indicator_id: ind.id, owner_id: 9, period: kpiEditPeriod, value: parseFloat(val) });
            }
        });

        if(payload.length === 0) {
            showToast(t('Preencha ao menos um valor.', 'Fill in at least one value.'), 'error');
            setLoading(false);
            return;
        }

        try {
            const indIds = payload.map(p => p.indicator_id);
            await supabaseClient.from('indicator_values').delete().eq('owner_id', 9).eq('period', kpiEditPeriod).in('indicator_id', indIds);
            await supabaseClient.from('indicator_values').insert(payload);
            showToast(t(`Valores de ${kpiEditPeriod} salvos!`, `Data for ${kpiEditPeriod} saved!`));
            loadData();
        } catch (err) {
            showToast(t('Erro ao salvar no banco.', 'Error saving to DB.'), 'error');
        }
        setLoading(false);
    };

    const financeiroCorpData = months.filter(m => kpiViewPeriod === 'ALL' || monthOrder[m] <= monthOrder[kpiViewPeriod]).map(m => {
        const getV = (id) => parseFloat(computedData.find(v => v.indicator_id === id && v.period === m)?.value || 0);
        
        const getVByFuzzyName = (keywords, excludeKeywords = []) => {
            const matchingIndicators = dbIndicators.filter(i => {
                if (!i.name) return false;
                const n = i.name.toUpperCase();
                const hasKeywords = keywords.every(kw => n.includes(kw));
                const hasExclude = excludeKeywords.some(kw => n.includes(kw));
                return hasKeywords && !hasExclude;
            });
            
            for (let ind of matchingIndicators) {
                const val = getV(ind.id);
                if (val !== 0) return val;
            }
            return 0;
        };

        const v1 = getV(101), v2 = getV(102), v3 = getV(103), v4 = getV(104), v5 = getV(105);
        const v10 = getV(110), v11 = getV(111), v12 = getV(112), v13 = getV(113), v14 = getV(114), v15 = getV(115);
        const v16 = getV(116), v17 = getV(117);
        
        const ebitVal = getV(106) || getVByFuzzyName(['EBIT'], ['BUDGET', 'META', 'PREVISTO', 'EBITDA']) || getVByFuzzyName(['EBT'], ['BUDGET', 'META', 'PREVISTO', 'EBITDA']) || 0;
        const ebitBudgetVal = getV(107) || getVByFuzzyName(['EBIT', 'BUDGET'], ['EBITDA']) || getVByFuzzyName(['EBT', 'BUDGET'], ['EBITDA']) || 0;
        const ebitdaVal = getV(108) || getVByFuzzyName(['EBITDA'], ['BUDGET', 'META', 'PREVISTO']) || 0;
        const ebitdaBudgetVal = getV(109) || getVByFuzzyName(['EBITDA', 'BUDGET']) || getVByFuzzyName(['EBITDA', 'META']) || 0;

        return {
            name: m,
            'Receita Liquida': v1,
            'Receita Budget': v2,
            'Margem Bruta %': v1 > 0 ? ((v1 - v3) / v1) * 100 : 0,
            'SG&A': v4,
            'SG&A Budget': v5,
            'ROE %': v12 > 0 ? (v10 / v12) * 100 : 0,
            'Margem Liquida %': v1 > 0 ? (v10 / v1) * 100 : 0,
            'Giro Ativo': v11 > 0 ? (v1 / v11) * 100 : 0,
            'Alavancagem': v12 > 0 ? (v11 / v12) * 100 : 0,
            'Liq Imediata': v13 * 100,
            'Liq Seca': v14 * 100,
            'Liq Corrente': v15 * 100,
            'Var Nao Realizada': v16,
            'Var Realizada': v17,
            'Var Total': v16 + v17,
            'EBIT': ebitVal,
            'EBIT Budget': ebitBudgetVal,
            'EBIT %': v1 > 0 ? (ebitVal / v1) * 100 : 0,
            'EBIT Budget %': v2 > 0 ? (ebitBudgetVal / v2) * 100 : 0,
            'EBITDA': ebitdaVal,
            'EBITDA Budget': ebitdaBudgetVal,
            'EBITDA %': v1 > 0 ? (ebitdaVal / v1) * 100 : 0,
            'EBITDA Budget %': v2 > 0 ? (ebitdaBudgetVal / v2) * 100 : 0
        };
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
           <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-zinc-200">
              <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl"><DollarSign size={24} /></div>
                  <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{t('Painel Financeiro', 'Financial Dashboard')}</h2>
              </div>
              <div className="flex items-center gap-3 bg-zinc-50 p-2 rounded-2xl border border-zinc-200">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">{t('Análise até o mês', 'YTD as of')}</label>
                  <select className="border-none bg-white text-zinc-900 px-4 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer shadow-sm" value={kpiViewPeriod} onChange={(e) => setKpiViewPeriod(e.target.value)}>
                      <option value="ALL">{t('Acumulado do Ano (YTD)', 'Year-to-Date (YTD)')}</option>
                      {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
              </div>
           </div>

           {/* NOVA ÁREA DE DIGITAÇÃO FINANCEIRA */}
           <div className="bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden mb-6">
               <div className="p-6 border-b border-zinc-100 bg-zinc-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                   <div>
                       <h3 className="text-xl font-extrabold text-zinc-900 flex items-center gap-3">
                           <FileSpreadsheet className="text-yellow-600" size={24} /> {t('Lançamento de Resultados Financeiros', 'Financial Data Entry')}
                       </h3>
                       <p className="text-sm text-zinc-500 mt-1 font-medium">{t('Preencha os valores para o mês selecionado.', 'Fill in the values for the selected month.')}</p>
                   </div>
                   <div className="flex items-center gap-3 bg-zinc-900 p-2 rounded-2xl shadow-sm border border-zinc-800 shrink-0">
                       <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-3">{t('Mês de Edição', 'Edit Month')}</label>
                       <select className="border-none bg-zinc-800 text-yellow-500 px-5 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer shadow-sm" value={kpiEditPeriod} onChange={(e) => setKpiEditPeriod(e.target.value)}>
                           {months.map(m => <option key={m} value={m}>{m}</option>)}
                       </select>
                   </div>
               </div>
               <form onSubmit={handleSaveFinanceKPIs} className="p-6">
                   <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                       {financeIndicators.map(ind => (
                           <div key={ind.id} className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 flex flex-col justify-between gap-2">
                               <label className="text-[10px] font-bold text-zinc-700 leading-tight h-8 line-clamp-2" title={tInd(ind.name)}>{tInd(ind.name).replace(/^\d+\.\s*/, '')}</label>
                               <div className="flex items-center gap-2">
                                   <input 
                                       type="number" step="any"
                                       value={formValues[ind.id] !== undefined ? formValues[ind.id] : ''}
                                       onChange={(e) => handleValueChange(ind.id, e.target.value)}
                                       className="w-full text-right bg-white border border-zinc-300 focus:border-yellow-500 rounded-lg p-2 font-black text-sm outline-none transition-colors"
                                       placeholder="0"
                                   />
                                   <span className="text-[9px] font-black text-zinc-400 w-5">{ind.unit}</span>
                               </div>
                           </div>
                       ))}
                   </div>
                   <div className="mt-6 flex justify-end pt-4 border-t border-zinc-100">
                       <button type="submit" disabled={loading} className="bg-black text-yellow-500 px-8 py-3 rounded-xl font-bold hover:bg-zinc-800 shadow-lg active:scale-95 flex items-center gap-2 transition-all disabled:opacity-50">
                           <Save size={18} /> {t('Gravar Valores', 'Save Data')}
                       </button>
                   </div>
               </form>
           </div>

           {/* PAINEL DE GRÁFICOS CORPORATIVOS FINANCEIRO */}
           <div className="pt-8 mt-8 border-t border-zinc-200">
                <div className="mb-6">
                    <h2 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
                        <div className="p-3 bg-zinc-900 text-yellow-500 rounded-xl"><LineChartIcon size={24} /></div>
                        {t('Performance Financeira Corporativa', 'Corporate Financial Performance')}
                    </h2>
                    <p className="text-zinc-500 text-sm mt-2 font-medium">{t('Análise de Receita, DuPont e Variação Cambial', 'Revenue, DuPont Analysis and FX Variation')}</p>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 mb-6">
                    <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4">Receita Líquida x Margem Bruta</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={financeiroCorpData} margin={{top:40, right:20, left:20, bottom:0}} barGap={8}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#71717a'}} dy={10} />
                            <YAxis yAxisId="left" width={80} axisLine={false} tickLine={false} tickFormatter={(val) => formatCurrencyShort3(val)} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={-10} />
                            <YAxis yAxisId="right" width={50} orientation="right" axisLine={false} tickLine={false} tickFormatter={(val) => val.toFixed(0)+'%'} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={10} domain={[0, 100]} />
                            <Tooltip content={<CustomTooltipFinanceiro2 />} cursor={{fill: '#f4f4f5'}} />
                            <Legend wrapperStyle={{fontSize: '11px', fontWeight: 'bold', paddingTop: '20px'}} />
                            
                            <Bar yAxisId="left" dataKey="Receita Budget" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={45}>
                                <LabelList dataKey="Receita Budget" position="top" fill="#71717a" fontSize={11} fontWeight="900" formatter={(val) => val !== 0 ? formatCurrencyShort3(val) : ''} />
                            </Bar>
                            
                            <Bar yAxisId="left" dataKey="Receita Liquida" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45}>
                                <LabelList dataKey="Receita Liquida" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={(val) => val !== 0 ? formatCurrencyShort3(val) : ''} />
                            </Bar>
                            
                            <Line yAxisId="right" type="monotone" dataKey="Margem Bruta %" stroke="#eab308" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: 'white'}}>
                                <LabelList dataKey="Margem Bruta %" content={(props) => {
                                    const { x, y, value } = props;
                                    if (!value) return null;
                                    const valStr = value.toFixed(1) + '%';
                                    return (
                                        <g>
                                            <text x={x} y={y - 12} stroke="white" strokeWidth={5} strokeLinejoin="round" fill="white" fontSize={11} fontWeight="900" textAnchor="middle">{valStr}</text>
                                            <text x={x} y={y - 12} fill="#eab308" fontSize={11} fontWeight="900" textAnchor="middle">{valStr}</text>
                                        </g>
                                    );
                                }} />
                            </Line>
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 mb-6">
                    <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4">SG&A</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={financeiroCorpData} margin={{top:30, right:0, left:-10, bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#71717a'}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => formatCurrencyShort(val)} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={-10} />
                            <Tooltip content={<CustomTooltipFinanceiro2 />} cursor={{fill: '#f4f4f5'}} />
                            <Legend wrapperStyle={{fontSize: '11px', fontWeight: 'bold', paddingTop: '20px'}} />
                            <Bar dataKey="SG&A Budget" fill="#fca5a5" radius={[4, 4, 0, 0]} maxBarSize={60}>
                                <LabelList dataKey="SG&A Budget" position="top" fill="#71717a" fontSize={11} fontWeight="900" formatter={(val) => val !== 0 ? formatCurrencyShort(val) : ''} />
                            </Bar>
                            <Bar dataKey="SG&A" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={60}>
                                <LabelList dataKey="SG&A" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={(val) => val !== 0 ? formatCurrencyShort(val) : ''} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* GRÁFICO ROE - DESTAQUE E EXPANSÍVEL */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-zinc-100 pb-4">
                        <div>
                            <h3 className="text-lg font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2"><Crown className="text-purple-500" size={20}/> Análise DuPont: ROE (%)</h3>
                            <p className="text-xs text-zinc-500 font-bold mt-1">Retorno sobre o Patrimônio Líquido</p>
                        </div>
                        <button 
                            onClick={() => setIsDuPontExpanded(!isDuPontExpanded)} 
                            className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md ${isDuPontExpanded ? 'bg-purple-600 text-white shadow-purple-500/30' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
                        >
                            <GitBranch size={16} />
                            {isDuPontExpanded ? t('Ocultar Justificativas', 'Hide Justifications') : t('Ver Justificativas (Árvore de Valor)', 'View Justifications')}
                        </button>
                    </div>

                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={financeiroCorpData} margin={{top:20, right:20, left:-20, bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#71717a'}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={v => v.toFixed(1) + '%'} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={-5} />
                            <Tooltip content={<CustomTooltipFinanceiro2 />} cursor={{fill: '#f4f4f5'}} />
                            <Line type="monotone" dataKey="ROE %" stroke="#8b5cf6" strokeWidth={5} dot={{r: 6, strokeWidth: 2, fill: 'white'}} activeDot={{r: 8}}>
                                <LabelList dataKey="ROE %" content={(props) => {
                                    const { x, y, value } = props;
                                    if (!value) return null;
                                    const valStr = value.toFixed(1) + '%';
                                    return (
                                        <g>
                                            <text x={x} y={value >= 0 ? y - 15 : y + 22} stroke="white" strokeWidth={5} strokeLinejoin="round" fill="white" fontSize={12} fontWeight="900" textAnchor="middle">{valStr}</text>
                                            <text x={x} y={value >= 0 ? y - 15 : y + 22} fill="#8b5cf6" fontSize={12} fontWeight="900" textAnchor="middle">{valStr}</text>
                                        </g>
                                    );
                                }} />
                            </Line>
                        </LineChart>
                    </ResponsiveContainer>

                    {/* EXPANSÃO DUPONT DINÂMICA */}
                    {isDuPontExpanded && (
                        <div className="mt-8 pt-8 border-t-2 border-dashed border-zinc-200 animate-in slide-in-from-top-4 fade-in duration-300">
                            <div className="bg-zinc-50 p-6 md:p-8 rounded-3xl border border-zinc-200 relative overflow-hidden">
                                
                                <div className="flex items-center justify-between mb-8">
                                    <button onClick={() => setDuPontActiveIndex(prev => prev === 0 ? 2 : prev - 1)} className="p-3 bg-white border border-zinc-200 rounded-full hover:bg-zinc-100 hover:scale-105 transition-all shadow-sm">
                                        <ChevronLeft size={24} className="text-zinc-700" />
                                    </button>
                                    <div className="text-center flex-1 px-4">
                                        <h4 className="text-base md:text-lg font-black text-zinc-800 uppercase tracking-widest flex items-center justify-center gap-2">
                                            <ArrowRightCircle size={20} className="text-purple-500"/> 
                                            {duPontActiveIndex === 0 && 'Margem Líquida %'}
                                            {duPontActiveIndex === 1 && 'Giro Ativo'}
                                            {duPontActiveIndex === 2 && 'Alavancagem'}
                                        </h4>
                                        <p className="text-xs md:text-sm text-zinc-500 font-bold mt-1.5">
                                            {duPontActiveIndex === 0 && t('Mede a Eficiência Operacional (Lucratividade)', 'Measures Operational Efficiency (Profitability)')}
                                            {duPontActiveIndex === 1 && t('Mede a Eficiência no Uso dos Ativos', 'Measures Asset Utilization Efficiency')}
                                            {duPontActiveIndex === 2 && t('Mede o Multiplicador de Capital Próprio (Risco)', 'Measures Equity Multiplier (Financial Risk)')}
                                        </p>
                                    </div>
                                    <button onClick={() => setDuPontActiveIndex(prev => prev === 2 ? 0 : prev + 1)} className="p-3 bg-white border border-zinc-200 rounded-full hover:bg-zinc-100 hover:scale-105 transition-all shadow-sm">
                                        <ChevronRight size={24} className="text-zinc-700" />
                                    </button>
                                </div>

                                <ResponsiveContainer width="100%" height={280}>
                                    <LineChart data={financeiroCorpData} margin={{top:20, right:20, left:-20, bottom:0}}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#71717a'}} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tickFormatter={v => v.toFixed(1) + '%'} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={-5} />
                                        <Tooltip content={<CustomTooltipFinanceiro2 />} cursor={{fill: '#f4f4f5'}} />
                                        
                                        {duPontActiveIndex === 0 && (
                                            <Line type="monotone" dataKey="Margem Liquida %" stroke="#ec4899" strokeWidth={4} dot={{r: 5, strokeWidth: 2, fill: 'white'}} activeDot={{r: 7}} animationDuration={500}>
                                                <LabelList dataKey="Margem Liquida %" content={(props) => {
                                                    const { x, y, value } = props;
                                                    if (!value) return null;
                                                    const valStr = value.toFixed(1) + '%';
                                                    return (
                                                        <g>
                                                            <text x={x} y={value >= 0 ? y - 12 : y + 20} stroke="white" strokeWidth={5} strokeLinejoin="round" fill="white" fontSize={11} fontWeight="900" textAnchor="middle">{valStr}</text>
                                                            <text x={x} y={value >= 0 ? y - 12 : y + 20} fill="#ec4899" fontSize={11} fontWeight="900" textAnchor="middle">{valStr}</text>
                                                        </g>
                                                    );
                                                }} />
                                            </Line>
                                        )}
                                        {duPontActiveIndex === 1 && (
                                            <Line type="monotone" dataKey="Giro Ativo" stroke="#14b8a6" strokeWidth={4} dot={{r: 5, strokeWidth: 2, fill: 'white'}} activeDot={{r: 7}} animationDuration={500}>
                                                <LabelList dataKey="Giro Ativo" content={(props) => {
                                                    const { x, y, value } = props;
                                                    if (!value) return null;
                                                    const valStr = value.toFixed(1) + '%';
                                                    return (
                                                        <g>
                                                            <text x={x} y={value >= 0 ? y - 12 : y + 20} stroke="white" strokeWidth={5} strokeLinejoin="round" fill="white" fontSize={11} fontWeight="900" textAnchor="middle">{valStr}</text>
                                                            <text x={x} y={value >= 0 ? y - 12 : y + 20} fill="#14b8a6" fontSize={11} fontWeight="900" textAnchor="middle">{valStr}</text>
                                                        </g>
                                                    );
                                                }} />
                                            </Line>
                                        )}
                                        {duPontActiveIndex === 2 && (
                                            <Line type="monotone" dataKey="Alavancagem" stroke="#f59e0b" strokeWidth={4} dot={{r: 5, strokeWidth: 2, fill: 'white'}} activeDot={{r: 7}} animationDuration={500}>
                                                <LabelList dataKey="Alavancagem" content={(props) => {
                                                    const { x, y, value } = props;
                                                    if (!value) return null;
                                                    const valStr = value.toFixed(1) + '%';
                                                    return (
                                                        <g>
                                                            <text x={x} y={value >= 0 ? y - 12 : y + 20} stroke="white" strokeWidth={5} strokeLinejoin="round" fill="white" fontSize={11} fontWeight="900" textAnchor="middle">{valStr}</text>
                                                            <text x={x} y={value >= 0 ? y - 12 : y + 20} fill="#f59e0b" fontSize={11} fontWeight="900" textAnchor="middle">{valStr}</text>
                                                        </g>
                                                    );
                                                }} />
                                            </Line>
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>

                                <div className="flex justify-center gap-3 mt-6">
                                    {[0, 1, 2].map((idx) => (
                                        <button 
                                            key={idx} 
                                            onClick={() => setDuPontActiveIndex(idx)} 
                                            className={`h-2.5 rounded-full transition-all duration-300 ${idx === duPontActiveIndex ? 'w-8 bg-purple-500' : 'w-2.5 bg-zinc-300 hover:bg-zinc-400'}`}
                                            title={`Ver Gráfico ${idx + 1}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mb-4 mt-8 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest">Índices de Liquidez</h3>
                </div>
                <div className="grid grid-cols-1 gap-6 mb-6">
                    {[
                        { key: 'Liq Imediata', color: '#10b981' },
                        { key: 'Liq Seca', color: '#3b82f6' },
                        { key: 'Liq Corrente', color: '#eab308' }
                    ].map(graph => (
                        <div key={graph.key} className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200">
                            <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">{graph.key}</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={financeiroCorpData} margin={{top:20, right:10, left:-20, bottom:0}}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold', fill: '#71717a'}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tickFormatter={v => v.toFixed(1) + '%'} tick={{fontSize: 9, fill: '#71717a', fontWeight: 'bold'}} dx={-5} />
                                    <Tooltip content={<CustomTooltipFinanceiro2 />} cursor={{fill: '#f4f4f5'}} />
                                    <Line type="monotone" dataKey={graph.key} stroke={graph.color} strokeWidth={4} dot={{r: 4, strokeWidth: 2, fill: 'white'}} activeDot={{r: 6}}>
                                        <LabelList dataKey={graph.key} content={(props) => {
                                            const { x, y, value } = props;
                                            if (!value) return null;
                                            const valStr = value.toFixed(1) + '%';
                                            return (
                                                <g>
                                                    <text x={x} y={value >= 0 ? y - 12 : y + 20} stroke="white" strokeWidth={5} strokeLinejoin="round" fill="white" fontSize={11} fontWeight="900" textAnchor="middle">{valStr}</text>
                                                    <text x={x} y={value >= 0 ? y - 12 : y + 20} fill={graph.color} fontSize={11} fontWeight="900" textAnchor="middle">{valStr}</text>
                                                </g>
                                            );
                                        }} />
                                    </Line>
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ))}
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 mt-6 mb-8">
                    <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4">Variação Cambial</h3>
                    <ResponsiveContainer width="100%" height={500}>
                        <LineChart data={financeiroCorpData} margin={{top:40, right:30, left:-10, bottom:20}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#71717a'}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => formatCurrencyShort(val)} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={-10} />
                            <Tooltip content={<CustomTooltipFinanceiro2 />} cursor={{fill: '#f4f4f5'}} />
                            <Legend wrapperStyle={{fontSize: '11px', fontWeight: 'bold', paddingTop: '20px'}} />
                            <Line type="monotone" dataKey="Var Nao Realizada" name="Não Realizada" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: 'white'}}>
                                <LabelList dataKey="Var Nao Realizada" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={(val) => val !== 0 ? formatCurrencyShort(val) : ''} />
                            </Line>
                            <Line type="monotone" dataKey="Var Realizada" name="Realizada" stroke="#ec4899" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: 'white'}}>
                                <LabelList dataKey="Var Realizada" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={(val) => val !== 0 ? formatCurrencyShort(val) : ''} />
                            </Line>
                            <Line type="monotone" dataKey="Var Total" name="Total (Realizada + Não Realizada)" stroke="#14b8a6" strokeWidth={4} dot={{r: 5, strokeWidth: 2, fill: 'white'}}>
                                <LabelList dataKey="Var Total" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={(val) => val !== 0 ? formatCurrencyShort(val) : ''} />
                            </Line>
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* GRÁFICOS NOVOS EBIT / EBITDA */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 mt-6 mb-8">
                    <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4">EBIT x Budget</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={financeiroCorpData} margin={{top:30, right:0, left:-10, bottom:0}} barGap={8}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#71717a'}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => formatCurrencyShort(val)} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={-10} />
                            <Tooltip content={<CustomTooltipFinanceiro2 />} cursor={{fill: '#f4f4f5'}} />
                            <Legend wrapperStyle={{fontSize: '11px', fontWeight: 'bold', paddingTop: '20px'}} />
                            <Bar dataKey="EBIT Budget" fill="#fde047" radius={[4, 4, 0, 0]} maxBarSize={45}>
                                <LabelList dataKey="EBIT Budget" position="top" fill="#71717a" fontSize={11} fontWeight="900" formatter={(val) => val !== 0 ? formatCurrencyShort(val) : ''} />
                            </Bar>
                            <Bar dataKey="EBIT" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={45}>
                                <LabelList dataKey="EBIT" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={(val) => val !== 0 ? formatCurrencyShort(val) : ''} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 mt-6 mb-8">
                    <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4">EBITDA x Budget</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={financeiroCorpData} margin={{top:30, right:0, left:-10, bottom:0}} barGap={8}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#71717a'}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => formatCurrencyShort(val)} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={-10} />
                            <Tooltip content={<CustomTooltipFinanceiro2 />} cursor={{fill: '#f4f4f5'}} />
                            <Legend wrapperStyle={{fontSize: '11px', fontWeight: 'bold', paddingTop: '20px'}} />
                            <Bar dataKey="EBITDA Budget" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={45}>
                                <LabelList dataKey="EBITDA Budget" position="top" fill="#71717a" fontSize={11} fontWeight="900" formatter={(val) => val !== 0 ? formatCurrencyShort(val) : ''} />
                            </Bar>
                            <Bar dataKey="EBITDA" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45}>
                                <LabelList dataKey="EBITDA" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={(val) => val !== 0 ? formatCurrencyShort(val) : ''} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
               <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200">
                   <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4">{t('Definição de Margens Categoria/PCP (%)', 'Margin Settings (%)')}</h3>
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
                                      <LabelList dataKey="Lucro" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={(val) => formatCurrencyShort(val)} />
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

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  
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
                                      <LabelList dataKey="value" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={(val) => formatCurrencyShort(val)} />
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
                                      <LabelList dataKey="value" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={(val) => formatCurrencyShort(val)} />
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
                              <p className="text-[9px] font-bold text-zinc-500 mt-0.5 uppercase">{t('Contrato vs Spot (R$)', 'Contract vs. Spot (BRL)')}</p>
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

  const renderDiretoria = () => {
    const currentMonthKey = kpiViewPeriod === 'ALL' ? months[new Date().getMonth()] : kpiViewPeriod;
    const mesAtualNum = monthOrder[currentMonthKey] || 1;
    
    const metaIdealFaturamento = (META_ANUAL_FATURAMENTO / 12) * mesAtualNum;
    const metaIdealVendas = (META_ANUAL_VENDAS / 12) * mesAtualNum;

    let computedDataDiretoria = computedData;
    if (kpiViewPeriod !== 'ALL') {
        computedDataDiretoria = computedData.filter(v => monthOrder[v.period] <= monthOrder[kpiViewPeriod]);
    }

    const filteredIncomingDiretoria = incomingOrders.filter(o => {
        if (kpiViewPeriod === 'ALL') return true;
        const orderMonth = normalizeExcelMonth(o.month);
        return monthOrder[orderMonth] <= monthOrder[kpiViewPeriod];
    });

    const faturamentoRealizado = computedDataDiretoria.filter(v => v.indicator_id === 24).reduce((acc, curr) => acc + parseFloat(curr.value || 0), 0);
    const atingimentoMetaFat = META_ANUAL_FATURAMENTO > 0 ? (faturamentoRealizado / META_ANUAL_FATURAMENTO) * 100 : 0;
    const diferencaMetaIdealFat = faturamentoRealizado - metaIdealFaturamento;
    const percMetaIdealFat = metaIdealFaturamento > 0 ? (faturamentoRealizado / metaIdealFaturamento) * 100 : 0;

    const vendasRealizadas = filteredIncomingDiretoria.reduce((acc, curr) => acc + (parseFloat(curr.net_value) || 0), 0);
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
        const propVendidas = incomingOrders.filter(o => normalizeExcelMonth(o.month) === m).reduce((acc, curr) => acc + (parseFloat(curr.net_value) || 0), 0);
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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
            <div className="flex flex-col gap-6 h-[400px]">
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

  return (
    <div className="min-h-screen bg-zinc-100 font-sans text-zinc-900 selection:bg-yellow-200 selection:text-black">
      <header className="bg-black border-b border-zinc-800 sticky top-0 z-[100] shadow-xl pointer-events-auto">
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

            <nav className="hidden lg:flex gap-1 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 shadow-inner relative z-[110]">
                {(user.role === 'admin' || user.role === 'dev') && (
                    <button type="button" onClick={() => setActiveTab('diretoria')} className={`px-4 xl:px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'diretoria' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                        <BarChart3 size={16} /> {t('Diretoria', 'Board')}
                    </button>
                )}
                <button type="button" onClick={() => setActiveTab('kpi')} className={`px-4 xl:px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'kpi' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                    <LineChartIcon size={16} /> {t('KPIs', 'KPIs')}
                </button>

                {(user.role === 'admin' || user.role === 'dev' || user.area === 'Comercial') && (
                    <button type="button" onClick={() => setActiveTab('comercial')} className={`px-4 xl:px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'comercial' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                        <DollarSign size={16} /> {t('Comercial', 'Commercial')}
                    </button>
                )}

                {(user.role === 'admin' || user.role === 'dev' || user.area === 'Financeiro' || user.username.toUpperCase().includes('FABIO')) && (
                    <button type="button" onClick={() => setActiveTab('financeiro')} className={`px-4 xl:px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'financeiro' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                        <Globe size={16} /> {t('Financeiro', 'Finance')}
                    </button>
                )}

                <button type="button" onClick={() => setActiveTab('5w2h')} className={`px-4 xl:px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all flex items-center gap-2 cursor-pointer ${activeTab === '5w2h' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                    <ListChecks size={16} /> {t('Matriz 5W2H', '5W2H Matrix')}
                </button>
                {(user.username.toUpperCase() === 'LUCIENE' || user.area === 'Comercial' || user.role === 'admin' || user.role === 'dev') && (
                    <button type="button" onClick={() => setActiveTab('auditoria')} className={`px-4 xl:px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'auditoria' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                        <FileSpreadsheet size={16} /> {t('Auditoria', 'Audit')}
                    </button>
                )}
            </nav>

            <div className="flex items-center gap-2 md:gap-4 relative z-[110]">
                <input type="file" id="logo-upload-input" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                
                {(user.role === 'admin' || user.role === 'dev') && (
                    <button type="button" onClick={triggerLogoUpload} className="hidden sm:block p-3 text-zinc-500 hover:bg-zinc-800 hover:text-yellow-500 rounded-xl transition-colors cursor-pointer" title={t('Alterar Logo da Empresa', 'Change Company Logo')}>
                        <ImageIcon size={20} />
                    </button>
                )}

                <div className="hidden sm:flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 mr-2">
                    <button type="button" onClick={() => setLang('PT')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${lang === 'PT' ? 'bg-yellow-500 text-black shadow-sm' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}>PT</button>
                    <button type="button" onClick={() => setLang('EN')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${lang === 'EN' ? 'bg-yellow-500 text-black shadow-sm' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}>EN</button>
                </div>

                <div className="flex items-center gap-3 bg-zinc-900 px-3 xl:px-4 py-2 rounded-full border border-zinc-800 shadow-sm shrink-0">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-500/50"></div>
                    <span className="text-[10px] xl:text-xs font-black text-white uppercase tracking-wider hidden sm:block truncate max-w-[80px] xl:max-w-[120px]">{user.username}</span>
                </div>
                <button type="button" onClick={() => window.location.reload()} className="hidden lg:block p-3 text-zinc-500 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-colors cursor-pointer" title={t('Sair com Segurança', 'Logout Safely')}>
                    <LogOut size={20} />
                </button>
                <button 
                    type="button"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="lg:hidden p-3 text-zinc-400 hover:text-yellow-500 rounded-xl transition-colors bg-zinc-900 border border-zinc-800 cursor-pointer"
                >
                    {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>
        </div>

        {isMobileMenuOpen && (
            <div className="lg:hidden absolute top-20 left-0 w-full border-t border-zinc-800 bg-zinc-950 p-4 flex flex-col gap-2 shadow-2xl animate-in slide-in-from-top-2 z-[120]">
                {(user.role === 'admin' || user.role === 'dev') && (
                    <button type="button" onClick={() => { setActiveTab('diretoria'); setIsMobileMenuOpen(false); }} className={`px-5 py-4 rounded-xl font-black uppercase tracking-wider text-sm transition-all flex items-center gap-3 cursor-pointer ${activeTab === 'diretoria' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                        <BarChart3 size={20} /> {t('Diretoria', 'Board')}
                    </button>
                )}
                <button type="button" onClick={() => { setActiveTab('kpi'); setIsMobileMenuOpen(false); }} className={`px-5 py-4 rounded-xl font-black uppercase tracking-wider text-sm transition-all flex items-center gap-3 cursor-pointer ${activeTab === 'kpi' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                    <LineChartIcon size={20} /> {t('KPIs', 'KPIs')}
                </button>
                {(user.role === 'admin' || user.role === 'dev' || user.area === 'Comercial') && (
                    <button type="button" onClick={() => { setActiveTab('comercial'); setIsMobileMenuOpen(false); }} className={`px-5 py-4 rounded-xl font-black uppercase tracking-wider text-sm transition-all flex items-center gap-3 cursor-pointer ${activeTab === 'comercial' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                        <DollarSign size={20} /> {t('Comercial', 'Commercial')}
                    </button>
                )}
                {(user.role === 'admin' || user.role === 'dev' || user.area === 'Financeiro' || user.username.toUpperCase().includes('FABIO')) && (
                    <button type="button" onClick={() => { setActiveTab('financeiro'); setIsMobileMenuOpen(false); }} className={`px-5 py-4 rounded-xl font-black uppercase tracking-wider text-sm transition-all flex items-center gap-3 cursor-pointer ${activeTab === 'financeiro' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                        <Globe size={20} /> {t('Financeiro', 'Finance')}
                    </button>
                )}
                <button type="button" onClick={() => { setActiveTab('5w2h'); setIsMobileMenuOpen(false); }} className={`px-5 py-4 rounded-xl font-black uppercase tracking-wider text-sm transition-all flex items-center gap-3 cursor-pointer ${activeTab === '5w2h' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                    <ListChecks size={20} /> {t('Matriz 5W2H', '5W2H Matrix')}
                </button>
                {(user.username.toUpperCase() === 'LUCIENE' || user.area === 'Comercial' || user.role === 'admin' || user.role === 'dev') && (
                    <button type="button" onClick={() => { setActiveTab('auditoria'); setIsMobileMenuOpen(false); }} className={`px-5 py-4 rounded-xl font-black uppercase tracking-wider text-sm transition-all flex items-center gap-3 cursor-pointer ${activeTab === 'auditoria' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                        <FileSpreadsheet size={20} /> {t('Auditoria', 'Audit')}
                    </button>
                )}
                <div className="h-px w-full bg-zinc-800 my-2"></div>
                <button type="button" onClick={() => window.location.reload()} className="px-5 py-4 rounded-xl font-black uppercase tracking-wider text-sm text-red-500 hover:bg-red-500/10 transition-all flex items-center gap-3 cursor-pointer">
                    <LogOut size={20} /> {t('Sair com Segurança', 'Logout Safely')}
                </button>
            </div>
        )}
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8 relative z-10">
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
