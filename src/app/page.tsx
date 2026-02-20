import BudgetDashboard from '@/components/BudgetDashboard';

export default function Home() {
  return (
    <main>
      {/* ========== BANNER COMANDA CERRADA ========== */}
      <div className="relative overflow-hidden w-full py-5 px-4 text-center"
        style={{
          background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
          borderBottom: '3px solid #f59e0b',
          boxShadow: '0 0 40px rgba(245,158,11,0.5), 0 0 80px rgba(239,68,68,0.3)',
        }}
      >
        {/* Estrellas decorativas */}
        <span className="absolute top-2 left-6 text-yellow-300 text-2xl animate-spin" style={{ animationDuration: '3s' }}>✦</span>
        <span className="absolute top-3 left-20 text-pink-400 text-xl animate-pulse">★</span>
        <span className="absolute top-1 right-8 text-yellow-300 text-2xl animate-spin" style={{ animationDuration: '4s' }}>✦</span>
        <span className="absolute top-4 right-24 text-pink-400 text-xl animate-pulse">★</span>
        <span className="absolute bottom-2 left-40 text-amber-300 text-lg animate-bounce">🎊</span>
        <span className="absolute bottom-2 right-40 text-amber-300 text-lg animate-bounce" style={{ animationDelay: '0.5s' }}>🎉</span>

        {/* Texto principal */}
        <p
          className="font-black tracking-widest uppercase text-lg sm:text-2xl md:text-3xl animate-pulse"
          style={{
            background: 'linear-gradient(90deg, #fbbf24, #f87171, #fb7185, #fbbf24)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'shimmer 2.5s linear infinite, pulse 2s ease-in-out infinite',
            textShadow: 'none',
            letterSpacing: '0.15em',
          }}
        >
          🔒 COMANDA CERRADA 🔒
        </p>

        <p
          className="mt-2 font-extrabold uppercase tracking-[0.2em] text-sm sm:text-base md:text-xl"
          style={{
            background: 'linear-gradient(90deg, #34d399, #60a5fa, #a78bfa, #f472b6, #34d399)',
            backgroundSize: '300% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'shimmer 3s linear infinite',
          }}
        >
          🎶 A CELEBRAR EL BANQUETE MIX 🎶
        </p>


      </div>

      {/* Animaciones keyframes inyectadas */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }

      `}</style>

      <BudgetDashboard />
    </main>
  );
}
