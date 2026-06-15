import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AppHeader from '../components/AppHeader'
import BottomSheet from '../components/BottomSheet'
import { useTheme } from '../contexts/ThemeContext'
import { LeafSmall, LeafBig, Flower, Mushroom } from '../components/CottageDecor'

const MEALS = [
  { id: 1,  emoji: '🍚', name: 'Riz poulet sauce curry coco',        desc: 'Riz basmati · poulet · lait de coco · curry doux · coriandre' },
  { id: 2,  emoji: '🍝', name: 'Pâtes bolognaise',                   desc: 'Spaghetti · viande hachée · tomates · oignon · herbes' },
  { id: 3,  emoji: '🍚', name: 'Riz sauté légumes & œuf',            desc: 'Riz · carottes · petits pois · sauce soja · ail' },
  { id: 4,  emoji: '🍝', name: 'Pâtes au pesto poulet',              desc: 'Fusilli · poulet grillé · pesto basilic · parmesan' },
  { id: 5,  emoji: '🥗', name: 'Bowl quinoa poulet rôti',            desc: 'Quinoa · poulet · concombre · avocat · sauce tahini-citron' },
  { id: 6,  emoji: '🐟', name: 'Poisson blanc citron-câpres',        desc: 'Cabillaud · beurre · câpres · citron · persil · riz blanc' },
  { id: 7,  emoji: '🌯', name: 'Wraps poulet avocat',                desc: 'Tortilla · poulet grillé · avocat · laitue · sauce yaourt-menthe' },
  { id: 8,  emoji: '🍝', name: 'Pâtes viande hachée crème',         desc: 'Penne · viande hachée · crème fraîche · champignons · ail' },
  { id: 9,  emoji: '🍕', name: 'Pizza maison jambon-mozzarella',    desc: 'Pâte fine · sauce tomate · mozzarella · jambon · origan' },
  { id: 10, emoji: '🍚', name: 'Riz poisson blanc sauce vierge',     desc: 'Riz · lieu noir · tomates · oignon · olives · huile d\'olive' },
  { id: 11, emoji: '🥗', name: 'Quinoa viande hachée poivrons',      desc: 'Quinoa · viande hachée · poivron rouge · cumin · coriandre' },
  { id: 12, emoji: '🍝', name: 'Pâtes poulet sauce tomate basilic', desc: 'Rigatoni · poulet · coulis de tomates · basilic frais' },
  { id: 13, emoji: '🍜', name: 'Bobun poulet',                       desc: 'Vermicelles · poulet mariné nuoc-mâm · concombre · cacahuètes · menthe' },
  { id: 14, emoji: '🍚', name: 'Riz viande hachée sauce soja',      desc: 'Riz · viande hachée · sauce soja · gingembre · oignons verts' },
  { id: 15, emoji: '🐟', name: 'Poisson blanc en papillote',        desc: 'Filet de merlu · tomates · courgette · herbes · riz complet' },
  { id: 16, emoji: '🥗', name: 'Salade quinoa poisson fumé',        desc: 'Quinoa · truite fumée · avocat · fenouil · citron' },
  { id: 17, emoji: '🍝', name: 'Pâtes carbonara',                   desc: 'Spaghetti · lardons · jaunes d\'œuf · parmesan · poivre' },
  { id: 18, emoji: '🍚', name: 'Riz poulet sauce teriyaki',         desc: 'Riz · cuisse de poulet · sauce teriyaki · sésame · brocoli' },
  { id: 19, emoji: '🌯', name: 'Wraps viande hachée tex-mex',       desc: 'Tortilla · viande hachée · haricots rouges · maïs · crème fraîche' },
  { id: 20, emoji: '🍕', name: 'Pizza poisson & crème',             desc: 'Pâte fine · crème fraîche · thon · câpres · mozzarella' },
  { id: 21, emoji: '🍚', name: 'Riz cantonnais maison',             desc: 'Riz · jambon · œuf · petits pois · sauce soja' },
  { id: 22, emoji: '🥗', name: 'Bowl quinoa bœuf épicé',            desc: 'Quinoa · viande hachée · paprika · oignon rouge · yaourt' },
  { id: 23, emoji: '🍝', name: 'Pâtes au saumon crème aneth',       desc: 'Tagliatelles · saumon · crème · aneth · citron' },
  { id: 24, emoji: '🐟', name: 'Poisson blanc panure maison',       desc: 'Merlan pané · chapelure · purée maison · sauce tartare' },
  { id: 25, emoji: '🍜', name: 'Bobun bœuf',                        desc: 'Vermicelles · viande hachée · carottes râpées · nuoc-mâm · cacahuètes' },
  { id: 26, emoji: '🍚', name: 'Riz poulet lait coco citron vert', desc: 'Riz jasmin · poulet · coco · citron vert · citronnelle' },
  { id: 27, emoji: '🍝', name: 'Pâtes aux champignons & thym',     desc: 'Tagliatelles · champignons de Paris · crème · thym · ail' },
  { id: 28, emoji: '🌯', name: 'Wraps poisson & chou',              desc: 'Tortilla · poisson blanc · chou rouge · mayo-citron · coriandre' },
  { id: 29, emoji: '🥗', name: 'Quinoa poulet grillé salade',       desc: 'Quinoa · poulet · tomates cerises · feta · vinaigrette miel-moutarde' },
  { id: 30, emoji: '🍕', name: 'Pizza viande hachée oignons',       desc: 'Pâte fine · viande hachée · oignon · champignons · fromage' },
]

