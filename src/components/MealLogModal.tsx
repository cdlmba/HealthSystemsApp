import React, { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { MealEntry, MacroTotals, USDAFoodItem, DailyFoodLog } from '../types';
import { searchFoods, extractMacros, getServingInfo } from '../lib/usda';
import {
  Search, Plus, Trash2, UtensilsCrossed, Loader2,
  CheckCircle2, X
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
    setMeals([...meals, entry]);
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
  const pct = (val: number, target?: number) => target ? Math.min(Math.round((val / target) * 100), 150) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[var(--tsd-bg)] border-2 border-[var(--tsd-surface-dim)] rounded-2xl shadow-2xl p-0 flex flex-col max-h-[90vh] w-[95vw]">
        
        {/* Header */}
        <DialogHeader className="p-4 border-b border-[var(--tsd-surface-dim)] bg-[var(--tsd-surface)] shrink-0">
          <DialogTitle className="flex items-center gap-2.5 text-[var(--tsd-text)] text-base font-extrabold tracking-tight">
            <div className="w-8 h-8 bg-[var(--tsd-forest)] rounded-lg flex items-center justify-center shadow">
              <UtensilsCrossed className="w-4 h-4 text-[#0e1412]" />
            </div>
            Meal Log — {format(date, 'EEE, MMM d')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 overflow-hidden">
          
          {/* Macro Totals Bar */}
          <div className="grid grid-cols-4 gap-2 p-3 border-b border-[var(--tsd-surface-dim)] shrink-0 bg-[var(--tsd-surface-2)]">
            {([ 
              { label: 'Calories', val: totals.calories, target: targets?.calories, unit: 'kcal', color: 'var(--tsd-gold)' },
              { label: 'Protein', val: totals.protein, target: targets?.protein, unit: 'g', color: 'var(--tsd-forest)' },
              { label: 'Fat', val: totals.fat, target: targets?.fat, unit: 'g', color: 'var(--tsd-gold-light)' },
              { label: 'Carbs', val: totals.netCarbs, target: targets?.netCarbs, unit: 'g', color: 'var(--tsd-forest-mid)' },
            ] as const).map(({ label, val, target, unit, color }) => {
              const p = pct(val, target);
              return (
                <div key={label} className="rounded-xl border-2 border-[var(--tsd-surface-dim)] p-2 flex flex-col gap-0.5 bg-[var(--tsd-bg)]">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--tsd-text-dim)]">{label}</span>
                  <span className="text-base font-black leading-none mt-1" style={{ color }}>{val}</span>
                  <span className="text-[8px] font-bold uppercase text-[var(--tsd-text-dim)]">{unit}{target ? ` / ${target}` : ''}</span>
                  {p !== null && (
                    <div className="mt-1 h-1 rounded-full bg-[var(--tsd-surface-dim)] overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(p, 100)}%`, background: color }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Food Search + Add */}
          <div className="p-3 border-b border-[var(--tsd-surface-dim)] shrink-0 bg-[var(--tsd-surface)] space-y-3">
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--tsd-text-dim)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search USDA food..."
                  className="w-full pl-9 pr-3 h-12 text-sm font-bold border-2 border-[var(--tsd-surface-dim)] bg-[var(--tsd-bg)] text-[var(--tsd-text)] rounded-xl focus:outline-none focus:border-[var(--tsd-forest)] transition"
                />
                {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--tsd-text-dim)] animate-spin" />}
              </div>
              
              <select
                value={mealType}
                onChange={e => setMealType(e.target.value as MealEntry['mealType'])}
                className="h-12 px-3 text-sm font-bold border-2 border-[var(--tsd-surface-dim)] bg-[var(--tsd-bg)] text-[var(--tsd-text)] rounded-xl focus:outline-none focus:border-[var(--tsd-forest)] capitalize w-full"
              >
                {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border-2 border-[var(--tsd-surface-dim)] rounded-xl overflow-hidden shadow-lg max-h-48 overflow-y-auto bg-[var(--tsd-surface-2)]">
                {searchResults.map(food => {
                  const serving = getServingInfo(food);
                  const preview = extractMacros(food, 1, serving.grams);
                  return (
                    <button
                      key={food.fdcId}
                      onClick={() => handleSelectFood(food)}
                      className="w-full px-3 py-3 text-left hover:bg-[var(--tsd-surface-dim)] transition-colors flex items-center justify-between gap-3 border-b border-[var(--tsd-surface-dim)] last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[var(--tsd-text)] truncate">{food.description}</p>
                        {food.brandOwner && <p className="text-[10px] font-bold uppercase text-[var(--tsd-text-dim)] truncate">{food.brandOwner}</p>}
                      </div>
                      <div className="flex gap-2 text-[10px] font-black shrink-0">
                        <span style={{ color: 'var(--tsd-gold)' }}>{preview.calories}</span>
                        <span style={{ color: 'var(--tsd-forest)' }}>{preview.protein}p</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {searchError && <p className="text-xs text-[var(--tsd-danger)] font-bold">{searchError}</p>}

            {/* Selected food confirmation */}
            {selectedFood && (() => {
              const serving = getServingInfo(selectedFood);
              return (
                <div className="flex flex-col gap-3 bg-[rgba(74,222,128,0.05)] border-2 border-[var(--tsd-forest)] rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[var(--tsd-forest)] shrink-0" />
                    <p className="text-xs font-black text-[var(--tsd-text)] truncate leading-tight">{selectedFood.description}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0.25} step={0.25}
                      value={servingQty}
                      onChange={e => setServingQty(Math.max(0.25, Number(e.target.value)))}
                      className="w-20 text-center text-sm font-black border-2 border-[var(--tsd-forest)] bg-[var(--tsd-bg)] text-[var(--tsd-text)] rounded-lg h-10 focus:outline-none"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--tsd-text-dim)] flex-1 truncate">{serving.unit}</span>
                    
                    <Button onClick={handleAddMeal} className="bg-[var(--tsd-forest)] text-[#0e1412] hover:bg-[var(--tsd-forest-mid)] text-xs h-10 px-4 font-black tracking-widest uppercase">
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                    <button onClick={() => setSelectedFood(null)} className="p-2 text-[var(--tsd-text-dim)] bg-[var(--tsd-surface)] rounded-lg ml-1 border-2 border-[var(--tsd-surface-dim)]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Meal List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[var(--tsd-bg)]">
            {meals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-[var(--tsd-text-dim)]">
                <UtensilsCrossed className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm font-bold">No meals logged</p>
                <p className="text-xs mt-1">Search to build your log</p>
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
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--tsd-text-dim)] mb-2 capitalize">{type}</p>
                    <div className="space-y-2">
                      {byMeal[type].map(meal => (
                        <div key={meal.id} className="bg-[var(--tsd-surface)] border-2 border-[var(--tsd-surface-dim)] rounded-xl p-3 flex flex-col gap-2 relative">
                          <div className="flex justify-between items-start gap-4 pr-6">
                            <div>
                              <p className="text-xs font-bold text-[var(--tsd-text)] leading-tight">{meal.name}</p>
                              <p className="text-[10px] font-bold text-[var(--tsd-text-dim)] uppercase mt-1">
                                {meal.servingQty} {meal.servingUnit} {meal.brand && `· ${meal.brand}`}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex gap-3 text-[10px] font-black">
                            <span style={{ color: 'var(--tsd-gold)' }}>{meal.calories}kcal</span>
                            <span style={{ color: 'var(--tsd-forest)' }}>{meal.protein}g P</span>
                            <span style={{ color: 'var(--tsd-gold-light)' }}>{meal.fat}g F</span>
                          </div>

                          <button
                            onClick={() => handleRemoveMeal(meal.id)}
                            className="absolute right-2 top-2 p-1.5 text-[var(--tsd-danger)] bg-[rgba(248,113,113,0.1)] rounded-lg"
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
          <div className="p-4 border-t border-[var(--tsd-surface-dim)] bg-[var(--tsd-surface)] shrink-0 flex items-center justify-between gap-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs font-bold border-2 border-[var(--tsd-surface-dim)] bg-[var(--tsd-bg)] text-[var(--tsd-text)] h-12">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1 bg-[var(--tsd-forest)] text-[#0e1412] hover:bg-[var(--tsd-forest-mid)] text-xs font-black uppercase tracking-widest h-12 gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Save Log
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
