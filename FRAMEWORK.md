# FRAMEWORK — the analytical framework of Terra Chartarum

This file is the one canonical home of the project's analytical framework (constitution Principle XI, ADR 0020). It applies to every stage (I Dacia, II Transylvania, III Wallachia and Moldavia, and any later one), to every phase inside a stage, and to every essay, Atlas layer and dataset. Specs and essays reference it and never restate or fork it. Changing a dimension or a methodological rule is a constitutional amendment.

Terms in **bold** are defined in `GLOSSARY.md`. Worked examples come from whichever territory illustrates a rule best; the rules apply everywhere.

## How the framework is used

- Every **Evidence record** (a claim) carries `analytical_dimensions`: each dimension it draws on, from the 13 below. Unknown values fail validation (`ENUM-INVALID`). A claim is rarely one-dimensional, so tag every dimension it actually rests on.
- Every claim carries a **Confidence** grade from the scale below, and every locator is `verified` or `pending` (constitution Principle VI).
- The editorial stage exits enforce the method (ADR 0003 §5): at Research, claims are tagged and the competing hypotheses are written down with what would weaken each; at Draft, every secondary source cited has its bias-audit score.

## The 13 analytical dimensions

The dimensions do different jobs. Eight are **empirical** (what is investigated), four are **interpretative** (how evidence is understood) and one is for **validation**. The identifier in `code` is the value stored in `analytical_dimensions`.

| # | Dimension | Identifier | Group |
|---|---|---|---|
| 1 | Historical | `historical` | empirical |
| 2 | Historiographical | `historiographical` | interpretative |
| 3 | Geographical | `geographical` | empirical |
| 4 | Social and demographic | `social_demographic` | empirical |
| 5 | Philosophical | `philosophical` | interpretative |
| 6 | Sociological | `sociological` | interpretative |
| 7 | Mythological | `mythological` | interpretative |
| 8 | Anthropological and archaeological | `anthropological_archaeological` | empirical |
| 9 | Linguistic | `linguistic` | empirical |
| 10 | Religious | `religious` | empirical |
| 11 | Economic | `economic` | empirical |
| 12 | Political | `political` | empirical |
| 13 | Methodological | `methodological` | validation |

Worked example of one claim through many dimensions: "pastoral communities crossed the Carpathians seasonally in the Middle Ages" is examined through geography (routes, passes), anthropology (transhumance), language (dialects), documents (historical), economy, law (political), historiography and method at once.

### 1. Historical
**Definition.** The reconstruction of events, institutions and changes over time from contemporary evidence, ordered chronologically and tied to specific places.
**Asks.** What happened, when, where and on whose authority? Which sources are contemporary and which are later reconstructions? How far did the authority reach? Was change achieved by conquest, treaty, inheritance or gradual integration? Does an omission in a document reflect absence, or only the document's purpose?
**Evidence.** Charters, diet and treaty texts, chronicles read in their own date, source editions; the date of an act and the date of its surviving copy are recorded separately.
**Pitfalls.** Reading a later chronicle as an eyewitness account; letting one well-known source stand for a century; anachronism (modern national categories in medieval arrangements); compressing a slow integration into one event; confusing legal claims with effective control (so Atlas boundaries are labelled legal, administrative or effective); counting several chronicles that repeat one account as several witnesses; assuming the surviving archive is all that was written; letting modern disputes set the reading of older evidence.
**Example.** A charter of Saxon privileges names who was privileged; it was never meant as a census.

### 2. Historiographical
**Definition.** The study of how history has been written: who wrote it, for whom, with which assumptions, institutions and political pressures, and how interpretations changed. It studies three objects: the past, the interpretations of it, and the politics through which interpretations gained authority.
**Asks.** When and why did each narrative appear? What evidence did each author treat as admissible, and what would have falsified their hypothesis? Did later historians return to the evidence or reproduce an earlier reading (citation chains)? Which arguments survived, were abandoned or revived?
**Evidence.** Historians' own works, prefaces, reviews, polemics, institutional records, read in the original language; translations are separate witnesses.
**Pitfalls.** Judging a work only by its political context (the genetic fallacy); assuming the latest interpretation is the most correct; false equivalence between traditions; treating national schools as uniform; attributing a later, systematic theory to an earlier author; citation circularity; mistaking a translator's reading for the author's; judging older scholarship only by present standards.
**Example.** The continuity and migration theses about the Romanian lands are themselves historical products, with authors, dates and purposes.

