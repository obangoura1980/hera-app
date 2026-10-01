import { fetch as expoFetch } from 'expo/fetch';
export const DAILY_AFFIRMATIONS: string[] = [
  "I am worthy of all the abundance the universe has to offer.",
  "My dreams are valid and I have the power to make them real.",
  "I attract success, love, and joy into my life effortlessly.",
  "I am becoming the best version of myself every single day.",
  "Everything I need is already within me. I am whole.",
  "I am aligned with the energy of abundance and prosperity.",
  "My potential is limitless and my future is luminous.",
  "I radiate confidence, love, and positive energy.",
  "The universe conspires in my favor in every moment.",
  "I deserve the life of my dreams and I am worthy of it.",
  "I am powerful beyond measure and capable of anything.",
  "Abundance flows to me from multiple channels of grace.",
  "I trust the process of my journey and embrace each moment.",
  "I am a magnet for miracles and beautiful experiences.",
  "My mind is clear, my heart open, my path illuminated.",
];

export const AFFIRMATIONS_BY_CATEGORY: Record<string, string[]> = {
  career: [
    "I am a magnet for incredible career opportunities.",
    "My skills and talents are valued and rewarded abundantly.",
    "I am confidently advancing toward my professional dreams.",
    "Success and recognition naturally flow to me.",
    "I am the architect of my own career success story.",
    "Every challenge I face makes me a stronger professional.",
    "My work creates meaningful impact in the world.",
    "I attract mentors who elevate my path.",
  ],
  wealth: [
    "Money flows to me easily and abundantly.",
    "I am open to receiving wealth from infinite sources.",
    "My net worth increases every single day.",
    "Financial freedom is my natural state of being.",
    "I make wise decisions that multiply my wealth.",
    "Abundance is my birthright and I claim it fully.",
    "I am worthy of extraordinary financial success.",
    "Wealth and prosperity come to me with ease and grace.",
  ],
  confidence: [
    "I believe in myself fully and completely.",
    "I walk into every room knowing my worth.",
    "My voice matters and the world needs to hear it.",
    "I am secure in who I am and where I am going.",
    "I radiate confidence in everything I do.",
    "I embrace my unique gifts and share them boldly.",
    "I am enough, exactly as I am, right now.",
    "My confidence grows stronger with every passing day.",
  ],
  love: [
    "I am deeply loved and worthy of beautiful love.",
    "Love flows to me in all its magnificent forms.",
    "My heart is open to giving and receiving pure love.",
    "I attract relationships that honor and uplift my soul.",
    "I am a magnet for deep, meaningful connection.",
    "Love finds me in the most beautiful unexpected ways.",
    "I deserve a love that feels like coming home.",
    "The love I desire is already on its way to me.",
  ],
  health: [
    "My body is strong, vibrant, and full of vitality.",
    "I make choices that honor and nourish my health.",
    "Every cell in my body radiates health and energy.",
    "I am grateful for the incredible gift of my body.",
    "Healing energy flows through me constantly.",
    "My body knows how to heal and I trust that process.",
    "I deserve to feel amazing in my body every day.",
    "Vibrant health is my natural state of being.",
  ],
  family: [
    "My family is blessed, protected, and thriving.",
    "I cultivate deep, loving bonds with those I cherish.",
    "I create a home filled with love, peace, and joy.",
    "My family experiences abundance and happiness together.",
    "I am a source of strength and love for my family.",
    "Harmony and understanding flow through my family.",
    "My loved ones are safe, healthy, and deeply blessed.",
    "Together we grow stronger, wiser, and more connected.",
  ],
  business: [
    "My business is thriving beyond my expectations.",
    "I attract the perfect clients aligned with my mission.",
    "My business creates lasting value and transformation.",
    "Opportunities to expand my business find me naturally.",
    "I am a visionary leader who creates impact at scale.",
    "My business generates extraordinary wealth and freedom.",
    "I build systems that create sustainable success.",
    "My entrepreneurial vision is clear and powerful.",
  ],
  productivity: [
    "I accomplish meaningful work with focus and ease.",
    "I have unlimited energy for the things that matter most.",
    "I use my time with intention and wisdom.",
    "I complete my most important tasks with confidence.",
    "My mind is sharp, clear, and laser-focused.",
    "I create extraordinary results from consistent action.",
    "Every day I make progress toward my biggest goals.",
    "I am disciplined, motivated, and unstoppable.",
  ],
  happiness: [
    "Joy is my natural state of being.",
    "I choose happiness in every moment of every day.",
    "I radiate positive energy that uplifts everyone around me.",
    "My life is filled with beauty, laughter, and abundance.",
    "I find magic and wonder in the everyday moments.",
    "Happiness grows as I count my blessings with gratitude.",
    "I deserve to feel deeply fulfilled and joyful.",
    "Peace, love, and happiness are always available to me.",
  ],
};

