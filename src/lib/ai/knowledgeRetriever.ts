import fs from 'fs';
import path from 'path';
import { ScientificContext } from '../contracts/scientificContext';

export interface RetrievedDocument {
  doc_id: string;
  title: string;
  category: string;
  source_file: string;
  excerpt: string;
  relevance_score: number;
  matched_tags: string[];
}

interface ParsedNote {
  doc_id: string;
  title: string;
  category: string;
  tags: string[];
  content: string;
  source_file: string;
  sections: { heading: string; body: string }[];
}

let cachedNotes: ParsedNote[] | null = null;

function getKnowledgeDir(): string {
  // Check common server paths for the knowledge directory
  const candidates = [
    path.join(process.cwd(), 'knowledge'),
    path.join(process.cwd(), 'src', 'knowledge'),
    path.join(__dirname, '..', '..', '..', 'knowledge'),
    path.join(__dirname, '..', 'knowledge'),
    path.resolve('d:/integration/integration/rsg-hazardguard/knowledge')
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  // Fallback to primary expected path
  return path.resolve('d:/integration/integration/rsg-hazardguard/knowledge');
}

function parseMarkdownNote(filePath: string): ParsedNote | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    const docId = fileName.replace(/\.md$/i, '');

    // Parse YAML frontmatter if present
    let title = docId;
    let category = 'general';
    let tags: string[] = [];
    let content = raw;

    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (fmMatch) {
      const fmContent = fmMatch[1];
      content = fmMatch[2];

      for (const line of fmContent.split('\n')) {
        const [k, ...rest] = line.split(':');
        if (k && rest.length > 0) {
          const key = k.trim().toLowerCase();
          const val = rest.join(':').trim().replace(/^["']|["']$/g, '');
          if (key === 'title') title = val;
          else if (key === 'category') category = val;
          else if (key === 'tags') {
            try {
              tags = JSON.parse(val.replace(/'/g, '"'));
            } catch {
              tags = val.split(',').map((t) => t.trim());
            }
          }
        }
      }
    }

    // Split into sections by heading
    const sections: { heading: string; body: string }[] = [];
    const sectionRegex = /(?:^|\n)(#{1,3}\s+[^\n]+)/g;
    let lastIdx = 0;
    let lastHeading = 'Introduction';
    let match: RegExpExecArray | null;

    while ((match = sectionRegex.exec(content)) !== null) {
      const body = content.substring(lastIdx, match.index).trim();
      if (body) {
        sections.push({ heading: lastHeading, body });
      }
      lastHeading = match[1].replace(/^#{1,3}\s+/, '').trim();
      lastIdx = match.index + match[0].length;
    }
    const finalBody = content.substring(lastIdx).trim();
    if (finalBody) {
      sections.push({ heading: lastHeading, body: finalBody });
    }

    return {
      doc_id: docId,
      title,
      category,
      tags,
      content,
      source_file: fileName,
      sections
    };
  } catch (err) {
    console.warn(`[KnowledgeRetriever] Failed to parse note at ${filePath}:`, err);
    return null;
  }
}

function loadAllNotes(): ParsedNote[] {
  if (cachedNotes) return cachedNotes;

  const kDir = getKnowledgeDir();
  if (!fs.existsSync(kDir)) {
    console.warn(`[KnowledgeRetriever] Knowledge directory not found at ${kDir}`);
    return [];
  }

  const files = fs.readdirSync(kDir).filter((f) => f.endsWith('.md'));
  const notes: ParsedNote[] = [];

  for (const f of files) {
    const note = parseMarkdownNote(path.join(kDir, f));
    if (note) notes.push(note);
  }

  cachedNotes = notes;
  return notes;
}

/**
 * Server-side knowledge retriever that selects authoritative Obsidian notes
 * grounded in the active user query and the runtime ScientificContext.
 */
export function retrieveRelevantKnowledge(
  query: string,
  context?: ScientificContext,
  maxDocs: number = 3
): RetrievedDocument[] {
  const notes = loadAllNotes();
  if (notes.length === 0) return [];

  const lowerQuery = (query || '').toLowerCase();
  const scored: Array<{ note: ParsedNote; score: number; matchedTags: string[]; bestExcerpt: string }> = [];

  for (const note of notes) {
    let score = 0;
    const matchedTags: string[] = [];

    // Tag matching against query
    for (const t of note.tags) {
      if (lowerQuery.includes(t.toLowerCase())) {
        score += 3.0;
        matchedTags.push(t);
      }
    }

    // Title / category match
    if (lowerQuery.includes(note.title.toLowerCase()) || lowerQuery.includes(note.doc_id.toLowerCase())) {
      score += 4.0;
    }

    // Query terms in content
    const queryWords = lowerQuery.split(/\s+/).filter((w) => w.length > 3);
    for (const w of queryWords) {
      if (note.content.toLowerCase().includes(w)) {
        score += 0.5;
      }
    }

    // Context-driven thematic boosting
    if (context) {
      // WeatherNext provider boosting
      if (
        (context.provider.includes('weathernext') || context.provider === 'weathernext3_statistics') &&
        (note.doc_id === 'models' || note.doc_id === 'interpretation_guidance')
      ) {
        score += 3.5;
        matchedTags.push('weathernext_accumulation');
      }

      // Fallback or uncalibrated status boosting
      if (
        (context.fallback || context.calibration_status.includes('UNCALIBRATED')) &&
        (note.doc_id === 'limitations' || note.doc_id === 'methodology')
      ) {
        score += 2.0;
        matchedTags.push('uncalibrated_limits');
      }

      // Unavailable hazards / UNKNOWN boosting
      if (
        context.unavailable_hazard_models &&
        context.unavailable_hazard_models.length > 0 &&
        note.doc_id === 'limitations'
      ) {
        score += 2.5;
        matchedTags.push('unsupported_models');
      }

      // Scenarios / Custom simulation boosting
      if (
        (context.simulation?.is_custom_scenario || context.simulation?.comparison) &&
        (note.doc_id === 'methodology' || note.doc_id === 'interpretation_guidance')
      ) {
        score += 3.0;
        matchedTags.push('scenarios_guidance');
      }

      // Verification boosting
      if (
        (lowerQuery.includes('verification') || lowerQuery.includes('rmse') || lowerQuery.includes('csi')) &&
        (note.doc_id === 'terminology' || note.doc_id === 'provenance')
      ) {
        score += 3.0;
        matchedTags.push('verification_metrics');
      }

      // Thresholds boosting
      if (
        (lowerQuery.includes('threshold') || lowerQuery.includes('moderate') || lowerQuery.includes('heavy')) &&
        note.doc_id === 'thresholds'
      ) {
        score += 4.0;
        matchedTags.push('threshold_hierarchy');
      }
    }

    // Pick best section excerpt
    let bestExcerpt = note.content.substring(0, 500);
    for (const sec of note.sections) {
      const lowerHeading = sec.heading.toLowerCase();
      const lowerBody = sec.body.toLowerCase();
      let secScore = 0;
      for (const w of queryWords) {
        if (lowerHeading.includes(w)) secScore += 2;
        if (lowerBody.includes(w)) secScore += 1;
      }
      if (secScore > 0) {
        bestExcerpt = `### ${sec.heading}\n${sec.body.substring(0, 450)}...`;
        break;
      }
    }

    scored.push({
      note,
      score,
      matchedTags,
      bestExcerpt
    });
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Take top N
  return scored.slice(0, maxDocs).map((item) => ({
    doc_id: item.note.doc_id,
    title: item.note.title,
    category: item.note.category,
    source_file: item.note.source_file,
    excerpt: item.bestExcerpt,
    relevance_score: Math.round(item.score * 10) / 10,
    matched_tags: Array.from(new Set(item.matchedTags))
  }));
}