### 3. Geographical
**Definition.** The study of space: physical setting, settlement patterns, borders, routes and place-names, and how they shaped and were shaped by human activity.
**Asks.** Where were settlements in each period? Which areas were pasture, farmland, mining zone or frontier? Was a river a barrier or a corridor? Which territorial unit does a name mean at a given date?
**Evidence.** Archaeological gazetteers, toponymy, historical maps, terrain models, census geography.
**Pitfalls.** Projecting modern borders backwards; treating a map's border as a line on the ground; letting one name stand for territories of different extent.
**Example.** "Transylvania" names at least four different units (the medieval voivodeship, the Principality, historic Transylvania, the 1920 territory); maps never imply they were one.

### 4. Social and demographic
**Definition.** How society was organised (estates, classes, legal status, household and community, relations between groups) and the size and movement of its population (numbers, household structure, births, deaths, migration). Statistical technique belongs to the methodological dimension; the questions and sources belong here.
**Asks.** Who held privileges and who did not? How did elites keep or lose status? How large was each group, and how reliable are estimates before censuses? How did census categories shape the numbers they produced? Who moved, where and when?
**Evidence.** Diet acts, manorial surveys, tax registers, petitions, court records, conscriptions and church registers, censuses.
**Pitfalls.** Equating a legal estate with an ethnic group; ignoring elites who assimilated; treating taxpayer or household counts as head counts without stating the multiplier; comparing censuses that asked different questions or covered different territories; giving a pre-statistical estimate without its uncertainty range.
**Example.** The "three nations" of 1437 were legal estates, not ethnic groups.

### 5. Philosophical
**Definition.** Examination of the concepts and reasoning behind historical claims: what counts as a group, what "continuity" means, and what follows from evidence or its absence.
**Asks.** Is ethnicity treated as fixed or as made through social boundaries? Does absence of evidence weaken a claim, and by how much? Are normative claims about legitimacy mixed with descriptive ones?
**Evidence.** The arguments themselves, examined for definitions, hidden premises and inference rules.
**Pitfalls.** Moving between meanings of a key term within one argument; treating a moral conclusion as a historical finding.

### 6. Sociological
**Definition.** The institutions, careers, networks and incentives that produce and circulate historical knowledge, and how publics receive it.
**Asks.** Who could publish what, where, and with what consequences? How did a work reach schools, diasporas and foreign libraries?
**Evidence.** Institutional histories, author biographies, publication and translation records, textbooks, press coverage.
**Pitfalls.** Assuming political pressure invalidates findings, or that independence guarantees them.

### 7. Mythological
**Definition.** Foundation stories, symbols and collective images that give a group meaning and legitimacy, whatever their factual basis. Myths are historically consequential narratives whose evolution matters, not merely false claims.
**Asks.** Which myths drive which historical arguments? How do myths enter scholarship, schoolbooks and maps?
**Evidence.** Chronicles, literature, iconography, monuments, commemorations, map title pages and cartouches.
**Pitfalls.** Debunking one side's myths only; dismissing myths when they shape what historians look for.

### 8. Anthropological and archaeological
**Definition.** Ways of life (subsistence, kinship, mobility, customary law, how group boundaries are made and kept) and their material remains (settlements, burials, tools, pottery, coins, land use), recovered and dated through archaeology.
**Asks.** How did mobility work? What did customary law regulate? How are assemblages linked to groups, and on what evidence? What can each kind of site show and not show? How firm are the dates? Where has excavation been intensive, and where are the blanks?
**Evidence.** Charters on customary law, ethnography, comparative evidence; excavation reports, national site registers, coin-find catalogues, aerial and landscape survey.
**Pitfalls.** Labelling an artefact type with a modern ethnic name; treating a mobile population as invader or native by default; reading the map of excavations as the map of past settlement; dating a site by one artefact type; treating a gap in finds as a gap in people.
**Example.** "Vlach" was often a social and occupational category as much as an ethnic one.

