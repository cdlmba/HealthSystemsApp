import React, { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { MealEntry, MacroTotals, USDAFoodItem, DailyFoodLog } from '../types';
import { searchFoods, extractMacros, getServingInfo } from '../lib/usda';
import {
  Search, Plus, Trash2, UtensilsCrossed, Loader2,
  Flame, Beef, Droplets, Wheat, CheckCircle2, X
} from 'lucide-react';
import { format } from 'date-fns';

interface MealLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  existingLog: DailyFoodLog | null;
  onSave: (log: DailyFoodLog) => void;
  userId: string;
  targets?: { calories: number; protein: number; fat: number; netCarbs: number };
}

const MEAL_TYPES: Array<MealEntry['mealType']> = ['breakfast', 'lunch', 'dinner', 'snack'];

const MACRO_COLORS = {
  calories: 'text-orange-600 bg-orange-50 border-orange-100',
  protein: 'text-blue-600 bg-blue-50 border-blue-100',
  fat: 'text-amber-600 bg-amber-50 border-amber-100',
  netCarbs: 'text-emerald-600 bg-emerald-50 border-emerald-100',
};

function calcTotals(meals: MealEntry[]): MacroTotals {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: Math.round((acc.protein + m.protein) * 10) / 10,
      fat: Math.round((acc.fat + m.fat) * 10) / 10,
      netCarbs: Math.round((acc.netCarbs + m.netCarbs) * 10) / 10,
    }),
    { calories: 0, protein: 0, fat: 0, netCarbs: 0 }
  );
}

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function MealLogModal({
  open, onOpenChange, date, existingLog, onSave, userId, targets
}: MealLogModalProps) {
  const [meals, setMeals] = useState<MealEntry[]>(existingLog?.meals || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<USDAFoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedFood, setSelectedFood] = useState<USDAFoodItem | null>(null);
  const [servingQty, setServingQty] = useState(1);
  const [mealType, setMealType] = useState<MealEntry['mealType']>('breakfast');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when modal opens with fresh data
  React.useEffect(() => {
    if (open) {
      setMeals(existingLog?.meals || []);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedFood(null);
      setServingQty(1);
      setSearchError('');
    }
  }, [open, existingLog]);

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      setSearchError('');
      try {
        const results = await searchFoods(q);
        setSearchResults(results.slice(0, 12));
      } catch {
        setSearchError('Search failed. Check your API key or connection.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, []);

  const handleSelectFood = (food: USDAFoodItem) => {
    setSelectedFood(food);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleAddMeal = () => {
    if (!selectedFood) return;
    const serving = getServingInfo(selectedFood);
    const macros = extractMacros(selectedFood, servingQty, serving.grams);
    const entry: MealEntry = {
      id: generateId(),
      name: selectedFood.description,
      brand: selectedFood.brandOwner || selectedFood.brandName,
      fdcId: selectedFood.fdcId,
      ...macros,
      totalCarbs: 0,
      fiber: 0,
      servingQty,
      servingUnit: serving.unit,
      mealType,
      loggedAt: new Date().toISOString(),
    };
    const updated = [...meals, entry];
    setMeals(updated);
    setSelectedFood(null);
    setServingQty(1);
  };

  const handleRemoveMeal = (id: string) => {
    setMeals(prev => prev.filter(m => m.id !== id));
  };

  const handleSave = () => {
    const totals = calcTotals(meals);
    const log: DailyFoodLog = {
      id: existingLog?.id,
      date: format(date, 'yyyy-MM-dd'),
      userId,
      meals,
      totals,
    };
    onSave(log);
    onOpenChange(false);
  };

  const totals = calcTotals(meals);

  const pct = (val: number, target?: number) =>
    target ? Math.min(Math.round((val / target) * 100), 150) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <DialogTitle className="flex items-center gap-2.5 text-slate-800 text-base font-extrabold tracking-tight">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow">
              <UtensilsCrossed className="w-4 h-4 text-white" />
            </div>
            Meal Log — {format(date, 'EEE, MMM d')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Macro Totals Bar */}
          <div className="grid grid-cols-4 gap-3 p-4 border-b border-slate-100 shrink-0 bg-white">
            {([ 
              { label: 'Calories', val: totals.calories, target: targets?.calories, unit: 'kcal', key: 'calories' },
              { label: 'Protein', val: totals.protein, target: targets?.protein, unit: 'g', key: 'protein' },
              { label: 'Fat', val: totals.fat, target: targets?.fat, unit: 'g', key: 'fat' },
              { label: 'Net Carbs', val: totals.netCarbs, target: targets?.netCarbs, unit: 'g', key: 'netCarbs' },
            ] as const).map(({ label, val, target, unit, key }) => {
              const p = pct(val, target);
              return (
                <div key={key} className={`rounded-lg border p-2.5 flex flex-col gap-1 ${MACRO_COLORS[key]}`}>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest opacity-70">{label}</span>
                  <span className="text-lg font-black leading-none">{val}</span>
                  <span className="text-[9px] font-semibold opacity-60">{unit}{target ? ` / ${target}` : ''}</span>
                  {p !== null && (
                    <div className="mt-1 h-1 rounded-full bg-black/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-current transition-all"
                        style={{ width: `${Math.min(p, 100)}%`, opacity: 0.7 }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Food Search + Add */}
          <div className="p-4 border-b border-slate-100 shrink-0 bg-white space-y-3">
            <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search USDA food database… (e.g. 'chicken breast', 'eggs')"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                )}
              </div>
              <select
                value={mealType}
                onChange={e => setMealType(e.target.value as MealEntry['mealType'])}
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white text-slate-700 font-semibold capitalize"
              >
                {MEAL_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden shadow-md max-h-48 overflow-y-auto divide-y divide-slate-50">
                {searchResults.map(food => {
                  const serving = getServingInfo(food);
                  const preview = extractMacros(food, 1, serving.grams);
                  return (
                    <button
                      key={food.fdcId}
                      onClick={() => handleSelectFood(food)}
                      className="w-full px-3 py-2.5 text-left hover:bg-emerald-50 transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-emerald-700">{food.description}</p>
                        {food.brandOwner && <p className="text-[10px] text-slate-400 truncate">{food.brandOwner}</p>}
                      </div>
                      <div className="flex gap-2 text-[10px] font-bold shrink-0">
                        <span className="text-orange-600">{preview.calories}kcal</span>
                        <span className="text-blue-600">{preview.protein}p</span>
                        <span className="text-emerald-600">{preview.netCarbs}nc</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {searchError && (
              <p className="text-xs text-rose-600 font-medium">{searchError}</p>
            )}

            {/* Selected food confirmation row */}
            {selectedFood && (() => {
              const serving = getServingInfo(selectedFood);
              const preview = extractMacros(selectedFood, servingQty, serving.grams);
              return (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-emerald-800 truncate">{selectedFood.description}</p>
                    <p className="text-[10px] text-emerald-600 font-medium">
                      {preview.calories} kcal · {preview.protein}g protein · {preview.fat}g fat · {preview.netCarbs}g net carbs
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-500 font-semibold">Qty:</span>
                    <input
                      type="number"
                      min={0.25}
                      step={0.25}
                      value={servingQty}
                      onChange={e => setServingQty(Math.max(0.25, Number(e.target.value)))}
                      className="w-16 text-center text-xs border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                    <span className="text-[10px] text-slate-500">{serving.unit}</span>
                    <Button onClick={handleAddMeal} size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7 px-3 gap-1 font-bold">
                      <Plus className="w-3.5 h-3.5" /> Add
                    </Button>
                    <button onClick={() => setSelectedFood(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Meal List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50">
            {meals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                <UtensilsCrossed className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm font-medium">No meals logged yet</p>
                <p className="text-xs mt-1">Search for a food above to start building your log</p>
              </div>
            ) : (
              (() => {
                const byMeal: Record<string, MealEntry[]> = {};
                meals.forEach(m => {
                  if (!byMeal[m.mealType]) byMeal[m.mealType] = [];
                  byMeal[m.mealType].push(m);
                });
                return MEAL_TYPES.filter(t => byMeal[t]?.length > 0).map(type => (
                  <div key={type}>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 capitalize">{type}</p>
                    <div className="space-y-1.5">
                      {byMeal[type].map(meal => (
                        <div key={meal.id} className="bg-white border border-slate-100 rounded-lg px-3 py-2.5 flex items-center gap-3 hover:border-slate-200 transition-colors group">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{meal.name}</p>
                            <p className="text-[10px] text-slate-400">
                              {meal.servingQty} {meal.servingUnit}
                              {meal.brand && ` · ${meal.brand}`}
                            </p>
                          </div>
                          <div className="flex gap-3 text-[10px] font-bold shrink-0">
                            <span className="text-orange-600">{meal.calories}kcal</span>
                            <span className="text-blue-600">{meal.protein}g P</span>
                            <span className="text-amber-600">{meal.fat}g F</span>
                            <span className="text-emerald-600">{meal.netCarbs}g NC</span>
                          </div>
                          <button
                            onClick={() => handleRemoveMeal(meal.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()
            )}
          </div>

          {/* Footer Save */}
          <div className="p-4 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between gap-4">
            <span className="text-xs text-slate-400 font-medium">{meals.length} item{meals.length !== 1 ? 's' : ''} logged</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs border-slate-200 text-slate-600">
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-2 px-5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Save Meal Log
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
