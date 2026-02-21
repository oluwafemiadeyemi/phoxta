'use client'

import { XenoTemplatePreview, XenoAiPreview, XenoDsPreview, XenoMaPreview, XenoWaPreview, XenoMinPreview, XenoSuPreview, XenoPfPreview, XenoCoPreview, XenoRePreview, XenoInfPreview, XenoLawPreview, XenoFitPreview, XenoEduPreview, XenoMedPreview, XenoEvPreview, XenoRlPreview, XenoPhPreview, XenoTraPreview, XenoEcoPreview, XenoMusPreview, XenoBarPreview, XenoCafePreview, XenoPetPreview, XenoArcPreview, XenoYogPreview, XenoAutPreview, XenoDenPreview, XenoFloPreview, XenoBakPreview, XenoSpaPreview, XenoNgoPreview, XenoPodPreview, XenoCryPreview, XenoFasPreview, XenoIntPreview, XenoDjPreview, XenoAccPreview, XenoPlmPreview, XenoDayPreview, XenoChuPreview, XenoInsPreview, XenoVetPreview, XenoPhrPreview, XenoLogPreview, XenoAgrPreview, XenoWnePreview, XenoBrwPreview, XenoTatPreview, XenoClnPreview, XenoSecPreview, XenoMovPreview, XenoWedPreview, XenoHtlPreview, XenoGolPreview, XenoMarPreview, XenoDncPreview, XenoThrPreview, XenoMsmPreview, XenoRecPreview, XenoBldPreview, XenoSolPreview, XenoJwlPreview, XenoOptPreview, XenoChiPreview, XenoPsyPreview, XenoNutPreview, XenoCokPreview, XenoLndPreview, XenoPrnPreview, XenoCwhPreview, XenoLauPreview, XenoNrsPreview, XenoGrcPreview, XenoBksPreview, XenoGamPreview, XenoSptPreview, XenoCamPreview, XenoDivPreview, XenoBnkPreview, XenoAptPreview } from './XenoTemplatePreview'

// ---------------------------------------------------------------------------
// Shared types & helpers
// ---------------------------------------------------------------------------
export type TemplateId = 'xeno' | 'xenoAi' | 'xenoDs' | 'xenoMa' | 'xenoWa' | 'xenoMin' | 'xenoSu' | 'xenoPf' | 'xenoCo' | 'xenoRe' | 'xenoInf' | 'xenoLaw' | 'xenoFit' | 'xenoEdu' | 'xenoMed' | 'xenoEv' | 'xenoRl' | 'xenoPh' | 'xenoTra' | 'xenoEco' | 'xenoMus' | 'xenoBar' | 'xenoCafe' | 'xenoPet' | 'xenoArc' | 'xenoYog' | 'xenoAut' | 'xenoDen' | 'xenoFlo' | 'xenoBak' | 'xenoSpa' | 'xenoNgo' | 'xenoPod' | 'xenoCry' | 'xenoFas' | 'xenoInt' | 'xenoDj' | 'xenoAcc' | 'xenoPlm' | 'xenoDay' | 'xenoChu' | 'xenoIns' | 'xenoVet' | 'xenoPhr' | 'xenoLog' | 'xenoAgr' | 'xenoWne' | 'xenoBrw' | 'xenoTat' | 'xenoCln' | 'xenoSec' | 'xenoMov' | 'xenoWed' | 'xenoHtl' | 'xenoGol' | 'xenoMar' | 'xenoDnc' | 'xenoThr' | 'xenoMsm' | 'xenoRec' | 'xenoBld' | 'xenoSol' | 'xenoJwl' | 'xenoOpt' | 'xenoChi' | 'xenoPsy' | 'xenoNut' | 'xenoCok' | 'xenoLnd' | 'xenoPrn' | 'xenoCwh' | 'xenoLau' | 'xenoNrs' | 'xenoGrc' | 'xenoBks' | 'xenoGam' | 'xenoSpt' | 'xenoCam' | 'xenoDiv' | 'xenoBnk' | 'xenoApt'

