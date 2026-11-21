import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFanPageCaption, cleanShortText } from './fanPage';

const post = { titulo: 'Pedro Páramo', autor: 'Juan Rulfo', nombre: 'María G.', comentario: 'Me dejó pensando días.' };

test('el texto de la fan page dice quién lo leyó, el resumen y su comentario', () => {
  const t = buildFanPageCaption(post, 'Juan Preciado llega a Comala buscando a su padre.');
  assert.ok(t.startsWith('📖 María G. leyó «Pedro Páramo», de Juan Rulfo.'));
  assert.ok(t.includes('Juan Preciado llega a Comala'));
  assert.ok(t.includes('«Me dejó pensando días.» — María G.'));
  assert.ok(t.includes('#LeerEsPensar'));
});

test('sin autor conocido, sin resumen ni comentario, sigue siendo un texto limpio', () => {
  const t = buildFanPageCaption({ ...post, autor: 'Autor desconocido', comentario: '' }, '');
  assert.ok(t.startsWith('📖 María G. leyó «Pedro Páramo».'));
  assert.ok(!t.includes('«» —'));
});

test('el comentario no deja pasar enlaces, etiquetas ni saltos raros', () => {
  assert.equal(cleanShortText('Mírenlo <b>aquí</b> https://spam.com ya\n\nok', 100), 'Mírenlo aquí ya ok');
  assert.equal(cleanShortText('x'.repeat(500), 240).length, 240);
});

test('el texto agradece al lector y trae una cita clásica', () => {
  const t = buildFanPageCaption({ titulo: 'Pedro Páramo', autor: 'Juan Rulfo', nombre: 'Rosa M.', comentario: '' }, '');
  assert.match(t, /Gracias, Rosa, por regalarte el tiempo de leer y aprender/);
  assert.match(t, /«[^»]+» — [A-ZÁÉÍÓÚ]/);
});
