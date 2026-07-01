import { useState } from 'react';
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

const REACTION_SET = ['🔥', '😂', '😍', '🤯', '👏'];

const initialPosts: Post[] = [
  {
    id: 1,
    author: 'Нова Стар',
    handle: '@nova',
    avatar: 'https://i.pravatar.cc/150?img=47',
    time: '2 мин',
    text: 'Запустила свой первый пет-проект в открытый космос идей. Ощущение — будто вышла в открытый космос без скафандра 🚀',
    image: 'https://cdn.poehali.dev/projects/efc5c180-a6af-4d45-a055-747a0f1efc1c/files/444643e2-558e-4196-bc70-4492eb72ea53.jpg',
    liked: false,
    likes: 128,
    reactions: { '🔥': 24, '😍': 12 },
  },
  {
    id: 2,
    author: 'Марк Орбита',
    handle: '@orbit',
    avatar: 'https://i.pravatar.cc/150?img=12',
    time: '18 мин',
    text: 'Ночь. Кофе. Код. Идеальное сочетание для тех, кто строит будущее ✨',
    image: 'https://cdn.poehali.dev/projects/efc5c180-a6af-4d45-a055-747a0f1efc1c/files/b8eda316-a833-45d2-9a84-ad5bc06ecee5.jpg',
    liked: true,
    likes: 341,
    reactions: { '🔥': 56, '👏': 30, '🤯': 8 },
    myReaction: '🔥',
  },
  {
    id: 3,
    author: 'Лия Ветер',
    handle: '@lia',
    avatar: 'https://i.pravatar.cc/150?img=32',
    time: '1 ч',
    text: 'Соцсеть без регистрации — это как вечеринка, куда можно зайти сразу. Никаких паролей, только вайб 💫',
    liked: false,
    likes: 87,
    reactions: { '😂': 15 },
  },
];

const suggestions = [
  { name: 'Космо Дев', handle: '@cosmo', avatar: 'https://i.pravatar.cc/150?img=5' },
  { name: 'Айра Нуар', handle: '@aira', avatar: 'https://i.pravatar.cc/150?img=25' },
  { name: 'Тео Пульс', handle: '@teo', avatar: 'https://i.pravatar.cc/150?img=15' },
];

interface Friend {
  name: string;
  handle: string;
  avatar: string;
  status: 'friend' | 'request';
  mutual: number;
}

const initialFriends: Friend[] = [
  { name: 'Нова Стар', handle: '@nova', avatar: 'https://i.pravatar.cc/150?img=47', status: 'friend', mutual: 12 },
  { name: 'Марк Орбита', handle: '@orbit', avatar: 'https://i.pravatar.cc/150?img=12', status: 'friend', mutual: 8 },
  { name: 'Лия Ветер', handle: '@lia', avatar: 'https://i.pravatar.cc/150?img=32', status: 'friend', mutual: 5 },
  { name: 'Космо Дев', handle: '@cosmo', avatar: 'https://i.pravatar.cc/150?img=5', status: 'request', mutual: 3 },
  { name: 'Айра Нуар', handle: '@aira', avatar: 'https://i.pravatar.cc/150?img=25', status: 'request', mutual: 1 },
];

