# Feature Specification: The Printing Network, 1508–1560s

**Feature Branch**: `012-printing-network`
**Created**: 2026-11-22
**Status**: Draft
**Input**: Jira epic TCX-79 (Stage III), story TCX-82 (rank 1 of the Stage III order). The printing network of 1508 to the 1560s shows Transylvania, Wallachia and Moldavia inside one network of books, people and paper. Its anchor objects are:
- Macarie's Slavonic Leitourgikon (10 November 1508);
- Ljubavić's Târgoviște prints (Molitvenic 1545, Apostol 1547);
- the lost Sibiu catechism of 1544;
- Coresi's work at Târgoviște and then Brașov;
- Venetian paper reaching the presses through Sibiu merchants.

It builds on ADR 0021 (place roles) and, where a term's history is shown, on ADR 0022 (term records). The decisions come from the Stage III grill of 22 November 2026 (TCX-80, TCX-81).

**Historical question served**: How closely were Transylvania, Wallachia and Moldavia tied together by the making and circulation of printed books between 1508 and the 1560s? It is answered from what each book says about itself, what scholarship attributes to it, and where its copies are and were kept. Throughout, the place a book was made is kept apart from the places it is kept now.

**Analytical dimensions** (`FRAMEWORK.md`, Principle XI): historical, geographical, religious, economic and linguistic (Church Slavonic, then Romanian-language printing), and methodological (stated against attributed, and silence). Each claim carries its own dimensions in the evidence register.

## Clarifications

### Session 2026-11-22

- Q: Which record family holds a printer (Macarie, Ljubavić, Coresi)? → A: A new `person` family, added to ADR 0006's closed family list by a spec amendment, as ADR 0022 does for `term`. Cartographer stays the profile of a maker of maps. A person who also made maps is one person record, which a Cartographer profile may point to; the two are not merged in this spec.
- Q: What do readers see from this spec? → A: The Atlas layer of the network, plus edition and printer pages. A short essay on the network is a later story, under the essay framework (spec 003). The Târgoviște essay (TCX-84) already tells part of the story.
- Q: Should a printed edition that is published and released get its own public page even when no public record cites it, overriding ADR 0014's rule for bibliography entries? → A: Yes, for an edition that carries place roles. It is studied for its own sake, like a map, so it is public when published and released. Every other bibliography entry keeps ADR 0014's rule (public only when a public record cites it). Recorded as an amendment to ADR 0014.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — An edition with its places (Priority: P1)

The maintainer records the 1508 Leitourgikon as one edition. It has one production place, Dealu Monastery at Târgoviște, recorded as *attributed* by scholarship with high confidence, while the date is *stated* by the book's epilogue. Each surviving copy is a dated holding at a named institution. The earlier attributions (Venice, Bistrița, Snagov, Govora, Cetinje) live in the edition's historiography note with their sources, not as further production places. The integrity gate holds every edition to ADR 0021.

**Audience**: 3 (researchers in book history and historical geography), 4 (developers and digital-edition researchers), and the maintainer.

**Why this priority**: Nothing else in the network can be drawn or argued until an edition can say, correctly, where it was made and where its copies are. This is the record the Princeton pin gets wrong.

**Independent Test**: Record the 1508 edition with one production place and its copies, then run the gate. It passes. A second production place, a holding without a holder or start date, or place roles on a map record each fail with a named rule.

**Acceptance Scenarios**:

1. **Given** the 1508 edition with one production place (Dealu, attributed, high confidence) and its copies as holdings, **When** the gate runs, **Then** it passes and each holding names its institution and the date the holding began.
2. **Given** an edition with two production places, **When** the gate runs, **Then** it fails, naming the edition and the rule.
3. **Given** a holding with no holder, or with no start date, **When** the gate runs, **Then** it fails, naming the copy and the missing field.
4. **Given** a map record carrying place roles, **When** the gate runs, **Then** it fails: maps keep their existing fields until their own migration (ADR 0021 decision 6).
5. **Given** a copy that moved (for example from Bistrița to Bucharest), **When** it is recorded, **Then** it has two dated holdings, and the earlier, closed one is read as "formerly at".
6. **Given** a superseded attribution, **When** a reader opens the edition, **Then** it appears in the historiography note with its source, and never as a place on the map.

---

### User Story 2 — The network on the map (Priority: P1)

A reader opens the Atlas at 1508–1560s and sees where the books of the network were made: Dealu/Târgoviște, Sibiu and Brașov. They also see the corridors across the Carpathians that joined those places. Every pin says what it is: "made here" or "a copy is kept here". Attributed places look different from stated ones. Copies are hidden until the reader asks for them. The corridors are drawn and labelled as editorial approximations.

**Audience**: 1 (general readers), 2 (collectors), 3 (researchers).

**Why this priority**: Showing the three lands joined by books is the story's purpose, and a correct map is where the place-role decision becomes visible.

**Independent Test**: Load the layer with the network's editions. In the default view only production places show, each pin labelled with its role in text. Turn on copies and holdings appear with their institutions. Each corridor's label and legend say it is an editorial approximation.

**Acceptance Scenarios**:

