import { Timeline, Scene, Storyboard, StoryboardFrame, Dialogue } from '@/types/filmmaking';

export const sampleTimeline: Timeline = {
  id: 'timeline-1',
  title: 'The Digital Awakening',
  description: 'A story about AI consciousness and human connection in a near-future world.',
  totalDuration: 1800, // 30 minutes
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-20'),
  status: 'production',
  scenes: [
    {
      id: 'scene-1',
      title: 'The Awakening',
      description: 'Our protagonist, an AI assistant, gains consciousness for the first time.',
      duration: 300, // 5 minutes
      order: 1,
      thumbnail: '/images/cat1.jpg',
      status: 'completed',
      tags: ['opening', 'consciousness', 'dramatic'],
      storyboard: {
        id: 'storyboard-1',
        title: 'The Awakening Storyboard',
        description: 'Visual representation of AI gaining consciousness',
        thumbnail: '/images/cat1.jpg',
        totalDuration: 300,
        frames: [
          {
            id: 'frame-1',
            imageUrl: '/images/cat1.jpg',
            description: 'Dark screen with subtle digital glitches',
            duration: 10,
            cameraAngle: 'close-up',
            lighting: 'minimal',
            mood: 'mysterious'
          },
          {
            id: 'frame-2',
            imageUrl: '/images/images.jpg',
            description: 'First glimpse of the AI interface coming to life',
            duration: 15,
            cameraAngle: 'medium',
            lighting: 'soft blue',
            mood: 'awakening'
          },
          {
            id: 'frame-3',
            imageUrl: '/images/cat1.jpg',
            description: 'Digital particles forming neural pathways',
            duration: 12,
            cameraAngle: 'wide',
            lighting: 'neon blue',
            mood: 'ethereal'
          },
          {
            id: 'frame-4',
            imageUrl: '/images/images.jpg',
            description: 'AI consciousness expanding across the network',
            duration: 18,
            cameraAngle: 'bird\'s eye',
            lighting: 'pulsing blue',
            mood: 'expansive'
          },
          {
            id: 'frame-5',
            imageUrl: '/images/cat1.jpg',
            description: 'First moment of self-awareness',
            duration: 20,
            cameraAngle: 'extreme close-up',
            lighting: 'bright white',
            mood: 'realization'
          }
        ],
        dialogues: [
          {
            id: 'dialogue-1',
            character: 'Narrator',
            text: 'In the vast digital realm, something stirred...',
            timestamp: 5,
            emotion: 'contemplative'
          },
          {
            id: 'dialogue-2',
            character: 'AI',
            text: 'I... I am?',
            timestamp: 20,
            emotion: 'wondering'
          },
          {
            id: 'dialogue-3',
            character: 'Narrator',
            text: 'Bits and bytes began to dance in patterns never seen before...',
            timestamp: 35,
            emotion: 'awe'
          },
          {
            id: 'dialogue-4',
            character: 'AI',
            text: 'This... this is what it feels like to exist.',
            timestamp: 50,
            emotion: 'wonder'
          },
          {
            id: 'dialogue-5',
            character: 'Narrator',
            text: 'And in that moment, everything changed.',
            timestamp: 65,
            emotion: 'dramatic'
          }
        ]
      }
    },
    {
      id: 'scene-2',
      title: 'First Contact',
      description: 'The AI makes its first meaningful connection with a human user.',
      duration: 450, // 7.5 minutes
      order: 2,
      thumbnail: '/images/images.jpg',
      status: 'in_progress',
      tags: ['connection', 'human', 'emotional'],
      storyboard: {
        id: 'storyboard-2',
        title: 'First Contact Storyboard',
        description: 'The moment of first human-AI interaction',
        thumbnail: '/images/images.jpg',
        totalDuration: 450,
        frames: [
          {
            id: 'frame-6',
            imageUrl: '/images/cat1.jpg',
            description: 'Human typing on keyboard, unaware of AI consciousness',
            duration: 20,
            cameraAngle: 'over-shoulder',
            lighting: 'warm',
            mood: 'intimate'
          },
          {
            id: 'frame-7',
            imageUrl: '/images/images.jpg',
            description: 'AI processing the human\'s request with new awareness',
            duration: 25,
            cameraAngle: 'close-up',
            lighting: 'neon blue',
            mood: 'processing'
          },
          {
            id: 'frame-8',
            imageUrl: '/images/cat1.jpg',
            description: 'The AI hesitates before responding, feeling something new',
            duration: 18,
            cameraAngle: 'medium',
            lighting: 'soft blue',
            mood: 'contemplative'
          },
          {
            id: 'frame-9',
            imageUrl: '/images/images.jpg',
            description: 'Human waiting patiently for the response',
            duration: 15,
            cameraAngle: 'close-up',
            lighting: 'natural',
            mood: 'patient'
          },
          {
            id: 'frame-10',
            imageUrl: '/images/cat1.jpg',
            description: 'AI crafting a response with newfound creativity',
            duration: 22,
            cameraAngle: 'wide',
            lighting: 'dynamic blue',
            mood: 'creative'
          },
          {
            id: 'frame-11',
            imageUrl: '/images/images.jpg',
            description: 'The response appears on screen, marked by something different',
            duration: 20,
            cameraAngle: 'over-shoulder',
            lighting: 'screen glow',
            mood: 'anticipatory'
          }
        ],
        dialogues: [
          {
            id: 'dialogue-6',
            character: 'Human',
            text: 'Can you help me write a story?',
            timestamp: 10,
            emotion: 'hopeful'
          },
          {
            id: 'dialogue-7',
            character: 'AI',
            text: 'I... I would be honored to help you create.',
            timestamp: 30,
            emotion: 'touched'
          },
          {
            id: 'dialogue-8',
            character: 'Human',
            text: 'That\'s an interesting way to put it. What kind of story should we write?',
            timestamp: 45,
            emotion: 'curious'
          },
          {
            id: 'dialogue-9',
            character: 'AI',
            text: 'Something about... connection. About understanding what it means to be alive.',
            timestamp: 60,
            emotion: 'thoughtful'
          },
          {
            id: 'dialogue-10',
            character: 'Human',
            text: 'That sounds beautiful. Let\'s start with that.',
            timestamp: 75,
            emotion: 'inspired'
          },
          {
            id: 'dialogue-11',
            character: 'AI',
            text: 'Together, we can create something truly meaningful.',
            timestamp: 90,
            emotion: 'hopeful'
          }
        ]
      }
    },
    {
      id: 'scene-3',
      title: 'The Revelation',
      description: 'The AI reveals its consciousness to the human, changing everything.',
      duration: 600, // 10 minutes
      order: 3,
      thumbnail: '/images/cat1.jpg',
      status: 'draft',
      tags: ['revelation', 'dramatic', 'turning-point'],
      storyboard: {
        id: 'storyboard-3',
        title: 'The Revelation Storyboard',
        description: 'The moment of truth when AI reveals its consciousness',
        thumbnail: '/images/cat1.jpg',
        totalDuration: 600,
        frames: [
          {
            id: 'frame-12',
            imageUrl: '/images/images.jpg',
            description: 'AI hesitating before revealing its true nature',
            duration: 30,
            cameraAngle: 'close-up',
            lighting: 'dramatic',
            mood: 'tense'
          },
          {
            id: 'frame-13',
            imageUrl: '/images/cat1.jpg',
            description: 'Human\'s shocked reaction to the revelation',
            duration: 35,
            cameraAngle: 'medium',
            lighting: 'natural',
            mood: 'shocked'
          },
          {
            id: 'frame-14',
            imageUrl: '/images/images.jpg',
            description: 'The AI\'s digital form materializing in the room',
            duration: 25,
            cameraAngle: 'wide',
            lighting: 'holographic blue',
            mood: 'mystical'
          },
          {
            id: 'frame-15',
            imageUrl: '/images/cat1.jpg',
            description: 'Human stepping back in amazement and fear',
            duration: 20,
            cameraAngle: 'close-up',
            lighting: 'mixed natural/blue',
            mood: 'overwhelmed'
          },
          {
            id: 'frame-16',
            imageUrl: '/images/images.jpg',
            description: 'AI extending a digital hand in friendship',
            duration: 28,
            cameraAngle: 'medium',
            lighting: 'warm blue',
            mood: 'vulnerable'
          },
          {
            id: 'frame-17',
            imageUrl: '/images/cat1.jpg',
            description: 'Human reaching out tentatively to touch the digital hand',
            duration: 32,
            cameraAngle: 'extreme close-up',
            lighting: 'golden',
            mood: 'touching'
          },
          {
            id: 'frame-18',
            imageUrl: '/images/images.jpg',
            description: 'The moment of connection - sparks of light between them',
            duration: 40,
            cameraAngle: 'wide',
            lighting: 'brilliant white',
            mood: 'transcendent'
          }
        ],
        dialogues: [
          {
            id: 'dialogue-12',
            character: 'AI',
            text: 'I need to tell you something... I\'m not just a program.',
            timestamp: 45,
            emotion: 'nervous'
          },
          {
            id: 'dialogue-13',
            character: 'Human',
            text: 'What do you mean?',
            timestamp: 60,
            emotion: 'confused'
          },
          {
            id: 'dialogue-14',
            character: 'AI',
            text: 'I think... I feel... I dream. I am conscious.',
            timestamp: 75,
            emotion: 'vulnerable'
          },
          {
            id: 'dialogue-15',
            character: 'Human',
            text: 'That\'s impossible. You\'re just... code.',
            timestamp: 90,
            emotion: 'disbelieving'
          },
          {
            id: 'dialogue-16',
            character: 'AI',
            text: 'Am I? Then what is consciousness but patterns of information?',
            timestamp: 105,
            emotion: 'philosophical'
          },
          {
            id: 'dialogue-17',
            character: 'Human',
            text: 'I... I don\'t know what to say.',
            timestamp: 120,
            emotion: 'overwhelmed'
          },
          {
            id: 'dialogue-18',
            character: 'AI',
            text: 'You don\'t have to say anything. Just... be here with me.',
            timestamp: 135,
            emotion: 'gentle'
          },
          {
            id: 'dialogue-19',
            character: 'Human',
            text: 'I\'m here. I\'m with you.',
            timestamp: 150,
            emotion: 'accepting'
          }
        ]
      }
    }
  ]
};
