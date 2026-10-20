import { z } from 'astro:content';
import { BASE } from '../data/base';

const getYear = () => 100;

const RAW: unknown[] = [
  { id: 'fine', title: 'A fine record', year: 5 },
  { id: 'spread-record', title: 'Spread', ...BASE },
  { id: 'call-record', title: 'Call', year: getYear() },
  { id: 'identifier-record', title: 'Identifier', year: BASE },
  { id: 'template-record', title: `Template ${BASE}` },
];