1. **Given** the default view, **When** the reader opens the layer, **Then** only production places are drawn, one pin per edition and role, and the legend lists only the roles shown.
2. **Given** an attributed production place, **When** it is drawn, **Then** its style and its label differ from a stated one, and the inspector says "attributed" in words, with the confidence.
3. **Given** the reader turns on copies, **When** the map redraws, **Then** current holdings and former holdings ("formerly at") appear as different, labelled roles, each naming its institution.
4. **Given** the Olt/Sibiu and Brașov corridors, **When** they are drawn, **Then** their geometry provenance is editorial and the legend says so (Constitution III), and no corridor is shown as a surveyed road.
5. **Given** a reader without a mouse, **When** they use the keyboard alone, **Then** they reach every pin and corridor and hear its role or provenance in text (ADR 0004).

---

### User Story 3 — People who crossed the mountains (Priority: P2)

A reader follows the printers through the network. They see Macarie at Dealu in 1508, Ljubavić at Târgoviște in 1545–47, and Coresi first at Târgoviște, then at Brașov. A printer's move is shown by the dated editions they made at each place. It is never shown as a line the sources do not draw.

**Audience**: 1, 3.

**Why this priority**: People make the network visible as connection rather than as dots, but the editions must exist first.

**Independent Test**: Open Coresi. His editions are listed with their production places and dates. The move appears as two production places, in date order, each backed by an edition, with no path drawn between them unless a source gives one.

**Acceptance Scenarios**:

1. **Given** a printer with editions at two places, **When** the reader opens the printer, **Then** each edition is listed with its production place and date, in date order.
2. **Given** no source for the route a printer took, **When** the move is shown, **Then** no path is drawn between the two places.
3. **Given** an edition whose printer is attributed rather than named in the book, **When** it is shown, **Then** the attribution is labelled and carries its confidence.

---

### User Story 4 — Lost books and unread colophons (Priority: P3)

A reader sees what is missing as well as what survives:
- The Sibiu catechism of 1544 was made at Sibiu, but no copy is known. It is shown as made, with no holdings, and that absence is stated rather than left blank.
- Ljubavić's colophons have not yet been read by this project. Their claim to be the first Wallachian books to name their place is shown as pending.

**Audience**: 3, 4.

**Why this priority**: Honest absence matters (Constitution III), but it needs the editions and the map first.

**Independent Test**: Open the 1544 catechism. It has a production place, no holdings, and a stated non-survival. Open the 1545 Molitvenic. Its place-naming claim rests on a pending locator, and the page says so.

**Acceptance Scenarios**:

1. **Given** an edition with no known copy, **When** it is shown, **Then** its production place is drawn, no holding is drawn, and a stated non-survival appears in words.
2. **Given** a claim resting on a locator not yet read by this project, **When** it is shown, **Then** it is marked pending and cannot be rated `secure` (ADR 0003 §4).

---

### User Story 5 — Paper as a thread between the lands (Priority: P3)

A reader learns that the paper of the 1508 book was Venetian and reached Wallachia through Sibiu merchants. This is shown only as far as the evidence goes: as a claim attached to the edition and to the Sibiu corridor, with its source and confidence.

**Audience**: 3.

**Why this priority**: It is the strongest single sign of a three-land network, but it rests on the thinnest evidence until watermarks or customs records are read.

**Independent Test**: Open the 1508 edition. The paper claim shows its source, its locator state and its confidence. If it has no Evidence record, nothing about paper is drawn on the map.

**Acceptance Scenarios**:

1. **Given** an Evidence record for the paper's origin, **When** the edition is shown, **Then** the claim appears with its source, locator state and confidence.
2. **Given** no such Evidence record, **When** the map is drawn, **Then** no paper flow is drawn.

---

### Edge Cases

