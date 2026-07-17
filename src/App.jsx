import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, ListChecks, LineChart as LineChartIcon, FileSpreadsheet, 
  Crown, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle,
  LogOut, Save, Filter, X, MessageSquareText, HelpCircle, ArrowRightCircle, Target,
  PieChart as PieChartIcon, BarChart3, Edit2, Trash2, GitBranch, Calendar, User, PlusCircle, History, Info, ChevronRight, ChevronLeft, Download, DollarSign, Image as ImageIcon, Briefcase, Globe, Menu, Upload, MapPin
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


const ObsoletosChart = ({ data }) => {
    const anos = ['2021','2022','2023','2024','2025','2026'];
    const gruposList = ['ABRESIST','PLACA ABT','FLANGES','CHAPA','BORRACHA','ELEM. FIXAÇÃO','COLA','KALCRET','KALCOR','KALEN','KALFIX','KALOCER','PLACA KLC','PASTILHA KLC','TUBO','METALLIC WEAR','TINTAS E DILUENTES','KALPOXY','ALMOXARIFADO','PLACA KALSICA','KALDETECT'];
    const coresMap = {'PLACA KLC':'#e34948','KALOCER':'#2a78d6','METALLIC WEAR':'#4a3aa7','ELEM. FIXAÇÃO':'#1baf7a'};
    const getCor = g => coresMap[g] || '#94a3b8';
    const top4 = ['PLACA KLC','KALOCER','METALLIC WEAR','ELEM. FIXAÇÃO'];

    const getVal = (grupo, ano) => {
        const row = data.find(d => d.grupo === grupo && d.ano === parseInt(ano));
        return row ? parseFloat(row.custo) || 0 : 0;
    };

    const totByAno = anos.map(a => gruposList.reduce((s,g) => s + getVal(g,a), 0));
    const acumulado = totByAno.reduce((acc,v,i) => { acc.push((acc[i-1]||0)+v); return acc; },[]);

    const fmt = v => {
        if(v>=1000000) return 'R$ '+(v/1000000).toFixed(2).replace('.',',')+'M';
        if(v>=1000)    return 'R$ '+Math.round(v/1000).toLocaleString('pt-BR')+'K';
        return v>0?'R$ '+Math.round(v).toLocaleString('pt-BR'):'-';
    };

    const tot26 = gruposList.reduce((s,g)=>s+getVal(g,'2026'),0);
    const tot25 = totByAno[4];
    const crescPct = tot25>0?(((tot26-tot25)/tot25)*100).toFixed(0):null;
    const placa26 = getVal('PLACA KLC','2026');
    const pctPlaca = tot26>0?((placa26/tot26)*100).toFixed(1):'0';
    const grupos26 = gruposList.map(g=>({label:g,val:getVal(g,'2026')})).filter(g=>g.val>0).sort((a,b)=>b.val-a.val);
    const seg = grupos26[1];
    const ter = grupos26[2];

    const chartDataEvol = anos.map((a,i) => {
        const row = {name:a, acumulado:acumulado[i]};
        top4.forEach(g => { row[g] = getVal(g,a); });
        row['Demais'] = gruposList.filter(g=>!top4.includes(g)).reduce((s,g)=>s+getVal(g,a),0);
        return row;
    });

    const chartDataLinha = anos.map(a => ({
        name:a,
        ...Object.fromEntries([...top4,'ABRESIST','PASTILHA KLC'].map(g=>{
            const v = getVal(g,a);
            return [g, v > 0 ? v : null];
        }))
    }));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    {lbl:'Total Jun/2026',val:fmt(tot26),sub:'Custo acumulado',cls:'border-l-4 border-red-400'},
                    {lbl:'PLACA KLC',val:fmt(placa26),sub:`${pctPlaca}% do total`,cls:'border-l-4 border-red-300'},
                    {lbl:'Crescimento vs 2025',val:crescPct?(crescPct>0?'+':'')+crescPct+'%':'—',sub:`2025: ${fmt(tot25)}`,cls:'border-l-4 border-amber-400'},
                    {lbl:'Acumulado histórico',val:fmt(acumulado[5]),sub:'2021 → Jun/2026',cls:'border-l-4 border-blue-400'},
                ].map((k,i)=>(
                    <div key={i} className={`bg-zinc-50 rounded-xl p-4 ${k.cls}`}>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{k.lbl}</p>
                        <p className="text-lg font-black text-zinc-900">{k.val}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{k.sub}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 p-5">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Evolução do custo por ano + acumulado</p>
                <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={chartDataEvol} margin={{top:20,right:60,left:10,bottom:0}} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#71717a',fontWeight:'bold'}} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tickFormatter={fmt} tick={{fontSize:10,fill:'#71717a'}} dx={-5} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tickFormatter={fmt} tick={{fontSize:10,fill:'#18181b',fontWeight:'bold'}} dx={5} />
                        <Tooltip formatter={(v,n)=>[v>0?fmt(v):null,n]} itemFilter={item=>item.value>0} />
                        <Bar yAxisId="left" dataKey="PLACA KLC" stackId="s" fill="#e34948" maxBarSize={50} />
                        <Bar yAxisId="left" dataKey="KALOCER" stackId="s" fill="#2a78d6" maxBarSize={50} />
                        <Bar yAxisId="left" dataKey="METALLIC WEAR" stackId="s" fill="#4a3aa7" maxBarSize={50} />
                        <Bar yAxisId="left" dataKey="ELEM. FIXAÇÃO" stackId="s" fill="#1baf7a" maxBarSize={50} />
                        <Bar yAxisId="left" dataKey="Demais" stackId="s" fill="#eda100" maxBarSize={50} radius={[4,4,0,0]} />
                        <Line yAxisId="right" type="monotone" dataKey="acumulado" stroke="#18181b" strokeWidth={2.5} dot={{r:4,fill:'#18181b',strokeWidth:2,stroke:'#fff'}} name="Acumulado" />
                    </ComposedChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-3">
                    {[['#e34948','PLACA KLC'],['#2a78d6','KALOCER'],['#4a3aa7','METALLIC WEAR'],['#1baf7a','ELEM. FIXAÇÃO'],['#eda100','Demais'],['#18181b','Acumulado']].map(([cor,nome])=>(
                        <span key={nome} className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{background:cor}}></span>{nome}
                        </span>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 p-5">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Ranking por grupo — Jun/2026 (passe o mouse para detalhes)</p>
                <ResponsiveContainer width="100%" height={Math.max(240,grupos26.length*34+60)}>
                    <BarChart data={grupos26} layout="vertical" margin={{top:0,right:90,left:10,bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" />
                        <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={fmt} tick={{fontSize:10,fill:'#71717a'}} />
                        <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#52525b'}} width={130} />
                        <Tooltip formatter={(v)=>[fmt(v)+' ('+((v/tot26)*100).toFixed(1)+'% do total)','Custo']} />
                        <Bar dataKey="val" maxBarSize={22} radius={[0,4,4,0]} name="Custo Jun/2026">
                            {grupos26.map((entry,i)=>(
                                <Cell key={i} fill={getCor(entry.label)} />
                            ))}
                            <LabelList dataKey="val" position="right" formatter={fmt} style={{fontSize:10,fontWeight:'bold',fill:'#52525b'}} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 p-5" style={{marginLeft:'-1.5rem',marginRight:'-1.5rem',borderRadius:'0',borderLeft:'none',borderRight:'none',paddingLeft:'1.5rem',paddingRight:'1.5rem'}}>
                <div className="flex justify-between items-center mb-5">
                    <p className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">Top 6 grupos — evolução histórica</p>
                    <span className="text-[9px] font-black text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-full uppercase tracking-widest">PLACA KLC e METALLIC WEAR → eixo direito</span>
                </div>
                <ResponsiveContainer width="100%" height={500}>
                    <LineChart data={chartDataLinha} margin={{top:30,right:100,left:20,bottom:50}}>
                        <CartesianGrid strokeDasharray="4 4" vertical={true} verticalFill={['#fafafa','#ffffff']} stroke="#e4e4e7" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:14,fill:'#374151',fontWeight:'bold'}} dy={12} />
                        <YAxis yAxisId="esq" axisLine={false} tickLine={false} tickFormatter={fmt} tick={{fontSize:12,fill:'#52525b',fontWeight:'600'}} dx={-10} width={95} />
                        <YAxis yAxisId="dir" orientation="right" axisLine={false} tickLine={false} tickFormatter={fmt} tick={{fontSize:12,fill:'#dc2626',fontWeight:'700'}} dx={10} width={95} />
                        <Tooltip
                            content={({active,payload,label})=>{
                                if(!active||!payload||!payload.length) return null;
                                const fmtV = v => {
                                    if(v===null||v===undefined||v===0) return '-';
                                    if(v>=1000000) return 'R$ '+(v/1000000).toFixed(3).replace('.',',')+'M';
                                    if(v>=1000) return 'R$ '+(v/1000).toFixed(1).replace('.',',')+'K';
                                    return 'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
                                };
                                return (
                                    <div style={{background:'#18181b',border:'1px solid #3f3f46',borderRadius:'10px',padding:'10px 14px',minWidth:'200px'}}>
                                        <p style={{color:'#eab308',fontWeight:'900',fontSize:'12px',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</p>
                                        {payload.filter(p=>p.value>0).sort((a,b)=>b.value-a.value).map((p,i)=>(
                                            <div key={i} style={{display:'flex',justifyContent:'space-between',gap:'20px',marginBottom:'5px'}}>
                                                <span style={{color:'#a1a1aa',fontSize:'11px',display:'flex',alignItems:'center',gap:'5px'}}>
                                                    <span style={{width:'8px',height:'8px',borderRadius:'2px',background:p.color,flexShrink:0,display:'inline-block'}}></span>
                                                    {p.name}
                                                </span>
                                                <span style={{color:'#ffffff',fontSize:'12px',fontWeight:'700'}}>{fmtV(p.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            }}
                            cursor={{strokeDasharray:'4 4',stroke:'#e4e4e7'}}
                        />
                        <Legend verticalAlign="bottom" height={52} iconSize={14} formatter={v=>{
                            const dirAxis = ['PLACA KLC','METALLIC WEAR'];
                            const isDirAxis = dirAxis.includes(v);
                            const colors = {'PLACA KLC':'#dc2626','METALLIC WEAR':'#4a3aa7'};
                            return <span style={{fontSize:'13px',color:isDirAxis?(colors[v]||'#374151'):'#374151',fontWeight:isDirAxis?'800':'600',letterSpacing:'0.01em'}}>{v}{isDirAxis?' (eixo →)':''}</span>;
                        }} />
                        <Line yAxisId="dir" type="monotone" dataKey="PLACA KLC" stroke="#e34948" strokeWidth={4} dot={{r:8,fill:'#e34948',strokeWidth:2.5,stroke:'#fff'}} activeDot={{r:12}} connectNulls />
                        <Line yAxisId="dir" type="monotone" dataKey="METALLIC WEAR" stroke="#4a3aa7" strokeWidth={3} strokeDasharray="4 4" dot={{r:7,fill:'#4a3aa7',strokeWidth:2,stroke:'#fff'}} activeDot={{r:10}} connectNulls={false} />
                        {[['KALOCER','#2a78d6',[6,3]],['ELEM. FIXAÇÃO','#1baf7a',[8,3]],['ABRESIST','#eda100',[2,2]],['PASTILHA KLC','#eb6834',[6,2]]].map(([name,color,dash])=>(
                            <Line key={name} yAxisId="esq" type="monotone" dataKey={name} stroke={color} strokeWidth={3} strokeDasharray={dash.join(' ')} dot={{r:7,fill:color,strokeWidth:2,stroke:'#fff'}} activeDot={{r:10}} connectNulls={false} />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {tot26 > 0 && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 text-sm text-zinc-600 leading-relaxed">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Análise automática</p>
                    <p className="mb-2">O custo total de obsoletos em <strong className="text-zinc-900">junho de 2026 atingiu {fmt(tot26)}</strong>{crescPct && <>, representando um crescimento de <strong className="text-red-600">{crescPct>0?'+':''}{crescPct}%</strong> em relação a 2025 ({fmt(tot25)})</>}. O principal responsável é o grupo <strong className="text-zinc-900">PLACA KLC</strong>, que concentra <strong className="text-red-600">{pctPlaca}%</strong> do custo total com {fmt(placa26)}.</p>
                    {seg && <p className="mb-2">Em segundo lugar aparece <strong className="text-zinc-900">{seg.label}</strong> ({fmt(seg.val)}){ter && <>, seguido de <strong className="text-zinc-900">{ter.label}</strong> ({fmt(ter.val)})</>}. Juntos, os três maiores grupos somam <strong className="text-zinc-900">{(((placa26+(seg?.val||0)+(ter?.val||0))/tot26)*100).toFixed(1)}%</strong> do custo total.</p>}
                    <p>O acumulado histórico soma <strong className="text-zinc-900">{fmt(acumulado[5])}</strong>, sendo que apenas em 2026 concentrou-se <strong className="text-zinc-900">{((tot26/acumulado[5])*100).toFixed(0)}%</strong> desse montante — indicando aceleração crítica da obsolescência no período recente.</p>
                </div>
            )}
        </div>
    );
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
  const [obsoletosData, setObsoletosData] = useState([]);
  const [obsoletosEditMode, setObsoletosEditMode] = useState(false);
  const [obsoletosForm, setObsoletosForm] = useState({});
  const [obsoletosAnoEdit, setObsoletosAnoEdit] = useState('2026');
  
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
          "estoque": "Inventory",
          "divergência no projeto": "Project Divergence",
          "divergencia no projeto": "Project Divergence",
          "perda no processo produtivo": "Production Process Loss",
          "perca no processo produtivo": "Production Process Loss"
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
  const [finViewMode, setFinViewMode] = useState('MONTHLY'); 
  const [projetosData, setProjetosData] = useState([]);
  const [projetosPeriodo, setProjetosPeriodo] = useState('');
  const [projetosForm, setProjetosForm] = useState({});
  const [visitasData, setVisitasData] = useState([]);
  const [visitasUploadMsg, setVisitasUploadMsg] = useState('');
  
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
      try {
          const { data: projRes } = await supabaseClient.from('projetos_vendedor').select('*').order('period').order('vendedor');
          if (projRes) setProjetosData(projRes);
      } catch(e) {}
      try {
          const { data: visitRes } = await supabaseClient.from('visitas_vendedor').select('*').order('mes').order('vendedor');
          if (visitRes) setVisitasData(visitRes);
      } catch(e) {}
      try {
          const { data: obsRes } = await supabaseClient.from('obsoletos').select('*').order('grupo');
          if (obsRes) setObsoletosData(obsRes);
      } catch (e) {}

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
          else if(upper.includes('DANILO') || upper.includes('SUPPLY') || upper.includes('LEONARDO')) setKpiOwnerId(5);
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
          // Filtra por período E owner (comentários isolados por setor)
          if (c.period === kpiEditPeriod && (c.owner_id === kpiOwnerId || c.owner_id === undefined || c.owner_id === null)) {
              newComms[c.indicator_id] = c.comment;
          }
      });
      
      // Financeiro (owner 9): buscar direto de dbValues
      if (activeTab === 'financeiro' || kpiOwnerId === 9) {
          dbValues.forEach(v => {
              if (v.owner_id === 9 && v.period === kpiEditPeriod) {
                  newVals[v.indicator_id] = v.value;
              }
          });
      }
      // Daniela owner 8: buscar 56, 121, 122 direto de dbValues
      if (kpiOwnerId === 8) {
          [56, 121, 122].forEach(indId => {
              if (newVals[indId] === undefined) {
                  const rec = dbValues.find(v => v.owner_id === 8 && v.indicator_id === indId && v.period === kpiEditPeriod);
                  if (rec) newVals[indId] = rec.value;
              }
          });
      }

      setFormValues(newVals);
      setFormComments(newComms);
      setExpandedCommentId(null);
  }, [kpiOwnerId, kpiEditPeriod, computedData, dbComments, dbValues, activeTab]); 

  // Carregar projetosForm quando muda o mês selecionado
  useEffect(() => {
      if (!projetosPeriodo) { setProjetosForm({}); return; }
      const dadosMes = projetosData.filter(p => p.period === projetosPeriodo);
      if (dadosMes.length === 0) { setProjetosForm({}); return; }
      const form = {};
      dadosMes.forEach(p => {
          form[p.vendedor] = {
              qtd_abertos: p.qtd_abertos ?? '',
              valor_abertos: p.valor_abertos ?? '',
              qtd_fechados: p.qtd_fechados ?? '',
              valor_fechados: p.valor_fechados ?? '',
          };
      });
      setProjetosForm(form);
  }, [projetosPeriodo, projetosData]);

  const needsComment = (id, ownerId, val) => {
    const numVal = parseFloat(val);
    if (isNaN(numVal) || numVal <= 0) return false;
    if (ownerId === 6) return true; 
    if (ownerId === 7) return true; 
    if (ownerId === 8 && (id === 121 || id === 122)) return true;
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
            await supabaseClient.from('indicator_comments').delete().eq('indicator_id', 9999).eq('period', 'FINANCE_MARGINS').eq('owner_id', 9);
            await supabaseClient.from('indicator_comments').insert([{ indicator_id: 9999, owner_id: 9, period: 'FINANCE_MARGINS', comment: payload }]);
            showToast(t("Margens salvas com sucesso!", "Margins saved successfully!"));
            loadData();
        } catch(e) { showToast(t("Erro ao salvar", "Error saving"), "error"); }
        setLoading(false);
    };

    const financeCategories = Array.from(new Set(incomingOrders.map(o => (o.kalenborn_group || o.category || o.product || '').trim()).filter(Boolean))).sort();
    const pcpYtd = computedData.filter(v => v.indicator_id === 24).reduce((a,c) => a + parseFloat(c.value||0), 0);
    const pcpProfit = (pcpYtd * (parseFloat(pcpMargin)||0)) / 100;

    const financeIndicators = dbIndicators.filter(i => {
        if (i.id >= 101 && i.id <= 130) return true;
        if (!i.name) return false;
        const cleanName = i.name.toUpperCase().replace(/[^A-Z]/g, '');
        return ['EBT','EBTBUDGET','EBITDA','EBITDABUDGET'].includes(cleanName);
    }).sort((a,b) => a.id - b.id);

    const handleSaveFinanceKPIs = async (e) => {
        e.preventDefault(); setLoading(true);
        const payload = [];
        financeIndicators.forEach(ind => {
            const val = formValues[ind.id];
            if (val !== undefined && val !== '') payload.push({ indicator_id: ind.id, owner_id: 9, period: kpiEditPeriod, value: parseFloat(val) });
        });
        if(payload.length === 0) { showToast(t('Preencha ao menos um valor.', 'Fill in at least one value.'), 'error'); setLoading(false); return; }
        try {
            const indIds = payload.map(p => p.indicator_id);
            await supabaseClient.from('indicator_values').delete().eq('owner_id', 9).eq('period', kpiEditPeriod).in('indicator_id', indIds);
            await supabaseClient.from('indicator_values').insert(payload);
            showToast(t(`Valores de ${kpiEditPeriod} salvos!`, `Data for ${kpiEditPeriod} saved!`));
            loadData();
        } catch (err) { showToast(t('Erro ao salvar no banco.', 'Error saving to DB.'), 'error'); }
        setLoading(false);
    };

    // Helper
    const getFinV = (id, m) => parseFloat(dbValues.find(v => v.indicator_id === id && v.owner_id === 9 && v.period === m)?.value || 0);
    const filteredMonths = months.filter(m => kpiViewPeriod === 'ALL' || monthOrder[m] <= monthOrder[kpiViewPeriod]);
    const filledMonths = filteredMonths.filter(m => dbValues.some(v => v.owner_id === 9 && v.period === m));

    // Acumulados com fórmulas corretas
    const acc = { v1:0, v2:0, v3:0, v4:0, v5:0, v10:0, v16:0, v17:0, ebit:0, ebitBudget:0, ebt:0, ebtBudget:0, nopat:0, sumV11:0, sumV12:0, sumDividas:0, sumEmprestimos:0, sumCaixa:0, countFilled:0 };
    filledMonths.forEach(m => {
        acc.v1 += getFinV(101,m); acc.v2 += getFinV(102,m); acc.v3 += getFinV(103,m); acc.v4 += getFinV(104,m); acc.v5 += getFinV(105,m);
        acc.v10 += getFinV(110,m); acc.v16 += getFinV(116,m); acc.v17 += getFinV(117,m);
        acc.ebit += getFinV(106,m); acc.ebitBudget += getFinV(107,m); acc.ebt += getFinV(108,m); acc.ebtBudget += getFinV(109,m); acc.nopat += getFinV(118,m);
        acc.sumV11 += getFinV(111,m); acc.sumV12 += getFinV(112,m); acc.sumDividas += getFinV(119,m); acc.sumEmprestimos += getFinV(120,m); acc.sumCaixa += getFinV(123,m);
        acc.countFilled++;
    });
    const n = acc.countFilled || 1;
    const avgV11 = acc.sumV11/n, avgV12 = acc.sumV12/n, avgDividas = acc.sumDividas/n, avgEmprestimos = acc.sumEmprestimos/n, avgCaixa = acc.sumCaixa/n;
    const ytdMargBruta = acc.v1 > 0 ? ((acc.v1 - acc.v3) / acc.v1) * 100 : 0;
    const ytdROE = avgV12 > 0 ? (acc.v10 / avgV12) * 100 : 0;
    const ytdMargLiquida = acc.v1 > 0 ? (acc.v10 / acc.v1) * 100 : 0;
    const ytdGiroAtivo = avgV11 > 0 ? (acc.v1 / avgV11) * 100 : 0;
    const ytdAlavancagem = avgV12 > 0 ? (avgV11 / avgV12) * 100 : 0;
    const ytdCapital = avgDividas + avgEmprestimos + avgV12 - avgCaixa;
    const ytdROIC = ytdCapital > 0 ? (acc.nopat / ytdCapital) * 100 : 0;

    // financeiroCorpData: sempre mensal + coluna acumulada no final quando YTD ativo
    const monthlyData = filteredMonths.map(m => {
        const v1=getFinV(101,m),v2=getFinV(102,m),v3=getFinV(103,m),v4=getFinV(104,m),v5=getFinV(105,m);
        const v10=getFinV(110,m),v11=getFinV(111,m),v12=getFinV(112,m),v13=getFinV(113,m),v14=getFinV(114,m),v15=getFinV(115,m);
        const v16=getFinV(116,m),v17=getFinV(117,m);
        const ebitVal=getFinV(106,m),ebitBudgetVal=getFinV(107,m),ebtVal=getFinV(108,m),ebtBudgetVal=getFinV(109,m);
        const nopatVal=getFinV(118,m),dividasVal=getFinV(119,m),emprestimosVal=getFinV(120,m),caixaVal=getFinV(123,m);
        const cap = dividasVal+emprestimosVal+v12-caixaVal;
        return {
            name: m,
            'Receita Liquida': v1, 'Receita Budget': v2, 'Margem Bruta %': v1>0?((v1-v3)/v1)*100:0,
            'SG&A': v4, 'SG&A Budget': v5,
            'ROE %': v12>0?(v10/v12)*100:0, 'Margem Liquida %': v1>0?(v10/v1)*100:0,
            'Giro Ativo': v11>0?(v1/v11)*100:0, 'Alavancagem': v12>0?(v11/v12)*100:0,
            'Liq Imediata': v13*100, 'Liq Seca': v14*100, 'Liq Corrente': v15*100,
            'Var Nao Realizada': v16, 'Var Realizada': v17, 'Var Total': v16+v17,
            'EBIT': ebitVal, 'EBIT Budget': ebitBudgetVal, 'EBT': ebtVal, 'EBT Budget': ebtBudgetVal,
            'NOPAT': nopatVal, 'ROIC %': cap>0?(nopatVal/cap)*100:0,
            isAccumulated: false
        };
    });

    // Ponto acumulado YTD (adicionado no final quando modo YTD)
    const ytdPoint = {
        name: '◼ YTD',
        'Receita Liquida': acc.v1, 'Receita Budget': acc.v2, 'Margem Bruta %': ytdMargBruta,
        'SG&A': acc.v4, 'SG&A Budget': acc.v5,
        'ROE %': ytdROE, 'Margem Liquida %': ytdMargLiquida,
        'Giro Ativo': ytdGiroAtivo, 'Alavancagem': ytdAlavancagem,
        'Liq Imediata': 0, 'Liq Seca': 0, 'Liq Corrente': 0,
        'Var Nao Realizada': acc.v16, 'Var Realizada': acc.v17, 'Var Total': acc.v16+acc.v17,
        'EBIT': acc.ebit, 'EBIT Budget': acc.ebitBudget,
        'EBT': acc.ebt, 'EBT Budget': acc.ebtBudget,
        'NOPAT': acc.nopat, 'ROIC %': ytdROIC,
        isAccumulated: true
    };

    const financeiroCorpData = finViewMode === 'YTD'
        ? [...monthlyData, ytdPoint]
        : monthlyData;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-zinc-200">
              <div className="flex items-center gap-3 ml-2">
                  <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl"><DollarSign size={24} /></div>
                  <div>
                      <h2 className="text-xl font-black text-zinc-900 tracking-tight">{t('Painel Financeiro', 'Financial Dashboard')}</h2>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">{finViewMode === 'YTD' ? t('Visão Acumulada — fórmulas ponderadas ativas', 'Cumulative view — weighted formulas active') : t('Visão Mensal', 'Monthly view')}</p>
                  </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-zinc-50 p-2 rounded-2xl border border-zinc-200">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">{t('Modo', 'Mode')}</label>
                      <select className="border-none bg-white text-zinc-900 px-4 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer shadow-sm" value={finViewMode} onChange={(e) => setFinViewMode(e.target.value)}>
                          <option value="MONTHLY">{t('Apenas Mensal', 'Monthly Only')}</option>
                          <option value="YTD">{t('Mensal + Acumulado YTD', 'Monthly + YTD Column')}</option>
                      </select>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-50 p-2 rounded-2xl border border-zinc-200">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">{t('Até o Mês', 'Up to Month')}</label>
                      <select className="border-none bg-white text-zinc-900 px-4 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer shadow-sm" value={kpiViewPeriod} onChange={(e) => setKpiViewPeriod(e.target.value)}>
                          <option value="ALL">{t('Todo o Ano', 'Full Year')}</option>
                          {months.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                  </div>
              </div>
           </div>

           <div className="pt-8 mt-2 border-t border-zinc-200">
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
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={(props) => {
                                const { x, y, payload } = props;
                                const isYTD = payload.value && payload.value.includes('YTD');
                                return (
                                    <text x={x} y={y + 10} textAnchor="middle" fontSize={10} fontWeight={isYTD ? '900' : 'bold'} fill={isYTD ? '#eab308' : '#71717a'}>
                                        {payload.value}
                                    </text>
                                );
                            }} dy={10} />
                            <YAxis yAxisId="left" width={80} axisLine={false} tickLine={false} tickFormatter={(val) => formatCurrencyShort3(val)} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={-10} />
                            <YAxis yAxisId="right" width={50} orientation="right" axisLine={false} tickLine={false} tickFormatter={(val) => val.toFixed(0)+'%'} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={10} domain={[0, 100]} />
                            <Tooltip content={<CustomTooltipFinanceiro2 />} cursor={{fill: '#f4f4f5'}} />
                            <Legend wrapperStyle={{fontSize: '11px', fontWeight: 'bold', paddingTop: '20px'}} />
                            <Line yAxisId="left" type="monotone" dataKey="Receita Budget" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={{r: 3}} name="Receita Budget" />
                            <Bar yAxisId="left" dataKey="Receita Liquida" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45}>
                                <LabelList dataKey="Receita Liquida" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={(val) => val !== 0 ? formatCurrencyShort3(val) : ''} />
                            </Bar>
                            <Line yAxisId="right" type="monotone" dataKey="Margem Bruta %" stroke="#eab308" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: 'white'}}>
                                <LabelList dataKey="Margem Bruta %" content={(props) => {
                                    const { x, y, value } = props;
                                    if (!value) return null;
                                    const valStr = value.toFixed(1) + '%';
                                    return (<g><text x={x} y={y - 12} stroke="white" strokeWidth={5} strokeLinejoin="round" fill="white" fontSize={11} fontWeight="900" textAnchor="middle">{valStr}</text><text x={x} y={y - 12} fill="#eab308" fontSize={11} fontWeight="900" textAnchor="middle">{valStr}</text></g>);
                                }} />
                            </Line>
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 mb-6">
                    <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4">SG&A</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={financeiroCorpData} margin={{top:30, right:0, left:-10, bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={(props) => {
                                const { x, y, payload } = props;
                                const isYTD = payload.value && payload.value.includes('YTD');
                                return (
                                    <text x={x} y={y + 10} textAnchor="middle" fontSize={10} fontWeight={isYTD ? '900' : 'bold'} fill={isYTD ? '#eab308' : '#71717a'}>
                                        {payload.value}
                                    </text>
                                );
                            }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => formatCurrencyShort(val)} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={-10} />
                            <Tooltip content={<CustomTooltipFinanceiro2 />} cursor={{fill: '#f4f4f5'}} />
                            <Legend wrapperStyle={{fontSize: '11px', fontWeight: 'bold', paddingTop: '20px'}} />
                            <Line type="monotone" dataKey="SG&A Budget" stroke="#fca5a5" strokeWidth={2} strokeDasharray="5 5" dot={{r: 3}} name="SG&A Budget" />
                            <Bar dataKey="SG&A" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={60}>
                                <LabelList dataKey="SG&A" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={(val) => val !== 0 ? formatCurrencyShort(val) : ''} />
                            </Bar>
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 mt-4 mb-4">
                    <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4">EBIT</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={financeiroCorpData} margin={{top:30, right:0, left:-10, bottom:0}} barGap={8}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={(props) => {
                                const { x, y, payload } = props;
                                const isYTD = payload.value && payload.value.includes('YTD');
                                return (
                                    <text x={x} y={y + 10} textAnchor="middle" fontSize={10} fontWeight={isYTD ? '900' : 'bold'} fill={isYTD ? '#eab308' : '#71717a'}>
                                        {payload.value}
                                    </text>
                                );
                            }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => formatCurrencyShort(val)} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={-10} />
                            <Tooltip content={<CustomTooltipFinanceiro2 />} cursor={{fill: '#f4f4f5'}} />
                            <Legend wrapperStyle={{fontSize: '11px', fontWeight: 'bold', paddingTop: '20px'}} />
                            <Line type="monotone" dataKey="EBIT Budget" stroke="#fde047" strokeWidth={2} strokeDasharray="5 5" dot={{r: 3}} name="EBIT Budget" />
                            <Bar dataKey="EBIT" radius={[4, 4, 0, 0]} maxBarSize={45}>
                                {financeiroCorpData.map((entry, index) => (
                                    <Cell key={index} fill={entry['EBIT'] < 0 ? '#ef4444' : '#f59e0b'} />
                                ))}
                                <LabelList dataKey="EBIT" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={(val) => val !== 0 ? formatCurrencyShort(val) : ''} />
                            </Bar>
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 mt-4 mb-6">
                    <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4">EBT</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={financeiroCorpData} margin={{top:30, right:0, left:-10, bottom:0}} barGap={8}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={(props) => {
                                const { x, y, payload } = props;
                                const isYTD = payload.value && payload.value.includes('YTD');
                                return (
                                    <text x={x} y={y + 10} textAnchor="middle" fontSize={10} fontWeight={isYTD ? '900' : 'bold'} fill={isYTD ? '#eab308' : '#71717a'}>
                                        {payload.value}
                                    </text>
                                );
                            }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => formatCurrencyShort(val)} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={-10} />
                            <Tooltip content={<CustomTooltipFinanceiro2 />} cursor={{fill: '#f4f4f5'}} />
                            <Legend wrapperStyle={{fontSize: '11px', fontWeight: 'bold', paddingTop: '20px'}} />
                            <Line type="monotone" dataKey="EBT Budget" stroke="#a1a1aa" strokeWidth={2} strokeDasharray="5 5" dot={{r: 3}} name="EBT Budget" />
                            <Bar dataKey="EBT" radius={[4, 4, 0, 0]} maxBarSize={45}>
                                {financeiroCorpData.map((entry, index) => (
                                    <Cell key={index} fill={entry['EBT'] < 0 ? '#ef4444' : '#6366f1'} />
                                ))}
                                <LabelList dataKey="EBT" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={(val) => val !== 0 ? formatCurrencyShort(val) : ''} />
                            </Bar>
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 mt-6 mb-8">
                    <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-4">Variação Cambial</h3>
                    <ResponsiveContainer width="100%" height={500}>
                        <LineChart data={financeiroCorpData} margin={{top:40, right:30, left:-10, bottom:20}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={(props) => {
                                const { x, y, payload } = props;
                                const isYTD = payload.value && payload.value.includes('YTD');
                                return (
                                    <text x={x} y={y + 10} textAnchor="middle" fontSize={10} fontWeight={isYTD ? '900' : 'bold'} fill={isYTD ? '#eab308' : '#71717a'}>
                                        {payload.value}
                                    </text>
                                );
                            }} dy={10} />
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

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 mt-6 mb-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest">ROIC (%)</h3>
                            <p className="text-[10px] text-zinc-400 font-bold mt-1 uppercase">NOPAT / (Dívidas Bancárias + Empréstimos IC + PL − Caixa e Equivalentes)</p>
                        </div>
                        <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 text-right">
                            <p className="text-[9px] font-black text-zinc-400 uppercase">ROIC Acumulado YTD</p>
                            <p className="text-lg font-black text-emerald-600">{ytdROIC.toFixed(1)}%</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={financeiroCorpData} margin={{top:20, right:20, left:-20, bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={(props) => {
                                const { x, y, payload } = props;
                                const isYTD = payload.value && payload.value.includes('YTD');
                                return (
                                    <text x={x} y={y + 10} textAnchor="middle" fontSize={10} fontWeight={isYTD ? '900' : 'bold'} fill={isYTD ? '#eab308' : '#71717a'}>
                                        {payload.value}
                                    </text>
                                );
                            }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={v => v.toFixed(1) + '%'} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={-5} />
                            <Tooltip content={<CustomTooltipFinanceiro2 />} cursor={{fill: '#f4f4f5'}} />
                            <Line type="monotone" dataKey="ROIC %" stroke="#10b981" strokeWidth={5} dot={{r: 6, strokeWidth: 2, fill: 'white'}} activeDot={{r: 8}}>
                                <LabelList dataKey="ROIC %" content={(props) => {
                                    const { x, y, value } = props;
                                    if (!value && value !== 0) return null;
                                    const valStr = value.toFixed(1) + '%';
                                    return (<g><text x={x} y={value >= 0 ? y - 15 : y + 22} stroke="white" strokeWidth={5} strokeLinejoin="round" fill="white" fontSize={12} fontWeight="900" textAnchor="middle">{valStr}</text><text x={x} y={value >= 0 ? y - 15 : y + 22} fill="#10b981" fontSize={12} fontWeight="900" textAnchor="middle">{valStr}</text></g>);
                                }} />
                            </Line>
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-zinc-100 pb-4">
                        <div>
                            <h3 className="text-lg font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2"><Crown className="text-purple-500" size={20}/> Análise DuPont: ROE (%)</h3>
                            <p className="text-xs text-zinc-500 font-bold mt-1">Retorno sobre o Patrimônio Líquido</p>
                        </div>
                        <button onClick={() => setIsDuPontExpanded(!isDuPontExpanded)} className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md ${isDuPontExpanded ? 'bg-purple-600 text-white shadow-purple-500/30' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>
                            <GitBranch size={16} />
                            {isDuPontExpanded ? t('Ocultar Justificativas', 'Hide Justifications') : t('Ver Justificativas (Árvore de Valor)', 'View Justifications')}
                        </button>
                    </div>
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={financeiroCorpData} margin={{top:20, right:20, left:-20, bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={(props) => {
                                const { x, y, payload } = props;
                                const isYTD = payload.value && payload.value.includes('YTD');
                                return (
                                    <text x={x} y={y + 10} textAnchor="middle" fontSize={10} fontWeight={isYTD ? '900' : 'bold'} fill={isYTD ? '#eab308' : '#71717a'}>
                                        {payload.value}
                                    </text>
                                );
                            }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={v => v.toFixed(1) + '%'} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={-5} />
                            <Tooltip content={<CustomTooltipFinanceiro2 />} cursor={{fill: '#f4f4f5'}} />
                            <Line type="monotone" dataKey="ROE %" stroke="#8b5cf6" strokeWidth={5} dot={{r: 6, strokeWidth: 2, fill: 'white'}} activeDot={{r: 8}}>
                                <LabelList dataKey="ROE %" content={(props) => {
                                    const { x, y, value } = props;
                                    if (!value) return null;
                                    const valStr = value.toFixed(1) + '%';
                                    return (<g><text x={x} y={value >= 0 ? y - 15 : y + 22} stroke="white" strokeWidth={5} strokeLinejoin="round" fill="white" fontSize={12} fontWeight="900" textAnchor="middle">{valStr}</text><text x={x} y={value >= 0 ? y - 15 : y + 22} fill="#8b5cf6" fontSize={12} fontWeight="900" textAnchor="middle">{valStr}</text></g>);
                                }} />
                            </Line>
                        </LineChart>
                    </ResponsiveContainer>
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
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={(props) => {
                                const { x, y, payload } = props;
                                const isYTD = payload.value && payload.value.includes('YTD');
                                return (
                                    <text x={x} y={y + 10} textAnchor="middle" fontSize={10} fontWeight={isYTD ? '900' : 'bold'} fill={isYTD ? '#eab308' : '#71717a'}>
                                        {payload.value}
                                    </text>
                                );
                            }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tickFormatter={v => v.toFixed(1) + '%'} tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} dx={-5} />
                                        <Tooltip content={<CustomTooltipFinanceiro2 />} cursor={{fill: '#f4f4f5'}} />
                                        {duPontActiveIndex === 0 && <Line type="monotone" dataKey="Margem Liquida %" stroke="#ec4899" strokeWidth={4} dot={{r: 5, strokeWidth: 2, fill: 'white'}} activeDot={{r: 7}} animationDuration={500}><LabelList dataKey="Margem Liquida %" content={(props) => { const {x,y,value}=props; if(!value)return null; const v=value.toFixed(1)+'%'; return(<g><text x={x} y={value>=0?y-12:y+20} stroke="white" strokeWidth={5} strokeLinejoin="round" fill="white" fontSize={11} fontWeight="900" textAnchor="middle">{v}</text><text x={x} y={value>=0?y-12:y+20} fill="#ec4899" fontSize={11} fontWeight="900" textAnchor="middle">{v}</text></g>); }} /></Line>}
                                        {duPontActiveIndex === 1 && <Line type="monotone" dataKey="Giro Ativo" stroke="#14b8a6" strokeWidth={4} dot={{r: 5, strokeWidth: 2, fill: 'white'}} activeDot={{r: 7}} animationDuration={500}><LabelList dataKey="Giro Ativo" content={(props) => { const {x,y,value}=props; if(!value)return null; const v=value.toFixed(1)+'%'; return(<g><text x={x} y={value>=0?y-12:y+20} stroke="white" strokeWidth={5} strokeLinejoin="round" fill="white" fontSize={11} fontWeight="900" textAnchor="middle">{v}</text><text x={x} y={value>=0?y-12:y+20} fill="#14b8a6" fontSize={11} fontWeight="900" textAnchor="middle">{v}</text></g>); }} /></Line>}
                                        {duPontActiveIndex === 2 && <Line type="monotone" dataKey="Alavancagem" stroke="#f59e0b" strokeWidth={4} dot={{r: 5, strokeWidth: 2, fill: 'white'}} activeDot={{r: 7}} animationDuration={500}><LabelList dataKey="Alavancagem" content={(props) => { const {x,y,value}=props; if(!value)return null; const v=value.toFixed(1)+'%'; return(<g><text x={x} y={value>=0?y-12:y+20} stroke="white" strokeWidth={5} strokeLinejoin="round" fill="white" fontSize={11} fontWeight="900" textAnchor="middle">{v}</text><text x={x} y={value>=0?y-12:y+20} fill="#f59e0b" fontSize={11} fontWeight="900" textAnchor="middle">{v}</text></g>); }} /></Line>}
                                    </LineChart>
                                </ResponsiveContainer>
                                <div className="flex justify-center gap-3 mt-6">
                                    {[0,1,2].map((idx) => (
                                        <button key={idx} onClick={() => setDuPontActiveIndex(idx)} className={`h-2.5 rounded-full transition-all duration-300 ${idx === duPontActiveIndex ? 'w-8 bg-purple-500' : 'w-2.5 bg-zinc-300 hover:bg-zinc-400'}`} title={`Ver Gráfico ${idx + 1}`} />
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
                                            return (<g><text x={x} y={value >= 0 ? y - 12 : y + 20} stroke="white" strokeWidth={5} strokeLinejoin="round" fill="white" fontSize={11} fontWeight="900" textAnchor="middle">{valStr}</text><text x={x} y={value >= 0 ? y - 12 : y + 20} fill={graph.color} fontSize={11} fontWeight="900" textAnchor="middle">{valStr}</text></g>);
                                        }} />
                                    </Line>
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ))}
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
                                  <Bar dataKey="Lucro" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                      {profitDataFinanceiro.map((entry, index) => (
                                          <Cell key={index} fill={entry['Lucro'] < 0 ? '#ef4444' : '#10b981'} />
                                      ))}
                                      <LabelList dataKey="Lucro" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={(val) => formatCurrencyShort(val)} />
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                   </div>
               </div>
           </div>

           <div className="bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden mt-8">
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
                                   <input type="number" step="any" value={formValues[ind.id] !== undefined ? formValues[ind.id] : ''} onChange={(e) => handleValueChange(ind.id, e.target.value)} className="w-full text-right bg-white border border-zinc-300 focus:border-yellow-500 rounded-lg p-2 font-black text-sm outline-none transition-colors" placeholder="0" />
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


            {/* ===================== SEÇÃO: PROJETOS POR VENDEDOR ===================== */}
            <div className="mt-10 space-y-6">

                {/* Título da seção */}
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-zinc-900 text-yellow-500 rounded-xl"><BarChart3 size={20} /></div>
                    <div>
                        <h2 className="text-xl font-black text-zinc-900 tracking-tight">Projetos por Vendedor</h2>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">Número e valor de projetos abertos e fechados por mês</p>
                    </div>
                </div>

                {/* ── FORMULÁRIO DE EDIÇÃO (padrão KPI) ── */}
                {(user.role === 'admin' || user.role === 'dev' ||
                  user.username?.toUpperCase().includes('RICARDO') ||
                  user.username?.toUpperCase().includes('PRISCILA')) && (
                    <div className="bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden">
                        {/* Header do formulário */}
                        <div className="p-5 border-b border-zinc-100 bg-zinc-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h3 className="text-base font-extrabold text-zinc-900 flex items-center gap-2">
                                    <Save size={18} className="text-yellow-600" /> Lançamento de Projetos
                                </h3>
                                <p className="text-xs text-zinc-400 mt-0.5">Preencha os dados do mês selecionado. Os valores já preenchidos aparecem automaticamente.</p>
                            </div>
                            <div className="flex items-center gap-3 bg-zinc-900 p-2 rounded-2xl border border-zinc-800 shrink-0">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-3">Mês de Edição</label>
                                <select className="border-none bg-zinc-800 text-yellow-500 px-5 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer shadow-sm"
                                    value={projetosPeriodo}
                                    onChange={e => setProjetosPeriodo(e.target.value)}>
                                    <option value="">— selecione —</option>
                                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Tabela de lançamento */}
                        {projetosPeriodo ? (
                            <div className="p-5">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b-2 border-zinc-100">
                                                <th className="text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest pb-3 pl-2 min-w-[170px]">Vendedor</th>
                                                <th className="text-center text-[10px] font-black text-yellow-600 uppercase tracking-widest pb-3 px-3 min-w-[110px]">Nº Abertos</th>
                                                <th className="text-center text-[10px] font-black text-yellow-600 uppercase tracking-widest pb-3 px-3 min-w-[160px]">Valor Abertos (R$)</th>
                                                <th className="w-6"></th>
                                                <th className="text-center text-[10px] font-black text-emerald-600 uppercase tracking-widest pb-3 px-3 min-w-[110px]">Nº Fechados</th>
                                                <th className="text-center text-[10px] font-black text-emerald-600 uppercase tracking-widest pb-3 px-3 min-w-[160px]">Valor Fechados (R$)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {['ALINE DEL PUPPO','CESAR MATOS','GIVALDO NONATO','GIVANILDO SILVA','HYGOR TOMAZ','KALBRAS','WILLIAM SCHRECK'].map((vend,i) => (
                                                <tr key={vend} className={`${i%2===0?'bg-zinc-50/50':'bg-white'} border-b border-zinc-100`}>
                                                    <td className="py-2.5 pl-2 pr-4">
                                                        <span className="text-sm font-bold text-zinc-800">{vend}</span>
                                                    </td>
                                                    {[
                                                        {campo:'qtd_abertos',   step:'1',    color:'yellow'},
                                                        {campo:'valor_abertos', step:'0.01', color:'yellow'},
                                                    ].map(({campo,step,color}) => (
                                                        <td key={campo} className="py-2 px-2">
                                                            <input type="number" step={step} min="0" placeholder="0"
                                                                value={projetosForm[vend]?.[campo] ?? ''}
                                                                onChange={e => setProjetosForm(prev => ({...prev, [vend]: {...(prev[vend]||{}), [campo]: e.target.value}}))}
                                                                className="w-full text-right bg-white border border-yellow-200 focus:border-yellow-500 rounded-lg p-2 font-black text-sm outline-none transition-colors" />
                                                        </td>
                                                    ))}
                                                    <td className="px-1 text-zinc-300 text-center">│</td>
                                                    {[
                                                        {campo:'qtd_fechados',   step:'1',    color:'emerald'},
                                                        {campo:'valor_fechados', step:'0.01', color:'emerald'},
                                                    ].map(({campo,step,color}) => (
                                                        <td key={campo} className="py-2 px-2">
                                                            <input type="number" step={step} min="0" placeholder="0"
                                                                value={projetosForm[vend]?.[campo] ?? ''}
                                                                onChange={e => setProjetosForm(prev => ({...prev, [vend]: {...(prev[vend]||{}), [campo]: e.target.value}}))}
                                                                className="w-full text-right bg-white border border-emerald-200 focus:border-emerald-500 rounded-lg p-2 font-black text-sm outline-none transition-colors" />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-5 flex justify-end pt-4 border-t border-zinc-100">
                                    <button type="button" disabled={loading}
                                        onClick={async () => {
                                            setLoading(true);
                                            try {
                                                await supabaseClient.from('projetos_vendedor').delete().eq('period', projetosPeriodo);
                                                const rows = Object.entries(projetosForm)
                                                    .filter(([,v]) => v && Object.values(v).some(x => x !== '' && parseFloat(x) > 0))
                                                    .map(([vendedor, v]) => ({
                                                        period: projetosPeriodo, vendedor,
                                                        qtd_abertos: parseInt(v.qtd_abertos)||0,
                                                        valor_abertos: parseFloat(v.valor_abertos)||0,
                                                        qtd_fechados: parseInt(v.qtd_fechados)||0,
                                                        valor_fechados: parseFloat(v.valor_fechados)||0,
                                                    }));
                                                if (rows.length > 0) await supabaseClient.from('projetos_vendedor').insert(rows);
                                                showToast(`Projetos de ${projetosPeriodo} salvos com sucesso!`);
                                                loadData();
                                            } catch(e) {
                                                console.error(e);
                                                showToast('Erro: ' + (e.message||''), 'error');
                                            }
                                            setLoading(false);
                                        }}
                                        className="bg-black text-yellow-500 px-8 py-3 rounded-xl font-bold hover:bg-zinc-800 shadow-lg active:scale-95 flex items-center gap-2 transition-all disabled:opacity-50">
                                        <Save size={18} /> Gravar Projetos de {projetosPeriodo}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-zinc-400 text-sm">
                                Selecione o mês de edição acima para lançar ou editar os dados.
                            </div>
                        )}
                    </div>
                )}

                {/* ── GRÁFICOS DE VISUALIZAÇÃO ── */}
                {(() => {
                    const periodoFiltro = projetosPeriodo || months.find(m => projetosData.some(p => p.period === m)) || '';
                    const dadosPeriodo = periodoFiltro
                        ? projetosData.filter(p => p.period === periodoFiltro)
                        : [];
                    if (dadosPeriodo.length === 0) return null;

                    const totalAbertos = dadosPeriodo.reduce((s,p) => s+(p.qtd_abertos||0), 0);
                    const totalFechados = dadosPeriodo.reduce((s,p) => s+(p.qtd_fechados||0), 0);
                    const totalValor = dadosPeriodo.reduce((s,p) => s+(parseFloat(p.valor_abertos)||0), 0);
                    const totalValorFechados = dadosPeriodo.reduce((s,p) => s+(parseFloat(p.valor_fechados)||0), 0);
                    const taxaConversao = totalAbertos > 0 ? ((totalFechados/totalAbertos)*100).toFixed(1) : null;
                    const BAR_H = Math.max(380, dadosPeriodo.length * 90 + 100);

                    return (
                        <div className="space-y-5">
                            {/* KPI cards */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                {[
                                    {lbl:'Proj. Abertos', val:totalAbertos, cls:'border-l-4 border-yellow-400', vCls:'text-yellow-600'},
                                    {lbl:'Valor Abertos', val:formatCurrency(totalValor), cls:'border-l-4 border-yellow-300', vCls:'text-yellow-700'},
                                    {lbl:'Proj. Fechados', val:totalFechados, cls:'border-l-4 border-emerald-400', vCls:'text-emerald-600'},
                                    {lbl:'Valor Fechados', val:formatCurrency(totalValorFechados), cls:'border-l-4 border-emerald-300', vCls:'text-emerald-700'},
                                    {lbl:'Taxa Conversão', val:taxaConversao?taxaConversao+'%':'—', cls:'border-l-4 border-blue-400', vCls:'text-blue-600'},
                                    {lbl:'Ticket Médio', val:totalAbertos>0?formatCurrency(totalValor/totalAbertos):'—', cls:'border-l-4 border-purple-400', vCls:'text-purple-600'},
                                ].map((k,i) => (
                                    <div key={i} className={`bg-white rounded-xl p-4 shadow-sm border border-zinc-200 ${k.cls}`}>
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{k.lbl}</p>
                                        <p className={`text-base font-black ${k.vCls}`}>{k.val}</p>
                                        <p className="text-[10px] text-zinc-300 mt-0.5">{periodoFiltro}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Gráfico 1 — Quantidade */}
                            <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm" style={{marginLeft:'-1.5rem',marginRight:'-1.5rem'}}>
                                <div className="flex justify-between items-center mb-5">
                                    <div>
                                        <p className="text-sm font-black text-zinc-800 uppercase tracking-widest">Nº de Projetos por Vendedor</p>
                                        <p className="text-[10px] text-zinc-400 mt-0.5">{periodoFiltro} — abertos vs fechados</p>
                                    </div>
                                    <div className="flex gap-4">
                                        {[['#eab308','Abertos'],['#10b981','Fechados']].map(([cor,lbl])=>(
                                            <span key={lbl} className="flex items-center gap-1.5 text-xs font-bold text-zinc-500">
                                                <span className="w-3 h-3 rounded-sm" style={{background:cor}}></span>{lbl}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <ResponsiveContainer width="100%" height={BAR_H}>
                                    <BarChart data={dadosPeriodo} layout="vertical" margin={{top:4,right:80,left:20,bottom:4}} barGap={8}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                                        <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#9ca3af'}} allowDecimals={false} />
                                        <YAxis type="category" dataKey="vendedor" axisLine={false} tickLine={false} tick={{fontSize:13,fill:'#374151',fontWeight:'700'}} width={170} />
                                        <Tooltip formatter={(v,n)=>[v+' projetos', n==='qtd_abertos'?'Abertos':'Fechados']} cursor={{fill:'#fafafa'}} />
                                        <Bar dataKey="qtd_abertos" fill="#eab308" maxBarSize={36} radius={[0,8,8,0]}>
                                            <LabelList dataKey="qtd_abertos" position="right" style={{fontSize:14,fontWeight:'900',fill:'#374151'}} />
                                        </Bar>
                                        <Bar dataKey="qtd_fechados" fill="#10b981" maxBarSize={36} radius={[0,8,8,0]}>
                                            <LabelList dataKey="qtd_fechados" position="right" style={{fontSize:13,fontWeight:'900',fill:'#374151'}} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Gráfico 2 — Valor */}
                            <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm" style={{marginLeft:'-1.5rem',marginRight:'-1.5rem'}}>
                                <div className="flex justify-between items-center mb-5">
                                    <div>
                                        <p className="text-sm font-black text-zinc-800 uppercase tracking-widest">Valor de Projetos por Vendedor</p>
                                        <p className="text-[10px] text-zinc-400 mt-0.5">{periodoFiltro} — valor abertos vs valor fechados</p>
                                    </div>
                                    <div className="flex gap-4">
                                        {[['#3b82f6','Valor Abertos'],['#10b981','Valor Fechados']].map(([cor,lbl])=>(
                                            <span key={lbl} className="flex items-center gap-1.5 text-xs font-bold text-zinc-500">
                                                <span className="w-3 h-3 rounded-sm" style={{background:cor}}></span>{lbl}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <ResponsiveContainer width="100%" height={BAR_H}>
                                    <BarChart data={dadosPeriodo} layout="vertical" margin={{top:4,right:120,left:20,bottom:4}} barGap={8}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                                        <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={v=>formatCurrencyShort(v)} tick={{fontSize:11,fill:'#9ca3af'}} />
                                        <YAxis type="category" dataKey="vendedor" axisLine={false} tickLine={false} tick={{fontSize:13,fill:'#374151',fontWeight:'700'}} width={170} />
                                        <Tooltip formatter={(v,n)=>[formatCurrency(v), n==='valor_abertos'?'Valor Abertos':'Valor Fechados']} cursor={{fill:'#fafafa'}} />
                                        <Bar dataKey="valor_abertos" fill="#3b82f6" maxBarSize={36} radius={[0,8,8,0]}>
                                            <LabelList dataKey="valor_abertos" position="right" formatter={v=>v>0?formatCurrencyShort(v):''} style={{fontSize:13,fontWeight:'900',fill:'#374151'}} />
                                        </Bar>
                                        <Bar dataKey="valor_fechados" fill="#10b981" maxBarSize={36} radius={[0,8,8,0]}>
                                            <LabelList dataKey="valor_fechados" position="right" formatter={v=>v>0?formatCurrencyShort(v):''} style={{fontSize:12,fontWeight:'900',fill:'#374151'}} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Gráfico 3 — Taxa de Conversão */}
                            {totalAbertos > 0 && (
                                <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm" style={{marginLeft:'-1.5rem',marginRight:'-1.5rem'}}>
                                    <div className="flex justify-between items-center mb-5">
                                        <div>
                                            <p className="text-sm font-black text-zinc-800 uppercase tracking-widest">Taxa de Conversão por Vendedor</p>
                                            <p className="text-[10px] text-zinc-400 mt-0.5">Fechados ÷ Abertos × 100</p>
                                        </div>
                                        <div className="flex gap-4">
                                            {[['#10b981','≥50% Ótimo'],['#eab308','25–49% Regular'],['#ef4444','<25% Atenção']].map(([cor,lbl])=>(
                                                <span key={lbl} className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500">
                                                    <span className="w-3 h-3 rounded-sm" style={{background:cor}}></span>{lbl}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <ResponsiveContainer width="100%" height={Math.max(260,dadosPeriodo.filter(p=>p.qtd_abertos>0).length*68+80)}>
                                        <BarChart
                                            data={dadosPeriodo.filter(p=>p.qtd_abertos>0).map(p=>({
                                                ...p, taxa:parseFloat(((p.qtd_fechados/p.qtd_abertos)*100).toFixed(1))
                                            }))}
                                            layout="vertical" margin={{top:4,right:90,left:20,bottom:4}}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                                            <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={v=>v+'%'} tick={{fontSize:11,fill:'#9ca3af'}} domain={[0,100]} />
                                            <YAxis type="category" dataKey="vendedor" axisLine={false} tickLine={false} tick={{fontSize:13,fill:'#374151',fontWeight:'700'}} width={170} />
                                            <Tooltip formatter={(v)=>[v+'%','Taxa de Conversão']} cursor={{fill:'#fafafa'}} />
                                            <Bar dataKey="taxa" maxBarSize={40} radius={[0,8,8,0]}>
                                                {dadosPeriodo.filter(p=>p.qtd_abertos>0).map((entry,i)=>{
                                                    const t=(entry.qtd_fechados/entry.qtd_abertos)*100;
                                                    return <Cell key={i} fill={t>=50?'#10b981':t>=25?'#eab308':'#ef4444'} />;
                                                })}
                                                <LabelList dataKey="taxa" position="right" formatter={v=>v+'%'} style={{fontSize:13,fontWeight:'900',fill:'#374151'}} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* ===================== SEÇÃO: VISITAS ===================== */}
            <div className="mt-10 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
                    <div>
                        <h2 className="text-xl font-black text-zinc-900 flex items-center gap-3">
                            <div className="p-2 bg-zinc-900 text-yellow-500 rounded-xl"><MapPin size={20} /></div>
                            Visitas por Vendedor
                        </h2>
                        <p className="text-xs text-zinc-400 mt-1 font-medium ml-11">Importe a planilha .xlsx para atualizar os dados de visitas</p>
                    </div>
                </div>

                {/* IMPORTAÇÃO DE PLANILHA */}
                {(user.role === 'admin' || user.role === 'dev' || user.username?.toUpperCase().includes('RICARDO') || user.username?.toUpperCase().includes('PRISCILA')) && (
                    <div className="bg-zinc-50 border-2 border-dashed border-zinc-300 rounded-2xl p-6 mb-6 hover:border-yellow-400 transition-colors">
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <div className="text-center md:text-left">
                                <p className="font-black text-zinc-700 text-sm mb-1">📂 Importar planilha de visitas (.xlsx)</p>
                                <p className="text-xs text-zinc-400">Colunas esperadas: <strong>vendedor | quantidade | local | mes</strong></p>
                                {visitasUploadMsg && <p className={`text-xs mt-2 font-bold ${visitasUploadMsg.includes('Erro') ? 'text-red-500' : 'text-emerald-600'}`}>{visitasUploadMsg}</p>}
                            </div>
                            <label className="cursor-pointer bg-zinc-900 text-yellow-500 px-5 py-2.5 rounded-xl font-black text-sm hover:bg-zinc-800 transition-all flex items-center gap-2 shrink-0">
                                <Upload size={16} /> Selecionar arquivo
                                <input type="file" accept=".xlsx,.xls" className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        setLoading(true);
                                        setVisitasUploadMsg('Processando...');
                                        try {
                                            const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.mjs');
                                            const ab = await file.arrayBuffer();
                                            const wb = XLSX.read(ab, {type:'array'});
                                            const ws = wb.Sheets[wb.SheetNames[0]];
                                            const rows = XLSX.utils.sheet_to_json(ws, {defval:''});
                                            const normalized = rows.map(r => ({
                                                vendedor: String(r['vendedor'] || r['Vendedor'] || r['VENDEDOR'] || '').trim().toUpperCase(),
                                                quantidade: parseInt(r['quantidade'] || r['Quantidade'] || r['qtd'] || 0) || 0,
                                                local: String(r['local'] || r['Local'] || r['LOCAL'] || '').trim(),
                                                mes: String(r['mes'] || r['Mes'] || r['mês'] || r['MES'] || '').trim().toUpperCase(),
                                            })).filter(r => r.vendedor && r.mes);
                                            if (normalized.length === 0) { setVisitasUploadMsg('Erro: nenhuma linha válida encontrada.'); setLoading(false); return; }
                                            const meses = [...new Set(normalized.map(r=>r.mes))];
                                            for (const mes of meses) {
                                                await supabaseClient.from('visitas_vendedor').delete().eq('mes', mes);
                                            }
                                            await supabaseClient.from('visitas_vendedor').insert(normalized);
                                            setVisitasUploadMsg(`✅ ${normalized.length} registros importados (${meses.join(', ')})`);
                                            loadData();
                                        } catch(err) {
                                            console.error(err);
                                            setVisitasUploadMsg('Erro ao processar: ' + (err.message||''));
                                        }
                                        setLoading(false);
                                        e.target.value = '';
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                )}

                {/* DASHBOARD VISITAS */}
                {visitasData.length > 0 && (() => {
                    const mesesVisitas = [...new Set(visitasData.map(v=>v.mes))].sort();
                    const mesVisitaAtual = projetosPeriodo || mesesVisitas[mesesVisitas.length-1] || '';
                    const visitasFiltradas = visitasData.filter(v => v.mes === mesVisitaAtual);
                    const totalVisitas = visitasFiltradas.reduce((s,v)=>s+(v.quantidade||0),0);
                    const byVendedor = Object.values(visitasFiltradas.reduce((acc,v)=>{
                        const k = v.vendedor;
                        if(!acc[k]) acc[k]={vendedor:k,quantidade:0,locais:[]};
                        acc[k].quantidade += v.quantidade||0;
                        if(v.local) acc[k].locais.push(v.local);
                        return acc;
                    },{})).sort((a,b)=>b.quantidade-a.quantidade);

                    return (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div className="bg-zinc-50 rounded-xl p-4 border-l-4 border-yellow-400">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total de visitas</p>
                                    <p className="text-2xl font-black text-zinc-900">{totalVisitas}</p>
                                    <p className="text-[11px] text-zinc-400 mt-0.5">{mesVisitaAtual}</p>
                                </div>
                                <div className="bg-zinc-50 rounded-xl p-4 border-l-4 border-blue-400">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Vendedores ativos</p>
                                    <p className="text-2xl font-black text-zinc-900">{byVendedor.length}</p>
                                    <p className="text-[11px] text-zinc-400 mt-0.5">com visitas no período</p>
                                </div>
                                <div className="bg-zinc-50 rounded-xl p-4 border-l-4 border-emerald-400">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Média por vendedor</p>
                                    <p className="text-2xl font-black text-zinc-900">{byVendedor.length > 0 ? (totalVisitas/byVendedor.length).toFixed(1) : '—'}</p>
                                    <p className="text-[11px] text-zinc-400 mt-0.5">visitas/vendedor</p>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl border border-zinc-200 p-5">
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Visitas por vendedor — {mesVisitaAtual}</p>
                                <ResponsiveContainer width="100%" height={Math.max(180, byVendedor.length*40+60)}>
                                    <BarChart data={byVendedor} layout="vertical" margin={{top:0,right:60,left:10,bottom:0}}>
                                        <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#71717a'}} allowDecimals={false} />
                                        <YAxis type="category" dataKey="vendedor" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#374151'}} width={150} />
                                        <Tooltip formatter={(v) => [v, 'Visitas']} />
                                        <Bar dataKey="quantidade" fill="#eab308" maxBarSize={22} radius={[0,4,4,0]}>
                                            <LabelList dataKey="quantidade" position="right" style={{fontSize:12,fontWeight:'bold',fill:'#374151'}} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            {visitasFiltradas.some(v=>v.local) && (
                                <div className="bg-white rounded-2xl border border-zinc-200 p-5">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Locais visitados — {mesVisitaAtual}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {byVendedor.filter(v=>v.locais.length>0).map(v=>(
                                            <div key={v.vendedor} className="bg-zinc-50 rounded-xl p-3 border border-zinc-200">
                                                <p className="text-[10px] font-black text-zinc-500 uppercase mb-2">{v.vendedor}</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {v.locais.map((l,i)=>(
                                                        <span key={i} className="text-[10px] bg-white border border-zinc-200 rounded-full px-2 py-0.5 text-zinc-600 font-medium">{l}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}
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

  const renderSparklineCard = (item, isResultado) => {
    if (kpiOwnerId === 1 && item.id === 6) return null; 
    if (kpiOwnerId === 2 && item.id === 12) return null; 
    if (kpiOwnerId === 3 && item.id === 33) return null; 
    if (kpiOwnerId === 4 && item.id === 36) return null; 

    let displayHist = computedData.filter(v => v.indicator_id === item.id && v.owner_id === kpiOwnerId);
    
    const uniqueMap = new Map();
    displayHist.forEach(h => uniqueMap.set(h.period, h));
    displayHist = Array.from(uniqueMap.values());
    
    const isMonthFilled = (period) => {
        if (kpiOwnerId === 8) return dbValues.some(v => (v.indicator_id === 56 || v.indicator_id === 121 || v.indicator_id === 122) && v.owner_id === 8 && v.period === period);
        return dbValues.some(v => v.owner_id === kpiOwnerId && v.period === period);
    };

    if (kpiViewPeriod !== 'ALL') {
        displayHist = displayHist.filter(h => monthOrder[h.period] <= monthOrder[kpiViewPeriod]);
    }

    displayHist.sort((a, b) => monthOrder[a.period] - monthOrder[b.period]);
    
    if (kpiViewMode === 'ANNUAL') {
        let cumulativeData = [];
        let currentSum = 0;
        let monthsCount = 0;
        months.forEach((m) => {
            if (kpiViewPeriod !== 'ALL' && monthOrder[m] > monthOrder[kpiViewPeriod]) return;
            
            let h = displayHist.find(d => d.period === m);
            let val = h ? parseFloat(h.value) : 0;
            
            if (!isMonthFilled(m)) {
                currentSum = 0;
            } else {
                monthsCount++;
                if (item.unit === '%' || item.unit === 'DIAS') {
                    if (item.name.includes('MÉDIA AC') || item.name.includes('TOTAL')) currentSum = val;
                    else currentSum = ((currentSum * (monthsCount - 1)) + val) / monthsCount;
                } else if (item.id === 56 || item.name.toLowerCase().includes('estoque')) {
                    currentSum = val; 
                } else {
                    currentSum += val;
                }
            }
            cumulativeData.push({ period: m, value: currentSum, originalValue: val });
        });
        displayHist = cumulativeData;
    } else {
        let monthlyData = [];
        months.forEach(m => {
            if (kpiViewPeriod !== 'ALL' && monthOrder[m] > monthOrder[kpiViewPeriod]) return;
            let h = displayHist.find(d => d.period === m);
            let val = h ? parseFloat(h.value) : 0;
            if (!isMonthFilled(m)) val = 0;
            monthlyData.push({ period: m, value: val, originalValue: val });
        });
        displayHist = monthlyData;
    }

    const goalObj = dbGoals.find(g => g.indicator_id === item.id);
    const metaVal = goalObj ? parseFloat(goalObj.goal_value) : undefined;
    
    let curr = null, prev = null, latestVal = '-', trendHtml = null;
    let latestRawVal = null;

    if (displayHist.length > 0) {
        const filledHistory = displayHist.filter(h => isMonthFilled(h.period));
        if (filledHistory.length > 0) {
            curr = parseFloat(filledHistory[filledHistory.length - 1].value);
            latestRawVal = curr;
            if (filledHistory.length > 1) prev = parseFloat(filledHistory[filledHistory.length - 2].value);
            
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
        } else {
            latestVal = '—';
        }
    }
    const isZeroFilled = curr === 0 && latestVal !== '—';

    const baseGraphData = displayHist.map(h => {
        const commentObj = dbComments.find(c => c.indicator_id === item.id && c.period === h.period && (c.owner_id === kpiOwnerId || c.owner_id === undefined || c.owner_id === null));
        return { name: h.period, value: parseFloat(h.value), originalValue: h.originalValue, comment: commentObj ? commentObj.comment : null };
    });

    let CustomBars = null;
    let modifiedGraphData = baseGraphData;
    const supplyIdNames = {
        45: 'Solicitações de compras recebidas',
        46: 'Ordens de compra emitidas',
        47: 'Solicitações de compra urgentes',
        48: 'Solicitações de industrializações',
        49: 'Solicitações de industrializações urgentes',
        50: 'Solicitações de compra atendidas fora do prazo',
        51: 'Solicitações de compras recebidas sem especificação',
        52: 'Ordens de compra emitidas sem solicitação',
    };
    let displayName = tInd(item.name);
    if (kpiOwnerId === 5 && supplyIdNames[item.id] && lang === 'PT') {
        displayName = supplyIdNames[item.id];
    }

    if (kpiOwnerId === 4 && item.id === 41) { 
        displayName = t("Projetos: Previstos vs Em Atraso", "Projects: Planned vs Overdue");
        const previstosHist = computedData.filter(v => v.indicator_id === 36 && v.owner_id === 4);
        modifiedGraphData = baseGraphData.map(g => {
            const pVal = previstosHist.find(v => v.period === g.name)?.value || 0;
            return { ...g, 'Total Projetos': isMonthFilled(g.name) ? parseFloat(pVal) : 0, 'Em Atraso': g.value };
        });
        CustomBars = [
            <Bar key="bar1" dataKey="Total Projetos" name={t('Total Projetos', 'Total Projects')} fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={30}>
                <LabelList dataKey="Total Projetos" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={v => v > 0 ? v : ''} />
            </Bar>,
            <Bar key="bar2" dataKey="Em Atraso" name={t('Em Atraso', 'Overdue')} fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30}>
                <LabelList dataKey="Em Atraso" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={v => v > 0 ? v : ''} />
            </Bar>
        ];
    } else if (kpiOwnerId === 2 && item.id === 13) {
        displayName = t("Orçamentos: Elaborados vs Em Atraso", "Quotes: Prepared vs Overdue");
        const elabHist = computedData.filter(v => v.indicator_id === 12 && v.owner_id === 2);
        modifiedGraphData = baseGraphData.map(g => {
            const eVal = elabHist.find(v => v.period === g.name)?.value || 0;
            return { ...g, 'Enviados': isMonthFilled(g.name) ? parseFloat(eVal) : 0, 'Atraso': g.value };
        });
        CustomBars = [
            <Bar key="bar1" dataKey="Enviados" name={t('Enviados', 'Prepared')} fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={30}>
                <LabelList dataKey="Enviados" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={v => v > 0 ? v : ''} />
            </Bar>,
            <Bar key="bar2" dataKey="Atraso" name={t('Atraso', 'Overdue')} fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30}>
                <LabelList dataKey="Atraso" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={v => v > 0 ? v : ''} />
            </Bar>
        ];
    } else if (kpiOwnerId === 1 && typeof item.name === 'string' && item.name.toLowerCase().includes('atraso pendentes')) {
        displayName = t("Orçamentos: Enviados vs Em Atraso", "Quotes: Submitted vs Overdue");
        const enviadosHist = computedData.filter(v => v.indicator_id === 6 && v.owner_id === 1);
        modifiedGraphData = baseGraphData.map(g => {
            const eVal = enviadosHist.find(v => v.period === g.name)?.value || 0;
            return { ...g, 'Enviados': isMonthFilled(g.name) ? parseFloat(eVal) : 0, 'Atraso': g.value };
        });
        CustomBars = [
            <Bar key="bar1" dataKey="Enviados" name={t('Enviados', 'Submitted')} fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={30}>
                <LabelList dataKey="Enviados" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={v => v > 0 ? v : ''} />
            </Bar>,
            <Bar key="bar2" dataKey="Atraso" name={t('Atraso', 'Overdue')} fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30}>
                <LabelList dataKey="Atraso" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={v => v > 0 ? v : ''} />
            </Bar>
        ];
    } else if (kpiOwnerId === 3 && item.id === 35) {
        displayName = t("Pedidos: Faturados vs Fora do Prazo", "Orders: Invoiced vs Late");
        const faturadosHist = computedData.filter(v => v.indicator_id === 33 && v.owner_id === 3);
        modifiedGraphData = baseGraphData.map(g => {
            const fVal = faturadosHist.find(v => v.period === g.name)?.value || 0;
            return { ...g, 'Faturados': isMonthFilled(g.name) ? parseFloat(fVal) : 0, 'Atraso': g.value };
        });
        CustomBars = [
            <Bar key="bar1" dataKey="Faturados" name={t('Faturados', 'Invoiced')} fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={30}>
                <LabelList dataKey="Faturados" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={v => v > 0 ? v : ''} />
            </Bar>,
            <Bar key="bar2" dataKey="Atraso" name={t('Fora do Prazo', 'Late')} fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30}>
                <LabelList dataKey="Atraso" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={v => v > 0 ? v : ''} />
            </Bar>
        ];
    } else if (kpiOwnerId === 1 && item.id === 2) {
        displayName = t("Ticket Médio (Mensal vs YTD)", "Average Order Value (MoM vs YTD)");
        let sumAcum = 0;
        modifiedGraphData = baseGraphData.map(g => {
             if (isMonthFilled(g.name)) {
                 sumAcum += g.originalValue; 
             } else {
                 sumAcum = 0;
             }
             return { ...g, 'Mensal': g.originalValue, 'Acumulado': sumAcum };
        });
        CustomBars = [
            <Bar key="bar1" dataKey="Mensal" name={t('Mensal', 'Monthly')} fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30}>
                <LabelList dataKey="Mensal" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={v => formatCurrencyShort(v)} />
            </Bar>,
            <Bar key="bar2" dataKey="Acumulado" name={t('Acumulado', 'YTD')} fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={30}>
                <LabelList dataKey="Acumulado" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={v => formatCurrencyShort(v)} />
            </Bar>
        ];
    } else {
        CustomBars = (
            <Bar dataKey="value" name={t('Resultado', 'Actual')} radius={[4, 4, 0, 0]} maxBarSize={45}>
                {modifiedGraphData.map((entry, index) => {
                    let barColor = isResultado ? '#18181b' : '#eab308';
                    if (metaVal !== undefined) {
                        const targetVal = kpiViewMode === 'ANNUAL' && (item.unit === 'R$' || item.unit === 'QTE') ? metaVal * (index + 1) : metaVal;
                        const isBad = item.inverse_goal ? entry.value > targetVal : entry.value < targetVal;
                        if (isBad) {
                            barColor = '#ef4444'; 
                        } else {
                            barColor = '#10b981'; 
                        }
                    }
                    return <Cell key={`cell-${index}`} fill={barColor} />;
                })}
                <LabelList dataKey="value" position="top" fill="#18181b" fontSize={11} fontWeight="900" formatter={v => {
                    if (!v || v === 0) return '';
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
        <div key={item.id} className={`bg-white p-6 rounded-[24px] shadow-sm border ${isResultado ? 'border-zinc-300' : 'border-zinc-200'} flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group h-[350px]`}>
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
                    {latestVal === '—' ? (
                        <span className="text-3xl font-black text-zinc-300" title={t('Sem lançamento', 'No data entered')}>—</span>
                    ) : isZeroFilled ? (
                        <span className="text-3xl font-black text-zinc-900 flex items-center gap-2">
                            0
                            <span className="text-[9px] font-black text-zinc-500 bg-zinc-100 border border-zinc-300 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                {t('zerado', 'zero')}
                            </span>
                        </span>
                    ) : (
                        <span className={`text-3xl font-black ${valueColorClass}`}>{latestVal}</span>
                    )}
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
        if (i.id === 56 || i.name.toLowerCase().includes('estoque')) {
            return kpiOwnerId === 8;
        }
        // Daniela: ids 121 e 122 sempre visíveis
        if (kpiOwnerId === 8 && (i.id === 121 || i.id === 122)) return true;
        if (i.category === 'ESFORCO' && kpiOwnerId === 8) {
            return ownerIndicatorIds.includes(i.id) || i.id === 121 || i.id === 122;
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
        esforcoList.forEach(ind => {
            const val = formValues[ind.id];
            if (val !== undefined && val !== '') {
                payload.push({ indicator_id: ind.id, owner_id: kpiOwnerId, period: kpiEditPeriod, value: parseFloat(val) });
            }
            
            const comment = formComments[ind.id];

            if (comment && comment.trim() !== '') {
                commentsPayload.push({ indicator_id: ind.id, owner_id: kpiOwnerId, period: kpiEditPeriod, comment });
            }
        });

        if(payload.length === 0) {
            showToast(t('Preencha ao menos um valor.', 'Fill in at least one value.'), 'error');
            setLoading(false);
            return;
        }

        try {
            const indIds = payload.map(p => p.indicator_id);
            const { error: delValErr } = await supabaseClient.from('indicator_values').delete().eq('owner_id', kpiOwnerId).eq('period', kpiEditPeriod).in('indicator_id', indIds);
            if (delValErr) console.error('Erro DELETE indicator_values:', delValErr);
            const { error: insValErr } = await supabaseClient.from('indicator_values').insert(payload);
            if (insValErr) console.error('Erro INSERT indicator_values:', insValErr);

            // Sempre limpar APENAS os comentários deste owner+período antes de regravar
            // (isolado por owner_id - nunca afeta comentários de outros setores)
            const { error: delComErr } = await supabaseClient.from('indicator_comments').delete().eq('period', kpiEditPeriod).eq('owner_id', kpiOwnerId);
            if (delComErr) console.error('Erro DELETE indicator_comments:', delComErr);
            if (commentsPayload.length > 0) {
                const { error: insComErr } = await supabaseClient.from('indicator_comments').insert(commentsPayload);
                if (insComErr) {
                    console.error('Erro INSERT indicator_comments:', insComErr);
                    showToast(t('Erro ao salvar observações: ', 'Error saving comments: ') + insComErr.message, 'error');
                    setLoading(false);
                    return;
                }
            }

            showToast(t(`Dados de ${kpiEditPeriod} guardados com sucesso!`, `${kpiEditPeriod} data saved successfully!`));
            setExpandedCommentId(null);
            loadData();
        } catch (err) {
            console.error('Erro geral handleSaveKPIs:', err);
            showToast(t('Erro ao salvar no banco de dados: ', 'Error saving to database: ') + (err.message || ''), 'error');
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

            {/* MUDANÇA AQUI: Alterado de lg:grid-cols-3 para lg:grid-cols-2 */}
            <div>
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 ml-2">{t('Indicadores de Resultado (Performance)', 'Key Performance Indicators (Results)')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
                    {resultadoList.length === 0 && <p className="text-sm text-zinc-400 italic col-span-full ml-2">{t('Nenhum resultado de performance encontrado.', 'No performance metrics found.')}</p>}
                    {resultadoList.map(ind => renderSparklineCard(ind, true))}
                </div>
            </div>

            {/* MUDANÇA AQUI: Alterado de lg:grid-cols-3 para lg:grid-cols-2 */}
            <div>
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 ml-2">{t('Métricas Operacionais (Esforço)', 'Operational Metrics (Leading)')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
                    {visibleEsforcoList.length === 0 && <p className="text-sm text-zinc-400 italic col-span-full ml-2">{t('Nenhuma métrica operacional encontrada.', 'No operational metrics found.')}</p>}
                    {visibleEsforcoList.map(ind => renderSparklineCard(ind, false))}
                </div>
            </div>


            {kpiOwnerId === 8 && (
                <div className="mt-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-2">
                            📦 Composição de Estoque — Itens Obsoletos (Custo R$)
                        </h3>
                        {(user.role === 'admin' || user.role === 'dev') && (
                            <button type="button" onClick={() => { setObsoletosEditMode(!obsoletosEditMode); setObsoletosForm({}); }}
                                className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all ${obsoletosEditMode ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-zinc-900 text-yellow-500 border border-zinc-700'}`}>
                                {obsoletosEditMode ? '✕ Cancelar edição' : '✏️ Atualizar dados'}
                            </button>
                        )}
                    </div>

                    {obsoletosEditMode && (user.role === 'admin' || user.role === 'dev') && (
                        <div className="bg-zinc-950 rounded-2xl p-5 mb-6 border border-zinc-800">
                            <div className="flex flex-col md:flex-row gap-4 mb-4 items-end">
                                <div>
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Ano de referência</label>
                                    <select className="bg-zinc-800 text-yellow-500 px-4 py-2 rounded-xl text-sm font-bold outline-none border border-zinc-700"
                                        value={obsoletosAnoEdit} onChange={e => setObsoletosAnoEdit(e.target.value)}>
                                        {['2021','2022','2023','2024','2025','2026'].map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                                <p className="text-xs text-zinc-400">Preencha os valores de custo (R$) para cada grupo no ano selecionado. Deixe em branco para manter o valor atual.</p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                                {['ABRESIST','PLACA ABT','FLANGES','CHAPA','BORRACHA','ELEM. FIXAÇÃO','COLA','KALCRET','KALCOR','KALEN','KALFIX','KALOCER','PLACA KLC','PASTILHA KLC','TUBO','METALLIC WEAR','TINTAS E DILUENTES','KALPOXY','ALMOXARIFADO','PLACA KALSICA','KALDETECT'].map(grupo => (
                                    <div key={grupo} className="flex flex-col gap-1">
                                        <label className="text-[9px] font-black text-zinc-400 uppercase truncate">{grupo}</label>
                                        <input type="number" step="0.01" min="0" placeholder="0,00"
                                            value={obsoletosForm[grupo] !== undefined ? obsoletosForm[grupo] : ''}
                                            onChange={e => setObsoletosForm(prev => ({...prev, [grupo]: e.target.value}))}
                                            className="bg-zinc-800 text-white text-sm px-3 py-2 rounded-lg border border-zinc-700 focus:border-yellow-500 outline-none" />
                                    </div>
                                ))}
                            </div>
                            <button type="button" disabled={loading}
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        const upserts = Object.entries(obsoletosForm)
                                            .filter(([, v]) => v !== '' && v !== undefined)
                                            .map(([grupo, valor]) => ({
                                                grupo,
                                                ano: parseInt(obsoletosAnoEdit),
                                                custo: parseFloat(valor) || 0
                                            }));
                                        if (upserts.length === 0) { showToast('Nenhum valor preenchido.', 'error'); setLoading(false); return; }
                                        for (const row of upserts) {
                                            await supabaseClient.from('obsoletos').upsert(row, { onConflict: 'grupo,ano' });
                                        }
                                        showToast(`${upserts.length} grupos atualizados para ${obsoletosAnoEdit}!`);
                                        setObsoletosForm({});
                                        setObsoletosEditMode(false);
                                        loadData();
                                    } catch(e) {
                                        console.error('Erro salvar obsoletos:', e);
                                        showToast('Erro ao salvar: ' + (e.message||''), 'error');
                                    }
                                    setLoading(false);
                                }}
                                className="bg-yellow-500 text-black px-6 py-2.5 rounded-xl font-black text-sm hover:bg-yellow-400 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2">
                                <Save size={16} /> Gravar valores
                            </button>
                        </div>
                    )}

                    {obsoletosData.length > 0 ? (
                        <ObsoletosChart data={obsoletosData} />
                    ) : (
                        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-8 text-center text-zinc-400 text-sm">
                            Nenhum dado de obsoletos encontrado. {(user.role === 'admin' || user.role === 'dev') ? 'Use o botão "Atualizar dados" para inserir.' : 'Aguarde o administrador inserir os dados.'}
                        </div>
                    )}
                </div>
            )}

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
                                if (kpiOwnerId === 5 && lang === 'PT') {
                                    const sMap = {45:'Solicitações de compras recebidas',46:'Ordens de compra emitidas',47:'Solicitações de compra urgentes',48:'Solicitações de industrializações',49:'Solicitações de industrializações urgentes',50:'Solicitações de compra atendidas fora do prazo',51:'Solicitações de compras recebidas sem especificação',52:'Ordens de compra emitidas sem solicitação'};
                                    if (sMap[ind.id]) displayName = sMap[ind.id];
                                }
                                if (ind.name === "Não conformidade (%)") displayName = t("Nº de Não Conformidades (Qtd)", "Number of Non-Conformities (Qty)");
                                
                                const currentVal = formValues[ind.id] !== undefined ? formValues[ind.id] : '';
                                const currentComment = formComments[ind.id] || '';
                                const hasComment = currentComment.trim() !== '';
                                let iconColorClass = 'text-zinc-400 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200';
                                if (hasComment) {
                                    iconColorClass = 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 shadow-sm';
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
                                                    title={hasComment ? t("Ver/Editar Observação", "View/Edit Comment") : t("Adicionar Observação opcional", "Add Optional Comment")}
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
                                                    className="w-full bg-yellow-50/50 border-yellow-200 focus:border-yellow-400 placeholder:text-yellow-600/50 text-zinc-800 text-sm p-3 rounded-xl outline-none shadow-inner resize-none min-h-[60px] transition-colors"
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
            
            <div className="flex-1 overflow-x-auto overflow-y-auto rounded-xl border border-zinc-200 shadow-inner bg-zinc-50 relative w-full">
                <table className="w-full min-w-[1200px] text-left text-sm whitespace-nowrap audit-table">
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
                <div className="overflow-x-auto w-full pb-4">
                    <table className="w-full text-left text-sm min-w-[800px]">
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

            <nav className="hidden xl:flex gap-1 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 shadow-inner relative z-[110]">
                {(user.role === 'admin' || user.role === 'dev') && (
                    <button type="button" onClick={() => setActiveTab('diretoria')} className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all flex items-center gap-2 ${activeTab === 'diretoria' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                        <BarChart3 size={16} /> {t('Diretoria', 'Board')}
                    </button>
                )}
                <button type="button" onClick={() => setActiveTab('kpi')} className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all flex items-center gap-2 ${activeTab === 'kpi' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                    <LineChartIcon size={16} /> {t('KPIs', 'KPIs')}
                </button>

                {(user.role === 'admin' || user.role === 'dev' || user.area === 'Comercial') && (
                    <button type="button" onClick={() => setActiveTab('comercial')} className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all flex items-center gap-2 ${activeTab === 'comercial' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                        <DollarSign size={16} /> {t('Comercial', 'Commercial')}
                    </button>
                )}

                {(user.role === 'admin' || user.role === 'dev' || user.area === 'Financeiro' || user.username.toUpperCase().includes('FABIO')) && (
                    <button type="button" onClick={() => setActiveTab('financeiro')} className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all flex items-center gap-2 ${activeTab === 'financeiro' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                        <Globe size={16} /> {t('Financeiro', 'Finance')}
                    </button>
                )}

                <button type="button" onClick={() => setActiveTab('5w2h')} className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all flex items-center gap-2 ${activeTab === '5w2h' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                    <ListChecks size={16} /> {t('Matriz 5W2H', '5W2H Matrix')}
                </button>
                {(user.username.toUpperCase() === 'LUCIENE' || user.area === 'Comercial' || user.role === 'admin' || user.role === 'dev') && (
                    <button type="button" onClick={() => setActiveTab('auditoria')} className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all flex items-center gap-2 ${activeTab === 'auditoria' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                        <FileSpreadsheet size={16} /> {t('Auditoria', 'Audit')}
                    </button>
                )}
            </nav>

            <div className="flex items-center gap-2 md:gap-4">
                <input type="file" id="logo-upload-input" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                
                {(user.role === 'admin' || user.role === 'dev') && (
                    <button onClick={triggerLogoUpload} className="hidden sm:block p-3 text-zinc-500 hover:bg-zinc-800 hover:text-yellow-500 rounded-xl transition-colors" title={t('Alterar Logo da Empresa', 'Change Company Logo')}>
                        <ImageIcon size={20} />
                    </button>
                )}

                <div className="hidden sm:flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 mr-2">
                    <button onClick={() => setLang('PT')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${lang === 'PT' ? 'bg-yellow-500 text-black shadow-sm' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}>PT</button>
                    <button onClick={() => setLang('EN')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${lang === 'EN' ? 'bg-yellow-500 text-black shadow-sm' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}>EN</button>
                </div>

                <div className="flex items-center gap-3 bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800 shadow-sm">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-500/50"></div>
                    <span className="text-xs font-black text-white uppercase tracking-wider">{user.username}</span>
                </div>
                <button onClick={() => window.location.reload()} className="hidden xl:block p-3 text-zinc-500 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-colors" title={t('Sair com Segurança', 'Logout Safely')}>
                    <LogOut size={20} />
                </button>
                <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="xl:hidden p-3 text-zinc-400 hover:text-yellow-500 rounded-xl transition-colors bg-zinc-900 border border-zinc-800"
                >
                    {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>
        </div>

        {isMobileMenuOpen && (
            <div className="xl:hidden absolute top-20 left-0 w-full border-t border-zinc-800 bg-zinc-950 p-4 flex flex-col gap-2 shadow-2xl animate-in slide-in-from-top-2 z-50">
                {(user.role === 'admin' || user.role === 'dev') && (
                    <button onClick={() => { setActiveTab('diretoria'); setIsMobileMenuOpen(false); }} className={`px-5 py-4 rounded-xl font-black uppercase tracking-wider text-sm transition-all flex items-center gap-3 ${activeTab === 'diretoria' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                        <BarChart3 size={20} /> {t('Diretoria', 'Board')}
                    </button>
                )}
                <button onClick={() => { setActiveTab('kpi'); setIsMobileMenuOpen(false); }} className={`px-5 py-4 rounded-xl font-black uppercase tracking-wider text-sm transition-all flex items-center gap-3 ${activeTab === 'kpi' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                    <LineChartIcon size={20} /> {t('KPIs', 'KPIs')}
                </button>
                {(user.role === 'admin' || user.role === 'dev' || user.area === 'Comercial') && (
                    <button onClick={() => { setActiveTab('comercial'); setIsMobileMenuOpen(false); }} className={`px-5 py-4 rounded-xl font-black uppercase tracking-wider text-sm transition-all flex items-center gap-3 ${activeTab === 'comercial' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                        <DollarSign size={20} /> {t('Comercial', 'Commercial')}
                    </button>
                )}
                {(user.role === 'admin' || user.role === 'dev' || user.area === 'Financeiro' || user.username.toUpperCase().includes('FABIO')) && (
                    <button onClick={() => { setActiveTab('financeiro'); setIsMobileMenuOpen(false); }} className={`px-5 py-4 rounded-xl font-black uppercase tracking-wider text-sm transition-all flex items-center gap-3 ${activeTab === 'financeiro' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                        <Globe size={20} /> {t('Financeiro', 'Finance')}
                    </button>
                )}
                <button onClick={() => { setActiveTab('5w2h'); setIsMobileMenuOpen(false); }} className={`px-5 py-4 rounded-xl font-black uppercase tracking-wider text-sm transition-all flex items-center gap-3 ${activeTab === '5w2h' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                    <ListChecks size={20} /> {t('Matriz 5W2H', '5W2H Matrix')}
                </button>
                {(user.username.toUpperCase() === 'LUCIENE' || user.area === 'Comercial' || user.role === 'admin' || user.role === 'dev') && (
                    <button onClick={() => { setActiveTab('auditoria'); setIsMobileMenuOpen(false); }} className={`px-5 py-4 rounded-xl font-black uppercase tracking-wider text-sm transition-all flex items-center gap-3 ${activeTab === 'auditoria' ? 'bg-yellow-500 text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                        <FileSpreadsheet size={20} /> {t('Auditoria', 'Audit')}
                    </button>
                )}
                <div className="h-px w-full bg-zinc-800 my-2"></div>
                <button onClick={() => window.location.reload()} className="px-5 py-4 rounded-xl font-black uppercase tracking-wider text-sm text-red-500 hover:bg-red-500/10 transition-all flex items-center gap-3">
                    <LogOut size={20} /> {t('Sair com Segurança', 'Logout Safely')}
                </button>
            </div>
        )}
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