export interface TemplateInfo {
  id: TemplateId
  name: string
  description: string
  preview: string // emoji preview
}

export const TEMPLATES: TemplateInfo[] = [
  { id: 'xeno', name: 'Agency', description: 'Creative agency template with services, projects & awards', preview: '🎨' },
  { id: 'xenoAi', name: 'AI Agency', description: 'Tech & AI solutions template with features, pricing & FAQ', preview: '🤖' },
  { id: 'xenoDs', name: 'Design Studio', description: 'Design studio template with projects, team & awards', preview: '🖌️' },
  { id: 'xenoMa', name: 'Marketing', description: 'Marketing agency template with work process, projects & blog', preview: '📣' },
  { id: 'xenoWa', name: 'Web Agency', description: 'Web design agency template with services, process & FAQ', preview: '🌐' },
  { id: 'xenoMin', name: 'Minimal', description: 'Ultra-clean minimal design studio with monochrome palette', preview: '⬛' },
  { id: 'xenoSu', name: 'Startup', description: 'Modern SaaS startup with gradient hero, pricing & FAQ', preview: '🚀' },
  { id: 'xenoPf', name: 'Portfolio', description: 'Personal portfolio with warm tones, skills & testimonials', preview: '📂' },
  { id: 'xenoCo', name: 'Consulting', description: 'Premium consulting firm with navy & gold professional look', preview: '💼' },
  { id: 'xenoRe', name: 'Restaurant', description: 'Fine dining restaurant with elegant menu, gallery & reservations', preview: '🍽️' },
  { id: 'xenoInf', name: 'Influencer', description: 'Influencer & creator personal brand with content grid, collabs & media kit', preview: '⭐' },
  { id: 'xenoLaw', name: 'Law Firm', description: 'Professional law firm with practice areas, attorneys & testimonials', preview: '⚖️' },
  { id: 'xenoFit', name: 'Fitness', description: 'Bold gym & fitness template with programs, trainers & pricing', preview: '💪' },
  { id: 'xenoEdu', name: 'Education', description: 'Online courses & education with course grid, instructors & stats', preview: '📚' },
  { id: 'xenoMed', name: 'Medical', description: 'Healthcare & medical clinic with departments, doctors & appointments', preview: '🏥' },
  { id: 'xenoEv', name: 'Events', description: 'Elegant wedding & event planner with portfolio, process & testimonials', preview: '💒' },
  { id: 'xenoRl', name: 'Real Estate', description: 'Luxury real estate with property listings, agents & testimonials', preview: '🏠' },
  { id: 'xenoPh', name: 'Photography', description: 'Photography studio with gallery, services & awards', preview: '📸' },
  { id: 'xenoTra', name: 'Travel', description: 'Vibrant travel agency with destinations, features & newsletter', preview: '✈️' },
  { id: 'xenoEco', name: 'Eco Shop', description: 'Sustainable living & eco-friendly products with impact stats & mission', preview: '🌿' },
  { id: 'xenoMus', name: 'Music', description: 'Band & music template with discography, tour dates & gallery', preview: '🎵' },
  { id: 'xenoBar', name: 'Barber', description: 'Vintage barbershop with services, pricing & appointments', preview: '💈' },
  { id: 'xenoCafe', name: 'Coffee Shop', description: 'Cozy café with menu, roasting story & warm aesthetics', preview: '☕' },
  { id: 'xenoPet', name: 'Pet Care', description: 'Friendly pet care with services, team & testimonials', preview: '🐾' },
  { id: 'xenoArc', name: 'Architecture', description: 'Minimalist architecture studio with projects & philosophy', preview: '🏛️' },
  { id: 'xenoYog', name: 'Yoga', description: 'Serene yoga & wellness studio with classes & schedule', preview: '🧘' },
  { id: 'xenoAut', name: 'Automotive', description: 'Bold automotive dealership with inventory & services', preview: '🚗' },
  { id: 'xenoDen', name: 'Dental', description: 'Clean dental clinic with services, team & appointments', preview: '🦷' },
  { id: 'xenoFlo', name: 'Florist', description: 'Elegant flower shop with arrangements & seasonal collections', preview: '🌸' },
  { id: 'xenoBak', name: 'Bakery', description: 'Warm bakery with menu, specialties & cozy atmosphere', preview: '🧁' },
  { id: 'xenoSpa', name: 'Spa', description: 'Luxurious spa & beauty salon with treatments & packages', preview: '💆' },
  { id: 'xenoNgo', name: 'Charity', description: 'Compassionate charity with causes, impact stats & donations', preview: '❤️' },
  { id: 'xenoPod', name: 'Podcast', description: 'Modern podcast with episodes, platforms & subscriptions', preview: '🎙️' },
  { id: 'xenoCry', name: 'Crypto', description: 'Futuristic crypto & Web3 platform with features & markets', preview: '🪙' },
  { id: 'xenoFas', name: 'Fashion', description: 'High-end fashion house with collection & editorial lookbook', preview: '👗' },
  { id: 'xenoInt', name: 'Interior', description: 'Sophisticated interior design with projects & services', preview: '🛋️' },
  { id: 'xenoDj', name: 'DJ / Nightclub', description: 'Vibrant DJ & nightclub with events, music & booking', preview: '🎧' },
  { id: 'xenoAcc', name: 'Accounting', description: 'Professional accounting firm with services & trust stats', preview: '📊' },
  { id: 'xenoPlm', name: 'Home Services', description: 'Reliable home repair & maintenance with services & booking', preview: '🔧' },
  { id: 'xenoDay', name: 'Daycare', description: 'Warm daycare & preschool with programs & gallery', preview: '👶' },
  { id: 'xenoChu', name: 'Church', description: 'Welcoming church with ministries, events & service times', preview: '⛪' },
  { id: 'xenoIns', name: 'Insurance', description: 'Professional insurance agency with coverage plans & trust stats', preview: '🛡️' },
  { id: 'xenoVet', name: 'Veterinary', description: 'Friendly veterinary clinic with services, team & appointments', preview: '🐕' },
  { id: 'xenoPhr', name: 'Pharmacy', description: 'Modern pharmacy with services, health programs & prescriptions', preview: '💊' },
  { id: 'xenoLog', name: 'Logistics', description: 'Global logistics & shipping with tracking, fleet & stats', preview: '📦' },
  { id: 'xenoAgr', name: 'Agriculture', description: 'Sustainable agriculture with farm products & seasonal harvest', preview: '🌾' },
  { id: 'xenoWne', name: 'Winery', description: 'Elegant winery with wine collection, vineyard tours & tastings', preview: '🍷' },
  { id: 'xenoBrw', name: 'Brewery', description: 'Craft brewery with beer selection, taproom & brewery tours', preview: '🍺' },
  { id: 'xenoTat', name: 'Tattoo', description: 'Creative tattoo studio with styles, artists & gallery', preview: '✒️' },
  { id: 'xenoCln', name: 'Cleaning', description: 'Professional cleaning service with packages & booking', preview: '🧹' },
  { id: 'xenoSec', name: 'Security', description: 'Trusted security company with services, monitoring & stats', preview: '🔒' },
  { id: 'xenoMov', name: 'Moving', description: 'Reliable moving company with services, pricing & booking', preview: '🚚' },
  { id: 'xenoWed', name: 'Wedding', description: 'Stunning wedding venue with spaces, packages & gallery', preview: '💍' },
  { id: 'xenoHtl', name: 'Hotel', description: 'Luxury hotel with rooms, amenities & reservations', preview: '🏨' },
  { id: 'xenoGol', name: 'Golf', description: 'Premium golf club with course details, membership & pro shop', preview: '⛳' },
  { id: 'xenoMar', name: 'Martial Arts', description: 'Dynamic martial arts dojo with programs, ranks & schedule', preview: '🥋' },
  { id: 'xenoDnc', name: 'Dance', description: 'Vibrant dance studio with styles, instructors & schedule', preview: '💃' },
  { id: 'xenoThr', name: 'Theater', description: 'Dramatic theater with shows, seasons & ticket booking', preview: '🎭' },
  { id: 'xenoMsm', name: 'Museum', description: 'Cultural museum with exhibitions, collections & visitor info', preview: '🖼️' },
  { id: 'xenoRec', name: 'Recruiting', description: 'Professional recruiting agency with services, industries & stats', preview: '👔' },
  { id: 'xenoBld', name: 'Construction', description: 'Bold construction company with projects, services & safety', preview: '🏗️' },
  { id: 'xenoSol', name: 'Solar', description: 'Clean solar energy with panels, savings calculator & installations', preview: '☀️' },
  { id: 'xenoJwl', name: 'Jewelry', description: 'Elegant jewelry store with collections, craftsmanship & custom design', preview: '💎' },
  { id: 'xenoOpt', name: 'Optometry', description: 'Modern optometry clinic with eye care, eyewear & appointments', preview: '👓' },
  { id: 'xenoChi', name: 'Chiropractic', description: 'Professional chiropractic with treatments, wellness & scheduling', preview: '🦴' },
  { id: 'xenoPsy', name: 'Therapy', description: 'Compassionate therapy practice with specialties & appointments', preview: '🧠' },
  { id: 'xenoNut', name: 'Nutrition', description: 'Holistic nutrition counseling with programs, plans & recipes', preview: '🥗' },
  { id: 'xenoCok', name: 'Cooking School', description: 'Interactive cooking school with classes, chefs & enrollment', preview: '👨‍🍳' },
  { id: 'xenoLnd', name: 'Landscaping', description: 'Professional landscaping with services, projects & estimates', preview: '🌳' },
  { id: 'xenoPrn', name: 'Print Shop', description: 'Full-service print shop with products, services & ordering', preview: '🖨️' },
  { id: 'xenoCwh', name: 'Car Wash', description: 'Premium car wash with packages, memberships & locations', preview: '🚿' },
  { id: 'xenoLau', name: 'Laundry', description: 'Convenient laundry service with pickup, delivery & pricing', preview: '👕' },
  { id: 'xenoNrs', name: 'Senior Care', description: 'Compassionate senior care with programs, amenities & community', preview: '👴' },
  { id: 'xenoGrc', name: 'Grocery', description: 'Fresh grocery store with departments, local produce & delivery', preview: '🛒' },
  { id: 'xenoBks', name: 'Bookstore', description: 'Independent bookstore with genres, events & book clubs', preview: '📕' },
  { id: 'xenoGam', name: 'Gaming', description: 'Gaming lounge & esports arena with stations, tournaments & VR', preview: '🎮' },
  { id: 'xenoSpt', name: 'Sports Club', description: 'Multi-sport athletic club with programs, facilities & membership', preview: '⚽' },
  { id: 'xenoCam', name: 'Camping', description: 'Outdoor camping adventures with trips, gear rentals & guides', preview: '🏕️' },
  { id: 'xenoDiv', name: 'Diving', description: 'PADI diving center with courses, certifications & guided dives', preview: '🤿' },
  { id: 'xenoBnk', name: 'Banking', description: 'Modern banking with accounts, savings, loans & security', preview: '🏦' },
  { id: 'xenoApt', name: 'Apartments', description: 'Luxury apartments with floor plans, amenities & virtual tours', preview: '🏢' },
]

