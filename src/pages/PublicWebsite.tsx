import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Phone, MessageCircle, Mail, MapPin, ArrowRight, ArrowLeft, Share2, Sparkles } from 'lucide-react';
import { useData } from '../context/DataContext';
import { activityBg } from './WebsiteManagement';

export default function PublicWebsite() {
  const { data } = useData();
  const navigate = useNavigate();
  const [showGrid, setShowGrid] = useState(false);
  const c = data.contact;

  const call = () => c.phone && (window.location.href = `tel:${c.phone}`);
  const whatsapp = () => c.whatsapp && window.open(`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`, '_blank');

  // Build marquee items list to ensure smooth looping (requires duplicating items if array is small)
  const marqueeItems = [];
  if (data.activities && data.activities.length > 0) {
    const repeatCount = Math.max(4, Math.ceil(12 / data.activities.length));
    for (let i = 0; i < repeatCount; i++) {
      marqueeItems.push(...data.activities);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-fg overflow-x-hidden relative selection:bg-accent selection:text-black">
      {/* Subtle page-wide decorative radial gradient */}
      <div className="absolute top-0 left-0 right-0 h-[1000px] bg-gradient-to-b from-accent-strong/5 via-transparent to-transparent pointer-events-none z-0" />

      {/* Nav */}
      <header className="sticky top-0 z-50 glass border-b border-line/10 shadow-soft">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-20 px-5">
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="flex items-center gap-3"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-grad text-black shadow-glow overflow-hidden">
              {data.club.logo ? (
                <img src={data.club.logo} alt="logo" className="h-full w-full object-cover" />
              ) : (
                <Trophy className="h-5 w-5" />
              )}
            </div>
            <span className="font-display font-black text-xl tracking-tight uppercase bg-clip-text bg-gradient-to-r from-fg to-muted">
              {data.club.name}
            </span>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <button 
              onClick={() => navigate('/login')} 
              className="btn-ghost !px-5 !py-2.5 flex items-center gap-2 hover:border-accent/40 hover:text-accent group transition-all"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              Espace admin
            </button>
          </motion.div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-32 z-10">
        {/* Background Grid Pattern & Ambient Glows */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(70rem 45rem at 50% -10%, rgb(var(--accent) / 0.18), transparent 70%)' }} />

        <div className="max-w-6xl mx-auto px-5 text-center relative z-10">
          <motion.div 
            initial={{ scale: 0, rotate: -45 }} 
            animate={{ scale: 1, rotate: 0 }} 
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="mx-auto grid h-24 w-24 place-items-center rounded-[2rem] bg-accent-grad text-black shadow-glow animate-float mb-8 overflow-hidden"
          >
            {data.club.logo ? (
              <img src={data.club.logo} alt="logo" className="h-full w-full object-cover" />
            ) : (
              <Trophy className="h-12 w-12" />
            )}
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 .5 py-1 rounded-full bg-accent/10 border border-accent/20 mb-6 backdrop-blur"
          >
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-accent-soft">Club de Football Officiel</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
            className="font-display text-5xl sm:text-8xl font-black tracking-tight leading-[0.95]"
          >
            <span className="gradient-text">{data.club.name}</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.4 }}
            className="mt-8 text-base sm:text-xl text-muted max-w-2xl mx-auto font-medium leading-relaxed"
          >
            {data.club.description}
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.55 }} 
            className="mt-10 flex flex-wrap gap-4 justify-center"
          >
            <button onClick={whatsapp} className="btn-primary !px-8 !py-4 shadow-glow flex items-center gap-2 hover:scale-[1.02] transition-transform">
              <MessageCircle className="h-5 w-5" />Nous rejoindre
            </button>
            <button 
              onClick={() => document.getElementById('activities')?.scrollIntoView({ behavior: 'smooth' })} 
              className="btn-ghost !px-8 !py-4 hover:shadow-soft flex items-center gap-2"
            >
              Nos activités <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>

          {/* Glowing Stats Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.7 }} 
            className="mt-20 grid grid-cols-3 gap-4 max-w-3xl mx-auto"
          >
            {[['+250', 'Joueurs actifs'], ['15+', 'Années d\'excellence'], ['3', 'Terrains pros']].map(([n, l]) => (
              <div 
                key={l} 
                className="p-5 rounded-2xl bg-surface-2/30 backdrop-blur-md border border-line/5 flex flex-col justify-center items-center shadow-card hover:border-accent/20 transition-all duration-300 group"
              >
                <p className="font-display text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-accent-soft via-accent to-accent-strong tracking-tight group-hover:scale-105 transition-transform duration-300">
                  {n}
                </p>
                <p className="text-[10px] sm:text-sm text-muted font-bold mt-2 uppercase tracking-wide">{l}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Activities Section with Auto-scrolling Line */}
      <section id="activities" className="relative py-24 overflow-hidden border-t border-b border-line/5 bg-surface/20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full filter blur-[150px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-5 mb-16 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 mb-4">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-accent">Nos Offres</span>
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">
            Nos Activités & Formations
          </h2>
          <p className="text-muted mt-3 max-w-xl mx-auto text-sm sm:text-base font-medium">
            Découvrez nos formations et événements. Les activités défilent automatiquement ci-dessous, passez votre curseur pour figer le défilement.
          </p>
        </div>

        {/* Dynamic Infinite Scroll Track */}
        {data.activities && data.activities.length > 0 ? (
          <div className="relative w-full overflow-hidden py-4 select-none">
            {/* Edge shadows/blurs for smooth marquee transitions */}
            <div className="absolute inset-y-0 left-0 w-16 sm:w-40 bg-gradient-to-r from-bg via-bg/80 to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-16 sm:w-40 bg-gradient-to-l from-bg via-bg/80 to-transparent z-10 pointer-events-none" />

            <div className="flex gap-6 animate-marquee py-4">
              {marqueeItems.map((a, i) => (
                <motion.div
                  key={`${a.id}-${i}`}
                  whileHover={{ y: -8, scale: 1.01 }}
                  className="w-[280px] sm:w-[360px] shrink-0 card group overflow-hidden bg-surface-2/40 backdrop-blur-md border border-line/10 hover:border-accent/40 transition-all duration-300 hover:shadow-glow relative"
                >
                  <div className="h-48 sm:h-52 relative overflow-hidden animate-sheen" style={{ background: activityBg(a.image) }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent opacity-90 transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-4 left-4 z-10">
                      <span className="chip !bg-black/70 !text-white backdrop-blur border-white/10 uppercase tracking-widest text-[9px] font-bold">Activité</span>
                    </div>
                  </div>
                  <div className="p-6 relative z-10">
                    <h3 className="font-display text-lg sm:text-xl font-bold group-hover:text-accent transition-colors duration-300">{a.name}</h3>
                    <p className="text-muted text-xs sm:text-sm mt-2 line-clamp-3 leading-relaxed h-[60px]">{a.description}</p>
                    <button onClick={whatsapp} className="btn-ghost mt-6 w-full flex items-center justify-center gap-2 group-hover:bg-accent-grad group-hover:text-black group-hover:border-transparent transition-all duration-300">
                      <MessageCircle className="h-4 w-4" />
                      S'inscrire
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-muted font-medium">Aucune activité disponible pour le moment.</div>
        )}

        {/* Toggle Grid Button */}
        {data.activities && data.activities.length > 0 && (
          <div className="text-center mt-12 relative z-10">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className="btn-primary !px-6 !py-3 inline-flex items-center gap-2 hover:scale-[1.02] transition-all shadow-glow"
            >
              {showGrid ? "Masquer la galerie" : "Afficher toutes les activités"}
              <ArrowRight className={`h-4 w-4 transition-transform duration-300 ${showGrid ? 'rotate-90' : ''}`} />
            </button>
          </div>
        )}

        {/* Expandable Static Grid */}
        <AnimatePresence>
          {showGrid && data.activities && data.activities.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="max-w-6xl mx-auto px-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-16 pb-6">
                {data.activities.map((a) => (
                  <motion.div 
                    key={a.id} 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="card group overflow-hidden bg-surface-2/40 backdrop-blur-md border border-line/10 hover:border-accent/40 transition-all duration-300 hover:shadow-glow"
                  >
                    <div className="h-48 relative overflow-hidden" style={{ background: activityBg(a.image) }}>
                      <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent opacity-95 transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute top-4 left-4 z-10">
                        <span className="chip !bg-black/70 !text-white backdrop-blur border-white/10 uppercase tracking-widest text-[9px] font-bold">Activité</span>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-display text-lg sm:text-xl font-bold group-hover:text-accent transition-colors duration-300">{a.name}</h3>
                      <p className="text-muted text-xs sm:text-sm mt-2 line-clamp-3 leading-relaxed">{a.description}</p>
                      <button onClick={whatsapp} className="btn-ghost mt-6 w-full flex items-center justify-center gap-2 group-hover:bg-accent-grad group-hover:text-black group-hover:border-transparent transition-all duration-300">
                        <MessageCircle className="h-4 w-4" />
                        S'inscrire
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Contact Section */}
      <section className="max-w-6xl mx-auto px-5 py-24 relative z-10">
        <div className="absolute -left-16 -bottom-16 h-72 w-72 rounded-full bg-accent-strong/5 blur-3xl pointer-events-none" />
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-accent-soft/5 blur-3xl pointer-events-none" />
        
        <div className="card p-8 sm:p-16 relative overflow-hidden bg-surface-2/20 backdrop-blur-lg border border-line/10 rounded-3xl shadow-soft">
          {/* Decorative grid pattern inside card */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
          
          <div className="relative grid lg:grid-cols-2 gap-12 items-center z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-strong/10 border border-accent-strong/20 mb-4">
                <span className="text-xs font-extrabold uppercase tracking-wider text-accent-strong">Une question ?</span>
              </div>
              <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">Contactez-nous</h2>
              <p className="text-muted mt-4 text-base leading-relaxed font-medium">
                Rejoignez la grande famille du {data.club.name}. Notre équipe est à votre écoute pour toute demande d'inscription, partenariat ou information générale.
              </p>
              
              <div className="mt-8 space-y-4">
                <a href={`tel:${c.phone}`} className="flex items-center gap-4 p-3 rounded-xl bg-surface-2/30 hover:bg-surface-2/60 border border-line/5 hover:border-accent/30 text-fg hover:text-accent transition-all duration-300 group">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-accent group-hover:scale-105 transition-transform"><Phone className="h-5 w-5" /></span>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-extrabold text-muted tracking-wider">Téléphone</span>
                    <span className="text-sm sm:text-base font-semibold">{c.phone}</span>
                  </div>
                </a>
                
                <a href={`mailto:${c.email}`} className="flex items-center gap-4 p-3 rounded-xl bg-surface-2/30 hover:bg-surface-2/60 border border-line/5 hover:border-accent/30 text-fg hover:text-accent transition-all duration-300 group">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent-soft/10 text-accent-soft group-hover:scale-105 transition-transform"><Mail className="h-5 w-5" /></span>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-extrabold text-muted tracking-wider">Email</span>
                    <span className="text-sm sm:text-base font-semibold">{c.email}</span>
                  </div>
                </a>
                
                <a href={c.map} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-3 rounded-xl bg-surface-2/30 hover:bg-surface-2/60 border border-line/5 hover:border-accent/30 text-fg hover:text-accent transition-all duration-300 group">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent-strong/10 text-accent-strong group-hover:scale-105 transition-transform"><MapPin className="h-5 w-5" /></span>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-extrabold text-muted tracking-wider">Adresse</span>
                    <span className="text-sm sm:text-base font-semibold text-left">{data.club.address}</span>
                  </div>
                </a>
              </div>
              
              <div className="flex flex-wrap gap-2.5 mt-8">
                {[['Facebook', c.facebook], ['Instagram', c.instagram], ['TikTok', c.tiktok]].map(([n, url]) => (
                  url ? (
                    <a key={n} href={url} target="_blank" rel="noreferrer" className="btn-ghost !px-4 !py-2.5 text-xs font-bold hover:shadow-soft flex items-center gap-1.5 hover:border-accent-soft/40" title={n}>
                      <Share2 className="h-3.5 w-3.5" />{n}
                    </a>
                  ) : null
                ))}
              </div>
            </div>
            
            {/* Quick Action Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={call} className="group p-8 flex flex-col items-center gap-4 text-center rounded-2xl bg-surface-2/40 border border-line/5 hover:border-accent/40 transition-all duration-500 hover:shadow-glow relative overflow-hidden">
                <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent-grad text-black shadow-glow group-hover:scale-110 transition-transform"><Phone className="h-7 w-7" /></span>
                <div className="relative z-10">
                  <span className="block font-black text-lg tracking-tight">Appeler</span>
                  <span className="block text-xs text-muted font-semibold mt-1">Ligne directe</span>
                </div>
              </button>
              
              <button onClick={whatsapp} className="group p-8 flex flex-col items-center gap-4 text-center rounded-2xl bg-surface-2/40 border border-line/5 hover:border-accent-strong/40 transition-all duration-500 hover:shadow-glow relative overflow-hidden">
                <div className="absolute inset-0 bg-accent-strong/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-success/20 text-success border border-success/30 group-hover:scale-110 transition-transform"><MessageCircle className="h-7 w-7" /></span>
                <div className="relative z-10">
                  <span className="block font-black text-lg tracking-tight text-success">WhatsApp</span>
                  <span className="block text-xs text-muted font-semibold mt-1">Chat instantané</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line/10 py-12 text-center text-sm text-muted bg-surface/10 relative z-10">
        <div className="flex items-center gap-2.5 justify-center mb-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent-grad text-black shadow-glow overflow-hidden">
            {data.club.logo ? (
              <img src={data.club.logo} alt="logo" className="h-full w-full object-cover" />
            ) : (
              <Trophy className="h-4 w-4" />
            )}
          </div>
          <span className="font-display font-black text-fg uppercase tracking-tight">{data.club.name}</span>
        </div>
        <p className="text-xs font-semibold">© {new Date().getFullYear()} {data.club.name}. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