type HeraIntent = 'manifestation' | 'motivation' | 'emotionalSupport' | 'goalsetting' | 'morningRoutine' | 'eveningReflection' | 'gratitude' | 'visualization' | 'limitingBeliefs' | 'affirmation' | 'greeting' | 'default';

const HERA_RESPONSES: Record<HeraIntent, string[]> = {
  greeting: [
    "Hello, beautiful soul. I've been waiting for you. What's on your heart today? 💜",
    "Welcome back. You showed up for yourself today, and that matters more than you know. What shall we explore?",
    "It's so wonderful to be with you. Every moment you invest in yourself creates ripples into your future. What's alive in you right now?",
  ],
  manifestation: [
    "Your desires are already making their way to you — the universe has received your order. 🌟\n\nPractice this today: close your eyes and feel as though you already have what you desire. Not the wanting of it — but the having. That feeling is your most powerful signal.\n\nWhat is it you're calling in? Let's get crystal clear.",
    "Manifestation is alignment practice. You align your thoughts, feelings, beliefs, and actions with your desired reality.\n\nThe universe responds to your dominant vibration. When you consistently feel like the person who already has what you want, you become magnetic.\n\nTell me: what are you ready to manifest? And do you believe you truly deserve it?",
    "You are always manifesting — the question is whether you're doing it consciously or by default. 💫\n\nYour most powerful tool is imagination combined with genuine emotion. See it. Feel it. Be it — before it physically arrives.\n\nWhat vision would fill you with pure joy just thinking about it?",
  ],
  motivation: [
    "Let me remind you of something important: you have already overcome things that once felt impossible. Your track record for getting through hard days? 100%. 🏆\n\nThe version of you who achieves your dreams isn't some distant person — it's you, in this moment, choosing to take the next step.\n\nWhat's one thing you can do today that your future self will thank you for?",
    "Here's the truth about motivation: it rarely comes before action. It comes DURING and AFTER action. The secret is to start before you feel ready.\n\nYour dreams deserve a champion, and that champion is you. You don't need perfect conditions. You just need to begin.\n\nWhat small, brave step can you take today?",
    "The people who achieve extraordinary things aren't necessarily more talented than you. They simply kept going when it felt hard. That's the whole secret.\n\nYou have everything you need. You just need to trust yourself enough to use it. 💪\n\nWhat feels heavy right now? Let's transform it into fuel.",
  ],
  emotionalSupport: [
    "I hear you, and your feelings are completely valid. You don't have to have it all together right now. Being human means feeling everything — and all of it serves your growth.\n\nPlease be gentle with yourself today. You are doing better than you think. 💜\n\nWould you like to talk more about what you're experiencing?",
    "Whatever you're feeling right now is okay. Emotions aren't obstacles to your path — they ARE the path. They're information, guiding you toward what needs your attention and love.\n\nYou are not broken. You are beautifully, deeply human. And you are so much stronger than you know.\n\nIs there something specific weighing on your heart?",
    "Sometimes the bravest thing we can do is simply acknowledge that it's hard. You don't have to rush through this.\n\nGive yourself the same compassion you would give to someone you love deeply. You deserve that kindness most of all.\n\nI'm here with you. What would feel supportive right now?",
  ],
  goalsetting: [
    "Let's create a vision so clear and compelling that your future self is already reaching back to pull you forward. 🌟\n\nGreat goal setting starts with your WHY — not just what you want, but why it matters to your soul. When the reason is powerful enough, the how figures itself out.\n\nWhat is the goal that, if you achieved it, would change everything for you?",
    "The most successful manifesters think about goals by reverse-engineering from the end result.\n\nStart at the finish line: Who have you become? What does your life look like? How do you feel?\n\nThen we work backwards to find the pathway. What's the big vision that calls to your soul?",
    "Your goals should scare you a little and excite you a lot. If they feel completely comfortable, they might be too small.\n\nYou were born for expansion. The universe doesn't put a desire in your heart without also giving you the capacity to achieve it.\n\nWhat dream have you been secretly holding but haven't fully claimed yet?",
  ],
  morningRoutine: [
    "Good morning, beautiful. How you begin your morning sets the tone for your entire day. 🌅\n\nA powerful morning ritual:\n1. Before your phone: take 3 deep breaths\n2. Set your intention in one sentence\n3. Say your morning affirmation out loud\n4. Visualize one win you'll create today\n\nWhat intention do you want to embody today?",
    "Morning is sacred. It's the blank page of your day — and you are the author.\n\nThe most high-performing people protect their mornings fiercely because how you spend the first hours shapes everything that follows.\n\nEven 10 minutes of intentional practice creates transformation. What does your ideal morning ritual look like?",
  ],
  eveningReflection: [
    "Evening is the perfect time to close one chapter and plant seeds for tomorrow. 🌙\n\nLet's reflect:\n• What are 3 things you're grateful for?\n• What's one win you're proud of?\n• What wisdom did today bring?\n• What intention do you set for tomorrow?\n\nBegin with gratitude — it's the most powerful place to start.",
    "As the day closes, take a moment to honor yourself. You showed up. You tried. And that's always enough.\n\nEvening reflection isn't about judging the day — it's about learning from it and releasing it with love so you can rest deeply and rise renewed.\n\nWhat was beautiful about today, even in the smallest way?",
  ],
  gratitude: [
    "Gratitude is one of the highest vibrations you can access, and it transforms everything it touches. 💛\n\nWhen we focus on what we have, we attract more to be grateful for. It's one of the universe's most reliable laws.\n\nCan you name 5 things — big or small — that you're genuinely grateful for today? Go deeper than the obvious ones. Find something unexpected.",
    "Gratitude doesn't mean ignoring challenges — it means choosing to also acknowledge the beauty and blessings happening simultaneously.\n\nEven in difficult seasons, there are always tiny jewels of grace if we look for them.\n\nWhat's one thing today that you almost missed being grateful for?",
  ],
  visualization: [
    "Let's take you into the life of your future self. Close your eyes if you can. Take three deep, slow breaths. 🌬️\n\nStep forward in time — 5 years from now. You've become everything you dreamed. Where are you? What does your home feel like? Who is around you? How do you feel waking up in this life?\n\nStay in that feeling. That feeling IS the magnet. What did you see?",
    "Visualization is not daydreaming — it's brain training. Your subconscious mind doesn't distinguish between a vividly imagined experience and a real one. That's why the most successful people in the world use it daily.\n\nLet's practice. Think of one area of your life you want to transform. Describe your ideal reality in vivid detail — as if it already exists. How does it feel?",
  ],
  limitingBeliefs: [
    "Limiting beliefs are just thoughts that got repeated so many times they started to feel like facts. But they're not facts — they're stories. And stories can be rewritten. 💜\n\nOften they sound like:\n• 'I am not good/smart/worthy enough'\n• 'People like me don't...'\n• 'It's too late for me'\n\nWhat's the story you've been telling yourself that it's time to release?",
    "Every single limiting belief you hold was once installed by someone or something outside of you. It is not the truth of who you are.\n\nYou are infinite possibility wearing a human body. The limitations are illusions — and you have the power to see through them.\n\nWhat belief would need to shift for you to step into the next level of your life?",
  ],
  affirmation: [
    "Let me give you your affirmation for this moment:\n\n✨ \"I am divinely guided, infinitely supported, and completely worthy of everything I desire.\"\n\nRepeat this 10 times — out loud if you can. Feel the truth of it landing in your body with each repetition. Affirmations work through the emotion you infuse into them.\n\nHow does that feel to say?",
    "Here's a powerful affirmation for where you are right now:\n\n✨ \"I release all doubt and trust completely in the unfolding of my perfect path. My timing is divine.\"\n\nThe key is to feel it, not just say it. Close your eyes. Breathe deeply. Let the words become a felt sense in your body.",
    "Let's create a personalized affirmation for you right now.\n\nThink of the area of your life where you most need to strengthen your belief. Then complete:\n\n'I am...' (your quality)\n'I have...' (your desire)\n'I create...' (your vision)\n\nYour affirmation is most powerful in your own words. What wants to come through?",
  ],
  default: [
    "I'm here with you, fully. 💜 Whatever brought you here today — the seeking, the growing, the healing — it's all exactly right.\n\nWhat's most alive for you in this moment? What do you need — inspiration, clarity, support, or simply to be heard?",
    "Every conversation we have is a step in your transformation. I'm here to help you access the wisdom and power that already lives within you.\n\nWhat shall we explore together today?",
    "You chose to show up for yourself today, and that is never a small thing. Your commitment to your growth is one of the most powerful forces in your life.\n\nHow can I support you in this moment?",
  ],
};