function getDayMeal() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now - start
  const dayOfYear = Math.floor(diff / 86400000)
  return MEALS[dayOfYear % MEALS.length]
}

const MEAL_KEY = 'home_meal_override'
const LIKED_KEY = 'home_liked_meals'

function getTodayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function getLiked() {
  try { return JSON.parse(localStorage.getItem(LIKED_KEY) || '[]') } catch { return [] }
}
function saveLiked(list) {
  localStorage.setItem(LIKED_KEY, JSON.stringify(list))
}

function getSavedOverride() {
  try {
    const raw = localStorage.getItem(MEAL_KEY)
    if (!raw) return null
    const { key, mealId } = JSON.parse(raw)
    if (key !== getTodayKey()) return null
    return mealId
  } catch { return null }
}
function saveOverride(mealId) {
  localStorage.setItem(MEAL_KEY, JSON.stringify({ key: getTodayKey(), mealId }))
}

export default function Home() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isCottagecore = theme === 'cottagecore'

  const baseMeal = useMemo(() => getDayMeal(), [])
  const [overrideMealId, setOverrideMealId] = useState(() => getSavedOverride())
  const [liked, setLiked] = useState(getLiked)
  const [showLiked, setShowLiked] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', desc: '' })
  const [showMenu, setShowMenu] = useState(false)

  const todayMeal = MEALS.find(m => m.id === overrideMealId) ?? baseMeal
  const isLiked = liked.some(m => m.id === todayMeal.id)

  useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [user, loading])

  function regenerate() {
    const excluded = new Set([todayMeal.id])
    const pool = MEALS.filter(m => !excluded.has(m.id))
    const pick = pool[Math.floor(Math.random() * pool.length)]
    saveOverride(pick.id)
    setOverrideMealId(pick.id)
  }

  function toggleLike() {
    setLiked(prev => {
      let next
      if (prev.some(m => m.id === todayMeal.id)) {
        next = prev.filter(m => m.id !== todayMeal.id)
      } else {
        next = [{ ...todayMeal, likedAt: new Date().toISOString() }, ...prev]
      }
      saveLiked(next)
      return next
    })
  }

  function unlike(id) {
    setLiked(prev => {
      const next = prev.filter(m => m.id !== id)
      saveLiked(next)
      return next
    })
  }

  function addCustomMeal() {
    if (!addForm.name.trim()) return
    const custom = {
      id: `custom_${Date.now()}`,
      emoji: '🍽️',
      name: addForm.name.trim(),
      desc: addForm.desc.trim(),
      likedAt: new Date().toISOString(),
    }
    setLiked(prev => {
      const next = [custom, ...prev]
      saveLiked(next)
      return next
    })
    setAddForm({ name: '', desc: '' })
    setShowAdd(false)
  }

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-base">

      {/* Blobs décoratifs */}
      <div className="absolute -left-16 -top-4 w-72 h-72 rounded-full bg-[#c4b5fd] opacity-30 blur-3xl pointer-events-none" />
      <div className="absolute left-32 top-14 w-64 h-64 rounded-full bg-[#a5f3fc] opacity-25 blur-3xl pointer-events-none" />
      <div className="absolute -left-8 top-52 w-60 h-60 rounded-full bg-[#bbf7d0] opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute left-40 top-[460px] w-64 h-64 rounded-full bg-[#fed7aa] opacity-25 blur-3xl pointer-events-none" />

      <AppHeader title="Toolbox" />


      <div className="absolute top-[92px] left-4 right-4 bottom-4 flex flex-col gap-3">

        {/* Bloc bonne journée */}
        <div className={`bg-white/55 border backdrop-blur-md rounded-[20px] flex flex-col items-center justify-center gap-2 py-6 px-6 relative ${isCottagecore ? 'cc-border' : 'border-white/85'}`}>
          {isCottagecore && <>
            <LeafBig   width={28} rotate={-25} style={{ position:'absolute', left:-10,  top:-10,   zIndex:10, pointerEvents:'none' }} />
            <Flower    width={18} rotate={20}  style={{ position:'absolute', left:'38%',top:-10,   zIndex:10, pointerEvents:'none' }} />
            <LeafSmall width={14} rotate={-40} style={{ position:'absolute', right:-8,  top:-8,    zIndex:10, pointerEvents:'none' }} />
            <Mushroom  width={20} rotate={-12} style={{ position:'absolute', left:-9,   bottom:-9, zIndex:10, pointerEvents:'none' }} />
            <LeafSmall width={13} rotate={60}  style={{ position:'absolute', left:'45%',bottom:-7, zIndex:10, pointerEvents:'none' }} />
            <Flower    width={16} rotate={30}  style={{ position:'absolute', right:-8,  bottom:-8, zIndex:10, pointerEvents:'none' }} />
          </>}
          <p className="text-[22px] font-bold text-dark/90">Bonne journée</p>
          <p className="text-[13px] text-muted text-center leading-snug">
            Ouvre le menu pour accéder<br />à tes outils
          </p>
        </div>

        {/* Bloc plat du jour */}
        <div className={`bg-white/55 border backdrop-blur-md rounded-[20px] px-4 py-4 flex flex-col gap-2 relative ${isCottagecore ? 'cc-border' : 'border-white/85'}`}>
          {isCottagecore && <>
            <Mushroom  width={24} rotate={15}  style={{ position:'absolute', left:-10,  top:-9,    zIndex:10, pointerEvents:'none' }} />
            <LeafBig   width={22} rotate={-15} style={{ position:'absolute', left:'40%',top:-9,    zIndex:10, pointerEvents:'none' }} />
            <Flower    width={16} rotate={-30} style={{ position:'absolute', right:-8,  top:-8,    zIndex:10, pointerEvents:'none' }} />
            <LeafSmall width={14} rotate={55}  style={{ position:'absolute', left:-7,   bottom:-7, zIndex:10, pointerEvents:'none' }} />
            <Flower    width={15} rotate={20}  style={{ position:'absolute', left:'42%',bottom:-8, zIndex:10, pointerEvents:'none' }} />
            <LeafBig   width={22} rotate={10}  style={{ position:'absolute', right:-9,  bottom:-9, zIndex:10, pointerEvents:'none' }} />
          </>}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${isCottagecore ? 'text-[#a36252]' : 'text-[#6c63ff]'}`}>Plat du jour</span>
              <span className="text-[15px] font-bold text-dark leading-tight">
                {todayMeal.emoji} {todayMeal.name}
              </span>
              <span className="text-[12px] text-muted leading-snug mt-0.5">{todayMeal.desc}</span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
              {/* Cœur — hors dropdown */}
              <button onClick={toggleLike} style={{ minWidth: 0, minHeight: 0 }} className="p-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill={isLiked ? '#e11d48' : 'none'} stroke={isLiked ? '#e11d48' : '#736694'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>

              {/* Bouton ⋮ + dropdown */}
              <div className="relative">
                <button onClick={() => setShowMenu(m => !m)} style={{ minWidth: 0, minHeight: 0 }} className="p-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#736694">
                    <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                  </svg>
                </button>
                {showMenu && (
                  <>
                    {/* overlay transparent pour fermer */}
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-8 z-50 bg-white rounded-[12px] shadow-lg border border-black/5 py-1 w-48 flex flex-col">
                      <button
                        onClick={() => { regenerate(); setShowMenu(false) }}
                        style={{ minWidth: 0, minHeight: 0 }}
                        className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-dark hover:bg-[#f2edfa] text-left"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#736694" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                        Autre suggestion
                      </button>
                      <button
                        onClick={() => { setShowAdd(true); setShowMenu(false) }}
                        style={{ minWidth: 0, minHeight: 0 }}
                        className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-dark hover:bg-[#f2edfa] text-left"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#736694" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                        </svg>
                        Ajouter un plat
                      </button>
                      {liked.length > 0 && (
                        <button
                          onClick={() => { setShowLiked(true); setShowMenu(false) }}
                          style={{ minWidth: 0, minHeight: 0 }}
                          className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-dark hover:bg-[#f2edfa] text-left"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#736694" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                          </svg>
                          Mes favoris ({liked.length})
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* BottomSheet ajout plat custom */}
      {showAdd && (
        <BottomSheet onClose={() => { setShowAdd(false); setAddForm({ name: '', desc: '' }) }}>
          <h2 className="text-[17px] font-bold text-dark">Ajouter un plat</h2>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-semibold text-muted">Nom du plat *</label>
              <input
                autoFocus
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addCustomMeal()}
                placeholder="Ex : Gratin dauphinois"
                className="h-12 rounded-[10px] bg-[#f2edfa] px-3 text-[14px] text-dark outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-semibold text-muted">Description (optionnelle)</label>
              <input
                value={addForm.desc}
                onChange={e => setAddForm(f => ({ ...f, desc: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addCustomMeal()}
                placeholder="Ingrédients, sauce…"
                className="h-12 rounded-[10px] bg-[#f2edfa] px-3 text-[14px] text-dark outline-none"
              />
            </div>
            <button
              onClick={addCustomMeal}
              disabled={!addForm.name.trim()}
              className="h-12 rounded-[12px] bg-[#6c63ff] text-white font-semibold text-[15px] disabled:opacity-40"
            >
              Ajouter aux favoris
            </button>
          </div>
        </BottomSheet>
      )}

      {/* BottomSheet plats likés */}
      {showLiked && (
        <BottomSheet onClose={() => setShowLiked(false)}>
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-dark">Mes plats favoris</h2>
            <button onClick={() => setShowLiked(false)} style={{ minWidth: 0, minHeight: 0 }} className="text-muted p-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {liked.map(meal => (
              <div key={meal.id} className={`flex items-start gap-3 rounded-[12px] px-3 py-2.5 ${isCottagecore ? 'bg-[#f5ede6]' : 'bg-[#f2edfa]'}`}>
                <span className="text-[22px] leading-none mt-0.5">{meal.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-dark leading-tight">{meal.name}</p>
                  <p className="text-[11px] text-muted leading-snug mt-0.5">{meal.desc}</p>
                </div>
                <button onClick={() => unlike(meal.id)} style={{ minWidth: 0, minHeight: 0 }} className="shrink-0 p-1 mt-0.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#e11d48" stroke="none">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
