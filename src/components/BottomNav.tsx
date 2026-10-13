import React from 'react';
import { Package, Utensils, ShoppingBag } from 'lucide-react';

export type TabType = 'pantry' | 'cook' | 'shopping';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  lowStockCount: number;
  shoppingItemsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  lowStockCount,
  shoppingItemsCount,
}) => {
  const tabs = [
    {
      id: 'pantry' as TabType,
      label: 'Vorrat',
      icon: Package,
      badge: lowStockCount > 0 ? lowStockCount : null,
      badgeType: 'warning',
    },
    {
      id: 'cook' as TabType,
      label: 'Kochen',
      icon: Utensils,
      badge: null,
      badgeType: 'default',
    },
    {
      id: 'shopping' as TabType,
      label: 'Einkauf & Budget',
      icon: ShoppingBag,
      badge: shoppingItemsCount > 0 ? shoppingItemsCount : null,
      badgeType: 'accent',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-slate-400 max-w-md mx-auto">
      <div className="grid grid-cols-3 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center min-h-[44px] transition-all duration-150 active:scale-95 ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.3]' : 'stroke-[1.8]'}`} />
                {tab.badge !== null && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center leading-none ${
                      tab.badgeType === 'warning'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-emerald-500 text-slate-950 font-black'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] tracking-tight mt-1 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute top-0 w-10 h-0.5 bg-emerald-400 rounded-b-sm" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
