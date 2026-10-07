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

test('breed mapping handles accents and known crosses without guessing ambiguous breeds', async () => {
  const { animalTypeFromBreed, bookingAnimalType } =
    await import('../src/animal-type.ts');
  for (const breed of [
    'Berger Australien',
    'bouledogue français',
    'croisé labrador',
    'Boxer x setter',
    ' Maine   Coon ',
    'British short hair',
  ]) {
    assert.equal(
      animalTypeFromBreed(breed),
      /coon|british/i.test(breed) ? 'Chat' : 'Chien'
    );
  }
  for (const breed of [
    'shetland',
    'angora',
    'rex',
    'nain',
    'croisé',
    'Moka',
    'inconnu',
    'labrador / chat',
    'labrador x inconnu',
    'chat / chien',
  ]) {
    assert.equal(animalTypeFromBreed(breed), null, breed);
  }
  assert.equal(
    bookingAnimalType({ animalType: 'Chat', breed: 'labrador' }),
    'Chat'
  );
  assert.equal(
    bookingAnimalType({ animalType: 'inconnu', breed: 'labrador' }),
    null
  );
  assert.equal(
    bookingAnimalType({ animalType: '', breed: 'labrador' }),
    'Chien'
  );
  assert.equal(animalTypeFrom('Autre NAC'), 'NAC');
  assert.equal(animalTypeFrom('Autre (à préciser dans la race)'), 'Autre');
});
