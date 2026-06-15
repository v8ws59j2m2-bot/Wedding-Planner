import { useState } from 'react'
import { PiggyBank, CreditCard, BarChart2 } from 'lucide-react'
import { Budget } from './Budget'
import { UpcomingPayments } from './UpcomingPayments'
import { FinancialOverview } from './FinancialOverview'
import { countOverduePayments } from '../lib/helpers'
import type { AppData, Page } from '../types'

export type BudgetTab = 'budget' | 'payments' | 'overview'

interface Props {
  data: AppData
  setData: (d: AppData | ((p: AppData) => AppData)) => void
  onNavigate: (p: Page) => void
  initialTab?: BudgetTab
}

export function BudgetPaymentsPage({ data, setData, onNavigate, initialTab = 'budget' }: Props) {
  const safeInitial: BudgetTab = (['budget', 'payments', 'overview'] as BudgetTab[]).includes(initialTab)
    ? initialTab : 'budget'
  const [tab, setTab] = useState<BudgetTab>(safeInitial)
  const [pendingExpenseId, setPendingExpenseId] = useState<string | undefined>(undefined)

  const handleEditExpense = (id: string) => {
    setTab('budget')
    setPendingExpenseId(id)
  }

  const overdueCount = countOverduePayments(data.budget)

  const TABS = [
    { key: 'budget'   as BudgetTab, label: 'Budget',             icon: PiggyBank,  badge: 0 },
    { key: 'payments' as BudgetTab, label: 'Upcoming Payments',   icon: CreditCard, badge: overdueCount },
    { key: 'overview' as BudgetTab, label: 'Financial Overview',  icon: BarChart2,  badge: 0 },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #F2E3CF', marginBottom: 0 }}>
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '12px 22px', borderRadius: 0, border: 'none',
                background: 'transparent', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? '#3B2A22' : '#7A6657',
                borderBottom: active ? '2px solid #C8A45D' : '2px solid transparent',
                marginBottom: -2, transition: 'all 0.15s',
              }}>
              <t.icon size={14} strokeWidth={1.6} style={{ color: active ? '#C8A45D' : '#A89080' }}/>
              {t.label}
              {t.badge > 0 && (
                <span style={{
                  minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
                  background: '#C47A52', color: '#fff',
                  fontSize: 9, fontWeight: 700, lineHeight: '16px', textAlign: 'center',
                }}>
                  {t.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'budget' && (
          <Budget
            data={data}
            setData={setData}
            openExpenseId={pendingExpenseId}
            onExpenseOpened={() => setPendingExpenseId(undefined)}
          />
        )}
        {tab === 'payments' && (
          <UpcomingPayments
            data={data}
            onNavigate={onNavigate}
            onGoToBudget={() => setTab('budget')}
            onEditExpense={handleEditExpense}
          />
        )}
        {tab === 'overview' && (
          <FinancialOverview
            data={data}
            onNavigate={onNavigate}
          />
        )}
      </div>
    </div>
  )
}