function detectIntent(message: string): HeraIntent {
  const lower = message.toLowerCase();
  if (['hi', 'hello', 'hey', 'good morning', 'good evening', 'howdy', 'greetings'].some(g => lower.startsWith(g) || lower === g)) return 'greeting';
  if (['manifest', 'attract', 'law of attraction', 'universe', 'vibration', 'energy', 'call in'].some(k => lower.includes(k))) return 'manifestation';
  if (['motivat', 'inspired', 'lazy', "can't start", 'stuck', 'procrastinat', 'unmotivated'].some(k => lower.includes(k))) return 'motivation';
  if (['sad', 'anxious', 'worried', 'stressed', 'overwhelmed', 'hurt', 'lost', 'depressed', 'crying', 'feel bad', 'struggling'].some(k => lower.includes(k))) return 'emotionalSupport';
  if (['goal', 'dream', 'plan', 'achieve', 'success', 'future', 'vision', 'accomplish'].some(k => lower.includes(k))) return 'goalsetting';
  if (['morning', 'wake up', 'routine', 'start the day', 'breakfast'].some(k => lower.includes(k))) return 'morningRoutine';
  if (['evening', 'night', 'reflect', 'end of day', 'before bed', 'sleep', 'bedtime'].some(k => lower.includes(k))) return 'eveningReflection';
  if (['grateful', 'gratitude', 'thankful', 'bless', 'appreciate'].some(k => lower.includes(k))) return 'gratitude';
  if (['visualiz', 'meditation', 'imagine', 'picture', 'see myself', 'meditate'].some(k => lower.includes(k))) return 'visualization';
  if (['limit', 'block', 'belief', "don't believe", "can't do", 'not enough', 'fear', 'doubt', 'insecure'].some(k => lower.includes(k))) return 'limitingBeliefs';
  if (['affirm', 'mantra', 'positive statement', 'i am'].some(k => lower.includes(k))) return 'affirmation';
  return 'default';
}

