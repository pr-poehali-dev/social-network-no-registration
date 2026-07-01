import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

type Reactions = Record<string, number>;

interface Post {
  id: number;
  author: string;
  handle: string;
  avatar: string;
  time: string;
  text: string;
  image?: string;
  liked: boolean;
  likes: number;
  reactions: Reactions;
  myReaction?: string;
}

interface UserProfile {
  name: string;
  handle: string;
  avatar: string;
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

interface Friend {
  name: string;
  handle: string;
  avatar: string;
  status: 'friend' | 'request';
  mutual: number;
}

// --- Onboarding Screen ---
const OnboardingScreen = ({ onDone }: { onDone: (profile: UserProfile) => void }) => {
  const [step, setStep] = useState<'name' | 'avatar'>('name');
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');

  const handleNameNext = () => {
    if (!name.trim()) return;
    setStep('avatar');
  };

  const handleFinish = () => {
    if (!selectedAvatar) return;
    const handle = '@' + name.trim().toLowerCase().replace(/\s+/g, '_');
    onDone({ name: name.trim(), handle, avatar: selectedAvatar });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <h1 className="font-display text-4xl font-extrabold mb-2 story-link">nebula</h1>
      <p className="text-muted-foreground text-sm mb-10">соцсеть без регистрации</p>

      <div className="w-full max-w-sm animate-fade-up">
        {step === 'name' && (
          <div className="rounded-3xl border border-border bg-card p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="font-display text-xl font-bold">Как тебя зовут?</h2>
              <p className="text-sm text-muted-foreground">Это имя увидят другие пользователи</p>
            </div>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNameNext()}
              placeholder="Твоё имя или никнейм"
              maxLength={30}
              className="w-full bg-secondary rounded-2xl px-4 py-3 text-base outline-none border border-border focus:border-primary transition-colors placeholder:text-muted-foreground"
            />
            <Button
              onClick={handleNameNext}
              disabled={!name.trim()}
              className="w-full rounded-full font-semibold h-12 disabled:opacity-40"
            >
              Далее
            </Button>
          </div>
        )}

        {step === 'avatar' && (
          <div className="rounded-3xl border border-border bg-card p-8 space-y-6">
            <div className="space-y-1">
              <button onClick={() => setStep('name')} className="text-muted-foreground text-sm flex items-center gap-1 mb-3 hover:text-foreground transition-colors">
                <Icon name="ChevronLeft" size={16} /> Назад
              </button>
              <h2 className="font-display text-xl font-bold">Выбери аватар</h2>
              <p className="text-sm text-muted-foreground">Можно сменить позже в профиле</p>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {AVATAR_OPTIONS.map((url) => (
                <button
                  key={url}
                  onClick={() => setSelectedAvatar(url)}
                  className={`relative rounded-2xl overflow-hidden transition-all ${
                    selectedAvatar === url
                      ? 'ring-2 ring-accent scale-105'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt="" className="w-full aspect-square object-cover" />
                  {selectedAvatar === url && (
                    <div className="absolute inset-0 flex items-center justify-center bg-accent/20">
                      <Icon name="Check" size={20} className="text-accent" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <Button
              onClick={handleFinish}
              disabled={!selectedAvatar}
              className="w-full rounded-full font-semibold h-12 disabled:opacity-40"
            >
              Войти в nebula 🚀
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App ---
const Index = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tab, setTab] = useState<'feed' | 'search' | 'friends' | 'profile'>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [openReactions, setOpenReactions] = useState<number | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);

  // Restore from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('nebula_user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const handleOnboarding = (profile: UserProfile) => {
    localStorage.setItem('nebula_user', JSON.stringify(profile));
    setUser(profile);
  };

  const acceptFriend = (handle: string) => {
    setFriends((prev) => prev.map((f) => (f.handle === handle ? { ...f, status: 'friend' } : f)));
  };
  const removeFriend = (handle: string) => {
    setFriends((prev) => prev.filter((f) => f.handle !== handle));
  };

  const toggleLike = (id: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p,
      ),
    );
  };

  const setReaction = (id: number, emoji: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const reactions = { ...p.reactions };
        if (p.myReaction) reactions[p.myReaction] = Math.max(0, (reactions[p.myReaction] || 1) - 1);
        let myReaction: string | undefined = emoji;
        if (p.myReaction === emoji) {
          myReaction = undefined;
        } else {
          reactions[emoji] = (reactions[emoji] || 0) + 1;
        }
        Object.keys(reactions).forEach((k) => reactions[k] <= 0 && delete reactions[k]);
        return { ...p, reactions, myReaction };
      }),
    );
    setOpenReactions(null);
  };

  const publish = () => {
    if (!draft.trim() || !user) return;
    setPosts((prev) => [
      {
        id: Date.now(),
        author: user.name,
        handle: user.handle,
        avatar: user.avatar,
        time: 'сейчас',
        text: draft.trim(),
        liked: false,
        likes: 0,
        reactions: {},
      },
      ...prev,
    ]);
    setDraft('');
  };

  const filtered = query
    ? posts.filter(
        (p) =>
          p.text.toLowerCase().includes(query.toLowerCase()) ||
          p.author.toLowerCase().includes(query.toLowerCase()) ||
          p.handle.toLowerCase().includes(query.toLowerCase()),
      )
    : posts;

  if (!user) return <OnboardingScreen onDone={handleOnboarding} />;

  return (
    <div className="min-h-screen text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-border">
        <div className="max-w-2xl mx-auto px-5 h-16 flex items-center justify-between">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            <span className="story-link">nebula</span>
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon name="Bell" size={20} />
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
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Что нового во вселенной?"
                    className="resize-none border-0 bg-transparent px-0 text-base focus-visible:ring-0 min-h-[52px]"
                  />
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-3 text-muted-foreground">
                      <Icon name="Image" size={20} className="cursor-pointer hover:text-accent transition-colors" />
                      <Icon name="Smile" size={20} className="cursor-pointer hover:text-accent transition-colors" />
                      <Icon name="MapPin" size={20} className="cursor-pointer hover:text-accent transition-colors" />
                    </div>
                    <Button
                      onClick={publish}
                      disabled={!draft.trim()}
                      className="rounded-full font-semibold px-6 disabled:opacity-40"
                    >
                      Опубликовать
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {posts.length === 0 && (
              <div className="text-center py-16 text-muted-foreground animate-fade-up">
                <p className="text-4xl mb-3">🌌</p>
                <p className="font-semibold">Лента пока пуста</p>
                <p className="text-sm mt-1">Будь первым — напиши что-нибудь!</p>
              </div>
            )}

            {filtered.map((post, i) => (
              <PostCard
                key={post.id}
                post={post}
                index={i}
                onLike={toggleLike}
                onReaction={setReaction}
                openReactions={openReactions}
                setOpenReactions={setOpenReactions}
              />
            ))}
          </div>
        )}

        {/* SEARCH */}
        {tab === 'search' && (
          <div className="space-y-5 animate-fade-up">
            <div className="flex items-center gap-3 rounded-full border border-border bg-card px-5 py-3">
              <Icon name="Search" size={20} className="text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск постов"
                className="flex-1 bg-transparent outline-none text-base"
              />
              {query && (
                <Icon name="X" size={18} className="text-muted-foreground cursor-pointer" onClick={() => setQuery('')} />
              )}
            </div>

            {!query && (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-semibold">Введи запрос</p>
                <p className="text-sm mt-1">Поиск по постам и авторам</p>
              </div>
            )}

            {query && filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-10">Ничего не найдено по «{query}»</p>
            )}

            {query && filtered.map((post, i) => (
              <PostCard
                key={post.id}
                post={post}
                index={i}
                onLike={toggleLike}
                onReaction={setReaction}
                openReactions={openReactions}
                setOpenReactions={setOpenReactions}
              />
            ))}
          </div>
        )}

        {/* FRIENDS */}
        {tab === 'friends' && (
          <div className="space-y-6 animate-fade-up">
            {friends.some((f) => f.status === 'request') && (
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
                  Заявки · {friends.filter((f) => f.status === 'request').length}
                </p>
                <div className="space-y-2">
                  {friends.filter((f) => f.status === 'request').map((f) => (
                    <div key={f.handle} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={f.avatar} />
                          <AvatarFallback>{f.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold leading-tight">{f.name}</p>
                          <p className="text-sm text-muted-foreground">{f.mutual} общих друзей</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => acceptFriend(f.handle)} className="rounded-full font-semibold h-9 px-4">Принять</Button>
                        <Button onClick={() => removeFriend(f.handle)} variant="secondary" className="rounded-full font-semibold h-9 px-3">
                          <Icon name="X" size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
                Друзья · {friends.filter((f) => f.status === 'friend').length}
              </p>
              {friends.filter((f) => f.status === 'friend').length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="text-4xl mb-3">👥</p>
                  <p className="font-semibold">Пока нет друзей</p>
                  <p className="text-sm mt-1">Найди людей через поиск</p>
                </div>
              )}
              <div className="space-y-2">
                {friends.filter((f) => f.status === 'friend').map((f) => (
                  <div key={f.handle} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={f.avatar} />
                        <AvatarFallback>{f.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold leading-tight">{f.name}</p>
                        <p className="text-sm text-muted-foreground">{f.handle} · {f.mutual} общих</p>
                      </div>
                    </div>
                    <Button onClick={() => removeFriend(f.handle)} variant="secondary" className="rounded-full font-semibold h-9 px-4">
                      Удалить
                    </Button>
                  </div>
                ))}
              </div>
            </div>
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
                  <Button
                    variant="secondary"
                    className="rounded-full font-semibold"
                    onClick={() => {
                      localStorage.removeItem('nebula_user');
                      setUser(null);
                    }}
                  >
                    Выйти
                  </Button>
                </div>
                <div className="mt-4 flex gap-6 text-sm">
                  <span><b className="font-display">{posts.filter((p) => p.handle === user.handle).length}</b> <span className="text-muted-foreground">постов</span></span>
                  <span><b className="font-display">{friends.filter((f) => f.status === 'friend').length}</b> <span className="text-muted-foreground">друзей</span></span>
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
                <PostCard
                  key={post.id}
                  post={post}
                  index={i}
                  onLike={toggleLike}
                  onReaction={setReaction}
                  openReactions={openReactions}
                  setOpenReactions={setOpenReactions}
                />
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
          <NavItem icon="Users" label="Друзья" active={tab === 'friends'} onClick={() => setTab('friends')} />
          <NavItem icon="User" label="Профиль" active={tab === 'profile'} onClick={() => setTab('profile')} />
        </div>
      </nav>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-0.5 transition-colors ${active ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
  >
    <Icon name={icon} size={22} />
    <span className="text-[11px] font-medium">{label}</span>
  </button>
);

const PostCard = ({
  post,
  index,
  onLike,
  onReaction,
  openReactions,
  setOpenReactions,
}: {
  post: Post;
  index: number;
  onLike: (id: number) => void;
  onReaction: (id: number, emoji: string) => void;
  openReactions: number | null;
  setOpenReactions: (id: number | null) => void;
}) => {
  const totalReactions = Object.values(post.reactions).reduce((a, b) => a + b, 0);
  return (
    <article
      className="rounded-3xl border border-border bg-card p-4 animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
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
                <button
                  key={emoji}
                  onClick={() => onReaction(post.id, emoji)}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm border transition-colors ${
                    post.myReaction === emoji
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-border bg-secondary text-foreground hover:bg-muted'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="text-xs font-medium">{count}</span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-6 text-muted-foreground relative">
            <button
              onClick={() => onLike(post.id)}
              className={`flex items-center gap-1.5 transition-colors ${post.liked ? 'text-destructive' : 'hover:text-destructive'}`}
            >
              <Icon name="Heart" size={19} className={post.liked ? 'fill-current animate-pop' : ''} />
              <span className="text-sm">{post.likes}</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setOpenReactions(openReactions === post.id ? null : post.id)}
                className="flex items-center gap-1.5 hover:text-accent transition-colors"
              >
                <Icon name="Smile" size={19} />
                <span className="text-sm">Реакция</span>
              </button>
              {openReactions === post.id && (
                <div className="absolute bottom-9 left-0 z-20 flex gap-1 rounded-full glass border border-border p-1.5 animate-fade-up shadow-xl">
                  {REACTION_SET.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onReaction(post.id, emoji)}
                      className="text-xl hover:scale-125 transition-transform px-1"
                    >
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
