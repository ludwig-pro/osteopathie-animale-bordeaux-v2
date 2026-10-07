import test from 'node:test';
import assert from 'node:assert/strict';
import { animalTypeFrom } from '../src/animal-type.ts';
test('species requires explicit, unambiguous species information', () => {
  assert.equal(animalTypeFrom('Consultation ostéopathie canine'), 'Chien');
  assert.equal(animalTypeFrom('chat'), 'Chat');
  assert.equal(animalTypeFrom('Équin'), 'Cheval');
  assert.equal(animalTypeFrom('Consultation chien / chat'), null);
  assert.equal(animalTypeFrom('Chanelle'), null);
  assert.equal(animalTypeFrom('Romy Bella'), null);
  assert.equal(animalTypeFrom('berger australien'), null);
});