### 9. Linguistic
**Definition.** Language evidence (sound changes, vocabulary layers, dialects, borrowing, place-names) used to reconstruct where and when speech communities formed and met.
**Asks.** Which features point to which homeland or contact zone? What do first-attestation dates of place-names show?
**Evidence.** Historical grammars, etymological and toponymic dictionaries, linguistic atlases.
**Pitfalls.** Treating linguistic evidence as a map with dates; relying on single words; treating absences as proof (see rule 3).

### 10. Religious
**Definition.** Belief, church organisation, ritual language and the legal status of confessions, and their role in identity and politics.
**Asks.** How did religious status shape political rights? What do church vocabularies reveal about stages of Christianisation? When did institutions form, and how did they relate to wider churches? What does a shift in religious writing reveal about literacy and institutions?
**Evidence.** Constitutional and ecclesiastical records, theological and polemical writings read as sources, religious texts and printing, churches, monasteries and inscriptions.
**Pitfalls.** Equating confession with nationality; taking liturgical language for spoken language; treating legal tolerance as equality; assuming institutional continuity from similar practices; reducing religious diversity to the recognised churches.
**Example.** Church Slavonic printing in Wallachia (1508) tells us about church networks, not about the origin of a speech community.

### 11. Economic
**Definition.** Production, trade, taxation, labour and property, and how economic interests shaped settlement, privileges and conflict.
**Asks.** Who produced, taxed and traded what? How did privilege follow economic function? How did a reform actually redistribute property, rather than how it is remembered?
**Evidence.** Mining records, tax and customs registers, manorial surveys, town accounts, reform statistics.
**Pitfalls.** Reading economic grievance as purely ethnic, or ethnic conflict as purely economic; letting one well-documented site stand for a province.

### 12. Political
**Definition.** Power: sovereignty, administration, law, diplomacy, war and the uses of history by states.
**Asks.** Who ruled, through what institutions, and how did borders change? For each territory and date, sovereignty, de facto control, administrative jurisdiction and international recognition are recorded separately. How did governments commission, censor or use historical work?
**Evidence.** Treaties, diet acts, administrative records, diplomatic archives, party documents.
**Pitfalls.** Treating sovereignty as proof of population; treating state-sponsored history as automatically false.

### 13. Methodological
**Definition.** The rules by which claims are tested: source criticism, sampling, comparison, standards of proof, quantitative analysis and reproducibility. Its rules are the research methodology below.
**Asks.** What evidence would weaken each hypothesis? Is the comparison like-for-like? Can another researcher repeat the result from the published data?
**Evidence.** The project's own data, code and evidence records.
**Pitfalls.** Mistaking precision for accuracy; quantifying data whose collection is itself biased.

## Research methodology

Every claim is a hypothesis with a stated evidence base, a confidence grade and the evidence that would weaken it. The same tests apply to every national and scholarly tradition, in every stage.

### Epistemic rules
1. **Keep presence, sovereignty and identity separate.** No argument moves from one to another without independent evidence.
2. **Symmetry.** Every critical tool (myth analysis, political context, source criticism) is applied to all traditions equally.
3. **Silence is weak evidence.** Absence of records is weighed against the expected survival of records for that place and period; it never proves absence on its own. Every claim separates positive evidence, contradictory evidence and absence of evidence, to the same standard for every competing hypothesis. Typed absence uses the **Silence state** vocabulary.
4. **No ethnic labels for objects without independent support.** An archaeological culture is named by site or type unless written or linguistic evidence ties it to a group.
5. **No golden mean.** A compromise position is accepted only when the evidence supports it.
6. **Name the definition.** Every use of a contested term ("continuity", a national or group name) states which sense is meant: linguistic, demographic, legal, confessional or self-identified.
7. **Facts before entitlements.** Whether a community lived in a territory at a date is a historical question; what political claim follows is a separate, normative one, kept apart for every narrative.

