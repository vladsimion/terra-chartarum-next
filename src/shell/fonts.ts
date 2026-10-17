/*
 * The self-hosted faces (spec 002 FR-013, ADR 0008). Each Fontsource stylesheet declares its
 * subsets with a unicode-range and `font-display: swap`, so a page downloads only the subsets its
 * text uses: Latin and Latin-extended from Cinzel and Crimson Pro, Greek from EB Garamond (the
 * body fallback for Greek), IBM Plex Mono for labels. Importing them here keeps the list in one
 * place for the layout.
 */
import '@fontsource-variable/cinzel/wght.css';
import '@fontsource-variable/crimson-pro/wght.css';
import '@fontsource-variable/eb-garamond/wght.css';
import '@fontsource/ibm-plex-mono/400.css';
import './styles/fallbacks.css';