const Index = () => {
  const [tab, setTab] = useState<'feed' | 'search' | 'friends' | 'profile'>('feed');
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [openReactions, setOpenReactions] = useState<number | null>(null);
  const [friends, setFriends] = useState<Friend[]>(initialFriends);

  const acceptFriend = (handle: string) => {
    setFriends((prev) => prev.map((f) => (f.handle === handle ? { ...f, status: 'friend' } : f)));
  };
  const removeFriend = (handle: string) => {
    setFriends((prev) => prev.filter((f) => f.handle !== handle));
  };

  const toggleLike = (id: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
          : p,
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
    if (!draft.trim()) return;
    setPosts((prev) => [
      {
        id: Date.now(),
        author: 'Вы',
        handle: '@me',
        avatar: 'https://i.pravatar.cc/150?img=68',
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
              <AvatarImage src="https://i.pravatar.cc/150?img=68" />
              <AvatarFallback>Я</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 pb-32 pt-6">
        {/* FEED */}
        {tab === 'feed' && (
          <div className="space-y-5">
            {/* Composer */}
            <div className="rounded-3xl border border-border bg-card p-4 animate-fade-up">
              <div className="flex gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src="https://i.pravatar.cc/150?img=68" />
                  <AvatarFallback>Я</AvatarFallback>
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
                placeholder="Поиск людей и постов"
                className="flex-1 bg-transparent outline-none text-base"
              />
              {query && (
                <Icon name="X" size={18} className="text-muted-foreground cursor-pointer" onClick={() => setQuery('')} />
              )}
            </div>

            {!query && (
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">Кого почитать</p>
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <div key={s.handle} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={s.avatar} />
                          <AvatarFallback>{s.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold leading-tight">{s.name}</p>
                          <p className="text-sm text-muted-foreground">{s.handle}</p>
                        </div>
                      </div>
                      <Button variant="secondary" className="rounded-full font-semibold">Читать</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {query && (
              <div className="space-y-5">
                {filtered.length === 0 && (
                  <p className="text-center text-muted-foreground py-10">Ничего не найдено по «{query}»</p>
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
          </div>
        )}

        {/* FRIENDS */}
        {tab === 'friends' && (
          <div className="space-y-6 animate-fade-up">
            {friends.some((f) => f.status === 'request') && (
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
                  Заявки в друзья · {friends.filter((f) => f.status === 'request').length}
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
                Мои друзья · {friends.filter((f) => f.status === 'friend').length}
              </p>
              <div className="space-y-2">
                {friends.filter((f) => f.status === 'friend').length === 0 && (
                  <p className="text-center text-muted-foreground py-10">Пока нет друзей. Добавьте кого-нибудь!</p>
                )}
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
                  <AvatarImage src="https://i.pravatar.cc/150?img=68" />
                  <AvatarFallback>Я</AvatarFallback>
                </Avatar>
                <div className="mt-3 flex items-start justify-between">
                  <div>
                    <h2 className="font-display text-xl font-bold">Вы</h2>
                    <p className="text-muted-foreground">@me</p>
                  </div>
                  <Button variant="secondary" className="rounded-full font-semibold">Изменить</Button>
                </div>
                <p className="mt-3 text-sm leading-relaxed">
                  Исследую вселенную идей 🚀 Строю будущее по одному посту за раз.
                </p>
                <div className="mt-4 flex gap-6 text-sm">
                  <span><b className="font-display">142</b> <span className="text-muted-foreground">постов</span></span>
                  <span><b className="font-display">3.2K</b> <span className="text-muted-foreground">читателей</span></span>
                  <span><b className="font-display">318</b> <span className="text-muted-foreground">читаю</span></span>
                </div>
              </div>
            </div>

            <p className="text-sm font-semibold text-muted-foreground mt-6 mb-3 px-1">Мои посты</p>
            <div className="space-y-5">
              {posts.filter((p) => p.handle === '@me').length === 0 && (
                <p className="text-center text-muted-foreground py-10">Пока пусто. Опубликуйте первый пост в ленте!</p>
              )}
              {posts.filter((p) => p.handle === '@me').map((post, i) => (
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

          {/* Reaction chips */}
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

          {/* Actions */}
          <div className="mt-3 flex items-center gap-6 text-muted-foreground relative">
            <button
              onClick={() => onLike(post.id)}
              className={`flex items-center gap-1.5 transition-colors ${post.liked ? 'text-destructive' : 'hover:text-destructive'}`}
            >
              <Icon name={post.liked ? 'Heart' : 'Heart'} size={19} className={post.liked ? 'fill-current animate-pop' : ''} />
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