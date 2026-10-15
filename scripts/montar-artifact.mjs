// Converte dist-claude/index.html no formato de página do Artifact:
// sem <!doctype>/<html>/<head>/<body> (o claude.ai acrescenta o esqueleto),
// com <title> e <style> no topo.
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist-claude/index.html', 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];

const pegar = (re) => [...head.matchAll(re)].map((m) => m[0]);
const titulo = pegar(/<title>[\s\S]*?<\/title>/g);
const fontes = pegar(/<link[^>]+fonts\.googleapis\.com[^>]*>/g);
const estilos = pegar(/<style[\s\S]*?<\/style>/g);
const scripts = pegar(/<script[\s\S]*?<\/script>/g);

const pagina = [
  ...titulo,
  ...fontes,
  ...estilos,
  body.trim(),
  ...scripts,
].join('\n');

writeFileSync('dist-claude/frota.html', pagina);
console.log(`dist-claude/frota.html: ${(pagina.length / 1024).toFixed(0)} KB`);