- **A copy whose holder is unknown** (known only from an old catalogue): it is not a holding until an institution is named. It goes in the edition's notes as a lead.
- **Two copies at one institution**: two holdings, told apart by shelfmark (ADR 0021 decision 4).
- **A holding with no known start date**: the start is written as an uncertain EDTF date (for example `19XX`, or `..` for unknown), never left blank.
- **An edition from outside the period or region** (for example Macarie's earlier Cetinje work): out of scope. It may be cited in a historiography note.
- **A place with no record yet** (for example Dealu Monastery as distinct from Târgoviște): it is minted before the edition refers to it. The difference between the monastery and the town is kept.
- **An attribution later shown false**: the production place is replaced and the old one moves to the historiography note. The edition's ID is unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: An edition MUST be able to carry place roles as ADR 0021 defines them: at most one `produced_at`, and any number of dated `held_at` links. Each link has a basis (stated or attributed), a confidence, EDTF dates and its evidence.
- **FR-002**: The integrity gate MUST reject the following, each with its own rule ID:
  - more than one `produced_at` on a record;
  - a `held_at` without a holder or a start date;
  - a role, basis or confidence outside its vocabulary;
  - place roles on any family other than the bibliography entry.
- **FR-003**: Each holding MUST name its holder (institution) and MAY carry a shelfmark. A copy that moved is recorded as consecutive dated holdings. This is an authoring convention, not a gate rule: a copy has no identity of its own apart from its holdings (ADR 0021 decision 4), so overlap between them cannot be checked.
- **FR-004**: An edition MUST be able to carry a historiography note listing superseded attributions with their sources. These MUST NOT be drawn on the map.
- **FR-005**: The Atlas MUST draw a pin for an edition only with its role, using one pin per role, styled by role, with a legend entry for each role shown.
- **FR-006**: The default Atlas view MUST show production places only. Holdings MUST appear only when the reader turns them on, and current and former holdings MUST be told apart in text.
- **FR-007**: An attributed place MUST be drawn and labelled differently from a stated one, and the inspector MUST say which it is in words, with the confidence.
- **FR-008**: The corridors joining the network's places MUST be drawn with editorial geometry provenance and labelled as approximations (Constitution III). They are taken from the Stage III passes-and-corridors work (TCX-86).
- **FR-009**: A printer MUST be linked to the editions they made, and a printer's movement MUST be shown only through dated editions, never as a path the sources do not give. A printer is a record of the new `person` family (Clarifications, 2026-11-22). Its link to an edition names the role (printer) and carries a basis (stated in the book, or attributed) and a confidence.
- **FR-010**: An edition with no known copy MUST state non-survival as a value, not as an empty list of holdings.
- **FR-011**: A claim resting on a pending locator MUST be shown as pending and MUST NOT be rated `secure`.
- **FR-012**: The paper claim, and any claim about materials or trade, MUST appear only through Evidence records. Nothing about paper is drawn without one.
- **FR-013**: Every claim in the network MUST carry its analytical dimensions (Principle XI, `DIM-MISSING` from `ready_for_build`).
- **FR-014**: Readers MUST see the network through the Atlas layer and through a page for each edition and each printer. An edition that carries place roles is public when published and released, whether or not a public record cites it. A bibliography entry without place roles keeps ADR 0014's rule (amended 2026-11-22). Each page lists the record's place roles in words, and those places link to the layer. An essay on the network is out of scope for this spec.
- **FR-015**: The `person` family MUST be added to the closed family list by amending spec 001 and ADR 0006 (decided in ADR 0023). A person record carries names (with language and kind), life dates in EDTF, and the editions linked to it. It follows the same held/released and lifecycle rules as every other family, so a person appears publicly only when published and released.

### Key Entities

- **Edition**: a printed book as published. Its record is a bibliography entry, with a title, a date (stated or attributed), a language, one production place, its holdings, a historiography note and a non-survival value where no copy is known.
- **Holding**: one copy at one institution for one dated interval: its holder, an optional shelfmark, its start and end dates, a basis and a confidence. A closed holding is read as "formerly at".
- **Place**: an existing Place record (Târgoviște, Sibiu, Brașov, Bucharest and others). New places are minted where needed, such as Dealu Monastery as distinct from the town.
- **Person**: a record of the new `person` family (FR-015). In this spec, a printer is linked to the editions they made, with a role, basis and confidence. Not a Cartographer profile, which is a maker of maps.
- **Corridor**: a route across the Carpathians, with editorial geometry, from the passes-and-corridors work (TCX-86).
- **Evidence**: as the registry defines it; it carries every claim about date, place, printer, paper and survival.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The four anchor editions are recorded: 1508 Leitourgikon, 1544 Sibiu catechism, 1545 Molitvenic and 1547 Apostol. Coresi's first editions at Târgoviște and at Brașov are recorded too. Each has exactly one production place, and the gate passes.
- **SC-002**: Every surviving copy of the 1508 edition that the literature locates is a holding with a named institution. The count found is recorded against the "twelve" reported, and any difference is explained.
- **SC-003**: In the default map view, a reader asked "where was this book made?" points at the production place, not at a library, for every edition shown. This is checked with five readers on the 1508 edition.
- **SC-004**: Every pin and corridor in the layer states its role or provenance in text. No pin is drawn without one, which is tested over the whole layer.
- **SC-005**: No claim rated `secure` rests on a pending locator, and every claim carries its analytical dimensions. The gate checks both.
- **SC-006**: The layer meets the ADR 0004 accessibility and performance budgets, as the other Atlas layers do.

## Assumptions

- ADR 0021 and ADR 0022 are accepted and merged (PR #147). This spec implements ADR 0021's rules and uses ADR 0022 only if a term record is needed for a name. None is planned in this spec.
- The corridor geometry comes from a thin slice of TCX-86. If it is not ready, the layer ships without corridors, and they are added when they arrive.
- The bibliography entries for the editions follow spec 006: one CSL file each. Because they carry place roles, they are public when published and released, without waiting for a citing record (FR-014, ADR 0014 as amended).
- Holdings are taken from published catalogues and literature, with pending locators until a person checks the institution's own record. No library is visited for this spec.
- The 1508 edition's attribution, date and copies are taken from the sources checked in `docs/research/transylvania/bibliography-verification.md` and from the Princeton "Mapping Eastern Europe" entry. Each becomes an Evidence record with its locator.
- Scope ends with Coresi's Brașov work of the 1560s. Later Romanian printing belongs to later work, and to *Between Three Empires* where it falls after 1700.