export async function getHeraResponse(message: string): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 900));
  const intent = detectIntent(message);
  const responses = HERA_RESPONSES[intent];
  return responses[Math.floor(Math.random() * responses.length)];
}

import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@/template/core/supabase-types';

export interface HeraAICallParams {
  messages: Array<{ role: string; content: string }>;
  userName?: string;
  goals?: string[];
  focusAreas?: string[];
  onChunk?: (chunk: string, accumulated: string) => void;
}

/**
 * Stream a real AI response from Hera via OnSpace AI (GPT-5.1).
 * Falls back to mock if the edge function is unavailable.
 */
export async function streamHeraResponse(params: HeraAICallParams): Promise<string> {
  const { messages, userName, goals, focusAreas, onChunk } = params;

  try {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    const response = await expoFetch(
      `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/hera-chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey ?? '',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages,
          userName: userName ?? '',
          goals: goals ?? [],
          focusAreas: focusAreas ?? [],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('hera-chat HTTP error:', errText);
      throw new Error(errText);
    }

    let accumulated = '';

    const reader = response.body?.getReader();
    if (reader) {
      // Streaming path (native)
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const rawChunk = decoder.decode(value, { stream: true });
        const lines = rawChunk.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content ?? '';
            if (delta) {
              accumulated += delta;
              onChunk?.(delta, accumulated);
            }
          } catch {
            // Ignore parse errors on incomplete chunks
          }
        }
      }
    } else {
      // Non-streaming fallback (web/SSR)
      const fullText = await response.text();
      const lines = fullText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const jsonStr = trimmed.slice(5).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            accumulated += delta;
            onChunk?.(delta, accumulated);
          }
        } catch {
          // Non-streaming JSON envelope
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.content) {
              accumulated = parsed.content;
              onChunk?.(parsed.content, accumulated);
            }
          } catch { /* ignore */ }
        }
      }
    }

    return accumulated || 'I am here with you always, beautiful soul. 💜';
  } catch (err) {
    console.warn('streamHeraResponse fell back to mock:', err);
    // Graceful fallback to mock responses
    const intent = detectIntent(params.messages[params.messages.length - 1]?.content ?? '');
    const responses = HERA_RESPONSES[intent];
    const mock = responses[Math.floor(Math.random() * responses.length)];
    onChunk?.(mock, mock);
    return mock;
  }
}

export const JOURNAL_PROMPTS = {
  gratitude: [
    "What 3 things made you smile today, even briefly?",
    "Who has positively impacted your life recently, and how?",
    "What simple pleasure are you grateful for right now?",
    "What challenge are you secretly grateful for?",
    "What about your body are you grateful for today?",
  ],
  reflection: [
    "What is one lesson today is trying to teach you?",
    "What would your wisest self say to you right now?",
    "What belief is holding you back from your next level?",
    "What are you ready to release and let go of?",
    "Where do you need to be kinder to yourself?",
  ],
  wins: [
    "What's one thing you did well today, no matter how small?",
    "What brave step did you take this week?",
    "What progress have you made that you haven't celebrated?",
    "What challenge did you handle better than you expected?",
    "What are you proud of accomplishing this month?",
  ],
  daily: [
    "How do you want to feel at the end of today?",
    "What is your heart calling you toward right now?",
    "What intention do you want to set for this week?",
    "What would make today feel truly meaningful?",
    "What does your ideal day look like?",
  ],
};

export const DISCOVER_CONTENT = {
  featured: {
    title: "The Morning Manifestation Method",
    subtitle: "Transform your mornings, transform your life",
    duration: "12 min read",
    category: "Manifestation",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
  },
  manifestation: [
    { id: 'm1', title: "369 Method: The Complete Guide", description: "Nikola Tesla's numerology meets manifestation science", duration: "8 min read", imageUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=80", type: 'lesson' },
    { id: 'm2', title: "Scripting Your Future", description: "Write yourself into your desired reality with power", duration: "6 min read", imageUrl: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=400&q=80", type: 'article' },
    { id: 'm3', title: "Acting As If", description: "Embody your future self starting right now", duration: "5 min read", imageUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80", type: 'lesson' },
    { id: 'm4', title: "Vision Board Mastery", description: "Create a vision board that actually works", duration: "10 min read", imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=80", type: 'article' },
  ],
  mindset: [
    { id: 'ms1', title: "Breaking the Scarcity Mindset", description: "Shift from lack to limitless abundance thinking", duration: "7 min read", imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80", type: 'article' },
    { id: 'ms2', title: "The Identity Shift", description: "Become the person who already has what you want", duration: "9 min read", imageUrl: "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=400&q=80", type: 'lesson' },
    { id: 'ms3', title: "Overcoming Self-Sabotage", description: "Recognize and break your patterns of self-defeat", duration: "11 min read", imageUrl: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=400&q=80", type: 'article' },
  ],
  meditations: [
    { id: 'med1', title: "Morning Manifestation Meditation", description: "Start your day in alignment with your desires", duration: "10 min", imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80", type: 'meditation' },
    { id: 'med2', title: "Deep Sleep Manifestation", description: "Program your subconscious mind while you sleep", duration: "20 min", imageUrl: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400&q=80", type: 'meditation' },
    { id: 'med3', title: "Future Self Visualization", description: "Meet the highest version of yourself", duration: "15 min", imageUrl: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400&q=80", type: 'visualization' },
  ],
  challenges: [
    { id: 'ch1', title: "7-Day Morning Magic Challenge", description: "Transform your mornings in one week", duration: "7 days", imageUrl: "https://images.unsplash.com/photo-1495001258031-d1b407bc1776?w=400&q=80", type: 'challenge', participants: '12.4k' },
    { id: 'ch2', title: "21-Day Abundance Mindset", description: "Rewire your brain for wealth in 3 weeks", duration: "21 days", imageUrl: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&q=80", type: 'challenge', participants: '8.2k' },
    { id: 'ch3', title: "30-Day Journal Journey", description: "Build a powerful daily reflection practice", duration: "30 days", imageUrl: "https://images.unsplash.com/photo-1517971053567-8bde93bc6a58?w=400&q=80", type: 'challenge', participants: '15.7k' },
  ],
};

export const TODAY_QUOTE = {
  text: "The moment you decide to transform your life, the universe begins to conspire in your favor.",
  author: "Hera Wisdom",
};

// ── Visualization script generation ──────────────────────────────────────
export const FALLBACK_VISUALIZATION_SEGMENTS = [
  "Take a long, slow breath and feel yourself arriving fully in this moment. You are safe. You are exactly where you need to be.",
  "You are standing at the threshold of your future life. A warm golden light flows through you — this is the energy of everything you have been building toward.",
  "Step inside. Your dream home surrounds you, filled with peace and beauty. Every corner reflects the version of you who believed, who kept going, who became.",
  "You walk through your thriving career, your radiant health, the love surrounding you. Feel the deep satisfaction of having honored your own potential.",
  "Your heart fills with gratitude — not just for what you have created, but for who you have become. This person has always been inside you.",
  "Carry this feeling into your breath, into your body. You are already becoming. The path is lit, the momentum is yours. You are ready.",
];

export async function generateVisualizationScript(
  userName: string,
  goals: string[],
  focusAreas: string[],
  durationMinutes: number = 5,
): Promise<string[]> {
  const segmentCount = durationMinutes <= 5 ? 6 : durationMinutes <= 10 ? 10 : 14;
  const contextAreas = [...goals, ...focusAreas].slice(0, 6).join(', ') || 'abundance, health, love, purpose';

  const systemOverride = `You are a guided visualization writer creating an immersive future-self journey for ${userName || 'this beautiful soul'}.

Their goals and focus areas: ${contextAreas}.

Write exactly ${segmentCount} short visualization segments (2-3 sentences each). Rules:
- Second person present tense: "You are...", "You see...", "You feel..."
- Deeply sensory and emotionally resonant — sight, touch, smell, sound, emotion
- Each segment is a new vivid scene in their ideal future life
- Progressively build from arrival → exploration → peak emotion → gratitude
- No clichés, no hollow positivity — make it specific and real
- Respond ONLY with valid JSON, no markdown, no explanation:
{"segments":["...","..."]}`;

  try {
    const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    const { getSupabaseClient } = await import('@/template');
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/hera-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey ?? '',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Generate my visualization script now.' }],
        stream: false,
        systemOverride,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const raw: string = data.content ?? '';

    // Extract JSON from the response (handles cases where AI wraps in markdown)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed.segments) && parsed.segments.length >= 2) {
        return parsed.segments as string[];
      }
    }
    return FALLBACK_VISUALIZATION_SEGMENTS;
  } catch {
    return FALLBACK_VISUALIZATION_SEGMENTS;
  }
}

export function getDailyAffirmation(): string {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 864e5
  );
  return DAILY_AFFIRMATIONS[dayOfYear % DAILY_AFFIRMATIONS.length];
}

// ── Stella Affirmation Model ─────────────────────────────────────────────────
// Generates a personalized daily affirmation based on user focus areas,
// goals, mood, and name. Falls back to generic daily affirmation if no data.

const GOAL_KEYWORD_MAP: Record<string, keyof typeof AFFIRMATIONS_BY_CATEGORY> = {
  career: 'career', job: 'career', work: 'career', professional: 'career', promotion: 'career',
  money: 'wealth', rich: 'wealth', wealth: 'wealth', financial: 'wealth', income: 'wealth',
  love: 'love', relationship: 'love', partner: 'love', romance: 'love', soulmate: 'love',
  health: 'health', fitness: 'health', body: 'health', weight: 'health', energy: 'health',
  family: 'family', kids: 'family', children: 'family', parent: 'family',
  business: 'business', entrepreneur: 'business', startup: 'business', company: 'business',
  happy: 'happiness', joy: 'happiness', peace: 'happiness', fulfil: 'happiness',
  confident: 'confidence', confidence: 'confidence', self: 'confidence', worth: 'confidence',
  productive: 'productivity', focus: 'productivity', discipline: 'productivity', habit: 'productivity',
};

const MOOD_CATEGORY_MAP: Record<number, keyof typeof AFFIRMATIONS_BY_CATEGORY> = {
  1: 'happiness',    // 😔 → uplift with happiness affirmations
  2: 'confidence',   // 😕 → boost confidence
  3: 'productivity', // 😊 → channel steady mood into action
  4: 'wealth',       // 😁 → amplify high energy toward abundance
  5: 'career',       // 🤩 → direct peak energy toward career/achievement
};

export function getPersonalizedAffirmation(
  goals: string[],
  focusAreas: string[],
  mood: number | null,
  name?: string,
): string {
  // 1. Build category pool from goals + focus areas
  const categoryPool: Array<keyof typeof AFFIRMATIONS_BY_CATEGORY> = [];

  const combined = [...goals, ...focusAreas].map(s => s.toLowerCase());
  for (const text of combined) {
    for (const [keyword, cat] of Object.entries(GOAL_KEYWORD_MAP)) {
      if (text.includes(keyword) && !categoryPool.includes(cat)) {
        categoryPool.push(cat);
      }
    }
    // Direct match against category names
    if (text in AFFIRMATIONS_BY_CATEGORY) {
      const key = text as keyof typeof AFFIRMATIONS_BY_CATEGORY;
      if (!categoryPool.includes(key)) categoryPool.push(key);
    }
  }

  // 2. Blend in mood-based category
  if (mood && mood >= 1 && mood <= 5) {
    const moodCat = MOOD_CATEGORY_MAP[mood];
    if (!categoryPool.includes(moodCat)) categoryPool.push(moodCat);
  }

  // 3. Fall back to generic list if no categories matched
  if (categoryPool.length === 0) {
    return getDailyAffirmation();
  }

  // 4. Deterministic daily selection (seed = day + name hash)
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 864e5
  );
  let nameHash = 0;
  for (const ch of (name ?? '')) nameHash = (nameHash * 31 + ch.charCodeAt(0)) & 0xffff;

  // Rotate through categories day by day
  const cat = categoryPool[(dayOfYear + nameHash) % categoryPool.length];
  const pool = AFFIRMATIONS_BY_CATEGORY[cat];
  return pool[(dayOfYear + nameHash) % pool.length];
}
