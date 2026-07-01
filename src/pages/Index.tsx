import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const USERS_URL = 'https://functions.poehali.dev/b00b6a61-5be3-4ba5-9110-330d09861bc9';
const POSTS_URL = 'https://functions.poehali.dev/bbb88fd0-5d54-4a87-827b-4d001c9c7e4e';
const NOTIF_URL = 'https://functions.poehali.dev/b5ccb2a4-042d-4e75-b901-e7769954d21d';

type Reactions = Record<string, number>;

interface Post {
  id: string;
  author: string;
  handle: string;
  avatar: string;
  time: string;
  text: string;
  image?: string;
  liked: boolean;
  likes: number;
  reactions: Reactions;
  myReaction?: string | null;
}

interface UserProfile {
  id: string;
  name: string;
  handle: string;
  avatar: string;
}

interface Notification {
  id: string;
  type: string;
  read: boolean;
  time: string;
  fromName: string;
  fromAvatar: string;
  fromHandle: string;
  postText: string;
}

const REACTION_SET = ['🔥', '😂', '😍', '🤯', '👏'];

const AVATAR_OPTIONS = [
  'https://i.pravatar.cc/150?img=1',
  'https://i.pravatar.cc/150?img=3',
  'https://i.pravatar.cc/150?img=5',
  'https://i.pravatar.cc/150?img=7',
  'https://i.pravatar.cc/150?img=9',
  'https://i.pravatar.cc/150?img=11',
  'https://i.pravatar.cc/150?img=20',
  'https://i.pravatar.cc/150?img=25',
  'https://i.pravatar.cc/150?img=30',
  'https://i.pravatar.cc/150?img=36',
  'https://i.pravatar.cc/150?img=44',
  'https://i.pravatar.cc/150?img=50',
];

