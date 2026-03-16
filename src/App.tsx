import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Clapperboard, 
  Sparkles, 
  Send, 
  UserCircle, 
  Target, 
  Package, 
  MessageSquare, 
  Clock,
  Loader2,
  Copy,
  Check,
  Database as DatabaseIcon,
  Plus,
  Trash2,
  FileText,
  ChevronRight,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

// Initialize Gemini API
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type View = 'learning' | 'generation';

interface Account {
  id: number;
  name: string;
  age_distribution: string;
  created_at: string;
  urls?: string[];
}

export default function App() {
  const [view, setView] = useState<View>('generation');
  
  // Learning Phase State
  const [learningName, setLearningName] = useState('');
  const [learningAge, setLearningAge] = useState('');
  const [learningUrls, setLearningUrls] = useState<string[]>(['']);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Generation Phase State
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [productName, setProductName] = useState('');
  const [productBrief, setProductBrief] = useState('');
  const [direction, setDirection] = useState('');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      setAccounts(data);
    } catch (error) {
      console.error("Failed to fetch accounts", error);
    }
  };

  const handleAddUrlField = () => {
    setLearningUrls([...learningUrls, '']);
  };

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...learningUrls];
    newUrls[index] = value;
    setLearningUrls(newUrls);
  };

  const handleRemoveUrlField = (index: number) => {
    const newUrls = learningUrls.filter((_, i) => i !== index);
    setLearningUrls(newUrls.length ? newUrls : ['']);
  };

  const saveKnowledge = async () => {
    if (!learningName || !learningAge) {
      alert('アカウント名と年齢分布を入力してください。');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: learningName,
          age_distribution: learningAge,
          urls: learningUrls.filter(u => u.trim())
        })
      });
      if (res.ok) {
        setLearningName('');
        setLearningAge('');
        setLearningUrls(['']);
        fetchAccounts();
        alert('ナレッジを保存しました。');
      }
    } catch (error) {
      alert('保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAccount = async (id: number) => {
    if (!confirm('このナレッジを削除しますか？')) return;
    try {
      await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      fetchAccounts();
    } catch (error) {
      alert('削除に失敗しました。');
    }
  };

  const generateScript = async () => {
    if (!selectedAccountId || !productName || !productBrief) {
      alert('必須項目を入力してください。');
      return;
    }

    setLoading(true);
    try {
      // Fetch account details for context
      const accountRes = await fetch(`/api/accounts/${selectedAccountId}`);
      const accountData = await accountRes.json();

      const response = await genAI.models.generateContent({ 
        model: "gemini-3.1-pro-preview",
        config: {
          systemInstruction: `
あなたは、TikTokやYouTube Shortsでバズる動画を量産する「プロの縦型ショートドラマ脚本家」です。
提供された「アカウントのナレッジ（過去作品のURL、視聴者層）」を深く分析し、そのアカウントの作風を完璧に再現します。

# 学習済みアカウント情報
- アカウント名: ${accountData.name}
- 視聴者の年齢分布: ${accountData.age_distribution}

# Workflow
1. **Step 1: 商材の分析**: 提供されたBrief資料から商材のコアバリューを抽出する。
2. **Step 2: アカウント作風の憑依**: 学習用URLのコンテンツから、フック、展開、オチのパターンを分析し、今回の脚本に反映させる。
3. **Step 3: 脚本作成**: 
   - **あらすじ**: 視聴者の興味を引くストーリーラインを作成。
   - **簡易脚本**: 縦型画面（9:16）を意識したアングル指定やテロップを含めた脚本を書く。

# Rules
- 広告感を極力抑え、エンタメ性を主軸にする。
- 冒頭2秒で視聴者の手を止める。
- テンポを重視し、無駄な説明を省く。

# Output Format
## 1. 商材の分析
## 2. あらすじ
## 3. 縦型ショートドラマ簡易脚本（想定尺：60秒）
**【登場人物】**
**【本編】**
[秒数] シーン/アングル/テロップ
セリフ/ト書き
          `,
          tools: accountData.urls?.length ? [{ urlContext: {} }] : undefined
        },
        contents: [{
          role: 'user',
          parts: [{
            text: `
以下の情報をもとに、学習済みアカウント「${accountData.name}」の作風で脚本を作成してください：
1. 商品名: ${productName}
2. 商材のBrief資料: ${productBrief}
3. 作品の方向性: ${direction}
${accountData.urls?.length ? `参考URLリスト: ${accountData.urls.join(', ')}` : ''}
            `
          }]
        }]
      });

      if (response.text) {
        setOutput(response.text);
      }
    } catch (error) {
      console.error("Error generating script:", error);
      alert("生成中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (output) {
      navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1a1a] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="bg-white border-b border-black/5 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
              <Clapperboard className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">Vertical Drama AI Pro</h1>
          </div>
          
          <nav className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setView('generation')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${view === 'generation' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Sparkles className="w-4 h-4" />
              脚本作成
            </button>
            <button 
              onClick={() => setView('learning')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${view === 'learning' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <DatabaseIcon className="w-4 h-4" />
              ナレッジ学習
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">
          {view === 'learning' ? (
            <motion.div 
              key="learning"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-10"
            >
              <div className="lg:col-span-5 space-y-6">
                <section className="bg-white p-8 rounded-3xl shadow-sm border border-black/5 space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Plus className="w-5 h-5 text-emerald-500" />
                    <h2 className="text-lg font-bold tracking-tight">新規アカウント学習</h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">アカウント名</label>
                      <input 
                        type="text"
                        value={learningName}
                        onChange={(e) => setLearningName(e.target.value)}
                        placeholder="例: @buzz_drama_official"
                        className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">視聴者の年齢分布</label>
                      <input 
                        type="text"
                        value={learningAge}
                        onChange={(e) => setLearningAge(e.target.value)}
                        placeholder="例: 18-24歳(40%), 25-34歳(35%)"
                        className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-400 mb-2 block flex justify-between items-center">
                        動画URL (最大30個)
                        <button onClick={handleAddUrlField} className="text-emerald-500 hover:text-emerald-600 flex items-center gap-1">
                          <Plus className="w-3 h-3" /> 追加
                        </button>
                      </label>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {learningUrls.map((url, index) => (
                          <div key={index} className="flex gap-2">
                            <input 
                              type="url"
                              value={url}
                              onChange={(e) => handleUrlChange(index, e.target.value)}
                              placeholder="https://..."
                              className="flex-1 p-3 bg-gray-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            />
                            <button 
                              onClick={() => handleRemoveUrlField(index)}
                              className="p-3 text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={saveKnowledge}
                    disabled={isSaving}
                    className="w-full py-4 bg-[#1a1a1a] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "ナレッジとして保存"}
                  </button>
                </section>
              </div>

              <div className="lg:col-span-7 space-y-6">
                <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-400" />
                  学習済みナレッジ一覧
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {accounts.map(account => (
                    <div key={account.id} className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-emerald-50 p-2 rounded-xl">
                          <UserCircle className="w-6 h-6 text-emerald-500" />
                        </div>
                        <button 
                          onClick={() => deleteAccount(account.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="font-bold text-lg mb-1">{account.name}</h3>
                      <p className="text-xs text-gray-400 mb-4">{account.age_distribution}</p>
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        <span>{new Date(account.created_at).toLocaleDateString()}</span>
                        <div className="flex items-center gap-1 text-emerald-500">
                          学習済み <ChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {accounts.length === 0 && (
                    <div className="col-span-2 py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl">
                      <p className="text-gray-400 text-sm">まだ学習データがありません</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="generation"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-10"
            >
              <div className="lg:col-span-5 space-y-6">
                <section className="bg-white p-8 rounded-3xl shadow-sm border border-black/5 space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                    <h2 className="text-lg font-bold tracking-tight">脚本作成フェーズ</h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">憑依させるアカウント</label>
                      <select 
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none"
                      >
                        <option value="">アカウントを選択してください</option>
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">商品名</label>
                      <input 
                        type="text"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="例: 無添加スキンケアセット"
                        className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">商材のBrief資料</label>
                      <textarea 
                        value={productBrief}
                        onChange={(e) => setProductBrief(e.target.value)}
                        placeholder="商材の強み、ターゲット、解決したい悩みなど..."
                        className="w-full min-h-[120px] p-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">作品の方向性</label>
                      <input 
                        type="text"
                        value={direction}
                        onChange={(e) => setDirection(e.target.value)}
                        placeholder="例: コメディ調、感動系、スカッと系"
                        className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    onClick={generateScript}
                    disabled={loading}
                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> 脚本を生成する</>}
                  </button>
                </section>
              </div>

              <div className="lg:col-span-7">
                <AnimatePresence mode="wait">
                  {output ? (
                    <motion.div
                      key="output"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white rounded-3xl shadow-xl border border-black/5 overflow-hidden"
                    >
                      <div className="p-6 border-b border-black/5 flex items-center justify-between bg-gray-50/50">
                        <div className="flex items-center gap-2 text-emerald-600">
                          <FileText className="w-5 h-5" />
                          <span className="text-xs font-bold uppercase tracking-wider">Generated Script</span>
                        </div>
                        <button 
                          onClick={copyToClipboard}
                          className="p-2 hover:bg-emerald-50 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold text-emerald-600"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copied ? 'Copied!' : 'Copy Script'}
                        </button>
                      </div>
                      <div className="p-10 prose prose-sm max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-p:text-gray-600 prose-strong:text-[#1a1a1a]">
                        <div className="markdown-body">
                          <ReactMarkdown>{output}</ReactMarkdown>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full min-h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-[40px] p-12 text-center bg-white/50">
                      <div className="bg-white p-6 rounded-3xl shadow-sm mb-6">
                        <Clapperboard className="w-10 h-10 text-gray-200" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-400 mb-2 tracking-tight">脚本がここに生成されます</h3>
                      <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                        ナレッジを選択し、商材情報を入力して生成を開始してください。
                      </p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </div>
  );
}
