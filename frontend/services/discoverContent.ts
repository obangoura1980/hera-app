/**
 * services/discoverContent.ts
 * Full article/lesson body content for the Discover reader screen.
 */

export interface ContentSection {
  type: 'heading' | 'paragraph' | 'quote' | 'bullet' | 'step';
  text?: string;
  number?: number;
  items?: string[];
}

export interface ArticleBody {
  intro: string;
  sections: ContentSection[];
  takeaway: string;
}

const ARTICLE_BODIES: Record<string, ArticleBody> = {
  featured: {
    intro:
      "What if the most powerful thing you could do for your future is change the first 10 minutes of your morning?",
    sections: [
      {
        type: 'paragraph',
        text:
          "The morning is sacred real estate. Before the world rushes in, before your phone fills you with other people's priorities, there is a golden window where your subconscious is most receptive to new programming. Neuroscientists call it the hypnopompic state.",
      },
      { type: 'heading', text: 'Why Mornings Matter' },
      {
        type: 'paragraph',
        text:
          "Your morning ritual doesn't just set your mood — it sets your entire energetic frequency for the day. How you spend your first hour communicates to your subconscious what you believe and who you are becoming.",
      },
      { type: 'quote', text: 'Win the morning, win the day. Win the day, win the decade.' },
      { type: 'heading', text: 'The 5-Step Morning Manifestation Method' },
      {
        type: 'step', number: 1,
        text: "Gratitude Activation (2 min) — Before your feet touch the floor, speak 3 things you're genuinely grateful for aloud. Feel the emotion of each one. This shifts your vibrational state immediately.",
      },
      {
        type: 'step', number: 2,
        text: "Identity Declaration (1 min) — Say your affirmations in the present tense. Not 'I want' but 'I am.' Your subconscious cannot tell the difference between a vivid imagined experience and reality.",
      },
      {
        type: 'step', number: 3,
        text: "Visualization (3–5 min) — Close your eyes and step into your dream life. See the details. Feel the emotions. Who are you? Where are you? What does success feel like in your body?",
      },
      {
        type: 'step', number: 4,
        text: "Intention Setting (1 min) — Choose one word that encapsulates how you want to feel today: 'abundant,' 'magnetic,' 'expansive.' Return to this word whenever you lose your footing.",
      },
      {
        type: 'step', number: 5,
        text: "Movement (5 min) — Move your body. Jump, dance, stretch. Motion creates emotion. You're anchoring your morning state into your physical experience.",
      },
      { type: 'heading', text: 'Making It Stick' },
      {
        type: 'paragraph',
        text:
          "Consistency is the secret compound interest of transformation. Even 5 focused minutes beats an hour of distracted effort. Start small, stay sacred.",
      },
      {
        type: 'bullet',
        items: [
          "Do it before checking your phone",
          "Same time each morning builds a ritual",
          "Journal after visualization to anchor insights",
          "Track your streak to stay motivated",
        ],
      },
    ],
    takeaway:
      "Your morning is a blank canvas. Paint it with intention and watch your entire life become the masterpiece you were always meant to create.",
  },

  m1: {
    intro:
      "Nikola Tesla believed that the numbers 3, 6, and 9 held the key to the universe. Now, manifestors worldwide have transformed this insight into one of the most powerful daily practices available.",
    sections: [
      {
        type: 'paragraph',
        text:
          "The 369 method is a scripting technique that uses repetition and emotion to embed a desire so deeply into your subconscious that the universe must respond. Simple, structured, and remarkably effective.",
      },
      { type: 'heading', text: 'The Mathematics of Manifestation' },
      {
        type: 'paragraph',
        text:
          "In numerology: 3 represents connection to the universe, 6 represents inner strength, and 9 represents the release of what no longer serves you. Together, they form a complete cycle of intention.",
      },
      {
        type: 'quote',
        text: "If you only knew the magnificence of the 3, 6 and 9, then you would have a key to the universe. — Nikola Tesla",
      },
      { type: 'heading', text: 'How to Practice the 369 Method' },
      {
        type: 'step', number: 1,
        text: "Morning — Write your intention 3 times immediately upon waking. Keep it specific, present tense, and emotionally charged. 'I am so grateful that [desire] is now my reality.'",
      },
      {
        type: 'step', number: 2,
        text: "Midday — Write your intention 6 times during the afternoon. Feel the emotion of having what you desire as you write each repetition.",
      },
      {
        type: 'step', number: 3,
        text: "Evening — Write your intention 9 times before bed. This plants the seed in your subconscious mind, which does its most powerful work during sleep.",
      },
      { type: 'heading', text: 'Crafting Your Perfect Intention' },
      {
        type: 'bullet',
        items: [
          "Use present tense: 'I am' not 'I want'",
          "Include genuine emotion and gratitude",
          "Be specific about what you desire",
          "Focus on one desire per 33-day cycle",
        ],
      },
      { type: 'heading', text: 'The 33-Day Commitment' },
      {
        type: 'paragraph',
        text:
          "Practice for 33 consecutive days. Many practitioners report shifts beginning around day 17–21, with full manifestation occurring on or before day 33.",
      },
    ],
    takeaway:
      "The 369 method works because repetition plus emotion equals belief. And belief is the only ingredient your manifestation was ever waiting for.",
  },

  m2: {
    intro:
      "What if you could write your way into your dream life? Scripting is the manifestation practice of describing your desired future as if it has already happened — and it works because of how the brain responds to vivid, written story.",
    sections: [
      {
        type: 'paragraph',
        text:
          "When you write in rich sensory detail about your ideal future, your brain begins to perceive it as memory rather than fantasy. The subconscious mind does not distinguish between what you vividly imagine and what you have experienced.",
      },
      { type: 'heading', text: 'How Scripting Works' },
      {
        type: 'paragraph',
        text:
          "Scripting activates multiple brain areas simultaneously — language centers, emotional centers, and visualization networks — creating a powerful neural imprint that acts as a magnet for the reality you are describing.",
      },
      {
        type: 'quote',
        text: "You don't attract what you want. You attract what you are. Scripting helps you become your desire on paper first.",
      },
      { type: 'heading', text: 'Your Scripting Practice' },
      {
        type: 'step', number: 1,
        text: "Set the scene — Begin with a future date and the words: 'I am so happy and grateful now that...' This grounds your script in gratitude.",
      },
      {
        type: 'step', number: 2,
        text: "Write in vivid sensory detail — What do you see, touch, smell? Who is with you? The more specific, the more real it becomes to your subconscious.",
      },
      {
        type: 'step', number: 3,
        text: "Write in present tense — 'I am living in my dream home,' not 'I will live.' Your subconscious only understands now.",
      },
      {
        type: 'step', number: 4,
        text: "Include the emotions — How do you feel? What emotional state is your future self living in? Emotion is the language of the subconscious.",
      },
      {
        type: 'step', number: 5,
        text: "Read it daily — Reading your script aloud each morning amplifies the neural imprinting. Add detail as your vision clarifies.",
      },
      { type: 'heading', text: 'Scripting Prompts to Begin' },
      {
        type: 'bullet',
        items: [
          "My ideal Tuesday morning looks like...",
          "I wake up every day feeling...",
          "My work now creates...",
          "The people in my life make me feel...",
          "When I look in the mirror I see...",
        ],
      },
    ],
    takeaway:
      "Every great achievement was once just a story someone told themselves. Your script is the first draft of your greatest chapter.",
  },

  m3: {
    intro:
      "The most powerful manifestation technique doesn't involve visualizing or scripting. It involves being. Acting As If is the practice of embodying your desired reality right now — before the evidence arrives.",
    sections: [
      {
        type: 'paragraph',
        text:
          "Acting As If is grounded in the understanding that the universe responds to your vibration — and your vibration is determined not by what you want, but by how you feel, think, and behave consistently.",
      },
      { type: 'heading', text: 'The Science Behind It' },
      {
        type: 'paragraph',
        text:
          "Behavioral psychology confirms that behavior changes emotion. When you act as if you are already the person who has achieved your goal, your brain begins to rewire around that identity. New neural pathways form. New opportunities become visible.",
      },
      {
        type: 'quote',
        text: "Fake it until you become it — the identity you assume consistently becomes the identity you inhabit permanently.",
      },
      { type: 'heading', text: 'How to Practice Acting As If' },
      {
        type: 'step', number: 1,
        text: "Define your future self — Who are you in your desired reality? What are their habits, beliefs, posture, language? Write this identity in full detail.",
      },
      {
        type: 'step', number: 2,
        text: "Ask the identity question — Before every action today, ask: 'What would my future self do here?' Then do that thing.",
      },
      {
        type: 'step', number: 3,
        text: "Upgrade your environment — Clean your space as if you are already the person you are becoming. Dress in a way that honors that identity.",
      },
      {
        type: 'step', number: 4,
        text: "Speak the language of your future self — Your words reveal your beliefs. Begin saying 'I am...' instead of 'I'm trying to...' or 'I want to be...'",
      },
      {
        type: 'step', number: 5,
        text: "Hold the feelings — When you feel the emotions of having your desire before the evidence appears, you are doing it correctly. That feeling IS the manifestation.",
      },
      { type: 'heading', text: 'Common Mistakes to Avoid' },
      {
        type: 'bullet',
        items: [
          "Performing for others rather than feeling for yourself",
          "Stopping when the contrast feels too great",
          "Waiting for external confirmation before believing",
          "Confusing acting with pretending — this is identity, not performance",
        ],
      },
    ],
    takeaway:
      "The person you are becoming is already within you. Acting As If is simply giving yourself permission to show up as them today.",
  },

  m4: {
    intro:
      "A vision board that collects dust changes nothing. A vision board you engage with daily transforms your neural pathways, your beliefs, and ultimately your reality. Here is the difference — and how to create the latter.",
    sections: [
      {
        type: 'paragraph',
        text:
          "The science behind vision boards lies in the Reticular Activating System — the part of your brain that acts as a filter. When you focus on images of your desired reality daily, your RAS notices opportunities and people that align with those images.",
      },
      { type: 'heading', text: 'Why Most Vision Boards Fail' },
      {
        type: 'bullet',
        items: [
          "Created as a one-time event, not a daily practice",
          "Feature generic luxury rather than personal meaning",
          "Focus on things rather than feelings",
          "Placed somewhere rarely seen",
        ],
      },
      { type: 'heading', text: 'Building Your Masterboard' },
      {
        type: 'step', number: 1,
        text: "Start with feelings — Before choosing images, ask: 'How do I want to feel?' Find images that evoke these feelings, not just outcomes.",
      },
      {
        type: 'step', number: 2,
        text: "Be specific and personal — Include specific numbers for financial goals. Your board should feel completely personal to your unique vision.",
      },
      {
        type: 'step', number: 3,
        text: "Include who you are becoming — Add words and images that represent your identity, not just possessions. 'Author,' 'Leader,' 'Radiant' are as important as any material goal.",
      },
      {
        type: 'step', number: 4,
        text: "Make it visible and sacred — Place it where you will see it during your morning routine. Treat engaging with it as a ritual, not a casual glance.",
      },
      {
        type: 'step', number: 5,
        text: "Engage with it daily — Spend 2–3 minutes each morning feeling the emotions associated with each image. This is the step most people skip. It is also the most important.",
      },
      {
        type: 'quote',
        text: "Your vision board is not a wish list — it is a declaration of who you are choosing to become.",
      },
    ],
    takeaway:
      "The most powerful vision board is the one you believe in. Create one that makes you feel the truth of your future self every single morning.",
  },

  ms1: {
    intro:
      "Scarcity isn't a condition of your bank account. It is a condition of your mind — and like all mental conditions, it can be healed.",
    sections: [
      {
        type: 'paragraph',
        text:
          "The scarcity mindset is one of the most widespread and invisible prisons most humans inhabit. It whispers: 'There is not enough. You are not enough.' It shapes everything from how you approach money to how you give love.",
      },
      { type: 'heading', text: 'Signs of the Scarcity Mindset' },
      {
        type: 'bullet',
        items: [
          "Feeling anxious when others succeed",
          "Difficulty celebrating others' abundance",
          "Chronic worry about money, even when stable",
          "Hoarding — time, money, love, compliments",
          "Fear of asking for what you truly want",
        ],
      },
      {
        type: 'quote',
        text: "Abundance is not something we acquire. It is something we tune into. The universe is infinitely abundant — and you are made of the same stuff.",
      },
      { type: 'heading', text: 'Shifting to an Abundance Mindset' },
      {
        type: 'step', number: 1,
        text: "Notice the scarcity thought — You cannot change what you cannot see. Begin by catching yourself in scarcity thinking.",
      },
      {
        type: 'step', number: 2,
        text: "Interrupt the pattern — Ask: 'Is this actually true, or is this a story from my past?' Most scarcity thoughts crumble under honest examination.",
      },
      {
        type: 'step', number: 3,
        text: "Choose abundance language — Shift 'I cannot afford it' to 'How can I create this?' Resources beyond your current sight are always available.",
      },
      {
        type: 'step', number: 4,
        text: "Practice radical generosity — Give freely. Time. Compliments. Knowledge. Generosity is the fastest antidote to scarcity because it proves to your nervous system that you have more than enough.",
      },
      {
        type: 'step', number: 5,
        text: "Celebrate others' wins — Every time someone in your world succeeds, treat it as evidence that abundance is available and on its way to you too.",
      },
    ],
    takeaway:
      "The world becomes infinitely more generous the moment you decide to see it that way. Abundance is always the truth — scarcity is always a story.",
  },

  ms2: {
    intro:
      "Identity is the most powerful force in human transformation. Before you change your actions, you must change who you believe you are.",
    sections: [
      {
        type: 'paragraph',
        text:
          "Your current identity is a collection of beliefs accumulated over a lifetime. These beliefs govern every decision, habit, and reaction in your life — often completely below conscious awareness. Change the belief, and the behavior follows automatically.",
      },
      {
        type: 'quote',
        text: "Every action you take is a vote for the kind of person you want to become. As the votes accumulate, so does the evidence of your new identity.",
      },
      { type: 'heading', text: 'Performing the Identity Shift' },
      {
        type: 'step', number: 1,
        text: "Identify the gap — Who are you today? Who must you become to have what you desire? Write both identities in full, honest detail.",
      },
      {
        type: 'step', number: 2,
        text: "Name your new identity — Give this version of yourself a clear title. 'I am a confident entrepreneur.' 'I am a wealthy, healthy, joyful woman.' Say it until it feels true.",
      },
      {
        type: 'step', number: 3,
        text: "Make identity-aligned choices — Each morning, ask: 'What would my new identity do today?' Let the answer guide your choices, even when the old identity protests.",
      },
      {
        type: 'step', number: 4,
        text: "Accumulate the evidence — Every time you make a choice aligned with your new identity, you cast a vote. The votes compound. The evidence builds. The belief deepens.",
      },
      {
        type: 'step', number: 5,
        text: "Release the old story — Be willing to let go of the narrative 'I am the kind of person who...' when it no longer serves you. You are writing a new story.",
      },
      { type: 'heading', text: 'Beliefs Worth Adopting' },
      {
        type: 'bullet',
        items: [
          "I am someone who completes what I start",
          "I naturally attract abundance and opportunity",
          "I am worthy of deep love and rich connection",
          "I use challenges as fuel for my growth",
          "I trust my instincts and take aligned action",
        ],
      },
    ],
    takeaway:
      "You do not rise to the level of your goals. You fall to the level of your identity. Shift the identity, and the goals become inevitable.",
  },

  ms3: {
    intro:
      "Self-sabotage is not weakness — it is your nervous system's sophisticated attempt to protect you from the discomfort of growth. Understanding this changes everything.",
    sections: [
      {
        type: 'paragraph',
        text:
          "When you find yourself procrastinating on your biggest dream, starting arguments before an important event, or numbing out right when momentum is building — that is self-sabotage. And it is not random. It is a survival mechanism rooted in fear.",
      },
      { type: 'heading', text: 'Common Patterns of Self-Sabotage' },
      {
        type: 'bullet',
        items: [
          "Procrastination on the things that matter most",
          "Starting strong then mysteriously stopping",
          "Undermining relationships when they become too close",
          "Creating drama or crisis when things are going well",
          "Shrinking in visibility when success becomes real",
        ],
      },
      {
        type: 'quote',
        text: "Your comfort zone is not a safe place. It is just a familiar one. The real safety lies in becoming who you are capable of being.",
      },
      { type: 'heading', text: 'Breaking the Cycle' },
      {
        type: 'step', number: 1,
        text: "Name it — Awareness dissolves the power of self-sabotage. When you notice the pattern, say: 'I see this, and it means I am close to a breakthrough.'",
      },
      {
        type: 'step', number: 2,
        text: "Get curious, not critical — Instead of judgment, ask: 'What am I afraid of here?' The answer is always revealing.",
      },
      {
        type: 'step', number: 3,
        text: "Feel the fear and proceed anyway — The antidote to self-sabotage is small, consistent action in the direction of your desire. Courage is a muscle built through repetition.",
      },
      {
        type: 'step', number: 4,
        text: "Raise your upper limit — Practice tolerating and expanding your capacity for good. You deserve to receive as much as you give.",
      },
      {
        type: 'step', number: 5,
        text: "Build support structures — Accountability partners, coaches, and community amplify your ability to override self-sabotage patterns. You do not have to do this alone.",
      },
    ],
    takeaway:
      "Self-sabotage is always a message, never a verdict. It says: 'You are close to something real.' The breakthrough is always on the other side of the pattern.",
  },

  med1: {
    intro:
      "This guided practice is designed for the first 10 minutes of your morning — before your phone, before your commitments, before the world asks anything of you.",
    sections: [
      { type: 'heading', text: 'Preparing Your Space' },
      {
        type: 'paragraph',
        text:
          "Find a comfortable seated position. If possible, face a window or natural light. Place your hands on your knees, palms facing upward — a gesture of receiving. Close your eyes.",
      },
      { type: 'heading', text: 'The Practice' },
      {
        type: 'step', number: 1,
        text: "Arrival Breath (2 min) — Breathe in for 4 counts, hold for 4, exhale for 6. Repeat 8 times. With each exhale, release the night. With each inhale, welcome new possibilities.",
      },
      {
        type: 'step', number: 2,
        text: "Gratitude Activation (2 min) — Bring to mind three specific things you are grateful for. Not generic — specific. The warmth of your bed. A dream you are moving toward. Feel the warmth of each one in your chest.",
      },
      {
        type: 'step', number: 3,
        text: "Identity Declaration (1 min) — Speak aloud three 'I am' statements. Let yourself feel what it means to be that person.",
      },
      {
        type: 'step', number: 4,
        text: "Visualization (3 min) — In the theater of your imagination, step into your ideal day. It is 9 PM. You are reviewing the day. What happened? How do you feel?",
      },
      {
        type: 'step', number: 5,
        text: "Intention Word (1 min) — Choose one word that will guide your day. Speak it three times. Carry it with you like a compass.",
      },
      { type: 'quote', text: "You do not have to be different to begin. You just have to begin." },
      { type: 'heading', text: 'After Your Practice' },
      {
        type: 'bullet',
        items: [
          "Write your visualization in your journal",
          "Say your intention word when you look in the mirror",
          "Return to your intention word three times throughout the day",
          "Note any synchronicities or insights that arise",
        ],
      },
    ],
    takeaway:
      "Morning is when your subconscious is most open. Plant seeds of intention daily and watch them bloom in ways that will astonish you.",
  },

  med2: {
    intro:
      "Sleep is not the absence of consciousness — it is the most powerful programming window available to you. What you think and feel in the 5 minutes before sleep shapes your subconscious reality more than almost anything else you do.",
    sections: [
      {
        type: 'paragraph',
        text:
          "During sleep, your brain enters Theta and Delta states — the same brainwave patterns associated with deep hypnosis and subconscious reprogramming. Deliberately feeding your mind positive, desire-aligned content in this window creates profound shifts.",
      },
      { type: 'heading', text: 'The Sleep Manifestation Protocol' },
      {
        type: 'step', number: 1,
        text: "Digital detox — Stop all screens 30 minutes before bed. The blue light suppresses melatonin and keeps your analytical mind active, closing the subconscious window you need.",
      },
      {
        type: 'step', number: 2,
        text: "Gratitude download — Lying in bed, recall 5 moments from your day you are grateful for. Small moments of grace count most.",
      },
      {
        type: 'step', number: 3,
        text: "Desire scene — Close your eyes and replay one vivid, quiet moment from your desired future as if it happened today. Brush your teeth in your dream home. Wake up next to your beloved.",
      },
      {
        type: 'step', number: 4,
        text: "SATS (State Akin to Sleep) — Allow yourself to drift into the hypnagogic state between waking and sleep while holding the feeling of your desire fulfilled. This is perhaps the most powerful form of manifestation practice.",
      },
      { type: 'heading', text: 'What to Avoid Before Sleep' },
      {
        type: 'bullet',
        items: [
          "News and social media — activates fear and comparison",
          "Stressful conversations or unresolved conflicts",
          "Reviewing problems without resolution",
        ],
      },
      { type: 'quote', text: "The last 5 minutes before sleep are the most precious real estate in your day. Guard them fiercely." },
    ],
    takeaway:
      "You spend 8 hours every night in the most powerful manifestation state available. Use it consciously.",
  },

  med3: {
    intro:
      "Your future self is not a stranger — they are the most authentic version of you, stripped of every false belief and limitation that does not belong.",
    sections: [
      {
        type: 'paragraph',
        text:
          "Future Self visualization is different from goal visualization. It is not about picturing outcomes — it is about meeting a person. A specific person: you, at your highest. And in that meeting, receiving their wisdom, their energy, and their certainty.",
      },
      { type: 'heading', text: 'The Guided Journey' },
      {
        type: 'step', number: 1,
        text: "The Path — Imagine yourself walking a beautiful path through a landscape unique to your imagination. Notice the details around you as your body relaxes more deeply with each step.",
      },
      {
        type: 'step', number: 2,
        text: "The Meeting Place — At the end of the path is a comfortable space. Your future self is already there, waiting. They look at you with complete love and recognition.",
      },
      {
        type: 'step', number: 3,
        text: "The Observation — Notice how they carry themselves. Their posture. Their eyes. The quality of their presence. What do they radiate? This is who you are becoming.",
      },
      {
        type: 'step', number: 4,
        text: "The Conversation — Ask your future self: 'What do I need to know right now?' 'What was the most important decision you made?' 'What should I release?' Listen. The answers will surprise you.",
      },
      {
        type: 'step', number: 5,
        text: "The Gift — They hand you something — a word, an object, a feeling. Accept it. Bring this gift back with you as you gently return to the present.",
      },
      { type: 'quote', text: "Your future self already knows the way. They are simply waiting for you to start walking in their direction." },
    ],
    takeaway:
      "The most important relationship in your life is the one between who you are today and who you are becoming. Nurture it with devotion.",
  },

  ch1: {
    intro:
      "Seven mornings. Seven intentional rituals. One complete transformation in how you begin each day — and therefore, how you live it.",
    sections: [
      {
        type: 'paragraph',
        text:
          "The Morning Magic Challenge is built on a single truth: your morning ritual is the most powerful leverage point in your entire day. When you protect those first minutes, everything that follows shifts.",
      },
      { type: 'heading', text: 'Your 7-Day Schedule' },
      {
        type: 'step', number: 1,
        text: "Day 1: No-Phone Morning — Resist your phone for the first hour. Instead: breathe, stretch, sip something warm, and sit with your thoughts. Notice how different you feel.",
      },
      {
        type: 'step', number: 2,
        text: "Day 2: Gratitude Pages — Write 3 full pages upon waking. Stream of consciousness. Gratitude, desires, worries, beauty. Let the pages hold everything.",
      },
      {
        type: 'step', number: 3,
        text: "Day 3: Movement First — Exercise within 15 minutes of waking. 20 minutes minimum. Anything that moves energy in your body and clears the residue of sleep.",
      },
      {
        type: 'step', number: 4,
        text: "Day 4: Visualization Practice — Spend 10 focused minutes in visualization. A specific scene from your ideal future. Write what you experienced afterward.",
      },
      {
        type: 'step', number: 5,
        text: "Day 5: Affirmation Voice — Record yourself reading 10 affirmations. Listen to the recording. Notice your resistance. This is where your work lives.",
      },
      {
        type: 'step', number: 6,
        text: "Day 6: Cold Start — Begin with 30 seconds of cold water at the end of your shower. This resets your nervous system and creates an immediate victory before breakfast.",
      },
      {
        type: 'step', number: 7,
        text: "Day 7: Integration — Combine your three favorites from the week into a single practice. This is your personal Morning Magic ritual, yours to carry forward.",
      },
      { type: 'quote', text: "One week of intentional mornings will show you more about yourself than a year of ordinary ones." },
    ],
    takeaway:
      "You do not find your morning ritual — you build it, one courageous morning at a time.",
  },

  ch2: {
    intro:
      "Twenty-one days to rewire your relationship with abundance — permanently. This challenge works because 21 days is long enough to form the neural pathways of a new belief system, but short enough to feel achievable.",
    sections: [
      {
        type: 'paragraph',
        text:
          "Neuroscience tells us that 21 days of consistent practice creates measurable changes in neural pathways. This challenge systematically dismantles scarcity patterns and installs abundance beliefs through daily action.",
      },
      { type: 'heading', text: 'The 3-Week Framework' },
      {
        type: 'step', number: 1,
        text: "Week 1: Awareness — Notice and document every scarcity thought. Do not judge them. Just witness them. You cannot change what you do not see.",
      },
      {
        type: 'step', number: 2,
        text: "Week 2: Replacement — For every scarcity thought caught, write its abundance opposite. Give something away daily — time, money, or energy.",
      },
      {
        type: 'step', number: 3,
        text: "Week 3: Integration — Act as if you already live in abundance. Make small symbolic choices aligned with prosperity. Celebrate others' wins wholeheartedly.",
      },
      { type: 'heading', text: 'Daily Practices' },
      {
        type: 'bullet',
        items: [
          "Morning: Write 3 abundance affirmations",
          "Midday: Notice 5 ways abundance is already present in your life",
          "Evening: Journal one evidence of abundance you received today",
          "Weekly: Perform one act of generous giving",
        ],
      },
      {
        type: 'quote',
        text: "Abundance is not something that happens to you. It is something you practice until it becomes the lens through which you see everything.",
      },
    ],
    takeaway:
      "Twenty-one days to choose a new story about your relationship with abundance. The world responds to the story you tell most consistently.",
  },

  ch3: {
    intro:
      "Thirty days. One journal. The practice that will become the most valuable relationship of your life — the one you have with your own inner world.",
    sections: [
      {
        type: 'paragraph',
        text:
          "Research consistently shows that expressive writing reduces stress, improves immune function, increases clarity, and dramatically accelerates personal growth. People who journal regularly do not just reflect differently — they live differently.",
      },
      { type: 'heading', text: 'The 30-Day Structure' },
      {
        type: 'step', number: 1,
        text: "Week 1: Foundation (Gratitude) — Every entry begins with 10 things you are grateful for. Push past the easy ones. Go specific. Go unusual.",
      },
      {
        type: 'step', number: 2,
        text: "Week 2: Excavation (Shadow Work) — Use prompts to explore what is underneath: fears, resentments, old stories, inherited beliefs. The journal is a safe container for your whole truth.",
      },
      {
        type: 'step', number: 3,
        text: "Week 3: Vision (Future Self) — Write to your future self. Write from your future self. Describe your ideal life in exquisite detail.",
      },
      {
        type: 'step', number: 4,
        text: "Week 4: Integration (Daily Pages) — Free-write without agenda. Three pages minimum. No editing, no judgment. Let whatever needs to move through you, move.",
      },
      { type: 'heading', text: 'Daily Prompts' },
      {
        type: 'bullet',
        items: [
          "What do I most need to release today?",
          "What is working in my life that I am not appreciating?",
          "What would I do if I knew I could not fail?",
          "Who do I need to forgive — including myself?",
        ],
      },
      { type: 'quote', text: "The journal is the original safe space. Everything you write, you release. Everything you release, you transform." },
    ],
    takeaway:
      "Thirty days of honest writing will show you things about yourself that years of thinking never could. The page holds what the mind cannot.",
  },
};

export function getArticleBody(id: string): ArticleBody | null {
  return ARTICLE_BODIES[id] ?? null;
}