// --- Onboarding ---
const OnboardingScreen = ({ onDone }: { onDone: (profile: UserProfile) => void }) => {
  const [step, setStep] = useState<'name' | 'avatar'>('name');
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFinish = async () => {
    if (!selectedAvatar) return;
    setLoading(true);
    setError('');
    const handle = '@' + name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-zа-яё0-9_]/gi, '');
    try {
      const res = await fetch(USERS_URL + '/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), handle, avatar: selectedAvatar }),
      });
      const raw = await res.json();
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!res.ok) throw new Error(data.error || 'Ошибка');
      onDone(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <h1 className="font-display text-4xl font-extrabold mb-2 story-link">nebula</h1>
      <p className="text-muted-foreground text-sm mb-10">соцсеть без регистрации</p>
      <div className="w-full max-w-sm animate-fade-up">
        {step === 'name' && (
          <div className="rounded-3xl border border-border bg-card p-8 space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold">Как тебя зовут?</h2>
              <p className="text-sm text-muted-foreground mt-1">Это имя увидят другие пользователи</p>
            </div>
            <input
              autoFocus value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep('avatar')}
              placeholder="Твоё имя или никнейм" maxLength={30}
              className="w-full bg-secondary rounded-2xl px-4 py-3 text-base outline-none border border-border focus:border-primary transition-colors placeholder:text-muted-foreground"
            />
            <Button onClick={() => setStep('avatar')} disabled={!name.trim()} className="w-full rounded-full font-semibold h-12 disabled:opacity-40">
              Далее
            </Button>
          </div>
        )}
        {step === 'avatar' && (
          <div className="rounded-3xl border border-border bg-card p-8 space-y-6">
            <div>
              <button onClick={() => setStep('name')} className="text-muted-foreground text-sm flex items-center gap-1 mb-3 hover:text-foreground transition-colors">
                <Icon name="ChevronLeft" size={16} /> Назад
              </button>
              <h2 className="font-display text-xl font-bold">Выбери аватар</h2>
              <p className="text-sm text-muted-foreground mt-1">Можно сменить позже в профиле</p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {AVATAR_OPTIONS.map((url) => (
                <button key={url} onClick={() => setSelectedAvatar(url)}
                  className={`relative rounded-2xl overflow-hidden transition-all ${selectedAvatar === url ? 'ring-2 ring-accent scale-105' : 'opacity-70 hover:opacity-100'}`}>
                  <img src={url} alt="" className="w-full aspect-square object-cover" />
                  {selectedAvatar === url && (
                    <div className="absolute inset-0 flex items-center justify-center bg-accent/20">
                      <Icon name="Check" size={20} className="text-accent" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            {error && <p className="text-destructive text-sm text-center">{error}</p>}
            <Button onClick={handleFinish} disabled={!selectedAvatar || loading} className="w-full rounded-full font-semibold h-12 disabled:opacity-40">
              {loading ? 'Входим...' : 'Войти в nebula 🚀'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Notifications Panel ---
const NotificationsPanel = ({ user, onClose }: { user: UserProfile; onClose: () => void }) => {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${NOTIF_URL}/?user_id=${user.id}`)
      .then((r) => r.json())
      .then((raw) => {
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        setNotifs(data.notifications || []);
        // пометить как прочитанные
        fetch(`${NOTIF_URL}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id }),
        });
      })
      .finally(() => setLoading(false));
  }, [user.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative m-4 mt-16 w-full max-w-sm rounded-3xl border border-border bg-card shadow-2xl animate-fade-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display font-bold text-base">Уведомления</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Icon name="Loader" size={24} className="animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && notifs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-3xl mb-2">🔔</p>
              <p className="text-sm">Пока тихо</p>
            </div>
          )}
          {notifs.map((n) => (
            <div key={n.id} className={`flex gap-3 px-5 py-4 border-b border-border last:border-0 ${!n.read ? 'bg-primary/5' : ''}`}>
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={n.fromAvatar} />
                <AvatarFallback>{n.fromName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">
                  <span className="font-semibold">{n.fromName}</span>
                  {' '}{n.type === 'like' ? '❤️ лайкнул(а)' : '😊 отреагировал(а) на'} твой пост
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">«{n.postText}»</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-accent mt-1 shrink-0" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Main App ---
const Index = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tab, setTab] = useState<'feed' | 'search' | 'profile'>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [openReactions, setOpenReactions] = useState<string | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('nebula_user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const fetchPosts = useCallback(async (userId: string) => {
    setLoadingPosts(true);
    try {
      const res = await fetch(`${POSTS_URL}/?user_id=${userId}`);
      const raw = await res.json();
      setPosts(typeof raw === 'string' ? JSON.parse(raw) : raw);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  const fetchUnread = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`${NOTIF_URL}/?user_id=${userId}`);
      const raw = await res.json();
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      setUnread(data.unread || 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchPosts(user.id);
    fetchUnread(user.id);
    const interval = setInterval(() => {
      fetchPosts(user.id);
      fetchUnread(user.id);
    }, 10000);
    return () => clearInterval(interval);
  }, [user, fetchPosts, fetchUnread]);

  const handleOnboarding = (profile: UserProfile) => {
    localStorage.setItem('nebula_user', JSON.stringify(profile));
    setUser(profile);
  };

  const toggleLike = async (id: string) => {
    if (!user) return;
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p));
    await fetch(`${POSTS_URL}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, post_id: id }),
    });
  };

  const setReaction = async (id: string, emoji: string) => {
    if (!user) return;
    setPosts((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const reactions = { ...p.reactions };
      if (p.myReaction) reactions[p.myReaction] = Math.max(0, (reactions[p.myReaction] || 1) - 1);
      const same = p.myReaction === emoji;
      if (!same) reactions[emoji] = (reactions[emoji] || 0) + 1;
      Object.keys(reactions).forEach((k) => reactions[k] <= 0 && delete reactions[k]);
      return { ...p, reactions, myReaction: same ? null : emoji };
    }));
    setOpenReactions(null);
    await fetch(`${POSTS_URL}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, post_id: id, emoji }),
    });
  };

  const publish = async () => {
    if (!draft.trim() || !user || publishing) return;
    setPublishing(true);
    const text = draft.trim();
    setDraft('');
    await fetch(`${POSTS_URL}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, text }),
    });
    await fetchPosts(user.id);
    setPublishing(false);
  };

  const filtered = query
    ? posts.filter((p) =>
        p.text.toLowerCase().includes(query.toLowerCase()) ||
        p.author.toLowerCase().includes(query.toLowerCase()) ||
        p.handle.toLowerCase().includes(query.toLowerCase()))
    : posts;

  if (!user) return <OnboardingScreen onDone={handleOnboarding} />;

  return (
    <div className="min-h-screen text-foreground">
      {/* Notifications panel */}
      {showNotifs && (
        <NotificationsPanel user={user} onClose={() => { setShowNotifs(false); setUnread(0); }} />
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-border">
        <div className="max-w-2xl mx-auto px-5 h-16 flex items-center justify-between">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            <span className="story-link">nebula</span>
          </h1>
          <div className="flex items-center gap-3">
            {/* Bell */}
            <button
              onClick={() => setShowNotifs(true)}
              className="relative text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon name="Bell" size={22} />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-accent text-[10px] font-bold text-accent-foreground flex items-center justify-center px-1 animate-pop">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            <Avatar className="h-8 w-8 ring-2 ring-primary/50">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{user.name[0]}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 pb-32 pt-6">
        {/* FEED */}
        {tab === 'feed' && (
          <div className="space-y-5">
            <div className="rounded-3xl border border-border bg-card p-4 animate-fade-up">
              <div className="flex gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    value={draft} onChange={(e) => setDraft(e.target.value)}
                    placeholder="Что нового во вселенной?"
                    className="resize-none border-0 bg-transparent px-0 text-base focus-visible:ring-0 min-h-[52px]"
                  />
                  <div className="flex items-center justify-between pt-2">
                    <Icon name="Smile" size={20} className="text-muted-foreground cursor-pointer hover:text-accent transition-colors" />
                    <Button onClick={publish} disabled={!draft.trim() || publishing} className="rounded-full font-semibold px-6 disabled:opacity-40">
                      {publishing ? 'Публикую...' : 'Опубликовать'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {loadingPosts && posts.length === 0 && (
              <div className="text-center py-16 text-muted-foreground animate-fade-up">
                <Icon name="Loader" size={32} className="animate-spin mx-auto mb-3" />
                <p>Загружаю ленту...</p>
              </div>
            )}
            {!loadingPosts && posts.length === 0 && (
              <div className="text-center py-16 text-muted-foreground animate-fade-up">
                <p className="text-4xl mb-3">🌌</p>
                <p className="font-semibold">Лента пока пуста</p>
                <p className="text-sm mt-1">Будь первым — напиши что-нибудь!</p>
              </div>
            )}
            {filtered.map((post, i) => (
              <PostCard key={post.id} post={post} index={i}
                onLike={toggleLike} onReaction={setReaction}
                openReactions={openReactions} setOpenReactions={setOpenReactions} />
            ))}
          </div>
        )}

        {/* SEARCH */}
        {tab === 'search' && (
          <div className="space-y-5 animate-fade-up">
            <div className="flex items-center gap-3 rounded-full border border-border bg-card px-5 py-3">
              <Icon name="Search" size={20} className="text-muted-foreground" />
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск постов и авторов"
                className="flex-1 bg-transparent outline-none text-base" />
              {query && <Icon name="X" size={18} className="text-muted-foreground cursor-pointer" onClick={() => setQuery('')} />}
            </div>
            {!query && (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-semibold">Введи запрос</p>
                <p className="text-sm mt-1">Поиск по постам и авторам</p>
              </div>
            )}
            {query && filtered.length === 0 && <p className="text-center text-muted-foreground py-10">Ничего не найдено по «{query}»</p>}
            {query && filtered.map((post, i) => (
              <PostCard key={post.id} post={post} index={i}
                onLike={toggleLike} onReaction={setReaction}
                openReactions={openReactions} setOpenReactions={setOpenReactions} />
            ))}
          </div>
        )}

        {/* PROFILE */}
        {tab === 'profile' && (
          <div className="animate-fade-up">
            <div className="relative rounded-3xl overflow-hidden border border-border">
              <div className="h-32 bg-gradient-to-r from-primary/60 via-accent/40 to-primary/60" />
              <div className="px-5 pb-5 bg-card">
                <Avatar className="h-24 w-24 -mt-12 ring-4 ring-card glow">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
                <div className="mt-3 flex items-start justify-between">
                  <div>
                    <h2 className="font-display text-xl font-bold">{user.name}</h2>
                    <p className="text-muted-foreground">{user.handle}</p>
                  </div>
                  <Button variant="secondary" className="rounded-full font-semibold"
                    onClick={() => { localStorage.removeItem('nebula_user'); setUser(null); }}>
                    Выйти
                  </Button>
                </div>
                <div className="mt-4 flex gap-6 text-sm">
                  <span><b className="font-display">{posts.filter((p) => p.handle === user.handle).length}</b> <span className="text-muted-foreground">постов</span></span>
                </div>
              </div>
            </div>
            <p className="text-sm font-semibold text-muted-foreground mt-6 mb-3 px-1">Мои посты</p>
            {posts.filter((p) => p.handle === user.handle).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-4xl mb-3">✍️</p>
                <p className="font-semibold">Постов пока нет</p>
                <p className="text-sm mt-1">Напиши что-нибудь в ленте!</p>
              </div>
            )}
            <div className="space-y-5">
              {posts.filter((p) => p.handle === user.handle).map((post, i) => (
                <PostCard key={post.id} post={post} index={i}
                  onLike={toggleLike} onReaction={setReaction}
                  openReactions={openReactions} setOpenReactions={setOpenReactions} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 glass border-t border-border">
        <div className="max-w-2xl mx-auto px-8 h-16 flex items-center justify-between">
          <NavItem icon="Home" label="Лента" active={tab === 'feed'} onClick={() => setTab('feed')} />
          <NavItem icon="Search" label="Поиск" active={tab === 'search'} onClick={() => setTab('search')} />
          <NavItem icon="User" label="Профиль" active={tab === 'profile'} onClick={() => setTab('profile')} />
        </div>
      </nav>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) => (
  <button onClick={onClick}
    className={`flex flex-col items-center gap-0.5 transition-colors ${active ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}>
    <Icon name={icon} size={22} />
    <span className="text-[11px] font-medium">{label}</span>
  </button>
);

const PostCard = ({ post, index, onLike, onReaction, openReactions, setOpenReactions }: {
  post: Post; index: number;
  onLike: (id: string) => void;
  onReaction: (id: string, emoji: string) => void;
  openReactions: string | null;
  setOpenReactions: (id: string | null) => void;
}) => {
  const totalReactions = Object.values(post.reactions).reduce((a, b) => a + b, 0);
  return (
    <article className="rounded-3xl border border-border bg-card p-4 animate-fade-up" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex gap-3">
        <Avatar className="h-11 w-11 shrink-0">
          <AvatarImage src={post.avatar} />
          <AvatarFallback>{post.author[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-semibold">{post.author}</span>
            <span className="text-muted-foreground">{post.handle}</span>
            <span className="text-muted-foreground">· {post.time}</span>
          </div>
          <p className="mt-1 text-[15px] leading-relaxed">{post.text}</p>
          {post.image && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-border">
              <img src={post.image} alt="" className="w-full object-cover max-h-80" />
            </div>
          )}
          {totalReactions > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(post.reactions).map(([emoji, count]) => (
                <button key={emoji} onClick={() => onReaction(post.id, emoji)}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm border transition-colors ${
                    post.myReaction === emoji ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-secondary text-foreground hover:bg-muted'}`}>
                  <span>{emoji}</span>
                  <span className="text-xs font-medium">{count}</span>
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center gap-6 text-muted-foreground relative">
            <button onClick={() => onLike(post.id)}
              className={`flex items-center gap-1.5 transition-colors ${post.liked ? 'text-destructive' : 'hover:text-destructive'}`}>
              <Icon name="Heart" size={19} className={post.liked ? 'fill-current animate-pop' : ''} />
              <span className="text-sm">{post.likes}</span>
            </button>
            <div className="relative">
              <button onClick={() => setOpenReactions(openReactions === post.id ? null : post.id)}
                className="flex items-center gap-1.5 hover:text-accent transition-colors">
                <Icon name="Smile" size={19} />
                <span className="text-sm">Реакция</span>
              </button>
              {openReactions === post.id && (
                <div className="absolute bottom-9 left-0 z-20 flex gap-1 rounded-full glass border border-border p-1.5 animate-fade-up shadow-xl">
                  {REACTION_SET.map((emoji) => (
                    <button key={emoji} onClick={() => onReaction(post.id, emoji)} className="text-xl hover:scale-125 transition-transform px-1">
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="flex items-center gap-1.5 hover:text-accent transition-colors ml-auto">
              <Icon name="Share2" size={19} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default Index;
