export default function App() {
  return (
    <div className="min-h-screen bg-[#f6f4f9] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-[-80px] left-[-60px] w-72 h-72 rounded-full bg-[#6c63ff] blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-60px] right-[-60px] w-72 h-72 rounded-full bg-yellow-300 blur-3xl opacity-15 pointer-events-none" />

      <div className="z-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-[#6c63ff] rounded-[18px] flex items-center justify-center mb-5 shadow-lg">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-[#211738] tracking-tight">HadeParty</h1>
        <p className="text-[#736694] mt-2 text-base">Gestion d'événements — en construction.</p>
        <a href="/" className="mt-8 text-sm text-[#6c63ff] font-medium">← Retour à l'accueil</a>
      </div>
    </div>
  )
}
