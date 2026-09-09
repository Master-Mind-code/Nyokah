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
import { formatFCFA, useApp } from '../../context/AppContext';

/** « 2026-09 » → « Sept » ou « Septembre 2026 ». */
function monthLabel(period: string, style: 'short' | 'long'): string {
  const [year, month] = period.split('-');
  const date = new Date(Date.UTC(Number(year), Number(month ?? '1') - 1, 1));
  if (Number.isNaN(date.getTime())) return period;

  return style === 'short'
    ? date.toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' })
    : date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export const AdminPerformanceCharts: React.FC = () => {
  const { revenueReport } = useApp();
  const [timeRange, setTimeRange] = useState<'6m' | '12m'>('6m');
  const [chartView, setChartView] = useState<'combined' | 'revenue' | 'bookings' | 'categories'>('combined');

  // Série mensuelle réelle renvoyée par GET /analytics/revenue, remise au
  // format attendu par les graphiques.
  const fullYearData = useMemo(
    () =>
      (revenueReport?.series ?? []).map((point) => ({
        month: monthLabel(point.period, 'short'),
        monthFull: monthLabel(point.period, 'long'),
        revenue: point.revenue,
        revenueB2B: point.revenueB2B,
        revenueB2C: point.revenueB2C,
        bookingsCount: point.bookings,
        completedRides: point.completedBookings,
        corporateBookings: point.corporateBookings,
        privateBookings: point.privateBookings,
        avgBasket: point.avgBasket
      })),
    [revenueReport]
  );

  // Filtered dataset according to selected time range
  const performanceData = useMemo(() => {
    if (timeRange === '6m') {
      return fullYearData.slice(-6);
    }
    return fullYearData;
  }, [timeRange, fullYearData]);

  // Totals and averages for the active range
  const totalPeriodRevenue = useMemo(
    () => performanceData.reduce((acc, curr) => acc + curr.revenue, 0),
    [performanceData]
  );

  const totalPeriodBookings = useMemo(
    () => performanceData.reduce((acc, curr) => acc + curr.bookingsCount, 0),
    [performanceData]
  );

  const totalCompletedRides = useMemo(
    () => performanceData.reduce((acc, curr) => acc + curr.completedRides, 0),
    [performanceData]
  );

  const averageMonthlyRevenue = useMemo(
    () => (performanceData.length > 0 ? Math.round(totalPeriodRevenue / performanceData.length) : 0),
    [totalPeriodRevenue, performanceData]
  );

  const averageBasket = useMemo(
    () => (totalPeriodBookings > 0 ? Math.round(totalPeriodRevenue / totalPeriodBookings) : 0),
    [totalPeriodRevenue, totalPeriodBookings]
  );

  /** Part des missions effectivement réalisées sur la période. */
  const completionRate = useMemo(
    () =>
      totalPeriodBookings > 0
        ? Math.round((totalCompletedRides / totalPeriodBookings) * 1000) / 10
        : null,
    [totalCompletedRides, totalPeriodBookings]
  );

  /** Croissance du dernier mois renseigné par rapport au précédent. */
  const lastMonthGrowth = useMemo(() => {
    if (performanceData.length < 2) return null;
    const previous = performanceData[performanceData.length - 2]!.revenue;
    const current = performanceData[performanceData.length - 1]!.revenue;
    if (previous <= 0) return null;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }, [performanceData]);

  // Répartition réelle par formule de location.
  const formulaDistribution = useMemo(() => {
    const palette = ['#795900', '#D4A017', '#10B981', '#3B82F6', '#8B5CF6', '#F97316'];
    return (revenueReport?.byFormula ?? []).map((entry, index) => ({
      name: entry.formula,
      value: entry.share,
      revenue: entry.revenue,
      color: palette[index % palette.length] as string
    }));
  }, [revenueReport]);

  // Répartition B2B / particuliers, calculée sur le chiffre d'affaires réel.
  const clientTypeDistribution = useMemo(() => {
    const b2b = revenueReport?.totals.revenueB2B ?? 0;
    const b2c = revenueReport?.totals.revenueB2C ?? 0;
    const total = b2b + b2c;
    if (total === 0) return [];
    return [
      {
        name: 'Entreprises B2B (Comptes Corporate)',
        value: Math.round((b2b / total) * 100),
        color: '#795900'
      },
      {
        name: 'Particuliers & VIP Internationaux',
        value: Math.round((b2c / total) * 100),
        color: '#10B981'
      }
    ];
  }, [revenueReport]);

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
            <span className="text-emerald-400 font-semibold">Régie Nyokah</span>
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
            <span>{lastMonthGrowth === null ? "Historique insuffisant" : `${lastMonthGrowth >= 0 ? "+" : ""}${lastMonthGrowth}% vs mois précédent`}</span>
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
            <span>{completionRate === null ? "Aucune mission sur la période" : `${completionRate}% exécutées`}</span>
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
