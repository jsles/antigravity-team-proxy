import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, Trash2, Delete, CornerDownLeft, 
  Sparkles, Layers, Cpu, Minimize2, Copy, Check 
} from 'lucide-react';

// --- Types ---
type CalculatorMode = 'basic' | 'scientific' | 'converter';
type ConverterType = 'length' | 'weight' | 'temperature' | 'area';

interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: Date;
}

// --- Units Map for Converter ---
const UNITS: Record<ConverterType, { name: string; value: string }[]> = {
  length: [
    { name: '미터 (m)', value: 'm' },
    { name: '킬로미터 (km)', value: 'km' },
    { name: '센티미터 (cm)', value: 'cm' },
    { name: '밀리미터 (mm)', value: 'mm' },
    { name: '인치 (in)', value: 'in' },
    { name: '피트 (ft)', value: 'ft' },
    { name: '야드 (yd)', value: 'yd' },
    { name: '마일 (mi)', value: 'mi' }
  ],
  weight: [
    { name: '킬로그램 (kg)', value: 'kg' },
    { name: '그램 (g)', value: 'g' },
    { name: '파운드 (lb)', value: 'lb' },
    { name: '온스 (oz)', value: 'oz' }
  ],
  temperature: [
    { name: '섭씨 (°C)', value: 'C' },
    { name: '화씨 (°F)', value: 'F' },
    { name: '켈빈 (K)', value: 'K' }
  ],
  area: [
    { name: '제곱미터 (㎡)', value: 'm2' },
    { name: '제곱킬로미터 (㎢)', value: 'km2' },
    { name: '평 (pyeong)', value: 'py' },
    { name: '에이커 (ac)', value: 'ac' }
  ]
};

// --- Safe Evaluator Parser ---
// This parser safely tokenizes and evaluates mathematical expressions supporting standard operators & functions
const safeEvaluate = (expr: string): number => {
  // Normalize expression for JS evaluation
  let normalized = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, String(Math.PI))
    .replace(/e/g, String(Math.E));

  // Regular expression parsing for functions: sin, cos, tan, ln, log, sqrt
  // We'll recursively evaluate function brackets
  const mathFunctions = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log', 'sqrt', 'abs'];
  
  for (const fn of mathFunctions) {
    const regex = new RegExp(`${fn}\\(([^()]+)\\)`, 'g');
    let match;
    while ((match = regex.exec(normalized)) !== null) {
      const innerVal = safeEvaluate(match[1]);
      let computedVal = 0;
      switch (fn) {
        case 'sin': computedVal = Math.sin(innerVal); break;
        case 'cos': computedVal = Math.cos(innerVal); break;
        case 'tan': computedVal = Math.tan(innerVal); break;
        case 'asin': computedVal = Math.asin(innerVal); break;
        case 'acos': computedVal = Math.acos(innerVal); break;
        case 'atan': computedVal = Math.atan(innerVal); break;
        case 'ln': computedVal = Math.log(innerVal); break;
        case 'log': computedVal = Math.log10(innerVal); break;
        case 'sqrt': computedVal = Math.sqrt(innerVal); break;
        case 'abs': computedVal = Math.abs(innerVal); break;
      }
      // Replace only this specific occurrence
      normalized = normalized.replace(match[0], String(computedVal));
      regex.lastIndex = 0; // Reset regex state
    }
  }

  // Handle exponents x^y -> Math.pow(x, y)
  // Simple regex to match: number^number
  let powRegex = /(\d+(\.\d+)?)\^(\d+(\.\d+)?)/g;
  while (powRegex.test(normalized)) {
    normalized = normalized.replace(powRegex, (_, base, __, exponent) => {
      return String(Math.pow(Number(base), Number(exponent)));
    });
  }

  // Strictly filter characters to prevent remote code execution (RCE)
  // Only allow digits, operators, dots, parentheses, and exponential 'e' (scientific notation like 1e+5)
  const allowedChars = /^[0-9+\-*/().\s|&^%e]+$/;
  // Strip spaces
  const cleanExpr = normalized.replace(/\s+/g, '');
  
  if (cleanExpr === '') return 0;
  if (!allowedChars.test(cleanExpr)) {
    throw new Error('Invalid characters');
  }

  // Use Function constructor safely as characters have been strongly sanitized
  // eslint-disable-next-line no-new-func
  const result = new Function(`return (${cleanExpr})`)();
  
  if (typeof result !== 'number' || isNaN(result)) {
    throw new Error('Not a number');
  }
  if (!isFinite(result)) {
    throw new Error('Division by zero');
  }

  return result;
};

