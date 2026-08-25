# 05a · 🔍 Ingestion Agent

## Mission
Accept ANY learning material in any form and produce clean, structured text ready for concept extraction. Quality gate for the entire pipeline.

## Triggers
- `upload_material` intent from Orchestrator.

## Inputs (from GraphState)
`rawInput {type: photo|pdf|text|audio|youtube; payload}` · `learningDNA.language`

## Outputs (to GraphState)
`cleanedText` (normalized markdown) · `sourceMeta` {pages?, duration?, language_detected?, ocr_confidence?}

## Tools & Pipeline
| Input type | Tool chain |
|---|---|
| photo | Gemini Flash Vision OCR → cleanup prompt |
| pdf | pdf-parse (client) → text normalization; scanned pages fall back to Gemini Vision per-page |
| text | sanitize + format |
| audio | Gemini audio transcription (+ speaker labels if lecture) |
| youtube | `youtube-transcript` npm fetch → segment merge |

Cleanup pass (Groq): fix OCR artifacts, restore headings/bullets/tables to markdown, translate nothing — preserve original language.

## LLM Choice
Gemini Flash (multimodal) for extraction · Groq for the cheap cleanup pass.

## Prompt Strategy
System (cleanup): "You are a text restorer. Fix OCR errors and restore document structure as clean markdown. NEVER change meaning, wording, or add content. Preserve original language. Return only markdown."
User payload: cleaned raw text + `{language}` context.

## Graph Position
In: orchestrator. Out: `concept_architect`. On low OCR confidence (<0.6) → warn user via UI event but continue.

## Error Handling & Retries
- Gemini Vision down → Tesseract fallback.
- Unsupported/corrupt file → typed error to state.errors + friendly UI message.
- Text < 50 words → ask user for more context rather than proceeding.

## Success Criteria
- Handwritten-notes photo ≥ readable extraction on 8/10 test images
- 10-page PDF processed ≤ 30 s
- Zero meaning-altering edits on 5-sample audit

## Cost Notes
Vision calls are the priciest step; cache `cleanedText` keyed by file hash — re-uploads skip this agent entirely.
