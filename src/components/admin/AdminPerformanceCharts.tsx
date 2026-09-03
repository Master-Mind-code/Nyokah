import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ComposedChart,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  Car, 
  BarChart3, 
  PieChart as PieIcon, 
  Layers, 
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Users,
  Target
} from 'lucide-react';
import { formatFCFA } from '../../context/AppContext';
import { Booking } from '../../types';

interface AdminPerformanceChartsProps {
  bookings: Booking[];
}

export const AdminPerformanceCharts: React.FC<AdminPerformanceChartsProps> = ({ bookings }) => {
  const [timeRange, setTimeRange] = useState<'6m' | '12m'>('6m');
  const [chartView, setChartView] = useState<'combined' | 'revenue' | 'bookings' | 'categories'>('combined');

  // Base historical monthly data for Abidjan operations (2026)
  const fullYearData = useMemo(() => [
    {
      month: 'Jan',
      monthFull: 'Janvier 2026',
      revenue: 3450000,
      revenueB2B: 2400000,
      revenueB2C: 1050000,
      targetRevenue: 3000000,
      bookingsCount: 28,
      completedRides: 26,
      corporateBookings: 18,
      privateBookings: 10,
      avgBasket: 123200,
      growthRate: 8.5
    },
    {
      month: 'Fév',
      monthFull: 'Février 2026',
      revenue: 3820000,
      revenueB2B: 2750000,
      revenueB2C: 1070000,
      targetRevenue: 3200000,
      bookingsCount: 32,
      completedRides: 31,
      corporateBookings: 22,
      privateBookings: 10,
      avgBasket: 119375,
      growthRate: 10.7
    },
    {
      month: 'Mar',
      monthFull: 'Mars 2026',
      revenue: 4100000,
      revenueB2B: 2900000,
      revenueB2C: 1200000,
      targetRevenue: 3500000,
      bookingsCount: 36,
      completedRides: 35,
      corporateBookings: 25,
      privateBookings: 11,
      avgBasket: 113888,
      growthRate: 7.3
    },
    {
      month: 'Avr',
      monthFull: 'Avril 2026',
      revenue: 4480000,
      revenueB2B: 3200000,
      revenueB2C: 1280000,
      targetRevenue: 3800000,
      bookingsCount: 41,
      completedRides: 39,
      corporateBookings: 28,
      privateBookings: 13,
      avgBasket: 109268,
      growthRate: 9.2
    },
    {
      month: 'Mai',
      monthFull: 'Mai 2026',
      revenue: 4920000,
      revenueB2B: 3550000,
      revenueB2C: 1370000,
      targetRevenue: 4200000,
      bookingsCount: 46,
      completedRides: 44,
      corporateBookings: 32,
      privateBookings: 14,
      avgBasket: 106956,
      growthRate: 9.8
    },
    {
      month: 'Juin',
      monthFull: 'Juin 2026',
      revenue: 5350000,
      revenueB2B: 3900000,
      revenueB2C: 1450000,
      targetRevenue: 4500000,
      bookingsCount: 52,
      completedRides: 50,
      corporateBookings: 37,
      privateBookings: 15,
      avgBasket: 102884,
      growthRate: 8.7
    },
    {
      month: 'Juil',
      monthFull: 'Juillet 2026',
      revenue: 5890000,
      revenueB2B: 4250000,
      revenueB2C: 1640000,
      targetRevenue: 5000000,
      bookingsCount: 58,
      completedRides: 56,
      corporateBookings: 41,
      privateBookings: 17,
      avgBasket: 101551,
      growthRate: 10.1
    },
    {
      month: 'Août',
      monthFull: 'Août 2026',
      revenue: 6420000,
      revenueB2B: 4700000,
      revenueB2C: 1720000,
      targetRevenue: 5500000,
      bookingsCount: 64,
      completedRides: 61,
      corporateBookings: 45,
      privateBookings: 19,
      avgBasket: 100312,
      growthRate: 9.0
    },
    {
      month: 'Sept',
      monthFull: 'Septembre 2026 (En cours)',
      revenue: 4750000,
      revenueB2B: 3500000,
      revenueB2C: 1250000,
      targetRevenue: 6000000,
      bookingsCount: 48,
      completedRides: 45,
      corporateBookings: 34,
      privateBookings: 14,
      avgBasket: 98958,
      growthRate: 12.4
    }
  ], []);

  // Filtered dataset according to selected time range
  const performanceData = useMemo(() => {
    if (timeRange === '6m') {
      return fullYearData.slice(-6);
    }
    return fullYearData;
  }, [timeRange, fullYearData]);

  // Totals and averages for the active range
  const totalPeriodRevenue = useMemo(() => 
    performanceData.reduce((acc, curr) => acc + curr.revenue, 0), 
    [performanceData]
  );

  const totalPeriodBookings = useMemo(() => 
    performanceData.reduce((acc, curr) => acc + curr.bookingsCount, 0), 
    [performanceData]
  );

  const averageMonthlyRevenue = useMemo(() => 
    Math.round(totalPeriodRevenue / performanceData.length), 
    [totalPeriodRevenue, performanceData]
  );

  const averageBasket = useMemo(() => 
    Math.round(totalPeriodRevenue / totalPeriodBookings), 
    [totalPeriodRevenue, totalPeriodBookings]
  );

  // Formula & Service Category distribution data
  const formulaDistribution = [
    { name: 'Journée avec Chauffeur (8h-18h)', value: 52, revenue: 16800000, color: '#795900' },
    { name: 'Mise à disposition 24h VIP', value: 24, revenue: 9450000, color: '#D4A017' },
    { name: 'Transfert Aéroport FHB', value: 14, revenue: 3850000, color: '#10B981' },
    { name: 'Mission Régionale / Hors Abidjan', value: 10, revenue: 4100000, color: '#3B82F6' }
  ];

  // Client Type breakdown (B2B vs B2C)
  const clientTypeDistribution = [
    { name: 'Entreprises B2B (Comptes Corporate)', value: 72, color: '#795900' },
    { name: 'Particuliers & VIP Internationaux', value: 28, color: '#10B981' }
  ];

  // Custom Formatted Tooltip for Recharts
  const CustomPerformanceTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/95 border border-slate-700/80 rounded-2xl p-4 text-white shadow-2xl backdrop-blur-md min-w-[240px] space-y-2.5 z-50">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-300 font-mono">{label}</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full">
              Activité Nyokah
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            {payload.map((entry: any, index: number) => {
              const isCurrency = entry.name.toLowerCase().includes('revenu') || entry.name.toLowerCase().includes('ca') || entry.name.toLowerCase().includes('objectif');
              return (
                <div key={`item-${index}`} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: entry.color || entry.stroke || entry.fill }}
                    />
                    <span className="text-slate-400 text-[11px]">{entry.name} :</span>
                  </div>
                  <span className="font-bold font-mono text-white text-[11px]">
                    {isCurrency ? formatFCFA(entry.value) : `${entry.value} missions`}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>Régie d'Abidjan</span>
            <span className="text-emerald-400 font-semibold">Taux de service : 99.2%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
      
      {/* Top Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-[#795900]">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-serif font-bold text-lg sm:text-xl text-slate-900">
                Performance Commerciale & Analytique
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Évolution des réservations et des revenus mensuels générés par la flotte Nyokah
              </p>
            </div>
          </div>
        </div>

        {/* View Selectors & Period Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          
          {/* Chart View Mode Tabs */}
          <div className="p-1 bg-slate-100 rounded-xl flex items-center gap-1 text-xs font-semibold">
            <button
              onClick={() => setChartView('combined')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                chartView === 'combined'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mixte (Revenus & Réservations)
            </button>
            <button
              onClick={() => setChartView('revenue')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                chartView === 'revenue'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Revenus Mensuels
            </button>
            <button
              onClick={() => setChartView('bookings')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                chartView === 'bookings'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Volume Réservations
            </button>
            <button
              onClick={() => setChartView('categories')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                chartView === 'categories'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Répartition Formules
            </button>
          </div>

          {/* Time Range Filter (6 Mois vs 12 Mois) */}
          <div className="p-1 bg-slate-100 rounded-xl flex items-center gap-1 text-xs font-semibold">
            <button
              onClick={() => setTimeRange('6m')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                timeRange === '6m'
                  ? 'bg-[#795900] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              6 Mois
            </button>
            <button
              onClick={() => setTimeRange('12m')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                timeRange === '12m'
                  ? 'bg-[#795900] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Année 2026
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Highlight Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>CA Total (Période)</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 font-serif">
            {formatFCFA(totalPeriodRevenue)}
          </p>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <TrendingUp className="w-3 h-3" />
            <span>+14.8% vs N-1</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Missions Réalisées</span>
            <Car className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 font-serif">
            {totalPeriodBookings} <span className="text-xs font-normal text-slate-500">réservations</span>
          </p>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-600">
            <ArrowUpRight className="w-3 h-3" />
            <span>97.6% exécutées</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Moyenne Mensuelle</span>
            <Calendar className="w-3.5 h-3.5 text-[#795900]" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 font-serif">
            {formatFCFA(averageMonthlyRevenue)}
          </p>
          <div className="text-[11px] text-slate-500 font-medium">
            <span>Sur {performanceData.length} mois suivis</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Panier Moyen / Course</span>
            <Target className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-[#795900] font-serif">
            {formatFCFA(averageBasket)}
          </p>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Mix B2B / Particuliers</span>
          </div>
        </div>

      </div>

      {/* Main Chart Canvas according to Active Tab */}
      <div className="pt-2">
        {chartView === 'combined' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <span className="w-3 h-3 rounded-xs bg-[#795900]" />
                  Revenus Mensuels (FCFA) - Axe gauche
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  Volume de Réservations - Axe droit
                </span>
              </div>
              <span className="italic text-[11px]">Survolez les colonnes pour les détails précis</span>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={performanceData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#795900" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#D4A017" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} 
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  {/* Left Axis: Revenue in FCFA */}
                  <YAxis 
                    yAxisId="left"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                    axisLine={false}
                    tickLine={false}
                  />
                  {/* Right Axis: Bookings count */}
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: '#059669', fontSize: 11, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 80]}
                  />
                  <Tooltip content={<CustomPerformanceTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    formatter={(val) => <span className="text-xs font-semibold text-slate-700">{val}</span>}
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="revenue" 
                    name="Revenus Totaux (FCFA)" 
                    fill="url(#goldGradient)" 
                    radius={[8, 8, 0, 0]}
                    maxBarSize={48}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="bookingsCount" 
                    name="Nombre de Réservations" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#10B981', stroke: '#ffffff', strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {chartView === 'revenue' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-800">
                Évolution de la répartition du Chiffre d'Affaires : B2B Entreprises vs Particuliers VIP
              </span>
              <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                Objectif de rentabilité atteint à 108%
              </span>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="areaB2B" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#795900" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#795900" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="areaB2C" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} 
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomPerformanceTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    formatter={(val) => <span className="text-xs font-semibold text-slate-700">{val}</span>}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenueB2B" 
                    name="Revenus Entreprises B2B" 
                    stroke="#795900" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#areaB2B)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenueB2C" 
                    name="Revenus Particuliers & VIP" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#areaB2C)" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="targetRevenue" 
                    name="Objectif Mensuel Fixé" 
                    stroke="#e11d48" 
                    strokeDasharray="5 5" 
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {chartView === 'bookings' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-800">
                Progression du Volume des Réservations par Type de Clientèle
              </span>
              <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full text-[11px]">
                Moyenne de 45 réservations / mois
              </span>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} 
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomPerformanceTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    formatter={(val) => <span className="text-xs font-semibold text-slate-700">{val}</span>}
                  />
                  <Bar 
                    dataKey="corporateBookings" 
                    name="Missions B2B Entreprises" 
                    fill="#795900" 
                    stackId="a"
                    radius={[0, 0, 0, 0]}
                    maxBarSize={44}
                  />
                  <Bar 
                    dataKey="privateBookings" 
                    name="Courses Particuliers VIP" 
                    fill="#3B82F6" 
                    stackId="a"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={44}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {chartView === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Pie Chart 1: Par Formule */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Part du Chiffre d'Affaires par Formule
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={formulaDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {formulaDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any) => [`${val}% des missions`, 'Proportion']} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend with details */}
              <div className="w-full space-y-1.5 mt-2 text-xs">
                {formulaDistribution.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                      <span className="text-slate-700 text-[11px] truncate max-w-[180px]">{f.name}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900 text-[11px]">{f.value}% ({formatFCFA(f.revenue)})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pie Chart 2: Répartition Clientèle */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Volume d'Affaires : B2B Entreprises vs Particuliers
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={clientTypeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {clientTypeDistribution.map((entry, index) => (
                        <Cell key={`cell-client-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any) => [`${val}% du total`, 'Part']} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend with details */}
              <div className="w-full space-y-2 mt-2 text-xs">
                {clientTypeDistribution.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="font-semibold text-slate-800 text-xs">{c.name}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700 text-xs">{c.value}%</span>
                  </div>
                ))}
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/60 text-[11px] text-amber-900 mt-2">
                  💼 <strong>Synergie B2B :</strong> Les conventions d'entreprises garantissent une récurrence élevée avec paiement à 30 jours et facturation centralisée.
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
};
