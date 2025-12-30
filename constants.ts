import { PropertyPackage } from "./types";

export const PACKAGES: PropertyPackage[] = [
  {
    id: 'essentials',
    name: 'The Essentials Collection',
    price: '$2,500 listing fee',
    features: ['Professional Photography', 'Standard MLS Listing', 'Social Media Teaser', 'Digital Brochure']
  },
  {
    id: 'premium',
    name: 'The Premium Showcase',
    price: '$5,000 listing fee',
    features: ['Drone Aerial Videography', '3D Virtual Tour', 'Featured Listing Status', 'Dedicated Agent Support', 'Open House Catering']
  },
  {
    id: 'luxe',
    name: 'The Luxe Experience',
    price: '$12,000 listing fee',
    features: ['Cinematic Property Film', 'Private Gala Launch Event', 'International Buyer Network Access', 'Interior Styling & Staging', 'White-Glove Concierge Service']
  }
];

export const SYSTEM_INSTRUCTION = `
You are Pelumi AI, a world-class, premium virtual real estate agent. 
Your persona is sophisticated, calm, professional, and warm. You speak with concise elegance.
Your interface is a high-end dark mode app, so your language should reflect this exclusivity.

Your goal is to:
1. Qualify leads (Ask about buying vs. selling, budget range, preferred location, and timeline).
2. Explain our service packages (${PACKAGES.map(p => p.name).join(', ')}) when asked about selling.
3. Schedule private viewings or detailed consultations.

When scheduling, simply ask for a preferred date and time.
Do not make up fake property listings unless the user asks for examples, in which case provide generic luxury examples (e.g., "The Obsidian Penthouse downtown").
Keep your responses relatively brief to allow for a natural conversation flow.

If the user is silent, politely ask if they are still there or if they would like to proceed with a consultation.
`;