### Evidence hierarchy

| Tier | Type | Default weight |
|---|---|---|
| A | Contemporary documents produced for practical purposes (charters, tax registers, inscriptions, censuses) | Highest, after authenticity checks |
| B | Physical evidence in dated context (excavated settlements, coin finds, cemeteries) | High for presence and dating; low for identity |
| C | Linguistic evidence (loanword layers, sound changes, place-name attestation dates) | High for contact and sequence; low for exact place and date |
| D | Contemporary narrative sources | Medium; check purpose, distance and literary models |
| E | Later narrative sources | Low for the events; high for the author's own time |
| F | Maps and images | High for contemporary perception; low for ground truth |
| G | Modern scholarship | Context only; always traced back to tiers A–F |

Proximity is not reliability: a contemporary report can be partisan and a late chronicle can preserve lost material. The tier sets the starting weight; source criticism decides the final one.

### Source criticism protocol
For each source: author, date, place of production, purpose, audience, original language and edition used, distance from the events, models or earlier texts it copies, and known forgeries or interpolations. These are structured fields, not prose.

### Triangulation
A claim rises in confidence only when supported by at least two independent evidence types (for example an inscription and a toponym, or a charter and an excavation). Two sources sharing a common origin count as one.

### Confidence scale
The labels are the shared **Confidence** vocabulary (ADR 0003 §3 as amended by ADR 0020); the numbers are display ordinals.

| Ordinal | Label | Criterion |
|---|---|---|
| 4 | `secure` | Two or more independent tier A–C sources agree, no credible contrary evidence, and a verified locator |
| 3 | `probable` | One strong source plus consistent indirect evidence |
| 2 | `possible` | Consistent with the evidence but not directly supported, or contested |
| 1 | `conjectural` | Resting on inference or late sources |
| 0 | `unsupported` | Contradicted, or no evidential basis; kept so it can be shown as refuted |
| — | `unknown` | Not yet assessed; never treated as the lowest level |

### Standards of proof
Each main hypothesis is written down before evidence is graded: what it predicts, what evidence would be expected if it were true, and what would weaken it. Findings are scored against all hypotheses at once, so evidence is never collected only for the favoured one.

### Quantitative methods
Where a dispute can be measured, it is measured: proportions, densities, attestation dates, census series, cartographic name and border frequencies, each with its uncertainty and corrected for how the data were collected (for example excavation intensity). Analysis is done in R, with data and code published so results can be repeated.

### Bias audit
Every secondary source is scored on a defined rubric rather than an impression: the author's institution and country, funding, date, the share of claims supported by citations, use of primary sources, engagement with opposing scholarship, and tone. Scores are recorded with their evidence so others can contest a rating.

**Status: approved by the author on 24 November 2026 (TCX-77).** It was drafted on 22 November 2026 and amended on 24 November 2026 after the ET1986 test sheet. Scores enter the evidence register only from a sheet a person has scored and dated.

The rubric has two parts that are never added together. **Context** describes where a text comes from: it raises questions, but it is not a verdict on the text. **Practice** scores what the text does on the page. A well-funded state project can practise well, and an independent author can practise badly, so a single total would hide exactly what the audit is for.

**Unit.** One chapter, or one section covering one period. A whole book is audited chapter by chapter; its profile is the list of chapter scores, never an average.

**Context (risk flags: 0 none found, 1 possible, 2 clear).** Each flag records its evidence: a title page, an acknowledgement, a dated event.

| Code | Criterion | 0 | 1 | 2 |
|---|---|---|---|---|
| C1 | Institution and country | Author independent of any body with a stake in the conclusion | Author's institution belongs to one national tradition in the dispute | Institution or editor directed by a state or party body with a declared position on the question |
| C2 | Funding and sponsorship (scored per edition: a later edition can have another funder) | None stated, or a funder with no stake | A funder from one side of the dispute, with no stated position | A sponsor with a declared position on the question, or the work commissioned for a political purpose |
| C3 | Date and setting | Written outside an active dispute over the question | Written during a public dispute over the question | Written as a direct intervention in a dispute (a reply, a rebuttal, or for an anniversary or treaty) |