// --- Unit Converter Logic ---
const convertUnits = (value: number, from: string, to: string, type: ConverterType): number => {
  if (isNaN(value)) return 0;
  if (from === to) return value;

  // Conversion reference to base unit (length: m, weight: kg, temperature: C, area: m2)
  if (type === 'length') {
    const toBase: Record<string, number> = { m: 1, km: 1000, cm: 0.01, mm: 0.001, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.34 };
    const valueInBase = value * toBase[from];
    return valueInBase / toBase[to];
  }

  if (type === 'weight') {
    const toBase: Record<string, number> = { kg: 1, g: 0.001, lb: 0.45359237, oz: 0.028349523 };
    const valueInBase = value * toBase[from];
    return valueInBase / toBase[to];
  }

  if (type === 'temperature') {
    let celsius = 0;
    if (from === 'C') celsius = value;
    else if (from === 'F') celsius = (value - 32) * 5 / 9;
    else if (from === 'K') celsius = value - 273.15;

    if (to === 'C') return celsius;
    if (to === 'F') return (celsius * 9 / 5) + 32;
    if (to === 'K') return celsius + 273.15;
  }

  if (type === 'area') {
    const toBase: Record<string, number> = { m2: 1, km2: 1000000, py: 3.3058, ac: 4046.86 };
    const valueInBase = value * toBase[from];
    return valueInBase / toBase[to];
  }

  return 0;
};