export interface TemplateProps {
  landingData: Record<string, unknown>
  setLandingData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>
  generatedImages: Record<string, string>
  approvedSections: Set<string>
  businessInfo: {
    contactEmail: string
    contactPhone: string
    location: string
    businessHours: string
    socialLinks: string
    ctaUrl: string
  }
  saveDay10State: (
    ld: Record<string, unknown>,
    img: Record<string, string>,
    ap: Set<string>,
    biz: TemplateProps['businessInfo'],
  ) => void
  findImageForSection: (name: string) => string | undefined
  stripMd: (s: string) => string
  colorScheme: { primary: string; secondary: string; accent: string; background: string; text: string }
  coverImage: string
  editedHtml?: string
  onEditedHtmlChange?: (html: string) => void
  ideaId?: string
}

// ---------------------------------------------------------------------------
// Template renderer map
// ---------------------------------------------------------------------------
export const TEMPLATE_RENDERERS: Record<TemplateId, React.FC<TemplateProps>> = {
  xeno: XenoTemplatePreview,
  xenoAi: XenoAiPreview,
  xenoDs: XenoDsPreview,
  xenoMa: XenoMaPreview,
  xenoWa: XenoWaPreview,
  xenoMin: XenoMinPreview,
  xenoSu: XenoSuPreview,
  xenoPf: XenoPfPreview,
  xenoCo: XenoCoPreview,
  xenoRe: XenoRePreview,
  xenoInf: XenoInfPreview,
  xenoLaw: XenoLawPreview,
  xenoFit: XenoFitPreview,
  xenoEdu: XenoEduPreview,
  xenoMed: XenoMedPreview,
  xenoEv: XenoEvPreview,
  xenoRl: XenoRlPreview,
  xenoPh: XenoPhPreview,
  xenoTra: XenoTraPreview,
  xenoEco: XenoEcoPreview,
  xenoMus: XenoMusPreview,
  xenoBar: XenoBarPreview,
  xenoCafe: XenoCafePreview,
  xenoPet: XenoPetPreview,
  xenoArc: XenoArcPreview,
  xenoYog: XenoYogPreview,
  xenoAut: XenoAutPreview,
  xenoDen: XenoDenPreview,
  xenoFlo: XenoFloPreview,
  xenoBak: XenoBakPreview,
  xenoSpa: XenoSpaPreview,
  xenoNgo: XenoNgoPreview,
  xenoPod: XenoPodPreview,
  xenoCry: XenoCryPreview,
  xenoFas: XenoFasPreview,
  xenoInt: XenoIntPreview,
  xenoDj: XenoDjPreview,
  xenoAcc: XenoAccPreview,
  xenoPlm: XenoPlmPreview,
  xenoDay: XenoDayPreview,
  xenoChu: XenoChuPreview,
  xenoIns: XenoInsPreview,
  xenoVet: XenoVetPreview,
  xenoPhr: XenoPhrPreview,
  xenoLog: XenoLogPreview,
  xenoAgr: XenoAgrPreview,
  xenoWne: XenoWnePreview,
  xenoBrw: XenoBrwPreview,
  xenoTat: XenoTatPreview,
  xenoCln: XenoClnPreview,
  xenoSec: XenoSecPreview,
  xenoMov: XenoMovPreview,
  xenoWed: XenoWedPreview,
  xenoHtl: XenoHtlPreview,
  xenoGol: XenoGolPreview,
  xenoMar: XenoMarPreview,
  xenoDnc: XenoDncPreview,
  xenoThr: XenoThrPreview,
  xenoMsm: XenoMsmPreview,
  xenoRec: XenoRecPreview,
  xenoBld: XenoBldPreview,
  xenoSol: XenoSolPreview,
  xenoJwl: XenoJwlPreview,
  xenoOpt: XenoOptPreview,
  xenoChi: XenoChiPreview,
  xenoPsy: XenoPsyPreview,
  xenoNut: XenoNutPreview,
  xenoCok: XenoCokPreview,
  xenoLnd: XenoLndPreview,
  xenoPrn: XenoPrnPreview,
  xenoCwh: XenoCwhPreview,
  xenoLau: XenoLauPreview,
  xenoNrs: XenoNrsPreview,
  xenoGrc: XenoGrcPreview,
  xenoBks: XenoBksPreview,
  xenoGam: XenoGamPreview,
  xenoSpt: XenoSptPreview,
  xenoCam: XenoCamPreview,
  xenoDiv: XenoDivPreview,
  xenoBnk: XenoBnkPreview,
  xenoApt: XenoAptPreview,
}