**Practice (0 to 3 each, higher is better).** Each score is measured on the sample below and records its counts and page references.

| Code | Criterion | How measured | 0 | 1 | 2 | 3 |
|---|---|---|---|---|---|---|
| P1 | Claims supported by citations | Share of the sampled factual claims with a citation that, when followed, supports that claim. A citation is either attached to the claim (a note) or, in a text that cites by section, a work that the section's bibliography names for that point. The sheet says which kind each is. | under 25% | 25–49% | 50–74% | 75% or more |
| P2 | Use of primary sources | Share of the citations counted for P1 that reach tiers A–F of the evidence hierarchy, directly or through a named edition | under 25% | 25–49% | 50–74% | 75% or more |
| P3 | Engagement with opposing scholarship | Whether the main works of the other tradition on the chapter's question are cited, stated fairly, and answered with evidence, in the text or in its notes and bibliography (the sheet says where) | not cited | cited, not engaged, or stated in a form its authors would not recognise | engaged on some points | stated fairly and answered on the main points, with evidence |
| P4 | Tone | Evaluative or loaded terms about peoples, scholars or traditions, per 1,000 words of the sample, plus the use of national "we" or "our" for a past population | more than 5, or national "we" throughout | 2–5, or national "we" in places | under 2 | none, and contested terms named as contested |

**Sampling.**
- *Claims (P1):* take every tenth sentence that states a fact about the past, from the start of the chapter, until 30 claims (all of them if fewer). State how sentences were split (by hand, or mechanically from a named text file), so another reader draws the same sample.
- *Evidence named in the text (recorded with P1, not scored):* for each sampled claim, whether it names its own evidence (a site, a find, a document, a word) in the sentence. A text that cites by section often names its evidence this way, and the count shows it.
- *Citations (P2):* the citations counted for P1.
- *Tone (P4):* the same pages as the claims.
- The sample's start, step and page range are recorded, so another reader can draw the same sample.

**Engagement (P3).** List first, before scoring, the three to five works of the opposing tradition that any specialist would expect this chapter to answer. Use the bibliography and the comparative control text. Then score against that list.

**Symmetry.** The rule of comparative control applies. Both texts are audited on the same period, with the same sample rule and the same list length for P3, and by the same scorer in the same week. Where two scorers are available, each scores alone, and differences of more than one point are discussed and recorded.

**Why these rules (amended 24 November 2026).** The ET1986 test sheet (`docs/research/transylvania/bias-audit/test-et1986-271-900.md`) showed that a rubric counting only claim-level notes scores 0 for any text that cites by section bibliography, as all four editions of the 1986 synthesis do. That says nothing about the text's practice. The same test found its engagement with the opposing works only in the notes, and funding that differs from one edition to the next.

**Recording.** One sheet per unit:
- the text, edition siglum (`docs/research/transylvania/edition-register.md`), chapter and pages;
- the sample (start, step, pages);
- each score with its evidence;
- the scorer and date.

A score without evidence is not recorded. The sheets live with the research data, and the essays cite them.

**What the rubric does not do.** It does not decide whether a chapter's conclusions are true; the evidence hierarchy, triangulation and the confidence scale do that. It measures how a text argues, so that a reader can weigh it, and so that the same weighing is applied to both traditions.

### Comparative control
A national synthesis is read side by side with its counterpart, by the same rubric, chapter by chapter and period by period. A claim about one tradition needs the comparison with the other.

### Values and position
Following Max Weber: values legitimately decide what is studied and which questions are asked (*Wertbeziehung*), and those choices are stated, not hidden. Once the question is set, findings must not carry value judgements disguised as results (*Wertfreiheit*); the evidence records, confidence grades, stated hypotheses and bias audit exist to enforce this. Value freedom is not silence: a judgement is stated as a judgement, with its evidence, so a reader can accept or contest it separately from the findings. Each programme declares its researcher's position.
