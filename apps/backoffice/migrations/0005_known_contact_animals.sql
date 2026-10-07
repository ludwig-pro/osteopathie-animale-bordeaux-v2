-- Independent of Google name fields: an ordinary name edit cannot lose animals.
CREATE TABLE known_contact_animals (
  contact_id TEXT NOT NULL,
  animal_key TEXT NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (contact_id, animal_key)
);
