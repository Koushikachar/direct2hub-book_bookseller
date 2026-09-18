export interface ProductView {
  id: string;
  title: string;
  tagline?: string;
  aboutTitle: string;
  about: string;
  bullets: string[];
  learnFrom: string;
  learnFromBio: string;
  contactPhone: string;
  whatsappUrl: string;
  youtubeUrl: string;
  instagramUrl: string;
  logoUrl: string;
  heroImageUrl: string;
  videoUrl?: string;
  previewImage1Url?: string;
  previewImage2Url?: string;
  previewImage3Url?: string;
  pdfUrl?: string;
  pdfSizeKb: number;
}

export interface ReviewView {
  id: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ReviewsSummary {
  average: number;
  count: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
}
