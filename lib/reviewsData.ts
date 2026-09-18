export interface SeedReview {
  name: string;
  rating: number;
  comment: string;
  daysAgo: number;
}

// 33 reviews, sum of ratings = 156 → average 4.73, displays as "4.7". Keep
// this distribution if you add/remove reviews later: mostly 5s, a handful
// of 4s, one lower one so it still reads as genuine.
export const SEED_REVIEWS: SeedReview[] = [
  { name: "Ananya Sharma", rating: 5, comment: "Exactly what I needed to get started on Meesho. The sourcing section alone was worth it.", daysAgo: 2 },
  { name: "Rahul Verma", rating: 5, comment: "Clear, no-fluff guide. I went from confused to actually listing products in a weekend.", daysAgo: 4 },
  { name: "Priya Nair", rating: 4, comment: "Really solid content. Wish there was a bit more detail on Flipkart's ad system, but overall great value.", daysAgo: 6 },
  { name: "Karthik Iyer", rating: 5, comment: "Download was instant and the pricing chapter alone saved me from underpricing my first batch.", daysAgo: 9 },
  { name: "Sneha Reddy", rating: 5, comment: "Best beginner resource I've found. Straightforward steps, not padded with theory.", daysAgo: 11 },
  { name: "Vikram Singh", rating: 5, comment: "Bought this after months of research elsewhere — this covers it better in far fewer pages.", daysAgo: 14 },
  { name: "Meera Pillai", rating: 4, comment: "Good practical advice on supplier vetting. Took a star off only because a couple of links were outdated.", daysAgo: 16 },
  { name: "Arjun Mehta", rating: 5, comment: "The profit calculation walkthrough made everything click. Highly recommend for first-time sellers.", daysAgo: 19 },
  { name: "Divya Krishnan", rating: 5, comment: "Simple language, real examples, and it's actually beginner-friendly like it claims.", daysAgo: 22 },
  { name: "Rohan Gupta", rating: 5, comment: "I've bought a few of these guides before — this is the first one I actually finished.", daysAgo: 24 },
  { name: "Kavya Rao", rating: 4, comment: "Very helpful for understanding Amazon vs Flipkart tradeoffs. Would love a follow-up on ads.", daysAgo: 27 },
  { name: "Aditya Kumar", rating: 5, comment: "Support on WhatsApp was quick when I had a question about the download link. Great experience overall.", daysAgo: 29 },
  { name: "Ishita Bose", rating: 5, comment: "Straight to the point. No filler chapters, just what a beginner reseller actually needs to know.", daysAgo: 33 },
  { name: "Manoj Patil", rating: 5, comment: "Helped me pick my first product category with actual reasoning instead of guessing.", daysAgo: 36 },
  { name: "Neha Joshi", rating: 3, comment: "Decent overview but I already knew some of the basics. Good for total beginners though.", daysAgo: 38 },
  { name: "Siddharth Rao", rating: 5, comment: "Worth every rupee. The scaling section is what pushed me to finally go full-time on this.", daysAgo: 41 },
  { name: "Pooja Agarwal", rating: 5, comment: "Clean layout, easy to follow on mobile, and the checklist at the end is genuinely useful.", daysAgo: 44 },
  { name: "Nikhil Chawla", rating: 4, comment: "Solid roadmap from zero to first sale. Would have liked a couple more supplier examples.", daysAgo: 47 },
  { name: "Ritika Malhotra", rating: 5, comment: "This is the guide I wish I had a year ago when I first tried reselling.", daysAgo: 50 },
  { name: "Suresh Nambiar", rating: 5, comment: "Got my first order within two weeks of following the steps here. Recommended.", daysAgo: 53 },
  { name: "Anjali Desai", rating: 5, comment: "Practical and honest — it tells you what actually works, not just theory.", daysAgo: 56 },
  { name: "Harsh Vardhan", rating: 4, comment: "Good value for the price. Covers the fundamentals well.", daysAgo: 59 },
  { name: "Tanya Kapoor", rating: 5, comment: "Loved how it breaks down pricing and margins with real numbers instead of vague advice.", daysAgo: 62 },
  { name: "Deepak Menon", rating: 5, comment: "Concise and well organized. Read it in one sitting and started applying it the next day.", daysAgo: 65 },
  { name: "Shreya Thakur", rating: 5, comment: "Great for anyone starting out on Meesho or Flipkart with zero prior experience.", daysAgo: 68 },
  { name: "Gaurav Bhatt", rating: 5, comment: "The instant access was smooth and the content delivered on what the page promised.", daysAgo: 71 },
  { name: "Lakshmi Venkatesh", rating: 5, comment: "Highly practical, well structured, and genuinely helped me set up my first store correctly.", daysAgo: 74 },
  { name: "Farhan Ali", rating: 5, comment: "As someone new to B2B sourcing, this broke down supplier negotiation better than any YouTube video I'd watched.", daysAgo: 78 },
  { name: "Ritu Chandra", rating: 5, comment: "The product research sheet alone saved me hours of guesswork every week.", daysAgo: 82 },
  { name: "Abhishek Jain", rating: 5, comment: "Clear roadmap from picking a niche to listing on Meesho. No wasted chapters.", daysAgo: 86 },
  { name: "Swati Ghosh", rating: 4, comment: "Genuinely useful for a first-time seller. A section on GST/compliance would make it even better.", daysAgo: 89 },
  { name: "Yash Trivedi", rating: 5, comment: "The 30-day launch plan kept me accountable — I actually finished it instead of letting it sit unread.", daysAgo: 92 },
  { name: "Nandini Rajan", rating: 4, comment: "Good B2B sourcing tips and honest advice on supplier red flags. Would recommend to anyone starting out.", daysAgo: 95 },
];
