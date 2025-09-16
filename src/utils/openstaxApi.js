// Minimal OpenStax API client using the public OpenStax books endpoint

// Use dev proxies to avoid CORS in development
const OPENSTAX_BOOKS_API = "/openstaxex/api/v1/books.json"; // Exercises API v1 JSON list of books

async function httpGetJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenStax request failed: ${res.status} ${res.statusText} - ${text.slice(0, 120)}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Expected JSON but received: ${contentType} - ${text.slice(0, 120)}`);
  }
  return res.json();
}

export async function listBooks() {
  const url = `${OPENSTAX_BOOKS_API}`;
  try {
    return await httpGetJson(url);
  } catch (err) {
    console.warn("Falling back to static OpenStax books due to API error:", err?.message || err);
    return { books: FALLBACK_BOOKS };
  }
}

export function findStemBooks(books) {
  // Simple filter heuristic by title keywords
  const stemKeywords = ["physics", "chemistry", "biology", "algebra", "calculus", "statistics", "astronomy", "anatomy", "microbiology", "college algebra", "precalculus", "trigonometry", "geology", "anatomy and physiology"];
  const lower = (s) => (s || "").toLowerCase();
  return (books || []).filter((b) => stemKeywords.some((k) => lower(b.title).includes(k)));
}

export function filterBooksBySubject(books, subjectQuery) {
  if (!subjectQuery) return books || [];
  const q = subjectQuery.toLowerCase();
  return (books || []).filter((b) => {
    // exercises API structure
    const title = b.title || b.name || '';
    const titleMatch = title.toLowerCase().includes(q);
    const subjects = Array.isArray(b.subjects) ? b.subjects : (Array.isArray(b.tags) ? b.tags : []);
    const subjectMatch = subjects.some((s) => (s || "").toLowerCase().includes(q));
    return titleMatch || subjectMatch;
  });
}

// Fallback curated list of common OpenStax STEM books
const FALLBACK_BOOKS = [
  { id: 'college-physics', title: 'College Physics', subjects: ['physics'], url: 'https://openstax.org/details/books/college-physics' },
  { id: 'university-physics-volume-1', title: 'University Physics Volume 1', subjects: ['physics'], url: 'https://openstax.org/details/books/university-physics-volume-1' },
  { id: 'university-physics-volume-2', title: 'University Physics Volume 2', subjects: ['physics'], url: 'https://openstax.org/details/books/university-physics-volume-2' },
  { id: 'university-physics-volume-3', title: 'University Physics Volume 3', subjects: ['physics'], url: 'https://openstax.org/details/books/university-physics-volume-3' },
  { id: 'chemistry-2e', title: 'Chemistry 2e', subjects: ['chemistry'], url: 'https://openstax.org/details/books/chemistry-2e' },
  { id: 'biology-2e', title: 'Biology 2e', subjects: ['biology'], url: 'https://openstax.org/details/books/biology-2e' },
  { id: 'algebra-and-trigonometry-2e', title: 'Algebra and Trigonometry 2e', subjects: ['algebra', 'trigonometry'], url: 'https://openstax.org/details/books/algebra-and-trigonometry-2e' },
  { id: 'precalculus-2e', title: 'Precalculus 2e', subjects: ['precalculus'], url: 'https://openstax.org/details/books/precalculus-2e' },
  { id: 'calculus-volume-1', title: 'Calculus Volume 1', subjects: ['calculus'], url: 'https://openstax.org/details/books/calculus-volume-1' },
  { id: 'calculus-volume-2', title: 'Calculus Volume 2', subjects: ['calculus'], url: 'https://openstax.org/details/books/calculus-volume-2' },
  { id: 'calculus-volume-3', title: 'Calculus Volume 3', subjects: ['calculus'], url: 'https://openstax.org/details/books/calculus-volume-3' },
  { id: 'introductory-statistics-2e', title: 'Introductory Statistics 2e', subjects: ['statistics'], url: 'https://openstax.org/details/books/introductory-statistics-2e' },
  { id: 'astronomy-2e', title: 'Astronomy 2e', subjects: ['astronomy'], url: 'https://openstax.org/details/books/astronomy-2e' },
  { id: 'geology', title: 'Geology', subjects: ['geology'], url: 'https://openstax.org/details/books/geology' },
  { id: 'anatomy-and-physiology-2e', title: 'Anatomy and Physiology 2e', subjects: ['anatomy'], url: 'https://openstax.org/details/books/anatomy-and-physiology-2e' },
];


