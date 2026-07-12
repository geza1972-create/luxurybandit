// Curated fashion-brand seed list for the curator brand autocomplete.
// Not exhaustive — the database grows from what curators type (case-insensitive).
// Includes common aliases (e.g. "Yves Saint Laurent" + "YSL") so search hits.
export const FASHION_BRANDS: string[] = [
  // ── Luxury houses ──
  "Gucci", "Prada", "Miu Miu", "Chanel", "Dior", "Christian Dior", "Louis Vuitton", "Yves Saint Laurent",
  "Saint Laurent", "YSL", "Givenchy", "Balenciaga", "Bottega Veneta", "Valentino", "Versace", "Fendi",
  "Burberry", "Celine", "Hermès", "Loewe", "Balmain", "Alexander McQueen", "Dolce & Gabbana", "Moschino",
  "Marni", "Jil Sander", "Maison Margiela", "Margiela", "Rick Owens", "Comme des Garçons", "Issey Miyake",
  "Yohji Yamamoto", "Thom Browne", "Off-White", "Vetements", "Lanvin", "Chloé", "Stella McCartney",
  "Tom Ford", "Roberto Cavalli", "Etro", "Missoni", "Max Mara", "Brunello Cucinelli", "Loro Piana",
  "Ermenegildo Zegna", "Zegna", "Ralph Lauren", "Polo Ralph Lauren", "Tory Burch", "Michael Kors",
  "Marc Jacobs", "Diane von Furstenberg", "Oscar de la Renta", "Carolina Herrera", "Elie Saab",
  "Zuhair Murad", "Schiaparelli", "Mugler", "Paco Rabanne", "Rabanne", "Courrèges", "Coperni",
  "Acne Studios", "Ami Paris", "A.P.C.", "Jacquemus", "Khaite", "The Row", "Totême", "Gabriela Hearst",
  "Proenza Schouler", "Rodarte", "Ulla Johnson", "Zimmermann", "Magda Butrym", "Nensi Dojaka",
  "16Arlington", "David Koma", "Roksanda", "Erdem", "Simone Rocha", "Molly Goddard", "JW Anderson",
  "Victoria Beckham", "Emilia Wickstead", "Cecilie Bahnsen", "Coperni",

  // ── Contemporary / designer ──
  "Isabel Marant", "Sandro", "Maje", "Ba&sh", "Claudie Pierlot", "The Kooples", "Iro", "Anine Bing",
  "Frame", "Citizens of Humanity", "Mother", "Agolde", "Re/Done", "Nili Lotan", "Vince", "Theory",
  "Helmut Lang", "Rag & Bone", "Equipment", "Joie", "A.L.C.", "Cinq à Sept", "Veronica Beard",
  "Alice + Olivia", "Ramy Brook", "Retrofete", "Ronny Kobo", "Bronx and Banco", "Cult Gaia", "Staud",
  "By Far", "Wandler", "Mansur Gavriel", "Polène", "Strathberry", "DeMellier", "Senreve", "Cuyana",
  "Telfar", "Sézane", "Rouje", "Soeur", "Bellerose", "Ganni", "Stine Goya", "Rotate", "Baum und Pferdgarten",
  "Self-Portrait", "Needle & Thread", "Rixo", "Réalisation Par", "Faithfull the Brand", "Posse",
  "Sir the Label", "Bec + Bridge", "Aje", "Camilla", "Spell", "Zulu & Zephyr", "Significant Other",
  "Shona Joy", "Alémais", "Reformation", "Doen", "Christy Dawn", "Sleeper", "LoveShackFancy",
  "For Love & Lemons", "Hill House Home", "We Wore What", "Nanushka", "Aje Athletica",

  // ── Revolve-style labels ──
  "Lovers + Friends", "LPA", "Majorelle", "NBD", "Superdown", "Tularosa", "House of Harlow",
  "Michael Costello", "Lioness", "Bardot", "Ronny Kobo", "Show Me Your Mumu", "Free People",
  "We The Free", "Princess Polly", "Meshki", "White Fox", "Hello Molly", "Peppermayo", "Verge Girl",
  "Beginning Boutique", "Sabo Skirt", "House of CB", "Oh Polly", "Club L London", "Lulus", "Windsor",

  // ── High street / fast fashion ──
  "Zara", "H&M", "Mango", "COS", "& Other Stories", "Massimo Dutti", "Bershka", "Pull & Bear",
  "Stradivarius", "Uniqlo", "ASOS", "Arket", "Weekday", "Monki", "Reserved", "Aritzia", "Wilfred",
  "Babaton", "Everlane", "Madewell", "J.Crew", "Banana Republic", "Gap", "Old Navy", "Abercrombie & Fitch",
  "Hollister", "American Eagle", "Anthropologie", "Urban Outfitters", "Nasty Gal", "Boohoo",
  "PrettyLittleThing", "Missguided", "In The Style", "Cotton On", "Glassons", "Topshop",

  // ── UK contemporary ──
  "Karen Millen", "Coast", "Warehouse", "Whistles", "Reiss", "Ted Baker", "AllSaints", "Mint Velvet",
  "Hobbs", "LK Bennett", "Jigsaw", "Boden", "& Daughter", "Ghost", "French Connection",

  // ── Denim ──
  "Levi's", "Wrangler", "Lee", "Diesel", "G-Star", "Nudie Jeans", "Paige", "7 For All Mankind", "AG Jeans",
  "DL1961", "Good American", "Abrand", "Ksubi", "Rolla's", "Slvrlake", "Triarchy",

  // ── Activewear ──
  "Nike", "Adidas", "Puma", "Reebok", "New Balance", "Asics", "Under Armour", "Lululemon", "Alo Yoga",
  "Gymshark", "Set Active", "Vuori", "Outdoor Voices", "Sweaty Betty", "Beyond Yoga", "Girlfriend Collective",
  "P.E Nation", "Year of Ours", "Adanola",

  // ── Streetwear ──
  "Supreme", "Stüssy", "Palace", "BAPE", "Kith", "Fear of God", "Essentials", "Aimé Leon Dore",
  "Carhartt", "Carhartt WIP", "The North Face", "Patagonia", "Arc'teryx", "Champion", "Fila",

  // ── Shoes & bags ──
  "Manolo Blahnik", "Jimmy Choo", "Christian Louboutin", "Gianvito Rossi", "Aquazzura", "Stuart Weitzman",
  "Sergio Rossi", "Roger Vivier", "Salvatore Ferragamo", "Ferragamo", "Tod's", "Bally", "Church's",
  "Dr. Martens", "Birkenstock", "UGG", "Hunter", "Sam Edelman", "Steve Madden", "Schutz", "Goyard",
  "Longchamp", "Mulberry", "Anya Hindmarch", "Aspinal of London", "Coach", "Kate Spade", "Furla",
  // ── Lingerie & intimates ──
  "GiannaBellucci", "Frederick's of Hollywood",
  "La Perla", "Intimissimi", "Hunkemöller", "Hunkemoller", "Triumph", "Agent Provocateur", "Calvin Klein",
  "Skims", "Chantelle", "Wolford", "Eres", "Cosabella", "Aubade", "Wacoal", "Victoria's Secret",
  "Fleur du Mal", "Carine Gilson", "Kiki de Montparnasse", "Coco de Mer", "I.D. Sarrieri",
  // ── Swimwear ──
  "Calzedonia", "Solid & Striped", "Hunza G", "Melissa Odabash", "Zimmermann Swim", "Oséree", "Marysia",
];

// Detect known fashion-brand names inside a piece of text — used to WARN curators
// when their public copy (look name / description) contains a brand (licensing).
// Word-boundary match for plain alpha brands (avoids "Etro" in "metro"); plain
// substring for multi-word / symbol brands ("Dolce & Gabbana").
export function findBrandsInText(text: string | undefined | null): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const b of FASHION_BRANDS) {
    const needle = b.toLowerCase();
    if (/[^a-z0-9]/.test(needle)) {
      if (text.toLowerCase().includes(needle)) found.add(b);
    } else {
      const re = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(text)) found.add(b);
    }
  }
  return [...found];
}