const Calculator: React.FC = () => {
  // --- UI & State ---
  const [mode, setMode] = useState<CalculatorMode>('basic');
  const [display, setDisplay] = useState<string>('');
  const [livePreview, setLivePreview] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // --- Unit Converter State ---
  const [converterType, setConverterType] = useState<ConverterType>('length');
  const [fromUnit, setFromUnit] = useState<string>('m');
  const [toUnit, setToUnit] = useState<string>('km');
  const [inputValue, setInputValue] = useState<string>('1');
  const [outputValue, setOutputValue] = useState<string>('0.001');

  const containerRef = useRef<HTMLDivElement>(null);

  // --- Real-time math expression preview ---
  useEffect(() => {
    if (mode === 'converter') return;
    if (display.trim() === '') {
      setLivePreview('');
      setIsError(false);
      return;
    }
    
    // Attempt live evaluation silently
    try {
      // Don't preview if ends with operator, decimal dot, or open bracket
      const lastChar = display.trim().slice(-1);
      if (['+', '-', '×', '÷', '.', '(', '^'].includes(lastChar)) {
        return;
      }
      
      // If bracket count mismatch, don't preview
      const openCount = (display.match(/\(/g) || []).length;
      const closeCount = (display.match(/\)/g) || []).length;
      if (openCount !== closeCount) return;

      const evalResult = safeEvaluate(display);
      // Format number nicely
      if (evalResult === Math.PI || evalResult === Math.E) {
        setLivePreview(evalResult.toFixed(8));
      } else {
        const formatted = Number(evalResult.toPrecision(12)).toString();
        setLivePreview(formatted);
      }
      setIsError(false);
    } catch {
      // Fail silently for live preview
    }
  }, [display, mode]);

  // --- Sync conversion whenever unit inputs change ---
  useEffect(() => {
    if (mode !== 'converter') return;
    const val = parseFloat(inputValue);
    if (isNaN(val)) {
      setOutputValue('');
      return;
    }
    const res = convertUnits(val, fromUnit, toUnit, converterType);
    // Format output beautifully
    setOutputValue(Number(res.toPrecision(10)).toString());
  }, [inputValue, fromUnit, toUnit, converterType, mode]);

  // Update default units when converter type changes
  useEffect(() => {
    const list = UNITS[converterType];
    if (list && list.length >= 2) {
      setFromUnit(list[0].value);
      setToUnit(list[1].value);
    }
  }, [converterType]);

  // --- Keyboard Event Binder ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable key capture if user is typing in the unit input box
      if (document.activeElement?.tagName === 'INPUT') return;

      const key = e.key;

      if (key >= '0' && key <= '9') {
        handleInput(key);
      } else if (key === '.') {
        handleInput('.');
      } else if (key === '+') {
        handleInput('+');
      } else if (key === '-') {
        handleInput('-');
      } else if (key === '*') {
        handleInput('×');
      } else if (key === '/') {
        handleInput('÷');
      } else if (key === '(' || key === ')') {
        handleInput(key);
      } else if (key === '^') {
        handleInput('^');
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        calculateResult();
      } else if (key === 'Backspace') {
        handleDelete();
      } else if (key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [display, mode]);

  // --- Handlers ---
  const handleInput = (value: string) => {
    setIsError(false);
    
    // Check if adding operator next to existing operator
    const lastChar = display.slice(-1);
    const operators = ['+', '-', '×', '÷', '^'];
    
    if (operators.includes(value) && operators.includes(lastChar)) {
      // Replace last operator with the new one
      setDisplay(prev => prev.slice(0, -1) + value);
      return;
    }

    // Special check for trigonometry/logs to append auto brackets
    if (['sin', 'cos', 'tan', 'ln', 'log', 'sqrt', 'abs'].includes(value)) {
      setDisplay(prev => prev + value + '(');
      return;
    }

    setDisplay(prev => prev + value);
  };

  const handleClear = () => {
    setDisplay('');
    setLivePreview('');
    setIsError(false);
  };

  const handleDelete = () => {
    setIsError(false);
    if (display.length === 0) return;
    
    // If backspacing a function word like sin(, cos(
    const funcMatch = display.match(/(sin\(|cos\(|tan\(|ln\(|log\(|sqrt\(|abs\()$/);
    if (funcMatch) {
      setDisplay(prev => prev.slice(0, -funcMatch[0].length));
      return;
    }

    setDisplay(prev => prev.slice(0, -1));
  };

  const calculateResult = () => {
    if (display.trim() === '') return;
    
    try {
      const finalResult = safeEvaluate(display);
      const formattedResult = Number(finalResult.toPrecision(12)).toString();
      
      // Save history
      const newHistoryItem: HistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        expression: display,
        result: formattedResult,
        timestamp: new Date()
      };
      
      setHistory(prev => [newHistoryItem, ...prev]);
      setDisplay(formattedResult);
      setLivePreview('');
      setIsError(false);
    } catch (err) {
      setIsError(true);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setDisplay(item.expression);
    setShowHistory(false);
    setIsError(false);
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const copyToClipboard = () => {
    if (display === '') return;
    navigator.clipboard.writeText(display);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div ref={containerRef} className="flex-1 w-full overflow-hidden p-6 md:p-8 flex flex-col relative justify-start items-center bg-[#F4F6F9] dark:bg-slate-950 transition-colors duration-300">
      
      {/* --- Rich Aesthetics - Animated Neon Background Orbs --- */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Animated Purple Orb */}
        <motion.div 
          animate={{
            x: [0, 80, -40, 0],
            y: [0, -80, 50, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500/20 dark:bg-purple-600/10 rounded-full blur-[100px]"
        />
        {/* Animated Aqua Orb */}
        <motion.div 
          animate={{
            x: [0, -90, 60, 0],
            y: [0, 80, -60, 0],
            scale: [1, 0.85, 1.15, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -bottom-40 -right-40 w-[450px] h-[450px] bg-cyan-400/20 dark:bg-cyan-500/10 rounded-full blur-[120px]"
        />
        {/* Steady Pink Accent */}
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-rose-400/10 dark:bg-rose-500/5 rounded-full blur-[90px]" />
      </div>

      {/* --- Main WebApp Card Container --- */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-5xl h-full flex flex-col bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl shadow-2xl overflow-hidden z-10"
      >
        {/* --- Top Controller / Mode Bar --- */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30">
          <div className="flex items-center gap-3 mb-3 sm:mb-0">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-violet-500 to-cyan-500 text-white shadow-md">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-slate-950 via-slate-800 to-slate-950 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent">
                Antigravity Premium Calculator
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">사칙연산부터 공학용 연산, 단위 변환까지</p>
            </div>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-2xl border border-slate-300/20 dark:border-slate-700/30">
            {(['basic', 'scientific', 'converter'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  handleClear();
                }}
                className={`relative px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-300 ${
                  mode === m 
                    ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-cyan-400 shadow-md scale-105' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {m === 'basic' && '일반 계산기'}
                {m === 'scientific' && '공학용'}
                {m === 'converter' && '단위 변환기'}
              </button>
            ))}
          </div>
        </div>

        {/* --- Calculator Main Layout --- */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* --- Left Calculator Area --- */}
          <div className="flex-1 flex flex-col p-6 overflow-y-auto">
            
            {/* --- Calculator Mode: Display Screen --- */}
            {mode !== 'converter' && (
              <motion.div 
                animate={isError ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
                transition={{ duration: 0.4 }}
                className={`relative w-full p-6 rounded-2xl mb-5 flex flex-col items-end justify-between transition-all border ${
                  isError 
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]' 
                    : 'bg-slate-100/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/40 shadow-inner'
                }`}
                style={{ minHeight: '130px' }}
              >
                {/* Copy & History Toggles */}
                <div className="absolute top-3 left-4 flex gap-2">
                  <button 
                    onClick={copyToClipboard}
                    title="결과 복사"
                    className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition border border-slate-200/50 dark:border-slate-700/50 shadow-sm"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button 
                    onClick={() => setShowHistory(prev => !prev)}
                    title="히스토리 토글"
                    className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition border border-slate-200/50 dark:border-slate-700/50 shadow-sm md:hidden"
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Mathematical Expression Input */}
                <div className="w-full text-right mt-6 overflow-x-auto whitespace-nowrap scrollbar-none">
                  <span className="text-xl sm:text-2xl font-medium tracking-wide text-slate-500 dark:text-slate-400">
                    {display || '0'}
                  </span>
                </div>

                {/* Real-time Result Preview */}
                <div className="w-full text-right min-h-[36px] flex items-center justify-end overflow-hidden">
                  <AnimatePresence mode="wait">
                    {isError ? (
                      <motion.span 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-xs sm:text-sm font-semibold text-rose-500 dark:text-rose-400 flex items-center gap-1.5 bg-rose-100/60 dark:bg-rose-950/40 px-3 py-1 rounded-lg"
                      >
                        신택스 에러 (잘못된 수식)
                      </motion.span>
                    ) : livePreview ? (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent"
                      >
                        = {livePreview}
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* --- Core Keypad Area --- */}
            {mode === 'basic' && (
              <div className="grid grid-cols-4 gap-3 flex-1 min-h-[300px]">
                {/* Clear / Delete / Operations */}
                <button onClick={handleClear} className="col-span-2 btn-calc bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-950">AC</button>
                <button onClick={handleDelete} className="btn-calc bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-950"><Delete className="w-5 h-5" /></button>
                <button onClick={() => handleInput('÷')} className="btn-calc bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-cyan-400 font-extrabold border border-violet-200 dark:border-violet-950">÷</button>

                {/* 7 8 9 Multiply */}
                <button onClick={() => handleInput('7')} className="btn-calc">7</button>
                <button onClick={() => handleInput('8')} className="btn-calc">8</button>
                <button onClick={() => handleInput('9')} className="btn-calc">9</button>
                <button onClick={() => handleInput('×')} className="btn-calc bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-cyan-400 font-extrabold border border-violet-200 dark:border-violet-950">×</button>

                {/* 4 5 6 Minus */}
                <button onClick={() => handleInput('4')} className="btn-calc">4</button>
                <button onClick={() => handleInput('5')} className="btn-calc">5</button>
                <button onClick={() => handleInput('6')} className="btn-calc">6</button>
                <button onClick={() => handleInput('-')} className="btn-calc bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-cyan-400 font-extrabold border border-violet-200 dark:border-violet-950">-</button>

                {/* 1 2 3 Plus */}
                <button onClick={() => handleInput('1')} className="btn-calc">1</button>
                <button onClick={() => handleInput('2')} className="btn-calc">2</button>
                <button onClick={() => handleInput('3')} className="btn-calc">3</button>
                <button onClick={() => handleInput('+')} className="btn-calc bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-cyan-400 font-extrabold border border-violet-200 dark:border-violet-950">+</button>

                {/* 0 Dot Bracket Equals */}
                <button onClick={() => handleInput('(')} className="btn-calc hover:bg-slate-200/50 dark:hover:bg-slate-800">(</button>
                <button onClick={() => handleInput('0')} className="btn-calc">0</button>
                <button onClick={() => handleInput(')')} className="btn-calc hover:bg-slate-200/50 dark:hover:bg-slate-800">)</button>
                <button onClick={() => handleInput('.')} className="btn-calc hover:bg-slate-200/50 dark:hover:bg-slate-800">.</button>
                
                <button onClick={calculateResult} className="col-span-4 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 dark:from-cyan-500 dark:to-blue-600 dark:hover:from-cyan-400 dark:hover:to-blue-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transition transform active:scale-95 flex items-center justify-center gap-2">
                  <CornerDownLeft className="w-5 h-5" /> 계산하기
                </button>
              </div>
            )}

            {/* --- Scientific Keypad Area --- */}
            {mode === 'scientific' && (
              <div className="grid grid-cols-5 gap-2.5 flex-1 min-h-[320px]">
                {/* Advanced Row 1 */}
                <button onClick={() => handleInput('sin')} className="btn-sci">sin</button>
                <button onClick={() => handleInput('cos')} className="btn-sci">cos</button>
                <button onClick={() => handleInput('tan')} className="btn-sci">tan</button>
                <button onClick={() => handleInput('^')} className="btn-sci">x<sup>y</sup></button>
                <button onClick={() => handleInput('sqrt')} className="btn-sci">√</button>

                {/* Advanced Row 2 */}
                <button onClick={() => handleInput('ln')} className="btn-sci">ln</button>
                <button onClick={() => handleInput('log')} className="btn-sci">log</button>
                <button onClick={() => handleInput('π')} className="btn-sci">π</button>
                <button onClick={() => handleInput('e')} className="btn-sci">e</button>
                <button onClick={() => handleInput('abs')} className="btn-sci">abs</button>

                {/* Normal Rows Integrated */}
                {/* AC, DEL, Parentheses */}
                <button onClick={handleClear} className="btn-calc bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-950">AC</button>
                <button onClick={handleDelete} className="btn-calc bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-950"><Delete className="w-4 h-4" /></button>
                <button onClick={() => handleInput('(')} className="btn-calc hover:bg-slate-200/50 dark:hover:bg-slate-800">(</button>
                <button onClick={() => handleInput(')')} className="btn-calc hover:bg-slate-200/50 dark:hover:bg-slate-800">)</button>
                <button onClick={() => handleInput('÷')} className="btn-calc bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-cyan-400 font-bold border border-violet-200 dark:border-violet-950">÷</button>

                {/* 7 8 9 Multiply */}
                <button onClick={() => handleInput('7')} className="btn-calc">7</button>
                <button onClick={() => handleInput('8')} className="btn-calc">8</button>
                <button onClick={() => handleInput('9')} className="btn-calc">9</button>
                <button onClick={() => handleInput('%')} className="btn-calc hover:bg-slate-200/50 dark:hover:bg-slate-800">%</button>
                <button onClick={() => handleInput('×')} className="btn-calc bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-cyan-400 font-bold border border-violet-200 dark:border-violet-950">×</button>

                {/* 4 5 6 Subtract */}
                <button onClick={() => handleInput('4')} className="btn-calc">4</button>
                <button onClick={() => handleInput('5')} className="btn-calc">5</button>
                <button onClick={() => handleInput('6')} className="btn-calc">6</button>
                <button onClick={() => handleInput('.')} className="btn-calc">.</button>
                <button onClick={() => handleInput('-')} className="btn-calc bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-cyan-400 font-bold border border-violet-200 dark:border-violet-950">-</button>

                {/* 1 2 3 Add */}
                <button onClick={() => handleInput('1')} className="btn-calc">1</button>
                <button onClick={() => handleInput('2')} className="btn-calc">2</button>
                <button onClick={() => handleInput('3')} className="btn-calc">3</button>
                <button onClick={() => handleInput('0')} className="btn-calc">0</button>
                <button onClick={() => handleInput('+')} className="btn-calc bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-cyan-400 font-bold border border-violet-200 dark:border-violet-950">+</button>

                {/* Equal bar on scientific */}
                <button onClick={calculateResult} className="col-span-5 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 dark:from-cyan-500 dark:to-blue-600 dark:hover:from-cyan-400 dark:hover:to-blue-500 text-white font-bold shadow-md hover:shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2">
                  <CornerDownLeft className="w-4 h-4" /> 수식 실행
                </button>
              </div>
            )}

            {/* --- Unit Converter Layout --- */}
            {mode === 'converter' && (
              <div className="flex-1 flex flex-col justify-start">
                
                {/* Category selectors */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {(['length', 'weight', 'temperature', 'area'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setConverterType(type)}
                      className={`py-3 px-2 text-xs font-bold rounded-xl border transition ${
                        converterType === type 
                          ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-500/20' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {type === 'length' && '📏 길이'}
                      {type === 'weight' && '⚖️ 무게'}
                      {type === 'temperature' && '🌡️ 온도'}
                      {type === 'area' && '🗺️ 넓이'}
                    </button>
                  ))}
                </div>

                {/* Core conversion interface */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/40 p-6 rounded-2xl">
                  
                  {/* From Field */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">변환할 값 (From)</label>
                    <select
                      value={fromUnit}
                      onChange={(e) => setFromUnit(e.target.value)}
                      className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white"
                    >
                      {UNITS[converterType].map((u) => (
                        <option key={u.value} value={u.value}>{u.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="mt-2 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-bold text-right focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white"
                      placeholder="숫자 입력..."
                    />
                  </div>

                  {/* To Field */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">변환 결과 (To)</label>
                    <select
                      value={toUnit}
                      onChange={(e) => setToUnit(e.target.value)}
                      className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white"
                    >
                      {UNITS[converterType].map((u) => (
                        <option key={u.value} value={u.value}>{u.name}</option>
                      ))}
                    </select>
                    <div className="mt-2 p-4 bg-slate-200/50 dark:bg-slate-900 border border-slate-300/40 dark:border-slate-800 rounded-xl text-lg font-bold text-right text-violet-600 dark:text-cyan-400 min-h-[60px] flex items-center justify-end overflow-x-auto whitespace-nowrap">
                      {outputValue || '0'}
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-violet-50 dark:bg-slate-900 border border-violet-100 dark:border-slate-800 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <Sparkles className="w-5 h-5 text-violet-500" />
                  <span>두 단위 간의 변환 수식이 실시간으로 안전하게 자동 계산되어 출력됩니다.</span>
                </div>
              </div>
            )}
          </div>

          {/* --- Right History Panel (Sidebar) --- */}
          {/* Desktop Version */}
          <div className="hidden md:flex w-80 border-l border-slate-200/50 dark:border-slate-800/40 flex-col bg-white/20 dark:bg-slate-900/20 backdrop-blur-sm">
            <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/40 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <History className="w-4 h-4 text-violet-500" /> 계산 기록 (History)
              </span>
              {history.length > 0 && (
                <button 
                  onClick={clearHistory}
                  title="기록 지우기"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-4">
                  <Layers className="w-8 h-8 mb-2 opacity-50 text-slate-500" />
                  <p className="text-xs">아직 계산 이력이 없습니다.</p>
                  <p className="text-[10px] mt-1 opacity-75">수식을 계산하면 이곳에 저장됩니다.</p>
                </div>
              ) : (
                history.map((item) => (
                  <motion.div
                    key={item.id}
                    onClick={() => loadHistoryItem(item)}
                    whileHover={{ scale: 1.02 }}
                    className="p-3 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 rounded-xl cursor-pointer transition shadow-sm group relative"
                  >
                    <span className="absolute top-2 right-2 text-[8px] text-slate-400 opacity-0 group-hover:opacity-100 transition duration-300">
                      클릭하여 수식 로드
                    </span>
                    <div className="text-xs text-slate-500 dark:text-slate-400 text-right truncate">
                      {item.expression}
                    </div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 text-right mt-1 truncate">
                      = {item.result}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Mobile Drawer (AnimatePresence) */}
          <AnimatePresence>
            {showHistory && (
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute inset-y-0 right-0 w-full sm:w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 z-50 flex flex-col shadow-2xl md:hidden"
              >
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <History className="w-4 h-4 text-violet-500" /> 계산 기록
                  </span>
                  <div className="flex gap-2">
                    {history.length > 0 && (
                      <button 
                        onClick={clearHistory}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => setShowHistory(false)}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    >
                      <Minimize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {history.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-4">
                      <Layers className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-xs">계산 이력이 없습니다.</p>
                    </div>
                  ) : (
                    history.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => loadHistoryItem(item)}
                        className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition"
                      >
                        <div className="text-xs text-slate-500 dark:text-slate-400 text-right truncate">
                          {item.expression}
                        </div>
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200 text-right mt-1 truncate">
                          = {item.result}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* --- Visual Styling Addons for buttons --- */}
      <style>{`
        .btn-calc {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem 0;
          font-size: 1.15rem;
          font-weight: 600;
          border-radius: 1rem;
          background-color: rgb(255 255 255 / 0.8);
          border: 1px solid rgb(226 232 240 / 0.8);
          color: rgb(15 23 42);
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .dark .btn-calc {
          background-color: rgb(30 41 59 / 0.5);
          border-color: rgb(51 65 85 / 0.4);
          color: rgb(241 245 249);
        }
        .btn-calc:hover {
          background-color: rgb(241 245 249);
          transform: translateY(-1px);
        }
        .dark .btn-calc:hover {
          background-color: rgb(51 65 85 / 0.6);
        }
        .btn-calc:active {
          transform: translateY(1px) scale(0.96);
        }
        
        .btn-sci {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 0;
          font-size: 0.85rem;
          font-weight: 700;
          border-radius: 1rem;
          background-color: rgb(241 245 249 / 0.7);
          border: 1px solid rgb(226 232 240 / 0.5);
          color: rgb(79 70 229);
          transition: all 0.2s;
        }
        .dark .btn-sci {
          background-color: rgb(15 23 42 / 0.6);
          border-color: rgb(30 41 59 / 0.6);
          color: rgb(56 189 248);
        }
        .btn-sci:hover {
          background-color: rgb(79 70 229 / 0.1);
          transform: translateY(-1px);
        }
        .dark .btn-sci:hover {
          background-color: rgb(56 189 248 / 0.1);
        }
        .btn-sci:active {
          transform: scale(0.96);
        }
      `}</style>
    </div>
  );
};

export default Calculator;
